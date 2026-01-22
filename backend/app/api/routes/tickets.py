"""
Support ticket API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi_cache.decorator import cache
from app.core.redis import cache_key_builder, invalidate_cache
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from uuid import UUID
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.ticket import Ticket, TicketComment
from app.models.user import User
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    TicketCommentCreate,
    TicketCommentResponse
)
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil
import secrets

router = APIRouter(prefix="/tickets", tags=["Support Tickets"])


def generate_ticket_number() -> str:
    """Generate a unique ticket number."""
    return f"TKT-{secrets.token_hex(4).upper()}"


def calculate_sla_due_date(priority: str) -> datetime:
    """Calculate SLA due date based on priority."""
    sla_hours = {
        "critical": 4,
        "high": 24,
        "medium": 48,
        "low": 72
    }
    hours = sla_hours.get(priority, 48)
    return datetime.utcnow() + timedelta(hours=hours)


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket."""
    new_ticket = Ticket(
        **ticket_data.model_dump(),
        ticket_number=generate_ticket_number(),
        created_by=current_user.id,
        sla_due_at=calculate_sla_due_date(ticket_data.priority or "medium"),
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
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    # Invalidate caches
    await invalidate_cache("tickets")
    await invalidate_cache("reports")
    
    return TicketResponse.model_validate(new_ticket)


@router.get("", response_model=TicketListResponse)
@cache(expire=60, namespace="tickets", key_builder=cache_key_builder)
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List tickets with pagination and filtering."""
    query = db.query(Ticket)
    
    # Role-based filtering
    if current_user.role.name == "support":
        query = query.filter(
            or_(
                Ticket.assigned_to == current_user.id,
                Ticket.assigned_to.is_(None)
            )
        )
    
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if assigned_to:
        query = query.filter(Ticket.assigned_to == assigned_to)
    if client_id:
        query = query.filter(Ticket.client_id == client_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Ticket.ticket_number.ilike(search_filter),
                Ticket.subject.ilike(search_filter),
                Ticket.description.ilike(search_filter)
            )
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    tickets = query.order_by(desc(Ticket.created_at)).offset(offset).limit(page_size).all()
    
    return TicketListResponse(
        items=[TicketResponse.model_validate(ticket) for ticket in tickets],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
@cache(expire=60, namespace="tickets", key_builder=cache_key_builder)
async def get_ticket(
    ticket_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific ticket by ID."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    ticket_data: TicketUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "support"])),
    db: Session = Depends(get_db)
):
    """Update a ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    update_data = ticket_data.model_dump(exclude_unset=True)
    
    # Update resolved/closed timestamps
    if 'status' in update_data:
        if update_data['status'] == 'resolved' and not ticket.resolved_at:
            ticket.resolved_at = datetime.utcnow()
        elif update_data['status'] == 'closed' and not ticket.closed_at:
            ticket.closed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(ticket, field, value)
    
    # Audit logging
    audit_entry = {
        "action": "updated",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "changes": list(update_data.keys())
    }
    
    current_meta = dict(ticket.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    ticket.meta_data = current_meta

    db.commit()
    db.refresh(ticket)
    
    # Invalidate caches
    await invalidate_cache("tickets")
    await invalidate_cache("reports")
    
    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse)
async def add_ticket_comment(
    ticket_id: UUID,
    comment_data: TicketCommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    new_comment = TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        **comment_data.model_dump()
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Invalidate tickets cache
    await invalidate_cache("tickets")
    
    return TicketCommentResponse.model_validate(new_comment)


@router.get("/{ticket_id}/comments", response_model=list[TicketCommentResponse])
@cache(expire=60, namespace="tickets", key_builder=cache_key_builder)
async def get_ticket_comments(
    ticket_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all comments for a ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    comments = db.query(TicketComment).filter(
        TicketComment.ticket_id == ticket_id
    ).order_by(TicketComment.created_at).all()
    
    return [TicketCommentResponse.model_validate(c) for c in comments]
