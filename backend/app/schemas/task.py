"""
Pydantic schemas for task and timesheet management.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# Task Schemas
class TaskBase(BaseModel):
    """Base task schema."""
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    priority: Optional[str] = Field(default="medium", pattern="^(low|medium|high|critical)$")
    estimated_hours: Optional[Decimal] = None
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    """Schema for creating a new task."""
    project_id: UUID
    assigned_to: Optional[UUID] = None
    status: Optional[str] = "todo"


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[UUID] = None
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    due_date: Optional[date] = None


class TaskResponse(TaskBase):
    """Schema for task response."""
    id: UUID
    project_id: UUID
    status: str
    actual_hours: Decimal
    assigned_to: Optional[UUID] = None
    created_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Schema for paginated task list."""
    items: list[TaskResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Timesheet Schemas
class TimesheetBase(BaseModel):
    """Base timesheet schema."""
    hours: Decimal = Field(..., gt=0, le=24)
    date: date
    description: Optional[str] = None
    billable: bool = True


class TimesheetCreate(TimesheetBase):
    """Schema for creating a timesheet entry."""
    task_id: UUID
    project_id: UUID


class TimesheetUpdate(BaseModel):
    """Schema for updating a timesheet entry."""
    hours: Optional[Decimal] = None
    date: Optional[date] = None
    description: Optional[str] = None
    billable: Optional[bool] = None


class TimesheetResponse(TimesheetBase):
    """Schema for timesheet response."""
    id: UUID
    user_id: UUID
    task_id: UUID
    project_id: UUID
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TimesheetListResponse(BaseModel):
    """Schema for paginated timesheet list."""
    items: list[TimesheetResponse]
    total: int
    page: int
    page_size: int
    pages: int
