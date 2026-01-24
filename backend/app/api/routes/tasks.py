"""
Task management API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi_cache.decorator import cache
from app.core.redis import cache_key_builder, invalidate_cache
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from datetime import datetime, date
from app.core.database import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Create a new task.
    
    Permissions: admin, manager
    """
    new_task = Task(
        **task_data.model_dump(),
        created_by=current_user.id,
        meta_data={
            "audit_log": [
                {
                    "action": "created",
                    "user_id": str(current_user.id),
                    "user_name": current_user.full_name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Invalidate caches
    await invalidate_cache("tasks")
    await invalidate_cache("projects")
    await invalidate_cache("reports")
    
    return TaskResponse.model_validate(new_task)


@router.get("", response_model=TaskListResponse)
@cache(expire=60, namespace="tasks", key_builder=cache_key_builder)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    project_id: Optional[UUID] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    due_before: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List tasks with pagination and filtering.
    """
    query = db.query(Task).filter(Task.deleted_at.is_(None))
    
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if due_before:
        query = query.filter(Task.due_date <= due_before)
    
    total = query.count()
    offset = (page - 1) * page_size
    tasks = query.order_by(desc(Task.created_at)).offset(offset).limit(page_size).all()
    
    return TaskListResponse(
        items=[TaskResponse.model_validate(task) for task in tasks],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific task by ID."""
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a task."""
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    update_data = task_data.model_dump(exclude_unset=True)
    
    # If status changed to completed, set completed_at
    if 'status' in update_data and update_data['status'] == 'completed' and not task.completed_at:
        task.completed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    # Audit logging
    audit_entry = {
        "action": "updated",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "changes": list(update_data.keys())
    }
    
    current_meta = dict(task.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    task.meta_data = current_meta

    db.commit()
    db.refresh(task)
    
    # Invalidate caches
    await invalidate_cache("tasks")
    await invalidate_cache("projects")
    await invalidate_cache("reports")
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", response_model=APIResponse)
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """Soft delete a task."""
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    task.deleted_at = datetime.utcnow()
    
    # Audit logging
    audit_entry = {
        "action": "deleted",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    current_meta = dict(task.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    task.meta_data = current_meta
    
    db.commit()
    
    # Invalidate caches
    await invalidate_cache("tasks")
    await invalidate_cache("projects")
    await invalidate_cache("reports")
    
    return APIResponse(success=True, message="Task deleted successfully")
