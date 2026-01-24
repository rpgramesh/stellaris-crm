
import sys
import os
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User
from app.api.dependencies import get_current_active_user, RoleChecker
from uuid import uuid4
from datetime import date
from app.core.redis import init_redis
from app.models.user import User, Role
from sqlalchemy import select

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

# Initialize Cache with InMemoryBackend
FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

# Bypass Redis init
async def mock_init_redis(app):
    pass

app.router.startup_tasks = [] # Clear startup tasks that might connect to DB/Redis

# Setup DB session for creating mock data
db = SessionLocal()

try:
    # Ensure role exists
    role = db.query(Role).filter_by(name="admin").first()
    if not role:
        role = Role(name="admin", description="Administrator")
        db.add(role)
        db.commit()
        db.refresh(role)
    
    # Ensure user exists
    user_email = "admin_test_progress@example.com"
    user = db.query(User).filter_by(email=user_email).first()
    if not user:
        user = User(
            email=user_email,
            full_name="Admin User Test",
            role_id=role.id,
            is_active=True,
            password_hash="dummy_hash"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    mock_user = user
    print(f"Using mock user: {mock_user.id} with role {mock_user.role.name}")

finally:
    db.close()


def override_get_current_active_user():
    return mock_user

def override_role_checker():
    return mock_user

app.dependency_overrides[get_current_active_user] = override_get_current_active_user
# We need to override the RoleChecker class dependency, which is tricky.
# But RoleChecker is a callable class.
# Let's try to just use the user override, assuming RoleChecker calls get_current_active_user internally?
# No, RoleChecker is used as Depends(RoleChecker(["admin"]))
# We can override the dependency injection for the specific routes if needed, 
# but FastAPI overrides work by matching the dependency callable.

# Let's try to just run it. If auth fails, we'll fix it.

client = TestClient(app)

def verify_progress_api():
    print("Starting API verification...")
    
    # Create a client
    client_data = {
        "company_name": f"Test Client {uuid4()}",
        "status": "active"
    }
    res = client.post("/api/v1/clients/", json=client_data)
    if res.status_code != 201:
        print(f"Failed to create client: {res.text}")
        return
    client_id = res.json()["id"]
    print(f"Client created: {client_id}")

    # Create a project
    project_data = {
        "name": "Progress Test Project",
        "client_id": client_id,
        "status": "in_progress",
        "description": "Test"
    }
    res = client.post("/api/v1/projects", json=project_data)
    if res.status_code != 201:
        print(f"Failed to create project: {res.text}")
        return
    project_id = res.json()["id"]
    print(f"Project created: {project_id}")
    
    # Check initial progress (should be 0)
    if res.json().get("progress") != 0:
        print(f"Error: Initial progress is {res.json().get('progress')}, expected 0")
    
    # Create Tasks
    # Task 1: Completed
    task1 = {
        "title": "Task 1",
        "project_id": project_id,
        "status": "completed",
        "priority": "medium",
        "description": "desc"
    }
    res = client.post("/api/v1/tasks", json=task1)
    if res.status_code != 201:
         print(f"Failed to create task 1: {res.text}")
    
    # Task 2: In Progress
    task2 = {
        "title": "Task 2",
        "project_id": project_id,
        "status": "in_progress",
        "priority": "medium",
         "description": "desc"
    }
    res = client.post("/api/v1/tasks", json=task2)
    
    # Task 3: Todo
    task3 = {
        "title": "Task 3",
        "project_id": project_id,
        "status": "todo",
        "priority": "medium",
         "description": "desc"
    }
    res = client.post("/api/v1/tasks", json=task3)
    
    # Fetch project and check progress
    # We expect 1 completed / 3 total = 33%
    res = client.get(f"/api/v1/projects/{project_id}")
    progress = res.json().get("progress")
    print(f"Progress after tasks: {progress}%")
    
    if progress == 33:
        print("SUCCESS: Progress is 33%")
    else:
        print(f"FAILURE: Expected 33%, got {progress}%")

    # Update project (test if update route preserves progress/tasks loading)
    update_data = {"description": "Updated Description"}
    res = client.put(f"/api/v1/projects/{project_id}", json=update_data)
    if res.status_code != 200:
        print(f"Failed to update project: {res.text}")
    
    updated_progress = res.json().get("progress")
    print(f"Progress after update: {updated_progress}%")
    
    if updated_progress == 33:
        print("SUCCESS: Progress preserved after update")
    else:
        print(f"FAILURE: Expected 33% after update, got {updated_progress}%")

    # Clean up
    # Delete project (cascades tasks)
    # client.delete(f"/api/v1/projects/{project_id}") # Route might not exist or require diff permissions
    
    print("Verification complete.")

if __name__ == "__main__":
    try:
        verify_progress_api()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
