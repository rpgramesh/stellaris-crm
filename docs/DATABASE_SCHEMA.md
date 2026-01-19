# CRM Portal Database Schema (ERD)

## Schema Overview

This document describes the complete PostgreSQL database schema for the CRM portal, including all tables, relationships, indexes, and constraints.

## Core Entities

### Users & Authentication

#### Table: users
Stores user accounts and authentication information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
```

**Relationships:**
- users.role_id → roles.id (Many-to-One)

---

#### Table: roles
Defines system roles (Admin, Manager, Sales, Support, etc.)

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Full system access'),
    ('manager', 'Team and pipeline management'),
    ('sales', 'Lead and client management'),
    ('support', 'Ticket management'),
    ('finance', 'Billing and invoicing');
```

---

#### Table: permissions
Granular permissions for resource access.

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,  -- e.g., 'leads', 'clients', 'invoices'
    action VARCHAR(50) NOT NULL,     -- e.g., 'create', 'read', 'update', 'delete'
    description TEXT,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
```

---

#### Table: role_permissions
Maps permissions to roles (Many-to-Many).

```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

---

#### Table: refresh_tokens
Stores refresh tokens for JWT authentication.

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
```

---

### Lead Management

#### Table: leads
Stores potential customer leads.

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    job_title VARCHAR(100),
    source VARCHAR(50),  -- e.g., 'website', 'referral', 'cold_call'
    status VARCHAR(50) DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    stage VARCHAR(50) DEFAULT 'prospect',  -- 'prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    score INTEGER DEFAULT 0,  -- Lead score (0-100)
    estimated_value DECIMAL(12, 2),
    expected_close_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}',  -- Flexible additional data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_metadata ON leads USING gin(metadata);
```

---

### Client Management

#### Table: clients
Stores converted customers.

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'inactive', 'churned'
    payment_terms VARCHAR(50),  -- 'net_30', 'net_60', etc.
    credit_limit DECIMAL(12, 2),
    tax_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_account_manager_id ON clients(account_manager_id);
CREATE INDEX idx_clients_status ON clients(status);
```

---

#### Table: projects
Client projects.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',  -- 'planning', 'in_progress', 'on_hold', 'completed', 'cancelled'
    priority VARCHAR(50) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'critical'
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2) DEFAULT 0,
    project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_project_manager_id ON projects(project_manager_id);
```

---

### Task Management

#### Table: tasks
Work items and to-dos.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',  -- 'todo', 'in_progress', 'review', 'completed', 'cancelled'
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2) DEFAULT 0,
    due_date DATE,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

#### Table: timesheets
Time tracking entries.

```sql
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    hours DECIMAL(5, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    billable BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX idx_timesheets_task_id ON timesheets(task_id);
CREATE INDEX idx_timesheets_project_id ON timesheets(project_id);
CREATE INDEX idx_timesheets_date ON timesheets(date);
CREATE INDEX idx_timesheets_status ON timesheets(status);
```

---

### Support System

#### Table: tickets
Customer support tickets.

```sql
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',  -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
    priority VARCHAR(50) DEFAULT 'medium',
    category VARCHAR(100),  -- 'bug', 'feature_request', 'question', 'incident'
    channel VARCHAR(50),  -- 'email', 'phone', 'chat', 'portal'
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_client_id ON tickets(client_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_sla_due_at ON tickets(sla_due_at);
```

---

#### Table: ticket_comments
Comments and updates on tickets.

```sql
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,  -- Internal notes vs customer-visible
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);
```

---

### Billing & Invoicing

#### Table: invoices
Customer invoices.

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',  -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

---

#### Table: invoice_items
Line items on invoices.

```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
```

---

#### Table: payments
Payment records.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),  -- 'credit_card', 'bank_transfer', 'check', 'cash'
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
```

---

### Activity & Audit

#### Table: activities
Activity log for leads, clients, projects, etc.

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,  -- 'lead', 'client', 'project', 'task', 'ticket'
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,  -- 'created', 'updated', 'status_changed', 'commented', etc.
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
```

---

#### Table: audit_logs
Comprehensive audit trail for compliance.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    changes JSONB,  -- Before/after values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

### Documents & Attachments

#### Table: documents
File attachments for various entities.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
```

---

## Entity Relationship Diagram (Textual)

```
users ──┬─── roles (Many-to-One)
        ├─── leads.assigned_to (One-to-Many)
        ├─── clients.account_manager_id (One-to-Many)
        ├─── projects.project_manager_id (One-to-Many)
        ├─── tasks.assigned_to (One-to-Many)
        ├─── timesheets.user_id (One-to-Many)
        └─── tickets.assigned_to (One-to-Many)

roles ──┬─── role_permissions (Many-to-Many with permissions)
        └─── users (One-to-Many)

leads ──┬─── clients (converted_to_client_id)
        └─── activities (One-to-Many)

clients ──┬─── projects (One-to-Many)
          ├─── invoices (One-to-Many)
          ├─── tickets (One-to-Many)
          └─── activities (One-to-Many)

projects ──┬─── tasks (One-to-Many)
           ├─── timesheets (One-to-Many)
           └─── invoices (One-to-Many)

tasks ──┬─── timesheets (One-to-Many)
        └─── activities (One-to-Many)

tickets ──┬─── ticket_comments (One-to-Many)
          └─── activities (One-to-Many)

invoices ──┬─── invoice_items (One-to-Many)
           └─── payments (One-to-Many)
```

## Database Views (for Reporting)

### View: lead_conversion_funnel
```sql
CREATE VIEW lead_conversion_funnel AS
SELECT 
    stage,
    COUNT(*) as count,
    AVG(estimated_value) as avg_value,
    SUM(estimated_value) as total_value
FROM leads
WHERE deleted_at IS NULL
GROUP BY stage
ORDER BY 
    CASE stage
        WHEN 'prospect' THEN 1
        WHEN 'qualified' THEN 2
        WHEN 'proposal' THEN 3
        WHEN 'negotiation' THEN 4
        WHEN 'closed_won' THEN 5
        WHEN 'closed_lost' THEN 6
    END;
```

### View: project_profitability
```sql
CREATE VIEW project_profitability AS
SELECT 
    p.id,
    p.name,
    p.budget,
    p.actual_cost,
    p.budget - p.actual_cost as profit,
    CASE 
        WHEN p.budget > 0 THEN ((p.budget - p.actual_cost) / p.budget * 100)
        ELSE 0 
    END as profit_margin,
    SUM(t.hours) as total_hours_logged
FROM projects p
LEFT JOIN timesheets t ON t.project_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.budget, p.actual_cost;
```

## Indexes Summary

All tables include indexes on:
- Primary keys (UUID)
- Foreign keys
- Status/state columns
- Date columns (for time-based queries)
- Email addresses (for lookups)
- JSONB columns (using GIN indexes)

## Constraints & Business Rules

1. **Soft Deletes**: All main entities use `deleted_at` for soft deletion
2. **Timestamps**: All tables have `created_at` and most have `updated_at`
3. **UUID Primary Keys**: For distributed system compatibility
4. **Cascading Deletes**: Properly configured to maintain referential integrity
5. **Check Constraints**: 
   - Email format validation
   - Positive monetary amounts
   - Valid status enumerations

## Migration Strategy

1. Use Alembic for version-controlled migrations
2. Always provide both `upgrade()` and `downgrade()` functions
3. Test migrations on staging before production
4. Backup database before major schema changes
5. Use online migration tools for zero-downtime deployments
