import os
os.environ["DATABASE_URL"] = "postgresql://user:password@localhost/dbname"
os.environ["SECRET_KEY"] = "test_secret_key"

import pytest
from unittest.mock import MagicMock, patch
from app.api.routes.users import invite_user, get_users
from app.models.user import User
from app.schemas.user import UserInvite
from uuid import uuid4

@pytest.fixture
def mock_db():
    return MagicMock()

def test_invite_user(mock_db):
    user_in = UserInvite(
        email="newuser@example.com",
        full_name="New User",
        role_id=None
    )
    
    # Mock query to return None (user doesn't exist)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    response = invite_user(user_in, db=mock_db)
    
    assert response.email == "newuser@example.com"
    assert response.full_name == "New User"
    assert response.is_verified is False
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_invite_user_existing(mock_db):
    user_in = UserInvite(
        email="existing@example.com",
        full_name="Existing User"
    )
    
    # Mock query to return a user
    mock_db.query.return_value.filter.return_value.first.return_value = User(id=uuid4(), email="existing@example.com")
    
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        invite_user(user_in, db=mock_db)
    
    assert exc.value.status_code == 400
    assert "already exists" in exc.value.detail

def test_get_users(mock_db):
    # Mock users
    users = [
        User(id=uuid4(), email="user1@example.com", full_name="User 1"),
        User(id=uuid4(), email="user2@example.com", full_name="User 2")
    ]
    
    mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = users
    
    response = get_users(skip=0, limit=10, db=mock_db)
    
    assert len(response) == 2
    assert response[0].email == "user1@example.com"

def test_delete_user(mock_db):
    from app.api.routes.users import delete_user
    
    user_id = uuid4()
    mock_user = MagicMock(spec=User)
    mock_user.id = user_id
    
    # Mock admin user performing the action
    admin_user = MagicMock(spec=User)
    
    # Mock user to be deleted found
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user
    
    delete_user(user_id, current_user=admin_user, db=mock_db)
    
    assert mock_user.deleted_at is not None
    assert mock_user.is_active is False
    mock_db.add.assert_called_once_with(mock_user)
    mock_db.commit.assert_called_once()

