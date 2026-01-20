
import os
os.environ["DATABASE_URL"] = "postgresql://user:password@localhost/dbname"
os.environ["SECRET_KEY"] = "test_secret_key"

import pytest
import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from app.main import app
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.client import Client
from app.core.database import get_db

client_instance = TestClient(app)

@pytest.fixture
def client():
    return client_instance

@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_admin_user():
    mock_role = MagicMock()
    mock_role.name = "admin"
    
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.role = mock_role
    user.is_active = True
    return user

def configure_mock_client(mock_client, **kwargs):
    # Set default values for all fields expected by ClientResponse
    defaults = {
        "id": uuid.uuid4(),
        "company_name": "Test Corp",
        "primary_contact_name": "Test Contact",
        "primary_contact_email": "test@example.com",
        "primary_contact_phone": "1234567890",
        "status": "active",
        "industry": None,
        "website": None,
        "address": None,
        "city": None,
        "state": None,
        "country": None,
        "postal_code": None,
        "payment_terms": None,
        "credit_limit": None,
        "tax_id": None,
        "account_manager_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "meta_data": {},
        "deleted_at": None
    }
    defaults.update(kwargs)
    for key, value in defaults.items():
        setattr(mock_client, key, value)
    return mock_client

def test_create_client(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    payload = {
        "company_name": "New Corp",
        "primary_contact_name": "John Doe",
        "primary_contact_email": "john@newcorp.com",
        "primary_contact_phone": "+1234567890",
        "status": "active"
    }

    # Mock DB behavior
    def side_effect_refresh(instance):
        instance.id = uuid.uuid4()
        instance.created_at = datetime.utcnow()
        instance.updated_at = datetime.utcnow()
        if not instance.status:
            instance.status = "active"
        
    mock_db_session.add = MagicMock()
    mock_db_session.commit = MagicMock()
    mock_db_session.refresh = MagicMock(side_effect=side_effect_refresh)

    response = client.post("/api/v1/clients/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "New Corp"
    
    app.dependency_overrides = {}

def test_update_client_audit_log(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    client_id = uuid.uuid4()
    
    # Mock existing client
    mock_client = MagicMock(spec=Client)
    configure_mock_client(mock_client, id=client_id, company_name="Old Corp", status="active")
    
    mock_query = mock_db_session.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_client

    payload = {
        "company_name": "Updated Corp",
        "status": "inactive"
    }

    response = client.patch(f"/api/v1/clients/{client_id}", json=payload)
    
    assert response.status_code == 200
    
    # Verify audit log
    assert mock_client.company_name == "Updated Corp"
    assert "audit_log" in mock_client.meta_data
    assert len(mock_client.meta_data["audit_log"]) == 1
    log = mock_client.meta_data["audit_log"][0]
    assert log["action"] == "update"
    assert log["changes"]["company_name"] == "Old Corp -> Updated Corp"
    
    app.dependency_overrides = {}

def test_delete_client_soft_delete(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    client_id = uuid.uuid4()
    mock_client = MagicMock(spec=Client)
    configure_mock_client(mock_client, id=client_id, deleted_at=None)

    mock_query = mock_db_session.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_client

    response = client.delete(f"/api/v1/clients/{client_id}")
    
    assert response.status_code == 200
    assert mock_client.deleted_at is not None
    
    app.dependency_overrides = {}

def test_restore_client(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    client_id = uuid.uuid4()
    mock_client = MagicMock(spec=Client)
    configure_mock_client(mock_client, id=client_id, deleted_at=datetime.utcnow())

    mock_query = mock_db_session.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_client

    response = client.post(f"/api/v1/clients/{client_id}/restore")
    
    assert response.status_code == 200
    assert mock_client.deleted_at is None
    # Check audit log for restore
    assert "audit_log" in mock_client.meta_data
    assert mock_client.meta_data["audit_log"][-1]["action"] == "restore"
    
    app.dependency_overrides = {}
