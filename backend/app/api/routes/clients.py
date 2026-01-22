"""
Client management API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from uuid import UUID
from datetime import datetime
from fastapi_cache.decorator import cache
from app.core.redis import cache_key_builder, invalidate_cache
from app.core.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "sales"])),
    db: Session = Depends(get_db)
):
    """
    Create a new client.
    
    Permissions: admin, manager, sales
    """
    # Create new client
    new_client = Client(
        **client_data.model_dump(),
        account_manager_id=current_user.id  # Auto-assign to creator
    )
    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    # Invalidate clients cache
    await invalidate_cache("clients")
    await invalidate_cache("reports") # New client might affect reports
    
    return ClientResponse.model_validate(new_client)


@router.get("", response_model=ClientListResponse)
@cache(expire=60, key_builder=cache_key_builder, namespace="clients")
async def list_clients(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    account_manager_id: Optional[UUID] = Query(None, description="Filter by account manager"),
    search: Optional[str] = Query(None, description="Search by company name or contact"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List clients with pagination and filtering.
    
    Permissions: All authenticated users
    """
    # Build query
    query = db.query(Client).filter(Client.deleted_at.is_(None))
    
    # Apply filters
    if status:
        query = query.filter(Client.status == status)
    if account_manager_id:
        query = query.filter(Client.account_manager_id == account_manager_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Client.company_name.ilike(search_filter),
                Client.primary_contact_name.ilike(search_filter),
                Client.primary_contact_email.ilike(search_filter)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    clients = query.order_by(desc(Client.created_at)).offset(offset).limit(page_size).all()
    
    return ClientListResponse(
        items=[ClientResponse.model_validate(client) for client in clients],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{client_id}", response_model=ClientResponse)
@cache(expire=60, key_builder=cache_key_builder, namespace="clients")
async def get_client(
    client_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific client by ID.
    
    Permissions: All authenticated users
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    return ClientResponse.model_validate(client)


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "sales"])),
    db: Session = Depends(get_db)
):
    """
    Update a client.
    
    Permissions: admin, manager, sales
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Update fields
    update_data = client_data.model_dump(exclude_unset=True)
    
    # Audit Logging
    changes = {}
    for field, value in update_data.items():
        if field == "meta_data":
            # Skip full metadata comparison for now, or implement deep diff
            changes[field] = "Updated metadata"
        elif getattr(client, field) != value:
            changes[field] = f"{getattr(client, field)} -> {value}"
    
    if changes:
        if not client.meta_data:
            client.meta_data = {}
        
        # Create a copy to ensure SQLAlchemy detects change
        new_meta = dict(client.meta_data)
        if "audit_log" not in new_meta:
            new_meta["audit_log"] = []
        
        new_meta["audit_log"].append({
            "action": "update",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": str(current_user.id),
            "changes": changes
        })
        client.meta_data = new_meta

    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    # Invalidate clients cache
    await invalidate_cache("clients")
    await invalidate_cache("reports")
    
    return ClientResponse.model_validate(client)


@router.post("/{client_id}/restore", response_model=APIResponse)
async def restore_client(
    client_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Restore a soft-deleted client.
    
    Permissions: admin, manager
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.deleted_at.isnot(None)
    ).first()
    
    if not client:
        # Check if it exists but is not deleted
        active_client = db.query(Client).filter(
            Client.id == client_id,
            Client.deleted_at.is_(None)
        ).first()
        if active_client:
             return APIResponse(
                success=True,
                message="Client is already active"
            )
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found in trash"
        )
    
    # Restore
    client.deleted_at = None
    
    # Log restoration
    if not client.meta_data:
        client.meta_data = {}
    
    new_meta = dict(client.meta_data)
    if "audit_log" not in new_meta:
        new_meta["audit_log"] = []
    
    new_meta["audit_log"].append({
        "action": "restore",
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": str(current_user.id)
    })
    client.meta_data = new_meta

    db.commit()
    
    # Invalidate clients cache
    await invalidate_cache("clients")
    await invalidate_cache("reports")
    
    return APIResponse(
        success=True,
        message="Client restored successfully"
    )


@router.delete("/{client_id}", response_model=APIResponse)
async def delete_client(
    client_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Soft delete a client.
    
    Permissions: admin, manager
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Soft delete
    client.deleted_at = datetime.utcnow()
    db.commit()
    
    # Invalidate clients cache
    await invalidate_cache("clients")
    await invalidate_cache("reports")
    
    return APIResponse(
        success=True,
        message="Client deleted successfully"
    )


@router.get("/{client_id}/projects", response_model=dict)
@cache(expire=60, key_builder=cache_key_builder, namespace="clients")
async def get_client_projects(
    client_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all projects for a specific client.
    
    Permissions: All authenticated users
    """
    from app.models.client import Project
    from app.schemas.client import ProjectResponse
    
    # Verify client exists
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get projects
    projects = db.query(Project).filter(
        Project.client_id == client_id,
        Project.deleted_at.is_(None)
    ).order_by(desc(Project.created_at)).all()
    
    return {
        "client_id": str(client_id),
        "projects": [ProjectResponse.model_validate(p) for p in projects]
    }
