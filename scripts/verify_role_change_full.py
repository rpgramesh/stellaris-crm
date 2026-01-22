import sys
import os
import requests
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.config import settings
from app.core.security import get_password_hash

# Configuration
API_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "verify_admin@example.com"
ADMIN_PASSWORD = "password123"
TEST_USER_EMAIL = "verify_target@example.com"

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
                VALUES (:id, :email, :pwd, 'Verify Admin', :role_id, true, true)
            """), {
                "id": admin_id,
                "email": ADMIN_EMAIL,
                "pwd": password_hash,
                "role_id": role_map['admin']
            })
            
        # 3. Upsert Target User (initially as sales)
        existing_target = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": TEST_USER_EMAIL}).fetchone()
        
        # Use sales as base role
        base_role_id = role_map['sales'] if 'sales' in role_map else list(role_map.values())[0]

        target_id = None
        if existing_target:
            target_id = existing_target.id
            print(f"Target user {TEST_USER_EMAIL} exists. Resetting to base role...")
            db.execute(text("""
                UPDATE users 
                SET role_id = :role_id 
                WHERE email = :email
            """), {
                "role_id": base_role_id,
                "email": TEST_USER_EMAIL
            })
        else:
            target_id = uuid.uuid4()
            print(f"Creating target user {TEST_USER_EMAIL}...")
            db.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role_id, is_active, is_verified)
                VALUES (:id, :email, :pwd, 'Verify Target', :role_id, true, true)
            """), {
                "id": target_id,
                "email": TEST_USER_EMAIL,
                "pwd": password_hash,
                "role_id": base_role_id
            })

        db.commit()
        print("Database setup complete.")
        return role_map, target_id

    except Exception as e:
        print(f"Database setup failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def test_api(role_map, target_user_id):
    print("\nTesting API endpoints...")
    
    # 1. Login
    print(f"Logging in as {ADMIN_EMAIL}...")
    login_resp = requests.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.text}")
        return False
        
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Get Roles
    print("Fetching roles...")
    roles_resp = requests.get(f"{API_URL}/roles", headers=headers)
    if roles_resp.status_code != 200:
        print(f"Get roles failed: {roles_resp.text}")
        return False
    
    roles_data = roles_resp.json()
    print(f"Found {len(roles_data)} roles.")
    if not any(r['name'] == 'admin' for r in roles_data):
        print("Admin role not found in response.")
        return False

    # 3. Update User Role
    new_role_id = str(role_map['manager']) # Change to manager
    print(f"Updating target user {target_user_id} to role manager ({new_role_id})...")
    
    update_resp = requests.patch(
        f"{API_URL}/users/{target_user_id}",
        headers=headers,
        json={"role_id": new_role_id}
    )
    
    if update_resp.status_code != 200:
        print(f"Update user failed: {update_resp.text}")
        return False
    
    updated_user = update_resp.json()
    if updated_user['role']['id'] != new_role_id:
        print(f"Role mismatch in response. Expected {new_role_id}, got {updated_user['role']['id']}")
        return False
        
    print("User updated successfully.")
    print("Verification Passed!")
    return True

if __name__ == "__main__":
    setup_result = setup_test_data()
    if setup_result:
        role_map, target_id = setup_result
        test_api(role_map, target_id)
    else:
        print("Setup failed, aborting test.")
