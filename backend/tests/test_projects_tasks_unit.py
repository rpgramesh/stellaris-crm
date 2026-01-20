import os
os.environ["DATABASE_URL"] = "postgresql://user:password@localhost/dbname"
os.environ["SECRET_KEY"] = "test_secret_key"

import pytest
from unittest.mock import MagicMock
from app.api.routes.projects import create_project
from app.api.routes.tasks import create_task
from app.models.client import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.client import ProjectCreate
from app.schemas.task import TaskCreate
from uuid import uuid4
from datetime import date

@pytest.fixture
def mock_db():
    db = MagicMock()
    
    def refresh_side_effect(obj):
        obj.id = uuid4()
        obj.created_at = date(2025, 1, 1) # Using date/datetime compatible value
        obj.updated_at = date(2025, 1, 1)
        if hasattr(obj, "status") and not obj.status:
            obj.status = "planning"
        if hasattr(obj, "actual_cost") and obj.actual_cost is None:
            obj.actual_cost = 0
        if hasattr(obj, "actual_hours") and obj.actual_hours is None:
            obj.actual_hours = 0
            
    db.refresh.side_effect = refresh_side_effect
    return db

@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id = uuid4()
    return user

def test_create_project(mock_db, mock_user):
    project_in = ProjectCreate(
        name="New Project",
        description="Description",
        client_id=uuid4(),
        priority="high",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        budget=10000.0
    )
    
    # Mock client existence check
    mock_db.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    response = create_project(project_in, current_user=mock_user, db=mock_db)
    
    assert response.name == "New Project"
    assert response.priority == "high"
    assert response.budget == 10000.0
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_create_task(mock_db, mock_user):
    task_in = TaskCreate(
        title="New Task",
        description="Task Description",
        project_id=uuid4(),
        priority="medium",
        status="in_progress",
        assigned_to=uuid4(),
        due_date=date(2025, 2, 1)
    )
    
    # Mock project existence check
    mock_db.query.return_value.filter.return_value.first.return_value = MagicMock()
    
    response = await create_task(task_in, current_user=mock_user, db=mock_db)
    
    assert response.title == "New Task"
    assert response.status == "in_progress"
    assert response.assigned_to == task_in.assigned_to
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_add_project_member(mock_db, mock_user):
    from app.api.routes.projects import add_project_member
    from app.schemas.client import ProjectMemberCreate
    
    project_id = uuid4()
    user_id = uuid4()
    member_data = ProjectMemberCreate(user_id=user_id, role="member")
    
    # Mock project
    project = MagicMock()
    project.id = project_id
    
    # Mock user to add
    user_to_add = MagicMock()
    user_to_add.id = user_id
    
    # Setup db queries
    # First query is for project (create_project check or add_member check)
    # In add_project_member:
    # 1. Project check
    # 2. User check
    # 3. Existing member check
    
    # We need to ensure the mock chain works.
    # db.query(...) returns a mock (let's call it Q)
    # Q.filter(...) returns Q (usually)
    # Q.first() returns the result
    
    # We configure side_effect on the LAST .first() call in the chain
    mock_db.query.return_value.filter.return_value.first.side_effect = [project, user_to_add, None]
    
    response = add_project_member(project_id, member_data, current_user=mock_user, db=mock_db)
    
    assert response.project_id == project_id
    assert response.user_id == user_id
    assert response.role == "member"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
