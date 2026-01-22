"""
Lead management API routes.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi_cache.decorator import cache
from app.core.redis import cache_key_builder, invalidate_cache
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from uuid import UUID
from app.core.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadListResponse
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "sales"])),
    db: Session = Depends(get_db)
):
    """
    Create a new lead.
    
    Permissions: admin, manager, sales
    """
    # Create new lead
    new_lead = Lead(
        **lead_data.model_dump(),
        assigned_to=current_user.id  # Auto-assign to creator
    )
    
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    
    # Invalidate caches
    await invalidate_cache("leads")
    
    return LeadResponse.model_validate(new_lead)


@router.get("", response_model=LeadListResponse)
@cache(expire=60, namespace="leads", key_builder=cache_key_builder)
async def list_leads(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by assigned user"),
    search: Optional[str] = Query(None, description="Search by name, email, or company"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List leads with pagination and filtering.
    
    Permissions: All authenticated users (filtered by role)
    """
    # Build query
    query = db.query(Lead).filter(Lead.deleted_at.is_(None))
    
    # Role-based filtering
    if current_user.role.name == "sales":
        # Sales users only see their own leads
        query = query.filter(Lead.assigned_to == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(Lead.status == status)
    if stage:
        query = query.filter(Lead.stage == stage)
    if assigned_to:
        query = query.filter(Lead.assigned_to == assigned_to)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Lead.first_name.ilike(search_filter),
                Lead.last_name.ilike(search_filter),
                Lead.email.ilike(search_filter),
                Lead.company.ilike(search_filter)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    leads = query.order_by(desc(Lead.created_at)).offset(offset).limit(page_size).all()
    
    return LeadListResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific lead by ID.
    
    Permissions: All authenticated users (with role-based access)
    """
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Check permissions
    if current_user.role.name == "sales" and lead.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own leads"
        )
    
    return LeadResponse.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    lead_data: LeadUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "sales"])),
    db: Session = Depends(get_db)
):
    """
    Update a lead.
    
    Permissions: admin, manager, sales (own leads only)
    """
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Check permissions
    if current_user.role.name == "sales" and lead.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own leads"
        )
    
    # Update fields
    update_data = lead_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    
    db.commit()
    db.refresh(lead)
    
    # Invalidate caches
    await invalidate_cache("leads")
    
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", response_model=APIResponse)
async def delete_lead(
    lead_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Soft delete a lead.
    
    Permissions: admin, manager
    """
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Soft delete
    lead.deleted_at = datetime.utcnow()
    db.commit()
    
    # Invalidate caches
    await invalidate_cache("leads")
    
    return APIResponse(
        success=True,
        message="Lead deleted successfully"
    )


@router.post("/{lead_id}/convert", response_model=APIResponse)
async def convert_lead_to_client(
    lead_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager", "sales"])),
    db: Session = Depends(get_db)
):
    """
    Convert a lead to a client.
    
    This creates a new client record from the lead data and marks the lead as converted.
    
    Permissions: admin, manager, sales
    """
    from app.models.client import Client
    
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.deleted_at.is_(None)
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    if lead.status == "converted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead is already converted"
        )
    
    # Create new client from lead
    client_data = {
        "company_name": lead.company or f"{lead.first_name} {lead.last_name}",
        "primary_contact_name": f"{lead.first_name} {lead.last_name}",
        "primary_contact_email": lead.email,
        "primary_contact_phone": lead.phone,
        "account_manager_id": lead.assigned_to or current_user.id,
        "status": "active",
        "meta_data": lead.meta_data or {}
    }

    # Add notes to metadata if present
    if lead.notes:
        if not client_data["meta_data"]:
            client_data["meta_data"] = {}
        client_data["meta_data"]["notes"] = lead.notes

    # Add conversion audit log
    if not client_data["meta_data"]:
        client_data["meta_data"] = {}
    
    client_data["meta_data"]["conversion_log"] = {
        "converted_at": datetime.utcnow().isoformat(),
        "converted_by": str(current_user.id),
        "from_lead_id": str(lead.id),
        "original_source": lead.source
    }

    new_client = Client(**client_data)
    
    try:
        db.add(new_client)
        db.flush()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create client: {str(e)}"
        )
    
    # Update lead
    lead.status = "converted"
    lead.stage = "closed_won"
    lead.converted_to_client_id = new_client.id
    
    db.commit()
    
    # Invalidate caches
    await invalidate_cache("leads")
    
    return APIResponse(
        success=True,
        message="Lead converted to client successfully",
        data={"client_id": str(new_client.id)}
    )


@router.get("/pipeline/stats", response_model=dict)
@cache(expire=300, namespace="leads", key_builder=cache_key_builder)
async def get_pipeline_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get sales pipeline statistics.
    
    Returns lead counts and values by stage.
    """
    from sqlalchemy import func
    
    # Build base query
    query = db.query(
        Lead.stage,
        func.count(Lead.id).label('count'),
        func.sum(Lead.estimated_value).label('total_value')
    ).filter(Lead.deleted_at.is_(None))
    
    # Filter by role
    if current_user.role.name == "sales":
        query = query.filter(Lead.assigned_to == current_user.id)
    
    # Group by stage
    results = query.group_by(Lead.stage).all()
    
    # Format response
    pipeline_stats = {
        "stages": [],
        "total_leads": 0,
        "total_value": 0
    }
    
    for stage, count, total_value in results:
        pipeline_stats["stages"].append({
            "stage": stage,
            "count": count,
            "value": float(total_value) if total_value else 0
        })
        pipeline_stats["total_leads"] += count
        pipeline_stats["total_value"] += float(total_value) if total_value else 0
    
    return pipeline_stats
