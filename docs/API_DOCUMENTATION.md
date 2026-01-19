# CRM Portal API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a JWT access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Expiration
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Errors:**
- `400`: Email already registered
- `500`: Default role not found

---

### POST /auth/login
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "role": {
      "id": "456e7890-e89b-12d3-a456-426614174000",
      "name": "sales",
      "description": "Lead and client management"
    },
    "is_active": true,
    "is_verified": false,
    "last_login_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-01T09:00:00Z"
  }
}
```

**Errors:**
- `401`: Incorrect email or password
- `403`: User account is inactive

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": { ... }
}
```

**Errors:**
- `401`: Invalid refresh token

---

### POST /auth/logout
Logout user by revoking refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /auth/me
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "role": {
    "id": "456e7890-e89b-12d3-a456-426614174000",
    "name": "sales",
    "description": "Lead and client management"
  },
  "is_active": true,
  "is_verified": false,
  "last_login_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-01T09:00:00Z"
}
```

---

## Role-Based Access Control (RBAC)

### Default Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full system access - all CRUD operations on all resources |
| **manager** | Lead, client, project, task, ticket, report management |
| **sales** | Lead and client management (no delete), project read-only |
| **support** | Full ticket management, client/project read-only |
| **finance** | Invoice management, client/project read-only |

### Permission Format
Permissions follow the pattern: `resource:action`

**Resources:** leads, clients, projects, tasks, tickets, invoices, users, reports
**Actions:** create, read, update, delete

**Examples:**
- `leads:create` - Create new leads
- `clients:read` - View client information
- `invoices:update` - Update invoices
- `users:delete` - Delete users (admin only)

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "detail": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Could not validate credentials"
}
```

**403 Forbidden:**
```json
{
  "detail": "User must have one of these roles: admin, manager"
}
```

**404 Not Found:**
```json
{
  "detail": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```

---

## Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

Use these interfaces to test API endpoints directly in your browser.
