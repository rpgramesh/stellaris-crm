import unittest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User, Role
from app.models.client import Client
from app.api.dependencies import get_current_active_user
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
import logging

# Configure logging to capture output
logging.basicConfig(level=logging.INFO)

class TestClientCreation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Initialize in-memory cache for testing
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
        cls.client = TestClient(app)
        
    def setUp(self):
        # Setup DB session
        from app.core.database import SessionLocal
        self.db = SessionLocal()
        
        # Ensure admin role exists
        role = self.db.query(Role).filter_by(name="admin").first()
        if not role:
            role = Role(name="admin", description="Admin")
            self.db.add(role)
            self.db.commit()
            self.db.refresh(role)
            
        # Create unique test user for this test run
        self.test_email = f"test_client_{uuid.uuid4().hex[:8]}@example.com"
        self.user = User(
            email=self.test_email,
            full_name="Test User",
            role_id=role.id,
            is_active=True,
            password_hash="hash"
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)
        
        # Override auth dependency
        app.dependency_overrides[get_current_active_user] = lambda: self.user
        
        # Track created clients for cleanup
        self.created_client_ids = []

    def tearDown(self):
        # Cleanup created data
        try:
            # Delete clients created during test
            if self.created_client_ids:
                self.db.query(Client).filter(Client.id.in_(self.created_client_ids)).delete(synchronize_session=False)
            
            # Delete test user
            self.db.query(User).filter(User.id == self.user.id).delete()
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logging.error(f"Cleanup failed: {e}")
        finally:
            self.db.close()
        app.dependency_overrides = {}

    def test_create_client_success(self):
        """Test successful client creation with valid data"""
        payload = {
            "company_name": f"Integration Test Co {uuid.uuid4().hex[:4]}",
            "industry": "Software",
            "primary_contact_email": "contact@test.com",
            "website": "https://example.com"
        }
        response = self.client.post("/api/v1/clients", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.created_client_ids.append(data["id"])
        
        self.assertEqual(data["company_name"], payload["company_name"])
        self.assertEqual(data["primary_contact_email"], payload["primary_contact_email"])
        self.assertEqual(data["account_manager_id"], str(self.user.id))
        
        # Verify in DB
        client_db = self.db.query(Client).filter(Client.id == data["id"]).first()
        self.assertIsNotNone(client_db)
        self.assertEqual(client_db.industry, "Software")

    def test_create_client_validation_error(self):
        """Test validation failure for invalid email"""
        payload = {
            "company_name": "Bad Email Co",
            "primary_contact_email": "not-an-email"
        }
        response = self.client.post("/api/v1/clients", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_create_client_empty_strings(self):
        """Test that empty strings for strict fields (EmailStr) are rejected"""
        payload = {
            "company_name": "Empty Email Co",
            "primary_contact_email": ""
        }
        response = self.client.post("/api/v1/clients", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_create_client_metadata(self):
        """Test metadata persistence"""
        payload = {
            "company_name": f"Metadata Co {uuid.uuid4().hex[:4]}",
            "meta_data": {"source": "campaign", "score": 10}
        }
        response = self.client.post("/api/v1/clients", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.created_client_ids.append(data["id"])
        
        self.assertEqual(data["meta_data"]["source"], "campaign")
        self.assertEqual(data["meta_data"]["score"], 10)

if __name__ == "__main__":
    unittest.main()
