"""
Lead and sales pipeline models.
"""
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Date, Numeric, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Lead(Base):
    """Lead model for potential customers."""
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), index=True)
    phone = Column(String(50))
    company = Column(String(255))
    job_title = Column(String(100))
    source = Column(String(50))  # website, referral, cold_call, etc.
    status = Column(String(50), default='new', index=True)  # new, contacted, qualified, converted, lost
    stage = Column(String(50), default='prospect', index=True)  # prospect, qualified, proposal, negotiation, closed_won, closed_lost
    score = Column(Integer, default=0)  # Lead score (0-100)
    estimated_value = Column(Numeric(12, 2))
    expected_close_date = Column(Date)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    converted_to_client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"))
    notes = Column(Text)
    meta_data = Column("metadata", JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    converted_client = relationship("Client", foreign_keys=[converted_to_client_id])
