# CRM Portal Deployment Guide

## Quick Start Deployment

### Prerequisites
- Docker and Docker Compose installed
- PostgreSQL 15+ and Redis 7+ (or use Docker)
- Python 3.11+ (for local development)

### Step 1: Clone and Configure

```bash
# Navigate to project directory
cd crm-portal

# Copy environment file
cp backend/.env.example backend/.env

# Edit .env with your settings
nano backend/.env
```

**Important Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/crm_db
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<generate-with-openssl-rand-hex-32>
DEBUG=False  # Set to False in production
CORS_ORIGINS=https://your-domain.com
```

### Step 2: Start Services with Docker

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# Wait for services to be healthy (about 10-15 seconds)
docker-compose ps

# Initialize database
docker-compose exec backend python /app/../scripts/init_database.py

# (Optional) Seed sample data
docker-compose exec backend python /app/../scripts/seed_sample_data.py
```

### Step 3: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:8000/health

# Access API documentation
open http://localhost:8000/api/docs
```

## Production Deployment

### Security Checklist

- [ ] Generate strong SECRET_KEY: `openssl rand -hex 32`
- [ ] Set DEBUG=False
- [ ] Configure proper CORS_ORIGINS
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure backup strategy

### Docker Production Build

1. **Create production docker-compose file:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: "False"
      CORS_ORIGINS: ${CORS_ORIGINS}
    depends_on:
      - postgres
      - redis
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
  redis_data:
```

2. **Build and deploy:**

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend python /app/../scripts/init_database.py
```

### Kubernetes Deployment

1. **Create Kubernetes manifests:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crm-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: crm-backend
  template:
    metadata:
      labels:
        app: crm-backend
    spec:
      containers:
      - name: backend
        image: your-registry/crm-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: database-url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: crm-secrets
              key: secret-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

2. **Deploy to Kubernetes:**

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/crm-backend
```

### Cloud Platform Deployment

#### AWS Deployment

1. **Using AWS ECS (Elastic Container Service):**

```bash
# Build and push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker build -t crm-backend backend/
docker tag crm-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/crm-backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/crm-backend:latest

# Create ECS task definition and service
aws ecs create-service --cli-input-json file://ecs-service.json
```

2. **Database: AWS RDS PostgreSQL**
3. **Cache: AWS ElastiCache Redis**
4. **Load Balancer: AWS ALB**

#### Google Cloud Platform

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/crm-backend

gcloud run deploy crm-backend \
  --image gcr.io/PROJECT_ID/crm-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=$DATABASE_URL,SECRET_KEY=$SECRET_KEY
```

#### Azure Deployment

```bash
# Create container registry
az acr create --resource-group crm-rg --name crmregistry --sku Basic

# Build and push image
az acr build --registry crmregistry --image crm-backend:latest backend/

# Deploy to Azure Container Instances
az container create \
  --resource-group crm-rg \
  --name crm-backend \
  --image crmregistry.azurecr.io/crm-backend:latest \
  --dns-name-label crm-api \
  --ports 8000
```

## Database Management

### Migrations

```bash
# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1

# View migration history
docker-compose exec backend alembic history
```

### Backup Strategy

```bash
# Automated PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/crm_backup_$TIMESTAMP.sql"

docker-compose exec -T postgres pg_dump -U postgres crm_db > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
# Stop backend service
docker-compose stop backend

# Restore database
gunzip -c backup_file.sql.gz | docker-compose exec -T postgres psql -U postgres crm_db

# Restart services
docker-compose start backend
```

## Monitoring & Logging

### Application Monitoring

```python
# Add to main.py for Prometheus metrics
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(...)
Instrumentator().instrument(app).expose(app)
```

### Health Checks

```bash
# Kubernetes health check
kubectl describe pod <pod-name>

# Docker health check
docker-compose ps
docker-compose logs backend
```

### Log Aggregation

```yaml
# docker-compose.yml logging configuration
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Performance Optimization

### Database Optimization

1. **Connection Pooling:**
```python
# Already configured in database.py
pool_size=5
max_overflow=10
pool_pre_ping=True
```

2. **Add Indexes:**
```sql
-- Already included in schema, verify with:
SELECT * FROM pg_indexes WHERE tablename IN ('leads', 'clients', 'invoices');
```

### Caching Strategy

```python
# Add Redis caching for frequently accessed data
import redis
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL)

# Cache example
def get_dashboard_stats_cached():
    cache_key = "dashboard:stats"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    stats = get_dashboard_stats()
    redis_client.setex(cache_key, 300, json.dumps(stats))  # 5 min TTL
    return stats
```

### Load Balancing

```nginx
# nginx.conf
upstream backend {
    least_conn;
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U postgres -d crm_db -c "SELECT 1;"
```

2. **Migration Errors:**
```bash
# Reset migrations (development only!)
docker-compose exec backend alembic downgrade base
docker-compose exec backend alembic upgrade head
```

3. **Permission Errors:**
```bash
# Reinitialize roles and permissions
docker-compose exec backend python /app/../scripts/init_database.py
```

## Scaling Recommendations

### Horizontal Scaling
- Run multiple backend instances behind load balancer
- Use session-less authentication (JWT)
- Store file uploads in object storage (S3, GCS)

### Vertical Scaling
- Increase container resources (CPU, Memory)
- Optimize database queries
- Add database read replicas

### Auto-scaling (Kubernetes)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crm-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: crm-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Support & Maintenance

### Regular Maintenance Tasks

- [ ] Weekly: Review logs for errors
- [ ] Weekly: Check disk space
- [ ] Monthly: Review and optimize slow queries
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Quarterly: Performance review

### Update Procedure

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build

# Run migrations
docker-compose exec backend alembic upgrade head

# Restart services
docker-compose up -d
