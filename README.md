# CRM Portal - Production-Ready System

A comprehensive CRM portal built with Next.js 16, TypeScript, and FastAPI (Python) backend, featuring complete authentication, RBAC, and seven core business modules.

## Features

### Core Modules
1. **Authentication & RBAC** - JWT-based auth with role-based permissions
2. **Lead & Sales Pipeline** - Lead management with conversion tracking
3. **Client & Project Management** - Full lifecycle project tracking
4. **Task & Timesheet Tracking** - Time logging and approval workflows
5. **Support Ticket System** - Multi-channel ticket management with SLA
6. **Billing & Invoicing** - Invoice generation and payment tracking
7. **Reports & Dashboards** - Real-time analytics and KPI dashboards

### Technology Stack

**Frontend:**
- Next.js 16 with App Router
- React 19.2 with TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Modern design system

**Backend:**
- FastAPI 0.104+ (Python 3.11+)
- PostgreSQL 15+ with SQLAlchemy 2.0
- JWT Authentication (python-jose)
- Redis for caching
- Bcrypt for password hashing

**DevOps:**
- Docker & Docker Compose
- PostgreSQL & Redis containers
- Health checks and auto-restart

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Python 3.11+ (if running backend without Docker)

### Frontend (Next.js)

1. **Install dependencies and run:**
```bash
npm install
npm run dev
```

2. **Set environment variable:**
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Login page: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard

### Backend (FastAPI)

1. **Start all services:**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- FastAPI backend on port 8000

2. **Initialize database:**
```bash
# Wait for services to be healthy (check with docker-compose ps)
docker-compose exec backend python scripts/init_db.py

# Optional: Seed with sample data
docker-compose exec backend python scripts/seed_sample_data.py
```

3. **Access the API:**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Project Structure

### Frontend
```
app/
├── page.tsx                    # Landing page
├── login/page.tsx             # Login page
├── register/page.tsx          # Registration page
└── dashboard/
    ├── page.tsx              # Main dashboard
    ├── leads/page.tsx        # Lead management
    ├── clients/page.tsx      # Client management
    ├── projects/page.tsx     # Project tracking
    ├── tasks/page.tsx        # Task management
    ├── tickets/page.tsx      # Support tickets
    ├── invoices/page.tsx     # Billing & invoicing
    └── settings/page.tsx     # User settings

components/
├── dashboard-layout.tsx       # Main dashboard layout
└── ui/                        # shadcn/ui components

hooks/
├── use-auth.tsx              # Authentication context
└── use-toast.ts              # Toast notifications

lib/
├── api-client.ts             # Backend API client
└── utils.ts                  # Utility functions
```

### Backend
```
backend/
├── app/
│   ├── api/
│   │   ├── dependencies.py    # Auth dependencies
│   │   └── routes/
│   │       ├── auth.py        # Authentication endpoints
│   │       ├── leads.py       # Lead management
│   │       ├── clients.py     # Client management
│   │       ├── projects.py    # Project management
│   │       ├── tasks.py       # Task tracking
│   │       ├── tickets.py     # Support tickets
│   │       ├── invoices.py    # Billing
│   │       └── reports.py     # Analytics
│   ├── core/
│   │   ├── config.py          # App configuration
│   │   ├── database.py        # DB connection
│   │   └── security.py        # JWT & password hashing
│   ├── models/                # SQLAlchemy ORM models
│   ├── schemas/               # Pydantic validation schemas
│   └── main.py                # FastAPI application
├── scripts/
│   ├── init_db.py            # Database initialization
│   └── seed_sample_data.py   # Sample data seeding
├── Dockerfile
├── requirements.txt
└── .env.example
```

## API Documentation

### Authentication

**Register:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SecurePass123!"
```

**Get Current User:**
```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer <your_access_token>"
```

### API Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/api/v1/auth/*` | Registration, login, token refresh |
| Leads | `/api/v1/leads/*` | Lead CRUD, conversion, pipeline |
| Clients | `/api/v1/clients/*` | Client management, history |
| Projects | `/api/v1/projects/*` | Project tracking, milestones |
| Tasks | `/api/v1/tasks/*` | Task management, time tracking |
| Tickets | `/api/v1/tickets/*` | Support tickets, comments |
| Invoices | `/api/v1/invoices/*` | Invoice generation, payments |
| Reports | `/api/v1/reports/*` | Dashboard stats, analytics |

See complete API documentation at http://localhost:8000/docs

### User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full system access, user management |
| **manager** | Team management, reporting access |
| **sales** | Lead and client management (default) |
| **support** | Ticket management, client communication |
| **finance** | Billing, invoicing, financial reports |

## Features by Module

### 1. Dashboard
- Real-time KPI metrics (leads, revenue, projects)
- Recent activity feed
- Upcoming tasks and deadlines
- Sales pipeline visualization

### 2. Lead Management
- Multi-stage sales pipeline (new, contacted, qualified, proposal, negotiation)
- Lead source tracking
- Conversion to client
- Estimated value tracking
- Notes and activity history

### 3. Client Management
- Complete client profiles
- Contact information
- Project history
- Revenue tracking
- Status management (active/inactive)

### 4. Project Management
- Project lifecycle tracking (planning, in progress, completed)
- Budget and timeline management
- Progress monitoring
- Team assignments
- Client association

### 5. Task Management
- Task creation and assignment
- Priority levels (high, medium, low)
- Due date tracking
- Time logging
- Project association

### 6. Support Tickets
- Ticket creation and tracking
- Priority and status management
- Client association
- Assignment workflow
- Comments and updates
- SLA tracking

### 7. Billing & Invoicing
- Invoice generation with line items
- Payment status tracking
- Due date management
- Overdue notifications
- Client billing history

## Development

### Running in Development Mode

**Frontend:**
```bash
npm run dev
```

**Backend (without Docker):**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Code Quality

**Frontend:**
```bash
npm run lint
npm run type-check
```

**Backend:**
```bash
cd backend
black app/
flake8 app/
mypy app/
pytest tests/
```

## Deployment

### Frontend (Vercel)

The project is optimized for Vercel deployment:

```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Backend (Docker)

Build and run production container:

```bash
docker build -t crm-backend ./backend
docker run -p 8000:8000 --env-file .env crm-backend
```

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed production setup.

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend (backend/.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm_db
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["http://localhost:3000"]
```

See `.env.example` files for complete configuration options.

## Documentation

- [Quick Start Guide](docs/QUICK_START.md) - Get started in 5 minutes
- [System Architecture](docs/ARCHITECTURE.md) - High-level design
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete ERD
- [API Reference](docs/API_REFERENCE.md) - Endpoint documentation
- [Security Practices](docs/SECURITY_PRACTICES.md) - Security guidelines
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment
- [Frontend Setup](docs/FRONTEND_SETUP.md) - Frontend details

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- SQL injection protection (SQLAlchemy ORM)
- CORS configuration
- Input validation (Pydantic)
- Secure password requirements

## Tech Stack Details

### Frontend Libraries
- React 19.2 with Server Components
- Next.js 16 App Router
- TypeScript 5+
- Tailwind CSS v4
- shadcn/ui components
- Lucide React icons
- SWR for data fetching

### Backend Libraries
- FastAPI 0.104+
- SQLAlchemy 2.0 ORM
- Pydantic v2 validation
- python-jose for JWT
- passlib with bcrypt
- psycopg2 PostgreSQL driver
- python-multipart for file uploads

## Testing

### Run Tests
```bash
# Frontend
npm test

# Backend
cd backend
pytest tests/ -v --cov=app
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Restart services
docker-compose restart

# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend API errors
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check backend is running on port 8000
- Verify CORS settings in backend

### Database connection issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in backend `.env`
- Verify database credentials

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - free to use for commercial and personal projects.

## Support

- Documentation: [/docs](docs/)
- API Docs: http://localhost:8000/docs
- Issues: GitHub Issues
# stellaris-crm
