"""
Task and timesheet models.
"""
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Task(Base):
    """Task model for work items."""
    __tablename__ = "tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='todo', index=True)  # todo, in_progress, review, completed, cancelled
    priority = Column(String(50), default='medium')  # low, medium, high, critical
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    estimated_hours = Column(Numeric(5, 2))
    actual_hours = Column(Numeric(5, 2), default=0)
    due_date = Column(Date, index=True)
    completed_at = Column(DateTime)
    meta_data = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    timesheets = relationship("Timesheet", back_populates="task")


class Timesheet(Base):
    """Timesheet model for time tracking."""
    __tablename__ = "timesheets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    hours = Column(Numeric(5, 2), nullable=False)
    date = Column(Date, nullable=False, index=True)
    description = Column(Text)
    billable = Column(Boolean, default=True)
    status = Column(String(50), default='pending', index=True)  # pending, approved, rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    approved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    task = relationship("Task", back_populates="timesheets")
    project = relationship("Project")
    approver = relationship("User", foreign_keys=[approved_by])
