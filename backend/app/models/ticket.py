"""
Support ticket models.
"""
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Ticket(Base):
    """Support ticket model."""
    __tablename__ = "tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default='open', index=True)  # open, in_progress, waiting_customer, resolved, closed
    priority = Column(String(50), default='medium', index=True)  # low, medium, high, critical
    category = Column(String(100))  # bug, feature_request, question, incident
    channel = Column(String(50))  # email, phone, chat, portal
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    sla_due_at = Column(DateTime, index=True)
    resolved_at = Column(DateTime)
    closed_at = Column(DateTime)
    meta_data = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")


class TicketComment(Base):
    """Ticket comment model."""
    __tablename__ = "ticket_comments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Internal notes vs customer-visible
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="comments")
    user = relationship("User")
