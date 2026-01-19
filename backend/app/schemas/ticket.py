"""
Pydantic schemas for support ticket management.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


# Ticket Schemas
class TicketBase(BaseModel):
    """Base ticket schema."""
    subject: str = Field(..., max_length=255)
    description: str
    priority: Optional[str] = Field(default="medium", pattern="^(low|medium|high|critical)$")
    category: Optional[str] = None
    channel: Optional[str] = None


class TicketCreate(TicketBase):
    """Schema for creating a new ticket."""
    client_id: Optional[UUID] = None


class TicketUpdate(BaseModel):
    """Schema for updating a ticket."""
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[UUID] = None


class TicketResponse(TicketBase):
    """Schema for ticket response."""
    id: UUID
    ticket_number: str
    client_id: Optional[UUID] = None
    status: str
    assigned_to: Optional[UUID] = None
    created_by: Optional[UUID] = None
    sla_due_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    """Schema for paginated ticket list."""
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Ticket Comment Schemas
class TicketCommentCreate(BaseModel):
    """Schema for creating a ticket comment."""
    comment: str
    is_internal: bool = False


class TicketCommentResponse(BaseModel):
    """Schema for ticket comment response."""
    id: UUID
    ticket_id: UUID
    user_id: Optional[UUID] = None
    comment: str
    is_internal: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
