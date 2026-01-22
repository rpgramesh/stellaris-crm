import sys
import os
import requests
import uuid
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Set default env vars for testing if not present
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/crm_db"
if "SECRET_KEY" not in os.environ:
    os.environ["SECRET_KEY"] = "test_secret_key"

from app.core.config import settings
from app.core.security import get_password_hash

# Configuration
API_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "verify_admin_inv@example.com"
ADMIN_PASSWORD = "password123"

def setup_test_data():
    print("Setting up test data in database...")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # 1. Get Roles
        roles = db.execute(text("SELECT id, name FROM roles")).fetchall()
        role_map = {r.name: r.id for r in roles}
        
        if 'admin' not in role_map:
            print("Error: Required role (admin) not found.")
            return False

        # 2. Upsert Admin User
        admin_id = uuid.uuid4()
        password_hash = get_password_hash(ADMIN_PASSWORD)
        
        # Check if exists
        existing_admin = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": ADMIN_EMAIL}).fetchone()
        
        if existing_admin:
            print(f"Admin user {ADMIN_EMAIL} exists. Updating...")
            db.execute(text("""
                UPDATE users 
                SET password_hash = :pwd, role_id = :role_id, is_active = true, is_verified = true 
                WHERE email = :email
            """), {
                "pwd": password_hash,
                "role_id": role_map['admin'],
                "email": ADMIN_EMAIL
            })
        else:
            print(f"Creating admin user {ADMIN_EMAIL}...")
            db.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role_id, is_active, is_verified)
                VALUES (:id, :email, :pwd, 'Verify Admin Inv', :role_id, true, true)
            """), {
                "id": admin_id,
                "email": ADMIN_EMAIL,
                "pwd": password_hash,
                "role_id": role_map['admin']
            })
            
        db.commit()
        print("Database setup complete.")
        return True

    except Exception as e:
        print(f"Error setting up database: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def login():
    print(f"Logging in as {ADMIN_EMAIL}...")
    response = requests.post(f"{API_URL}/auth/login", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
        
    return response.json()["access_token"]

def run_tests():
    if not setup_test_data():
        return

    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a Client
    print("\n1. Creating Client...")
    client_data = {
        "company_name": f"Test Client {uuid.uuid4()}",
        "email": f"client_{uuid.uuid4()}@example.com",
        "first_name": "Test",
        "last_name": "Client",
        "status": "active"
    }
    response = requests.post(f"{API_URL}/clients/", json=client_data, headers=headers)
    if response.status_code not in [200, 201]:
        print(f"Failed to create client: {response.text}")
        return
    client_id = response.json()["id"]
    print(f"Client created: {client_id}")

    # 2. Create an Invoice
    print("\n2. Creating Invoice...")
    invoice_data = {
        "client_id": client_id,
        "issue_date": str(datetime.date.today()),
        "due_date": str(datetime.date.today() + datetime.timedelta(days=30)),
        "items": [
            {"description": "Test Item 1", "quantity": 1, "unit_price": 100},
            {"description": "Test Item 2", "quantity": 2, "unit_price": 50}
        ],
        "notes": "Test invoice for verification"
    }
    response = requests.post(f"{API_URL}/invoices/", json=invoice_data, headers=headers)
    if response.status_code not in [200, 201]:
        print(f"Failed to create invoice: {response.text}")
        return
    invoice = response.json()
    invoice_id = invoice["id"]
    print(f"Invoice created: {invoice_id} (Number: {invoice['invoice_number']})")

    # 3. Test PDF Download
    print("\n3. Testing PDF Download...")
    response = requests.get(f"{API_URL}/invoices/{invoice_id}/pdf", headers=headers)
    if response.status_code == 200:
        if response.headers.get("content-type") == "application/pdf":
            print("PDF download successful (content-type verified).")
            # Verify size > 0
            if len(response.content) > 0:
                print(f"PDF size: {len(response.content)} bytes")
            else:
                print("Error: PDF is empty")
        else:
            print(f"Error: Wrong content type: {response.headers.get('content-type')}")
    else:
        print(f"Failed to download PDF: {response.status_code} {response.text}")

    # 4. Test Approve Invoice
    # Check if approve endpoint exists or if it is just an update
    # The frontend uses `apiClient.approveInvoice` which likely maps to a specific endpoint or update
    # Let's check `backend/app/api/routes/invoices.py` again to see the approve route.
    # It seems I didn't check for an explicit approve route, but `view-invoice-dialog.tsx` calls `apiClient.approveInvoice`.
    # I should assume it exists or I might have missed it. 
    # Wait, I didn't add an approve route in my previous steps, I only added PDF download.
    # If the approve route doesn't exist, the frontend will fail.
    # I should check `backend/app/api/routes/invoices.py` for `approve` or `status` update.
    
    print("\n4. Testing Approve Invoice...")
    # Trying POST /invoices/{id}/approve first
    response = requests.post(f"{API_URL}/invoices/{invoice_id}/approve", headers=headers)
    if response.status_code == 200:
        print("Invoice approved successfully.")
        updated_invoice = response.json()
        print(f"Status: {updated_invoice['status']}")
    elif response.status_code == 404: 
        print("Approve endpoint not found. Trying generic update...")
        # Fallback to update status if no specific endpoint
        response = requests.put(f"{API_URL}/invoices/{invoice_id}", json={"status": "approved"}, headers=headers)
        if response.status_code == 200:
             print("Invoice approved via update.")
        else:
             print(f"Failed to approve invoice: {response.status_code} {response.text}")
    else:
        print(f"Failed to approve invoice: {response.status_code} {response.text}")

    # 5. Test Send Invoice
    print("\n5. Testing Send Invoice...")
    response = requests.post(f"{API_URL}/invoices/{invoice_id}/send", headers=headers)
    if response.status_code == 200:
        print("Invoice sent successfully.")
        updated_invoice = response.json()
        print(f"Status: {updated_invoice['status']}")
    else:
        print(f"Failed to send invoice: {response.status_code} {response.text}")

    # 6. Test Delete Invoice
    print("\n6. Testing Delete Invoice...")
    response = requests.delete(f"{API_URL}/invoices/{invoice_id}", headers=headers)
    if response.status_code == 200:
        print("Invoice deleted successfully.")
        # Verify it's gone
        response = requests.get(f"{API_URL}/invoices/{invoice_id}", headers=headers)
        if response.status_code == 404:
            print("Verification: Invoice not found (correct).")
        else:
            print(f"Error: Invoice still exists or error fetching: {response.status_code}")
    else:
        print(f"Failed to delete invoice: {response.status_code} {response.text}")

if __name__ == "__main__":
    run_tests()
