from io import BytesIO
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.models.invoice import Invoice

def generate_invoice_pdf(invoice: Invoice) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()

    # Logo
    current_dir = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.abspath(os.path.join(current_dir, "../../../public/stellaris-logo-new.png"))
    
    if os.path.exists(logo_path):
        # Add logo with fixed width/height - adjust aspect ratio as needed
        # Assuming a wide logo approx 4:1 ratio
        elements.append(Image(logo_path, width=2.5*inch, height=0.6*inch))
        elements.append(Spacer(1, 12))

    # Title
    elements.append(Paragraph(f"INVOICE {invoice.invoice_number}", styles['Title']))
    elements.append(Spacer(1, 12))

    # Header Info
    header_data = [
        ["Issue Date:", str(invoice.issue_date)],
        ["Due Date:", str(invoice.due_date)],
        ["Status:", invoice.status.upper()],
        ["Client:", invoice.client.company_name if invoice.client else "N/A"]
    ]
    t = Table(header_data, colWidths=[100, 200])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 24))

    # Items Table
    data = [['Description', 'Quantity', 'Unit Price', 'Total']]
    for item in invoice.items:
        data.append([
            item.description,
            str(item.quantity),
            f"${item.unit_price:,.2f}",
            f"${item.amount:,.2f}"
        ])
    
    # Totals
    data.append(['', '', 'Subtotal:', f"${invoice.subtotal:,.2f}"])
    if invoice.tax_amount > 0:
        data.append(['', '', 'Tax:', f"${invoice.tax_amount:,.2f}"])
    if invoice.discount_amount > 0:
        data.append(['', '', 'Discount:', f"-${invoice.discount_amount:,.2f}"])
    data.append(['', '', 'Total:', f"${invoice.total_amount:,.2f}"])

    table = Table(data, colWidths=[300, 80, 80, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -4), 1, colors.black),
        # Align numbers to right
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    elements.append(table)
    
    # Notes
    if invoice.notes:
        elements.append(Spacer(1, 24))
        elements.append(Paragraph("Notes:", styles['Heading3']))
        elements.append(Paragraph(invoice.notes, styles['Normal']))

    doc.build(elements)
    buffer.seek(0)
    return buffer
