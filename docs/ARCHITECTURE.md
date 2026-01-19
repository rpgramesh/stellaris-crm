# CRM Portal System Architecture

## Overview
Production-ready CRM system built with FastAPI backend and React TypeScript frontend, designed for scalability, security, and maintainability.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │   API Docs   │      │
│  │ (React/TS)   │  │  (Future)    │  │  (Swagger)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer             │
│                         (Nginx/Traefik)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           FastAPI Application (Python 3.11+)         │  │
│  │                                                       │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │  │
│  │  │  Auth   │  │ Leads   │  │ Clients │  │ Tasks  │ │  │
│  │  │ Service │  │ Service │  │ Service │  │Service │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘ │  │
│  │                                                       │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │  │
│  │  │ Support │  │ Billing │  │ Reports │             │  │
│  │  │ Service │  │ Service │  │ Service │             │  │
│  │  └─────────┘  └─────────┘  └─────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   S3/Blob    │      │
│  │   Database   │  │    Cache     │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy 2.0+
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt/passlib
- **CORS**: FastAPI CORS middleware

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Query + Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios/Fetch

### Database
- **Primary Database**: PostgreSQL 15+
- **Caching**: Redis 7+
- **Full-text Search**: PostgreSQL tsvector

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Cloud**: AWS/GCP/Azure compatible

## Module Architecture

### 1. Authentication & RBAC
- JWT-based authentication
- Role-Based Access Control (Admin, Manager, Sales, Support)
- Permission-based authorization
- Password reset & email verification
- Session management

### 2. Lead & Sales Pipeline
- Lead capture & qualification
- Pipeline stages (Prospect → Qualified → Proposal → Negotiation → Closed)
- Lead assignment & routing
- Activity tracking
- Conversion analytics

### 3. Client & Project Management
- Client profiles & history
- Project lifecycle management
- Milestone tracking
- Document management
- Client communication log

### 4. Task & Timesheet Tracking
- Task assignment & prioritization
- Time logging & approval workflow
- Resource allocation
- Workload analytics
- Calendar integration

### 5. Support Ticket System
- Multi-channel ticket creation
- Priority & SLA management
- Ticket assignment & escalation
- Knowledge base integration
- Customer satisfaction surveys

### 6. Billing & Invoicing
- Invoice generation & templates
- Payment tracking
- Recurring billing
- Tax calculation
- Financial reporting

### 7. Reports & Dashboards
- Real-time KPI dashboards
- Custom report builder
- Export functionality (PDF, Excel)
- Scheduled reports
- Data visualization

## Security Architecture

### Authentication Flow
```
1. User submits credentials → API
2. API validates against PostgreSQL
3. Generate JWT with user claims & roles
4. Return access token (15min) + refresh token (7days)
5. Client stores tokens (httpOnly cookies or secure storage)
6. Subsequent requests include access token in Authorization header
7. API validates token & extracts user context
8. Check permissions for requested resource
9. Execute operation or return 403 Forbidden
```

### Security Layers
1. **Transport Security**: TLS 1.3 for all communications
2. **Input Validation**: Pydantic models, SQL parameterization
3. **Output Encoding**: Prevent XSS attacks
4. **Rate Limiting**: Redis-based throttling
5. **CORS**: Whitelist approved origins
6. **SQL Injection Prevention**: SQLAlchemy ORM
7. **CSRF Protection**: Token-based validation
8. **Audit Logging**: All mutations logged with user context

## Data Architecture

### Database Design Principles
- Normalized schema (3NF) for transactional data
- Denormalized views for reporting
- Soft deletes for audit trail
- UUID primary keys for distributed systems
- Indexed foreign keys for performance
- JSONB columns for flexible metadata
- Row-level security (RLS) for multi-tenancy

### Caching Strategy
- **Redis Cache Layers**:
  - L1: User sessions & permissions (TTL: 15min)
  - L2: Frequently accessed entities (TTL: 5min)
  - L3: Dashboard aggregates (TTL: 1min)
  
### Backup & Recovery
- Automated daily PostgreSQL backups
- Point-in-time recovery (PITR)
- Cross-region replication
- Disaster recovery plan (RTO: 1hr, RPO: 15min)

## API Design

### RESTful Principles
- Resource-based URLs
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Consistent response format
- Pagination for list endpoints
- Filtering, sorting, and search
- HATEOAS for discoverability

### API Versioning
- URL versioning: `/api/v1/`, `/api/v2/`
- Backward compatibility for 2 major versions
- Deprecation warnings in response headers

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 150
  },
  "error": null
}
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers (12-factor app)
- Load balancing with health checks
- Database connection pooling
- Async task processing (Celery/RQ)

### Performance Optimization
- Database query optimization & indexing
- N+1 query prevention (eager loading)
- Redis caching for hot data
- CDN for static assets
- Lazy loading & pagination
- Background job processing

### Monitoring & Observability
- Application metrics (request rate, latency, errors)
- Database metrics (connections, query time)
- Business metrics (user signups, conversions)
- Distributed tracing (OpenTelemetry)
- Alert thresholds & on-call rotation

## Deployment Architecture

### Container Strategy
```
docker-compose.yml (Development)
├── app (FastAPI)
├── frontend (React/Nginx)
├── postgres
├── redis
└── nginx (reverse proxy)

Kubernetes (Production)
├── Deployment: API servers (3+ replicas)
├── Deployment: Frontend (2+ replicas)
├── StatefulSet: PostgreSQL (primary + replicas)
├── Deployment: Redis
├── Ingress: Load balancer
└── Secrets: Environment variables
```

### CI/CD Pipeline
```
1. Code push to GitHub
2. Run linters (black, flake8, eslint)
3. Run unit tests (pytest, jest)
4. Run integration tests
5. Build Docker images
6. Push to container registry
7. Deploy to staging (auto)
8. Run E2E tests (Playwright)
9. Manual approval for production
10. Blue-green deployment to production
11. Health checks & rollback if needed
```

### Environment Strategy
- **Development**: Docker Compose on local
- **Staging**: Kubernetes cluster (mirrors production)
- **Production**: Kubernetes with auto-scaling
- **Feature Branches**: Ephemeral preview environments

## Development Workflow

### Project Structure
```
crm-portal/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers
│   ├── alembic/          # Migrations
│   ├── tests/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API clients
│   │   ├── store/        # State management
│   │   └── utils/        # Helpers
│   └── public/
├── docker/
├── docs/
└── k8s/
```

### Code Quality
- Type hints (mypy) for Python
- TypeScript strict mode
- Unit test coverage >80%
- Integration tests for critical paths
- Code reviews required
- Automated security scanning

## Next Steps
1. Implement database schema and migrations
2. Build authentication system with RBAC
3. Develop core modules (leads, clients, tasks, etc.)
4. Create frontend components and pages
5. Implement reporting and dashboards
6. Add monitoring and logging
7. Deploy to staging environment
