"""
Client and project management models.
"""
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Numeric, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Client(Base):
    """Client model for converted customers."""
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False, index=True)
    industry = Column(String(100))
    website = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    primary_contact_name = Column(String(255))
    primary_contact_email = Column(String(255))
    primary_contact_phone = Column(String(50))
    account_manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    status = Column(String(50), default='active', index=True)  # active, inactive, churned
    payment_terms = Column(String(50))  # net_30, net_60, etc.
    credit_limit = Column(Numeric(12, 2))
    tax_id = Column(String(100))
    meta_data = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    account_manager = relationship("User", foreign_keys=[account_manager_id])
    projects = relationship("Project", back_populates="client")


class ProjectMember(Base):
    """Project member model for team management."""
    __tablename__ = "project_members"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(50), default="member")  # admin, editor, viewer
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")


class Project(Base):
    """Project model for client work."""
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='planning', index=True)  # planning, in_progress, on_hold, completed, cancelled
    priority = Column(String(50), default='medium')  # low, medium, high, critical
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Numeric(12, 2))
    actual_cost = Column(Numeric(12, 2), default=0)
    project_manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    meta_data = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    client = relationship("Client", back_populates="projects")
    project_manager = relationship("User", foreign_keys=[project_manager_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

    @property
    def progress(self):
        """
        Calculate project progress based on completed tasks.
        
        Formula: (Completed Active Tasks / Total Active Tasks) * 100
        Active Tasks: Tasks where deleted_at is None.
        """
        if not self.tasks:
            return 0
            
        active_tasks = [t for t in self.tasks if t.deleted_at is None]
        total = len(active_tasks)
        if total == 0:
            return 0
            
        completed = len([t for t in active_tasks if t.status == 'completed'])
        return int((completed / total) * 100)
