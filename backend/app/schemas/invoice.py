"""
Pydantic schemas for invoice and payment management.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# Invoice Item Schemas
class InvoiceItemBase(BaseModel):
    """Base invoice item schema."""
    description: str
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=0, ge=0, le=100)


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating an invoice item."""
    pass


class InvoiceItemResponse(InvoiceItemBase):
    """Schema for invoice item response."""
    id: UUID
    invoice_id: UUID
    amount: Decimal
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Invoice Schemas
class InvoiceBase(BaseModel):
    """Base invoice schema."""
    client_id: UUID
    project_id: Optional[UUID] = None
    issue_date: date
    due_date: date
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    """Schema for creating an invoice."""
    items: List[InvoiceItemCreate]
    tax_amount: Decimal = Field(default=0, ge=0)
    discount_amount: Decimal = Field(default=0, ge=0)


class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice."""
    project_id: Optional[UUID] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    tax_amount: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None


class InvoiceResponse(InvoiceBase):
    """Schema for invoice response."""
    id: UUID
    invoice_number: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    currency: str
    created_by: Optional[UUID] = None
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    meta_data: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(BaseModel):
    """Schema for paginated invoice list."""
    items: list[InvoiceResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Payment Schemas
class PaymentBase(BaseModel):
    """Base payment schema."""
    amount: Decimal = Field(..., gt=0)
    payment_method: Optional[str] = None
    payment_date: date
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    """Schema for creating a payment."""
    invoice_id: UUID


class PaymentResponse(PaymentBase):
    """Schema for payment response."""
    id: UUID
    invoice_id: UUID
    client_id: UUID
    currency: str
    created_by: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PaymentListResponse(BaseModel):
    """Schema for paginated payment list."""
    items: list[PaymentResponse]
    total: int
    page: int
    page_size: int
    pages: int
