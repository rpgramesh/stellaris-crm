
import sys
import os
import requests
import json
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to sys.path
# Script is in scripts/, so backend is in ../backend
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.append(backend_dir)

from app.core.config import settings
from app.core.security import get_password_hash

def setup_admin_user():
    print("Setting up admin user...")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    email = "verify_admin@example.com"
    password = "password123"
    
    try:
        # Get admin role id
        role = db.execute(text("SELECT id FROM roles WHERE name = 'admin'")).fetchone()
        if not role:
            print("Error: 'admin' role not found.")
            return None, None
            
        role_id = role[0]
        password_hash = get_password_hash(password)
        
        # Check if user exists
        user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
        
        if user:
            # Update password and ensure active
            db.execute(text("""
                UPDATE users 
                SET password_hash = :pwd, role_id = :role_id, is_active = true, is_verified = true 
                WHERE email = :email
            """), {
                "pwd": password_hash,
                "role_id": role_id,
                "email": email
            })
        else:
            # Create user
            user_id = uuid.uuid4()
            db.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role_id, is_active, is_verified)
                VALUES (:id, :email, :pwd, 'Verify Admin', :role_id, true, true)
            """), {
                "id": user_id,
                "email": email,
                "pwd": password_hash,
                "role_id": role_id
            })
            
        db.commit()
        return email, password
        
    except Exception as e:
        print(f"Error setting up user: {e}")
        return None, None
    finally:
        db.close()

def verify_create_client():
    """
    Verify the client creation API endpoint.
    """
    print("Verifying client creation API...")
    
    # 0. Setup Admin User
    email, password = setup_admin_user()
    if not email:
        return False

    # 1. Login to get access token
    login_url = f"{settings.API_V1_PREFIX}/auth/login"
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(f"http://localhost:8000{login_url}", json=login_data)
        if response.status_code != 200:
            print(f"Failed to login: {response.status_code} {response.text}")
            return False
            
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend server at http://localhost:8000")
        return False

    # 2. Create a new client
    create_url = f"{settings.API_V1_PREFIX}/clients"
    client_data = {
        "company_name": f"Test Company {datetime.now().strftime('%Y%m%d%H%M%S')}",
        "industry": "Technology",
        "primary_contact_name": "Test Contact",
        "primary_contact_email": "test@example.com",
        "primary_contact_phone": "+1234567890",
        "website": "https://example.com",
        "address": "123 Test St",
        "city": "Test City",
        "country": "Test Country"
    }
    
    print(f"Creating client: {client_data['company_name']}")
    response = requests.post(f"http://localhost:8000{create_url}", json=client_data, headers=headers)
    
    if response.status_code == 201:
        print("Client created successfully!")
        client = response.json()
        print(f"ID: {client['id']}")
        print(f"Name: {client['company_name']}")
        return True
    else:
        print(f"Failed to create client: {response.status_code} {response.text}")
        return False

if __name__ == "__main__":
    success = verify_create_client()
    sys.exit(0 if success else 1)
