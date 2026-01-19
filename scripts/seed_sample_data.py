"""
Seed database with sample data for testing.
"""
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.models.lead import Lead
from app.models.client import Client, Project

# Create engine and session
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("Seeding sample data...")
    
    # Get roles
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    sales_role = db.query(Role).filter(Role.name == "sales").first()
    manager_role = db.query(Role).filter(Role.name == "manager").first()
    
    # Create sample users
    print("\nCreating sample users...")
    users = []
    
    # Admin user
    admin_user = User(
        email="admin@crm.com",
        password_hash=get_password_hash("admin123"),
        full_name="Admin User",
        phone="+1234567890",
        role_id=admin_role.id,
        is_active=True,
        is_verified=True
    )
    db.add(admin_user)
    users.append(admin_user)
    print("  ✓ Created admin user (admin@crm.com / admin123)")
    
    # Sales users
    sales_user1 = User(
        email="john.sales@crm.com",
        password_hash=get_password_hash("sales123"),
        full_name="John Sales",
        phone="+1234567891",
        role_id=sales_role.id,
        is_active=True,
        is_verified=True
    )
    db.add(sales_user1)
    users.append(sales_user1)
    
    sales_user2 = User(
        email="jane.sales@crm.com",
        password_hash=get_password_hash("sales123"),
        full_name="Jane Sales",
        phone="+1234567892",
        role_id=sales_role.id,
        is_active=True,
        is_verified=True
    )
    db.add(sales_user2)
    users.append(sales_user2)
    print("  ✓ Created 2 sales users")
    
    # Manager user
    manager_user = User(
        email="manager@crm.com",
        password_hash=get_password_hash("manager123"),
        full_name="Sales Manager",
        phone="+1234567893",
        role_id=manager_role.id,
        is_active=True,
        is_verified=True
    )
    db.add(manager_user)
    users.append(manager_user)
    print("  ✓ Created manager user (manager@crm.com / manager123)")
    
    db.flush()
    
    # Create sample leads
    print("\nCreating sample leads...")
    leads_data = [
        {
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice@techcorp.com",
            "phone": "+1555000001",
            "company": "TechCorp Inc",
            "job_title": "CTO",
            "source": "website",
            "status": "qualified",
            "stage": "proposal",
            "score": 85,
            "estimated_value": Decimal("50000.00"),
            "expected_close_date": datetime.now().date() + timedelta(days=30),
            "assigned_to": sales_user1.id,
            "notes": "Very interested in enterprise plan"
        },
        {
            "first_name": "Bob",
            "last_name": "Smith",
            "email": "bob@startup.io",
            "phone": "+1555000002",
            "company": "Startup.io",
            "job_title": "Founder",
            "source": "referral",
            "status": "contacted",
            "stage": "qualified",
            "score": 70,
            "estimated_value": Decimal("25000.00"),
            "expected_close_date": datetime.now().date() + timedelta(days=45),
            "assigned_to": sales_user2.id,
            "notes": "Referred by existing client"
        },
        {
            "first_name": "Carol",
            "last_name": "White",
            "email": "carol@enterprise.com",
            "phone": "+1555000003",
            "company": "Enterprise Solutions",
            "job_title": "VP of Operations",
            "source": "cold_call",
            "status": "new",
            "stage": "prospect",
            "score": 45,
            "estimated_value": Decimal("75000.00"),
            "expected_close_date": datetime.now().date() + timedelta(days=60),
            "assigned_to": sales_user1.id,
            "notes": "Initial contact made"
        },
        {
            "first_name": "David",
            "last_name": "Brown",
            "email": "david@innovative.com",
            "phone": "+1555000004",
            "company": "Innovative Labs",
            "job_title": "CEO",
            "source": "website",
            "status": "qualified",
            "stage": "negotiation",
            "score": 90,
            "estimated_value": Decimal("100000.00"),
            "expected_close_date": datetime.now().date() + timedelta(days=15),
            "assigned_to": sales_user2.id,
            "notes": "Ready to close, negotiating terms"
        },
        {
            "first_name": "Eve",
            "last_name": "Martinez",
            "email": "eve@digitalagency.com",
            "phone": "+1555000005",
            "company": "Digital Agency Co",
            "job_title": "Marketing Director",
            "source": "referral",
            "status": "new",
            "stage": "prospect",
            "score": 55,
            "estimated_value": Decimal("30000.00"),
            "expected_close_date": datetime.now().date() + timedelta(days=50),
            "assigned_to": sales_user1.id,
            "notes": "Interested in marketing automation features"
        }
    ]
    
    for lead_data in leads_data:
        lead = Lead(**lead_data)
        db.add(lead)
    
    print(f"  ✓ Created {len(leads_data)} sample leads")
    
    # Create sample clients
    print("\nCreating sample clients...")
    clients_data = [
        {
            "company_name": "Acme Corporation",
            "industry": "Technology",
            "website": "https://acme.com",
            "primary_contact_name": "Frank Wilson",
            "primary_contact_email": "frank@acme.com",
            "primary_contact_phone": "+1555000010",
            "account_manager_id": sales_user1.id,
            "status": "active",
            "payment_terms": "net_30"
        },
        {
            "company_name": "Global Enterprises",
            "industry": "Finance",
            "website": "https://globalent.com",
            "primary_contact_name": "Grace Lee",
            "primary_contact_email": "grace@globalent.com",
            "primary_contact_phone": "+1555000011",
            "account_manager_id": sales_user2.id,
            "status": "active",
            "payment_terms": "net_60"
        }
    ]
    
    clients = []
    for client_data in clients_data:
        client = Client(**client_data)
        db.add(client)
        db.flush()
        clients.append(client)
    
    print(f"  ✓ Created {len(clients_data)} sample clients")
    
    # Create sample projects
    print("\nCreating sample projects...")
    projects_data = [
        {
            "client_id": clients[0].id,
            "name": "CRM Implementation",
            "description": "Full CRM system implementation and training",
            "status": "in_progress",
            "priority": "high",
            "start_date": datetime.now().date(),
            "end_date": datetime.now().date() + timedelta(days=90),
            "budget": Decimal("50000.00"),
            "actual_cost": Decimal("15000.00"),
            "project_manager_id": manager_user.id
        },
        {
            "client_id": clients[1].id,
            "name": "Custom Integration",
            "description": "Custom API integration with existing systems",
            "status": "planning",
            "priority": "medium",
            "start_date": datetime.now().date() + timedelta(days=30),
            "end_date": datetime.now().date() + timedelta(days=120),
            "budget": Decimal("75000.00"),
            "actual_cost": Decimal("0.00"),
            "project_manager_id": manager_user.id
        }
    ]
    
    for project_data in projects_data:
        project = Project(**project_data)
        db.add(project)
    
    print(f"  ✓ Created {len(projects_data)} sample projects")
    
    # Commit all changes
    db.commit()
    
    print("\n✓ Sample data seeded successfully!")
    print("\nSample Login Credentials:")
    print("  Admin:   admin@crm.com / admin123")
    print("  Manager: manager@crm.com / manager123")
    print("  Sales:   john.sales@crm.com / sales123")
    print("  Sales:   jane.sales@crm.com / sales123")
    
except Exception as e:
    print(f"\n✗ Error seeding data: {e}")
    db.rollback()
    sys.exit(1)
finally:
    db.close()
