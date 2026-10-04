"""Report generation utilities for PDF and Excel exports."""

from io import BytesIO
from datetime import datetime
from typing import List

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Scan, Finding, Severity


def generate_pdf_report(scan_id: int, db: Session) -> BytesIO:
    """Generate a PDF report for a scan.
    
    Args:
        scan_id: The ID of the scan
        db: Database session
        
    Returns:
        BytesIO: PDF file as bytes
    """
    scan = db.get(Scan, scan_id)
    if not scan:
        raise ValueError("Scan not found")
    
    findings = db.scalars(
        select(Finding).where(Finding.scan_id == scan_id)
    ).all()
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#2E5AAC'),
        spaceAfter=30
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#333333'),
        spaceAfter=12
    )
    
    # Title
    story.append(Paragraph("Security Scan Report", title_style))
    story.append(Spacer(1, 0.2 * inch))
    
    # Scan Summary
    story.append(Paragraph("Scan Summary", heading_style))
    summary_data = [
        ["Target:", scan.target],
        ["Scan Type:", scan.scan_type],
        ["Status:", scan.status.value],
        ["Created At:", scan.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")],
        ["Finished At:", scan.finished_at.strftime("%Y-%m-%d %H:%M:%S UTC") if scan.finished_at else "N/A"],
    ]
    
    summary_table = Table(summary_data, colWidths=[1.5 * inch, 4 * inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.white),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3 * inch))
    
    # Findings Summary
    severity_counts = {s.value: 0 for s in Severity}
    for finding in findings:
        severity_counts[finding.severity.value] += 1
    
    story.append(Paragraph("Findings Summary", heading_style))
    summary_counts_data = [
        ["Severity", "Count"],
        ["Critical", str(severity_counts["critical"])],
        ["High", str(severity_counts["high"])],
        ["Medium", str(severity_counts["medium"])],
        ["Low", str(severity_counts["low"])],
        ["Info", str(severity_counts["info"])],
        ["Total", str(len(findings))],
    ]
    
    summary_counts_table = Table(summary_counts_data, colWidths=[2 * inch, 2 * inch])
    summary_counts_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E5AAC')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(summary_counts_table)
    story.append(Spacer(1, 0.3 * inch))
    
    # Detailed Findings
    story.append(Paragraph("Detailed Findings", heading_style))
    
    for i, finding in enumerate(findings, 1):
        # Severity color
        severity_colors = {
            "critical": colors.red,
            "high": colors.orange,
            "medium": colors.yellow,
            "low": colors.green,
            "info": colors.blue
        }
        severity_color = severity_colors.get(finding.severity.value, colors.black)
        
        story.append(Paragraph(f"{i}. {finding.title}", ParagraphStyle(
            'FindingTitle',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=severity_color,
            spaceAfter=6
        )))
        
        story.append(Paragraph(f"<b>Severity:</b> {finding.severity.value.upper()}", styles['Normal']))
        story.append(Paragraph(f"<b>Description:</b> {finding.description}", styles['Normal']))
        story.append(Paragraph(f"<b>Recommendation:</b> {finding.recommendation}", styles['Normal']))
        story.append(Paragraph(f"<b>Status:</b> {'Resolved' if finding.resolved else 'Open'}", styles['Normal']))
        story.append(Spacer(1, 0.2 * inch))
    
    # Footer
    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(
        f"Report generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} by VerideumDefence",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    ))
    
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_excel_report(scan_id: int, db: Session) -> BytesIO:
    """Generate an Excel report for a scan.
    
    Args:
        scan_id: The ID of the scan
        db: Database session
        
    Returns:
        BytesIO: Excel file as bytes
    """
    scan = db.get(Scan, scan_id)
    if not scan:
        raise ValueError("Scan not found")
    
    findings = db.scalars(
        select(Finding).where(Finding.scan_id == scan_id)
    ).all()
    
    buffer = BytesIO()
    
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        # Scan Summary Sheet
        summary_data = {
            "Field": ["Target", "Scan Type", "Status", "Created At", "Finished At"],
            "Value": [
                scan.target,
                scan.scan_type,
                scan.status.value,
                scan.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                scan.finished_at.strftime("%Y-%m-%d %H:%M:%S UTC") if scan.finished_at else "N/A"
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        
        # Findings Sheet
        findings_data = []
        for finding in findings:
            findings_data.append({
                "ID": finding.id,
                "Title": finding.title,
                "Severity": finding.severity.value,
                "Description": finding.description,
                "Recommendation": finding.recommendation,
                "Status": "Resolved" if finding.resolved else "Open",
                "Created At": finding.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            })
        
        findings_df = pd.DataFrame(findings_data)
        findings_df.to_excel(writer, sheet_name="Findings", index=False)
        
        # Severity Summary Sheet
        severity_counts = {s.value: 0 for s in Severity}
        for finding in findings:
            severity_counts[finding.severity.value] += 1
        
        severity_data = {
            "Severity": ["Critical", "High", "Medium", "Low", "Info", "Total"],
            "Count": [
                severity_counts["critical"],
                severity_counts["high"],
                severity_counts["medium"],
                severity_counts["low"],
                severity_counts["info"],
                len(findings)
            ]
        }
        severity_df = pd.DataFrame(severity_data)
        severity_df.to_excel(writer, sheet_name="Severity Summary", index=False)
    
    buffer.seek(0)
    return buffer
