import sys
import os
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.models.client import Project, Client
from app.models.task import Task
from app.models.user import User
import uuid

def test_progress():
    db = SessionLocal()
    try:
        print("Starting verification...")
        
        # Ensure we have a client
        client = db.query(Client).first()
        if not client:
            print("Creating test client...")
            client = Client(company_name="Test Client Verification")
            db.add(client)
            db.commit()
            db.refresh(client)
        
        # Create a test project
        project = Project(
            name="Verification Project",
            client_id=client.id,
            status="planning",
            description="Temporary project for progress verification"
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        print(f"Project created: {project.id}")
        
        # Initial progress should be 0 (no tasks)
        print(f"Initial Progress (no tasks): {project.progress}%")
        if project.progress != 0:
            print("FAILED: Expected 0%")
        
        # Add tasks
        print("Adding 4 tasks (1 completed, 3 todo)...")
        task1 = Task(project_id=project.id, title="Task 1", status="completed")
        task2 = Task(project_id=project.id, title="Task 2", status="todo")
        task3 = Task(project_id=project.id, title="Task 3", status="todo")
        task4 = Task(project_id=project.id, title="Task 4", status="todo")
        
        db.add_all([task1, task2, task3, task4])
        db.commit()
        
        # Force reload to pick up relationship
        db.expire(project)
        # Accessing project.tasks should trigger lazy load (or we can query again)
        # With joinedload in the route it works, here we rely on lazy load which is default
        
        print(f"Task count: {len(project.tasks)}")
        print(f"Progress (1/4): {project.progress}%")
        
        expected = 25
        if project.progress != expected:
            print(f"FAILED: Expected {expected}%, got {project.progress}%")
        else:
            print("PASSED: 25% progress")
            
        # Update another task
        print("Marking Task 2 as completed...")
        task2.status = "completed"
        db.commit()
        db.expire(project)
        
        print(f"Progress (2/4): {project.progress}%")
        expected = 50
        if project.progress != expected:
             print(f"FAILED: Expected {expected}%, got {project.progress}%")
        else:
             print("PASSED: 50% progress")

        # Soft delete a task
        print("Soft deleting Task 3...")
        from datetime import datetime
        task3.deleted_at = datetime.utcnow()
        db.commit()
        db.expire(project)
        
        # Now we have 3 active tasks, 2 completed. 2/3 = 66%
        print(f"Progress (2/3 active): {project.progress}%")
        expected = 66
        if project.progress != expected:
             print(f"FAILED: Expected {expected}%, got {project.progress}%")
        else:
             print("PASSED: 66% progress")
             
        # Cleanup
        print("Cleaning up...")
        db.query(Task).filter(Task.project_id == project.id).delete()
        db.delete(project)
        db.commit()
        print("Done.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_progress()
