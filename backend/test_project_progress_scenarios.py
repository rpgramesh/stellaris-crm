import sys
import os
import asyncio
import logging
from datetime import datetime
from uuid import uuid4

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.client import Project, Client
from app.models.task import Task
from app.models.user import User, Role
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Cache
FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")

def setup_db():
    db = SessionLocal()
    try:
        # Ensure admin role exists
        role = db.query(Role).filter_by(name="admin").first()
        if not role:
            role = Role(name="admin", description="Administrator")
            db.add(role)
            db.commit()
            db.refresh(role)
        
        # Ensure test user exists
        user_email = "test_progress_scenarios@example.com"
        user = db.query(User).filter_by(email=user_email).first()
        if not user:
            user = User(
                email=user_email,
                full_name="Test Progress User",
                role_id=role.id,
                is_active=True,
                password_hash="dummy_hash"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        # Ensure test client exists
        client_name = "Test Progress Client"
        client = db.query(Client).filter_by(company_name=client_name).first()
        if not client:
            client = Client(
                company_name=client_name,
                industry="Testing",
                status="active"
            )
            db.add(client)
            db.commit()
            db.refresh(client)
            
        return db, user, client
    except Exception as e:
        db.close()
        raise e

def test_scenarios():
    db, user, client = setup_db()
    project = None
    try:
        # 1. Create Project
        logger.info("--- Test 1: Create Project ---")
        project = Project(
            name=f"Progress Test Project {uuid4().hex[:8]}",
            description="Testing progress calculation",
            client_id=client.id, 
            status="planning",
            priority="medium",
            project_manager_id=user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        logger.info(f"Project created. ID: {project.id}, Progress: {project.progress}%")
        assert project.progress == 0, f"Expected 0%, got {project.progress}%"

        # 2. Add 3 Active Tasks
        logger.info("\n--- Test 2: Add 3 Active Tasks ---")
        tasks = []
        for i in range(3):
            task = Task(
                title=f"Task {i+1}",
                project_id=project.id,
                status="in_progress",
                priority="medium",
                created_by=user.id
            )
            db.add(task)
            tasks.append(task)
        db.commit()
        
        # Refresh project to load tasks
        db.refresh(project)
        # Force reload of tasks relationship
        db.expire(project, ['tasks'])
        logger.info(f"Added 3 tasks. Project Progress: {project.progress}%")
        assert project.progress == 0, f"Expected 0%, got {project.progress}%"

        # 3. Complete 1 Task
        logger.info("\n--- Test 3: Complete 1 Task ---")
        tasks[0].status = "completed"
        tasks[0].completed_at = datetime.utcnow()
        db.add(tasks[0])
        db.commit()
        
        db.expire(project, ['tasks'])
        logger.info(f"Completed Task 1. Project Progress: {project.progress}%")
        # 1/3 = 33%
        assert project.progress == 33, f"Expected 33%, got {project.progress}%"

        # 4. Complete Another Task
        logger.info("\n--- Test 4: Complete Another Task ---")
        tasks[1].status = "completed"
        tasks[1].completed_at = datetime.utcnow()
        db.add(tasks[1])
        db.commit()
        
        db.expire(project, ['tasks'])
        logger.info(f"Completed Task 2. Project Progress: {project.progress}%")
        # 2/3 = 66%
        assert project.progress == 66, f"Expected 66%, got {project.progress}%"

        # 5. Soft Delete a Completed Task
        logger.info("\n--- Test 5: Soft Delete a Completed Task ---")
        # Deleting task 1 (completed)
        # Remaining: Task 2 (completed), Task 3 (in_progress) -> Total 2 active tasks.
        # Completed active: 1 (Task 2).
        # Progress: 1/2 = 50%
        tasks[0].deleted_at = datetime.utcnow()
        db.add(tasks[0])
        db.commit()
        
        db.expire(project, ['tasks'])
        logger.info(f"Deleted Task 1. Project Progress: {project.progress}%")
        assert project.progress == 50, f"Expected 50%, got {project.progress}%"

        # 6. Soft Delete an Active Task
        logger.info("\n--- Test 6: Soft Delete an Active Task ---")
        # Deleting task 3 (in_progress)
        # Remaining: Task 2 (completed). Task 1 and 3 are deleted.
        # Total active: 1 (Task 2).
        # Completed active: 1 (Task 2).
        # Progress: 1/1 = 100%
        tasks[2].deleted_at = datetime.utcnow()
        db.add(tasks[2])
        db.commit()
        
        db.expire(project, ['tasks'])
        logger.info(f"Deleted Task 3. Project Progress: {project.progress}%")
        assert project.progress == 100, f"Expected 100%, got {project.progress}%"

        logger.info("\nSUCCESS: All progress calculation scenarios passed!")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        # Rollback in case of error to allow cleanup (though session might be invalidated)
        db.rollback() 
        raise e
    finally:
        # Cleanup
        if project and project.id:
            try:
                # Hard delete for cleanup
                db.query(Task).filter(Task.project_id == project.id).delete()
                db.query(Project).filter(Project.id == project.id).delete()
                db.commit()
            except Exception as cleanup_error:
                logger.error(f"Cleanup failed: {cleanup_error}")
                db.rollback()
        db.close()

if __name__ == "__main__":
    test_scenarios()
