# API Reference

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}

Response: 200 OK
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "user"
}
```

### Login
```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass123!

Response: 200 OK
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

## Leads

### List Leads
```http
GET /leads?skip=0&limit=100&stage=qualified

Response: 200 OK
{
  "items": [...],
  "total": 50,
  "skip": 0,
  "limit": 100
}
```

### Create Lead
```http
POST /leads
Authorization: Bearer <token>

{
  "company_name": "Acme Corp",
  "contact_name": "John Smith",
  "email": "john@acme.com",
  "phone": "+1-555-0123",
  "stage": "new",
  "source": "website",
  "estimated_value": 50000,
  "notes": "Interested in Enterprise plan"
}

Response: 201 Created
```

### Update Lead
```http
PUT /leads/{lead_id}
Authorization: Bearer <token>

{
  "stage": "qualified",
  "notes": "Qualified lead, ready for proposal"
}

Response: 200 OK
```

### Convert Lead to Client
```http
POST /leads/{lead_id}/convert
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Lead converted successfully",
  "client_id": 42
}
```

## Clients

### List Clients
```http
GET /clients?skip=0&limit=100

Response: 200 OK
```

### Get Client
```http
GET /clients/{client_id}

Response: 200 OK
{
  "id": 1,
  "company_name": "Acme Corp",
  "contact_name": "John Smith",
  "email": "john@acme.com",
  "projects": [...]
}
```

## Projects

### List Projects
```http
GET /projects?client_id=1&status=in_progress

Response: 200 OK
```

### Create Project
```http
POST /projects
Authorization: Bearer <token>

{
  "name": "Website Redesign",
  "client_id": 1,
  "status": "planning",
  "start_date": "2026-02-01",
  "end_date": "2026-04-30",
  "budget": 50000
}

Response: 201 Created
```

## Tasks

### List Tasks
```http
GET /tasks?project_id=1&assigned_to=2&status=in_progress

Response: 200 OK
```

### Create Task
```http
POST /tasks
Authorization: Bearer <token>

{
  "title": "Design homepage mockup",
  "description": "Create initial design concepts",
  "project_id": 1,
  "assigned_to": 2,
  "priority": "high",
  "due_date": "2026-02-15"
}

Response: 201 Created
```

## Tickets

### List Tickets
```http
GET /tickets?status=open&priority=high

Response: 200 OK
```

### Create Ticket
```http
POST /tickets
Authorization: Bearer <token>

{
  "subject": "Login issue",
  "description": "Cannot access dashboard",
  "client_id": 1,
  "priority": "high",
  "category": "technical"
}

Response: 201 Created
```

### Add Comment
```http
POST /tickets/{ticket_id}/comments

{
  "content": "We've identified the issue and working on a fix"
}

Response: 201 Created
```

## Invoices

### List Invoices
```http
GET /invoices?client_id=1&status=pending

Response: 200 OK
```

### Create Invoice
```http
POST /invoices
Authorization: Bearer <token>

{
  "client_id": 1,
  "due_date": "2026-02-15",
  "items": [
    {
      "description": "Website Development",
      "quantity": 1,
      "unit_price": 50000
    }
  ],
  "notes": "Payment terms: Net 30"
}

Response: 201 Created
```

## Reports

### Dashboard Stats
```http
GET /reports/dashboard

Response: 200 OK
{
  "leads": {
    "total": 150,
    "by_stage": {...},
    "conversion_rate": 0.35
  },
  "revenue": {
    "total": 500000,
    "this_month": 125000
  },
  "projects": {
    "active": 12,
    "completed": 45
  }
}
```

### Sales Report
```http
GET /reports/sales?start_date=2026-01-01&end_date=2026-01-31

Response: 200 OK
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid input data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## Rate Limiting

Production API implements rate limiting:
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Admin: 5000 requests/hour

## Pagination

List endpoints support pagination:
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100, max: 1000)

## Filtering

Most list endpoints support filtering via query parameters:
- `status`: Filter by status
- `priority`: Filter by priority  
- `created_after`: Filter by creation date
- `assigned_to`: Filter by assignee

## Sorting

Use `sort` parameter:
- `sort=created_at` - Ascending
- `sort=-created_at` - Descending
