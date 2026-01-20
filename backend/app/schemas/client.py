"""
Pydantic schemas for client and project management.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from app.schemas.user import UserResponse


# Client Schemas
class ClientBase(BaseModel):
    """Base client schema."""
    company_name: str = Field(..., max_length=255)
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[EmailStr] = None
    primary_contact_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    tax_id: Optional[str] = None
    meta_data: Optional[dict] = None


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    pass


class ClientUpdate(BaseModel):
    """Schema for updating a client."""
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[EmailStr] = None
    primary_contact_phone: Optional[str] = None
    account_manager_id: Optional[UUID] = None
    status: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    tax_id: Optional[str] = None
    meta_data: Optional[dict] = None


class ClientResponse(ClientBase):
    """Schema for client response."""
    id: UUID
    account_manager_id: Optional[UUID] = None
    status: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ClientListResponse(BaseModel):
    """Schema for paginated client list."""
    items: list[ClientResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Project Schemas
class ProjectBase(BaseModel):
    """Base project schema."""
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = Field(default="medium", pattern="^(low|medium|high|critical)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    client_id: UUID


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    project_manager_id: Optional[UUID] = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""
    id: UUID
    client_id: UUID
    status: str
    actual_cost: Decimal
    project_manager_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """Schema for paginated project list."""
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ProjectWithClient(ProjectResponse):
    """Schema for project with client details."""
    client: ClientResponse
    
    model_config = ConfigDict(from_attributes=True)


# Project Member Schemas
class ProjectMemberBase(BaseModel):
    """Base project member schema."""
    role: str = "member"


class ProjectMemberCreate(ProjectMemberBase):
    """Schema for adding a member."""
    user_id: Optional[UUID] = None
    email: Optional[EmailStr] = None


class ProjectMemberUpdate(ProjectMemberBase):
    """Schema for updating a member role."""
    pass


class ProjectMemberResponse(ProjectMemberBase):
    """Schema for project member response."""
    project_id: UUID
    user_id: UUID
    user: UserResponse
    joined_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
