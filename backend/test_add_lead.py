import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_add_lead():
    # 1. Register/Login
    email = f"testadmin_{uuid.uuid4()}@example.com"
    password = "password123"
    
    print(f"Registering user: {email}")
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Test Admin"
        })
        if resp.status_code != 201:
            # Maybe user exists, try login
            pass
    except Exception as e:
        print(f"Registration failed: {e}")

    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Lead
    print("Creating lead...")
    lead_data = {
        "company": "Test Corp",
        "first_name": "Test",
        "last_name": "Lead",
        "email": "test.lead@testcorp.com",
        "phone": "1234567890",
        "estimated_value": 5000,
        "status": "new",
        "stage": "prospect",
        "source": "Script"
    }

    resp = requests.post(f"{BASE_URL}/leads", json=lead_data, headers=headers)
    
    if resp.status_code == 201:
        print("Lead created successfully!")
        print(resp.json())
    else:
        print(f"Failed to create lead: {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    test_add_lead()
