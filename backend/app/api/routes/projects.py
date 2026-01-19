"""
Project management API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.client import Project, Client
from app.models.user import User
from app.schemas.client import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectWithClient
)
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Create a new project.
    
    Permissions: admin, manager
    """
    # Verify client exists
    client = db.query(Client).filter(
        Client.id == project_data.client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Create new project
    new_project = Project(
        **project_data.model_dump(),
        project_manager_id=current_user.id
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return ProjectResponse.model_validate(new_project)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    project_manager_id: Optional[UUID] = Query(None, description="Filter by project manager"),
    search: Optional[str] = Query(None, description="Search by name"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List projects with pagination and filtering.
    
    Permissions: All authenticated users
    """
    # Build query
    query = db.query(Project).filter(Project.deleted_at.is_(None))
    
    # Apply filters
    if status:
        query = query.filter(Project.status == status)
    if priority:
        query = query.filter(Project.priority == priority)
    if client_id:
        query = query.filter(Project.client_id == client_id)
    if project_manager_id:
        query = query.filter(Project.project_manager_id == project_manager_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Project.name.ilike(search_filter))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    projects = query.order_by(desc(Project.created_at)).offset(offset).limit(page_size).all()
    
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(project) for project in projects],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{project_id}", response_model=ProjectWithClient)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific project by ID with client details.
    
    Permissions: All authenticated users
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return ProjectWithClient.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Update a project.
    
    Permissions: admin, manager
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", response_model=APIResponse)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Soft delete a project.
    
    Permissions: admin, manager
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Soft delete
    project.deleted_at = datetime.utcnow()
    db.commit()
    
    return APIResponse(
        success=True,
        message="Project deleted successfully"
    )


@router.get("/{project_id}/stats", response_model=dict)
async def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get project statistics (budget, hours, tasks, etc.).
    
    Permissions: All authenticated users
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Calculate statistics
    budget_remaining = float(project.budget - project.actual_cost) if project.budget else None
    budget_utilization = float((project.actual_cost / project.budget * 100)) if project.budget and project.budget > 0 else 0
    
    return {
        "project_id": str(project_id),
        "budget": float(project.budget) if project.budget else 0,
        "actual_cost": float(project.actual_cost),
        "budget_remaining": budget_remaining,
        "budget_utilization_percent": round(budget_utilization, 2),
        "status": project.status,
        "priority": project.priority
    }
