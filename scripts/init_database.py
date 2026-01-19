"""
Initialize database with default roles and permissions.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import Role, Permission, RolePermission
from app.core.database import Base
import uuid

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Create all tables
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✓ Tables created successfully")

# Create session
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Check if roles already exist
    existing_roles = db.query(Role).count()
    if existing_roles > 0:
        print("✓ Roles already exist, skipping initialization")
        sys.exit(0)
    
    # Create roles
    print("\nCreating default roles...")
    roles_data = [
        {"name": "admin", "description": "Full system access"},
        {"name": "manager", "description": "Team and pipeline management"},
        {"name": "sales", "description": "Lead and client management"},
        {"name": "support", "description": "Ticket management"},
        {"name": "finance", "description": "Billing and invoicing"},
    ]
    
    roles = {}
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        db.flush()
        roles[role_data["name"]] = role
        print(f"  ✓ Created role: {role_data['name']}")
    
    # Create permissions
    print("\nCreating permissions...")
    resources = ["leads", "clients", "projects", "tasks", "tickets", "invoices", "users", "reports"]
    actions = ["create", "read", "update", "delete"]
    
    permissions = {}
    for resource in resources:
        for action in actions:
            perm = Permission(
                resource=resource,
                action=action,
                description=f"{action.capitalize()} {resource}"
            )
            db.add(perm)
            db.flush()
            permissions[f"{resource}:{action}"] = perm
            print(f"  ✓ Created permission: {resource}:{action}")
    
    # Assign permissions to roles
    print("\nAssigning permissions to roles...")
    
    # Admin - all permissions
    for perm in permissions.values():
        db.add(RolePermission(role_id=roles["admin"].id, permission_id=perm.id))
    print("  ✓ Admin: all permissions")
    
    # Manager - most permissions except user management
    manager_resources = ["leads", "clients", "projects", "tasks", "tickets", "reports"]
    for resource in manager_resources:
        for action in actions:
            key = f"{resource}:{action}"
            if key in permissions:
                db.add(RolePermission(role_id=roles["manager"].id, permission_id=permissions[key].id))
    print("  ✓ Manager: lead, client, project, task, ticket, report permissions")
    
    # Sales - leads, clients, projects (no delete)
    sales_perms = [
        "leads:create", "leads:read", "leads:update",
        "clients:create", "clients:read", "clients:update",
        "projects:read", "reports:read"
    ]
    for perm_key in sales_perms:
        if perm_key in permissions:
            db.add(RolePermission(role_id=roles["sales"].id, permission_id=permissions[perm_key].id))
    print("  ✓ Sales: lead and client permissions")
    
    # Support - tickets and clients (read-only clients)
    support_perms = [
        "tickets:create", "tickets:read", "tickets:update", "tickets:delete",
        "clients:read", "projects:read"
    ]
    for perm_key in support_perms:
        if perm_key in permissions:
            db.add(RolePermission(role_id=roles["support"].id, permission_id=permissions[perm_key].id))
    print("  ✓ Support: ticket permissions")
    
    # Finance - invoices, clients, projects
    finance_perms = [
        "invoices:create", "invoices:read", "invoices:update", "invoices:delete",
        "clients:read", "projects:read", "reports:read"
    ]
    for perm_key in finance_perms:
        if perm_key in permissions:
            db.add(RolePermission(role_id=roles["finance"].id, permission_id=permissions[perm_key].id))
    print("  ✓ Finance: invoice permissions")
    
    # Commit all changes
    db.commit()
    print("\n✓ Database initialized successfully!")
    print("\nDefault roles created:")
    print("  - admin: Full system access")
    print("  - manager: Team and pipeline management")
    print("  - sales: Lead and client management")
    print("  - support: Ticket management")
    print("  - finance: Billing and invoicing")
    
except Exception as e:
    print(f"\n✗ Error initializing database: {e}")
    db.rollback()
    sys.exit(1)
finally:
    db.close()
