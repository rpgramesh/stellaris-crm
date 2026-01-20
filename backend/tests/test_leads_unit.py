
import pytest
import uuid
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from app.main import app
from app.api.dependencies import get_current_active_user
from app.models.user import User, Role
from app.models.lead import Lead

client_instance = TestClient(app)

@pytest.fixture
def client():
    return client_instance

# Remove global mocks to avoid side effects
# We will create them in each test or use fixtures

@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_admin_user():
    mock_role = MagicMock()
    mock_role.name = "admin"
    
    user = MagicMock(spec=User)
    user.id = "user-uuid"
    user.role = mock_role
    user.is_active = True
    return user

def test_delete_lead_import_fix(client, mock_db_session, mock_admin_user):
    """
    Test that delete_lead endpoint works (no NameError for datetime).
    We mock the DB query to return a lead, so it proceeds to delete.
    """
    # Override dependencies
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db_session

    # Mock lead query
    mock_lead = MagicMock(spec=Lead)
    mock_lead.id = "lead-uuid"
    mock_lead.deleted_at = None
    
    # Setup query chain
    mock_query = mock_db_session.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_lead
    
    # Call delete
    lead_id = "00000000-0000-0000-0000-000000000000"
    
    response = client.delete(f"/api/v1/leads/{lead_id}")
    
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Verify lead.deleted_at was set
    assert mock_lead.deleted_at is not None
    # Verify db.commit was called
    mock_db_session.commit.assert_called_once()
    
    # Clean up overrides
    app.dependency_overrides = {}

def test_convert_lead_already_converted_api(client, mock_db_session, mock_admin_user):
    # Setup
    lead_id = uuid.uuid4()
    
    # Mock finding the lead
    lead = MagicMock(spec=Lead)
    lead.id = lead_id
    lead.status = "converted"
    lead.first_name = "Test"
    lead.last_name = "User"
    lead.email = "test@example.com"
    lead.company = "Test Co"
    lead.assigned_to = uuid.uuid4()
    lead.meta_data = {}
    lead.notes = "notes"
    
    mock_db_session.query.return_value.filter.return_value.first.return_value = lead
    
    # Override dependency
    from app.api.dependencies import get_current_active_user, get_db
    from app.main import app
    
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session
    
    # Execute
    response = client.post(f"/api/v1/leads/{lead_id}/convert")
    
    # Verify
    assert response.status_code == 400
    assert "Lead is already converted" in response.json()["detail"]

def test_create_lead_with_metadata(client, mock_db_session, mock_admin_user):
    """
    Test that creating a lead with meta_data works (schema validation).
    """
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db_session
    
    # Mock db.add to simulate auto-generated ID
    def side_effect(obj):
        obj.id = uuid.uuid4()  # Use valid UUID
        obj.created_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()
        if not hasattr(obj, 'score') or obj.score is None:
            obj.score = 0
    mock_db_session.add.side_effect = side_effect
    
    # Mock user id as UUID
    mock_admin_user.id = uuid.uuid4()

    lead_data = {
        "first_name": "Meta",
        "last_name": "Data",
        "email": "meta@example.com",
        "meta_data": {"custom": "value"}
    }
    
    response = client.post("/api/v1/leads", json=lead_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Meta"
    # Verify meta_data is in response (requires schema update)
    assert "meta_data" in data
    assert data["meta_data"] == {"custom": "value"}
    
    # Verify it was passed to model
    args, _ = mock_db_session.add.call_args
    new_lead = args[0]
    assert new_lead.meta_data == {"custom": "value"}
    
    app.dependency_overrides = {}

def test_convert_lead_success(client, mock_db_session, mock_admin_user):
    """
    Test convert lead success path.
    """
    # Override dependencies
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    from app.core.database import get_db
    app.dependency_overrides[get_db] = lambda: mock_db_session
    
    # Mock lead
    mock_lead = MagicMock(spec=Lead)
    mock_lead.id = "lead-uuid"
    mock_lead.first_name = "John"
    mock_lead.last_name = "Doe"
    mock_lead.email = "john@example.com"
    mock_lead.phone = "123456"
    mock_lead.company = "Doe Corp"
    mock_lead.assigned_to = "user-uuid"
    mock_lead.status = "new"
    mock_lead.notes = "Some notes"
    mock_lead.meta_data = {"existing": "data"}
    mock_lead.deleted_at = None
    
    mock_query = mock_db_session.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_filter.first.return_value = mock_lead
    
    lead_id = "00000000-0000-0000-0000-000000000000"
    response = client.post(f"/api/v1/leads/{lead_id}/convert")
    
    assert response.status_code == 200
    assert response.json()["success"] == True
    
    # Verify Client creation
    # db.add is called with new client
    args, _ = mock_db_session.add.call_args
    new_client = args[0]
    
    assert new_client.company_name == "Doe Corp"
    assert new_client.meta_data["notes"] == "Some notes"
    assert new_client.meta_data["existing"] == "data"

    assert "conversion_log" in new_client.meta_data
    assert new_client.meta_data["conversion_log"]["from_lead_id"] == "lead-uuid"
    assert new_client.meta_data["conversion_log"]["converted_by"] == "user-uuid"
    
    # Verify Lead update
    assert mock_lead.status == "converted"
    assert mock_lead.stage == "closed_won"
    
    # Clean up overrides
    app.dependency_overrides = {}


