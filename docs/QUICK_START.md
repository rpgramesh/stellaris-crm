# Quick Start Guide

Get your CRM portal up and running in 5 minutes.

## Prerequisites Check

Before starting, verify you have:

```bash
node --version    # Should be 20+
python --version  # Should be 3.11+
docker --version  # Optional, for containerized setup
```

## 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd crm-portal

# Copy environment files
cp backend/.env.example backend/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
```

## 2. Start with Docker (Easiest)

```bash
# Start all services (PostgreSQL, Redis, Backend)
docker-compose up -d

# Wait for services to be healthy (30 seconds)
docker-compose ps

# Initialize database with tables
docker-compose exec backend python scripts/init_db.py

# Seed with sample data (optional)
docker-compose exec backend python scripts/seed_sample_data.py

# Install frontend dependencies
npm install

# Start frontend
npm run dev
```

## 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 4. Login

Use these default credentials:

**Admin Account:**
- Email: `admin@crm.com`
- Password: `admin123`

## 5. Explore

### Dashboard
View real-time business metrics and recent activities at `/dashboard`

### Leads
Add and manage leads through the sales pipeline at `/dashboard/leads`

### Clients
Track client relationships and project history at `/dashboard/clients`

### Projects
Manage ongoing projects and deliverables at `/dashboard/projects`

### API
Explore the interactive API documentation at http://localhost:8000/docs

## Next Steps

1. **Customize Settings**: Update user profile and preferences
2. **Add Real Data**: Start adding your actual leads and clients
3. **Configure**: Review backend `.env` for email and integrations
4. **Deploy**: Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for production

## Troubleshooting

### Backend won't start
```bash
# Check database connection
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend API errors
```bash
# Verify backend is running
curl http://localhost:8000/api/v1/health

# Check environment variable
cat .env.local
```

### Port conflicts
```bash
# Stop conflicting services
docker-compose down

# Use different ports in docker-compose.yml
# Edit ports section for each service
```

## Manual Setup (Without Docker)

If you prefer not to use Docker:

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Edit .env with your PostgreSQL credentials
python scripts/init_db.py
uvicorn app.main:app --reload
```

### Frontend
```bash
npm install
npm run dev
```

## Getting Help

- Check [README.md](../README.md) for detailed setup
- Review [API_REFERENCE.md](API_REFERENCE.md) for API usage
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
