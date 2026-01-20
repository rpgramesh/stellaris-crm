from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.client import Project, ProjectMember
from app.models.user import User
from app.schemas.client import (
    ProjectCreate, 
    ProjectUpdate, 
    ProjectResponse, 
    ProjectListResponse,
    ProjectMemberCreate, 
    ProjectMemberUpdate, 
    ProjectMemberResponse
)
from uuid import UUID
from app.api.dependencies import get_current_active_user, RoleChecker
from datetime import datetime

router = APIRouter(tags=["projects"])

@router.get("/projects", response_model=ProjectListResponse)
def get_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve projects.
    """
    total = db.query(Project).filter(Project.deleted_at == None).count()
    projects = db.query(Project).filter(Project.deleted_at == None).offset(skip).limit(limit).all()
    
    return {
        "items": projects,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create new project.
    """
    project = Project(
        **project_in.model_dump(),
        project_manager_id=current_user.id # Default to creator as manager if not specified, logic can be refined
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get project by ID.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at == None).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update project.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at == None).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
        
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Delete project (soft delete).
    """
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at == None).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
        
    project.deleted_at = datetime.utcnow()
    db.add(project)
    db.commit()
    return None

@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
def list_project_members(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List members of a project.
    Permissions: All authenticated users
    """
    # Check if project exists
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at.is_(None)
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    return members


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Add a member to a project.
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

    user_to_add = None
    if member_data.user_id:
        user_to_add = db.query(User).filter(User.id == member_data.user_id).first()
    elif member_data.email:
        user_to_add = db.query(User).filter(User.email == member_data.email).first()
        
    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Check if already a member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_to_add.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
        
    new_member = ProjectMember(
        project_id=project_id,
        user_id=user_to_add.id,
        role=member_data.role
    )
    
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return new_member


@router.put("/projects/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
def update_project_member(
    project_id: UUID,
    user_id: UUID,
    member_data: ProjectMemberUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Update a project member's role.
    Permissions: admin, manager
    """
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    member.role = member_data.role
    db.commit()
    db.refresh(member)
    
    return member


@router.delete("/projects/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Remove a member from a project.
    Permissions: admin, manager
    """
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
        
    db.delete(member)
    db.commit()
    
    return None
