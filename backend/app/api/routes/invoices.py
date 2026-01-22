"""
Invoice management API routes.
"""
from typing import Optional
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from fastapi_cache.decorator import cache
from app.core.redis import cache_key_builder, invalidate_cache
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from app.core.database import get_db
from app.models.invoice import Invoice, InvoiceItem, Payment
from app.models.client import Client
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    PaymentCreate,
    PaymentResponse,
    PaymentListResponse
)
from app.schemas.user import APIResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from math import ceil
import secrets

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_invoice_number() -> str:
    """Generate a unique invoice number."""
    return f"INV-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"


def calculate_invoice_totals(items: list, tax_amount: Decimal, discount_amount: Decimal) -> dict:
    """Calculate invoice totals."""
    subtotal = sum(Decimal(item.quantity) * Decimal(item.unit_price) for item in items)
    total = subtotal + tax_amount - discount_amount
    
    return {
        "subtotal": subtotal,
        "total_amount": total
    }


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Create a new invoice with line items.
    
    Permissions: admin, manager, finance
    """
    # Verify client exists
    client = db.query(Client).filter(
        Client.id == invoice_data.client_id,
        Client.deleted_at.is_(None)
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Calculate totals
    totals = calculate_invoice_totals(
        invoice_data.items,
        invoice_data.tax_amount,
        invoice_data.discount_amount
    )
    
    # Create invoice
    new_invoice = Invoice(
        invoice_number=generate_invoice_number(),
        client_id=invoice_data.client_id,
        project_id=invoice_data.project_id,
        issue_date=invoice_data.issue_date,
        due_date=invoice_data.due_date,
        subtotal=totals["subtotal"],
        tax_amount=invoice_data.tax_amount,
        discount_amount=invoice_data.discount_amount,
        total_amount=totals["total_amount"],
        payment_terms=invoice_data.payment_terms,
        notes=invoice_data.notes,
        created_by=current_user.id,
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
    
    db.add(new_invoice)
    db.flush()
    
    # Create invoice items
    for item_data in invoice_data.items:
        item_amount = item_data.quantity * item_data.unit_price
        item = InvoiceItem(
            invoice_id=new_invoice.id,
            **item_data.model_dump(),
            amount=item_amount
        )
        db.add(item)
    
    db.commit()
    db.refresh(new_invoice)
    
    # Invalidate invoices cache
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return InvoiceResponse.model_validate(new_invoice)


@router.get("", response_model=InvoiceListResponse)
@cache(expire=60, key_builder=cache_key_builder, namespace="invoices")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    client_id: Optional[UUID] = Query(None),
    project_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List invoices with pagination and filtering.
    
    Permissions: All authenticated users
    """
    query = db.query(Invoice)
    
    if status:
        query = query.filter(Invoice.status == status)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if project_id:
        query = query.filter(Invoice.project_id == project_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Invoice.invoice_number.ilike(search_filter))
    
    # Check for overdue invoices and update status
    today = date.today()
    overdue_invoices = query.filter(
        Invoice.status == 'sent',
        Invoice.due_date < today
    ).all()
    
    for inv in overdue_invoices:
        inv.status = 'overdue'
    
    if overdue_invoices:
        db.commit()
    
    total = query.count()
    offset = (page - 1) * page_size
    invoices = query.order_by(desc(Invoice.created_at)).offset(offset).limit(page_size).all()
    
    return InvoiceListResponse(
        items=[InvoiceResponse.model_validate(inv) for inv in invoices],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
@cache(expire=60, key_builder=cache_key_builder, namespace="invoices")
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific invoice by ID with all line items."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return InvoiceResponse.model_validate(invoice)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(RoleChecker(["admin", "manager", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Update an invoice.
    
    Permissions: admin, manager, finance
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.status == 'paid':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a paid invoice"
        )
    
    update_data = invoice_data.model_dump(exclude_unset=True)
    
    # Recalculate total if tax or discount changed
    if 'tax_amount' in update_data or 'discount_amount' in update_data:
        tax = update_data.get('tax_amount', invoice.tax_amount)
        discount = update_data.get('discount_amount', invoice.discount_amount)
        invoice.total_amount = invoice.subtotal + tax - discount
    
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    # Audit logging
    audit_entry = {
        "action": "updated",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "changes": list(update_data.keys())
    }
    
    current_meta = dict(invoice.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    invoice.meta_data = current_meta

    db.commit()
    db.refresh(invoice)
    
    # Invalidate invoices cache
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return InvoiceResponse.model_validate(invoice)


@router.delete("/{invoice_id}", response_model=APIResponse)
async def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Delete an invoice (only draft or cancelled).
    
    Permissions: admin, finance
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.status not in ['draft', 'cancelled']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft or cancelled invoices"
        )
    
    db.delete(invoice)
    db.commit()
    
    # Invalidate invoices cache
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return APIResponse(
        success=True,
        message="Invoice deleted successfully"
    )


@router.post("/{invoice_id}/approve", response_model=APIResponse)
async def approve_invoice(
    invoice_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Approve an invoice.
    
    Permissions: admin, manager, finance
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.status != 'draft':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only approve draft invoices"
        )
    
    invoice.status = 'approved'
    invoice.approved_by = current_user.id
    invoice.approved_at = datetime.utcnow()
    
    # Audit logging
    audit_entry = {
        "action": "approved",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    current_meta = dict(invoice.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    invoice.meta_data = current_meta
    
    db.commit()
    
    # Invalidate invoices cache
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return APIResponse(
        success=True,
        message="Invoice approved successfully"
    )


from app.services.pdf_service import generate_invoice_pdf

@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate and download invoice PDF.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    pdf_buffer = generate_invoice_pdf(invoice)
    filename = f"invoice_{invoice.invoice_number}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/{invoice_id}/send", response_model=APIResponse)
async def send_invoice(
    invoice_id: UUID,
    current_user: User = Depends(RoleChecker(["admin", "manager", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Mark invoice as sent and mock email sending with PDF.
    
    Permissions: admin, manager, finance
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if invoice.status not in ['draft', 'approved']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send draft or approved invoices"
        )
    
    # Generate PDF
    try:
        pdf_buffer = generate_invoice_pdf(invoice)
        # Mock email sending
        print(f"Sending email to client {invoice.client.email if invoice.client else 'unknown'} with invoice {invoice.invoice_number}")
        # In a real app, you would attach pdf_buffer.getvalue() to an email
    except Exception as e:
        print(f"Error generating PDF for email: {e}")
        # Log error but proceed with status update or raise exception depending on requirements
    
    invoice.status = 'sent'
    
    # Audit logging
    audit_entry = {
        "action": "sent",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    current_meta = dict(invoice.meta_data or {})
    audit_log = current_meta.get("audit_log", [])
    audit_log.append(audit_entry)
    current_meta["audit_log"] = audit_log
    invoice.meta_data = current_meta
    
    db.commit()
    
    # Invalidate invoices cache
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return APIResponse(
        success=True,
        message="Invoice sent successfully"
    )


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(RoleChecker(["admin", "finance"])),
    db: Session = Depends(get_db)
):
    """
    Record a payment for an invoice.
    
    Permissions: admin, finance
    """
    invoice = db.query(Invoice).filter(Invoice.id == payment_data.invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check if payment amount is valid
    remaining_amount = invoice.total_amount - invoice.amount_paid
    if payment_data.amount > remaining_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount exceeds remaining balance of {remaining_amount}"
        )
    
    # Create payment
    new_payment = Payment(
        invoice_id=invoice.id,
        client_id=invoice.client_id,
        **payment_data.model_dump(exclude={'invoice_id'}),
        created_by=current_user.id
    )
    
    db.add(new_payment)
    
    # Update invoice
    invoice.amount_paid += payment_data.amount
    
    if invoice.amount_paid >= invoice.total_amount:
        invoice.status = 'paid'
    
    db.commit()
    db.refresh(new_payment)
    
    # Invalidate invoices cache (since payments affect invoice status)
    await invalidate_cache("invoices")
    await invalidate_cache("reports")
    
    return PaymentResponse.model_validate(new_payment)


@router.get("/payments/list", response_model=PaymentListResponse)
@cache(expire=60, key_builder=cache_key_builder, namespace="invoices")
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    client_id: Optional[UUID] = Query(None),
    invoice_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List payments with pagination and filtering.
    """
    query = db.query(Payment)
    
    if client_id:
        query = query.filter(Payment.client_id == client_id)
    if invoice_id:
        query = query.filter(Payment.invoice_id == invoice_id)
    
    total = query.count()
    offset = (page - 1) * page_size
    payments = query.order_by(desc(Payment.created_at)).offset(offset).limit(page_size).all()
    
    return PaymentListResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        pages=ceil(total / page_size) if total > 0 else 0
    )
