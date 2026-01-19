"""
Pydantic schemas for lead management.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


class LeadBase(BaseModel):
    """Base lead schema."""
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    source: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    """Schema for creating a new lead."""
    pass


class LeadUpdate(BaseModel):
    """Schema for updating a lead."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)
    estimated_value: Optional[Decimal] = None
    expected_close_date: Optional[date] = None
    assigned_to: Optional[UUID] = None
    notes: Optional[str] = None


class LeadResponse(LeadBase):
    """Schema for lead response."""
    id: UUID
    status: str
    stage: str
    score: int
    assigned_to: Optional[UUID] = None
    converted_to_client_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LeadListResponse(BaseModel):
    """Schema for paginated lead list."""
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
    pages: int
