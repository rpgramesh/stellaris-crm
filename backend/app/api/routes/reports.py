"""
Reports and analytics API routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, date, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.models.lead import Lead
from app.models.client import Client, Project
from app.models.task import Task, Timesheet
from app.models.ticket import Ticket
from app.models.invoice import Invoice, Payment
from app.models.user import User
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics.
    
    Returns key metrics across all modules for dashboard display.
    """
    # Date ranges
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    
    # Build base queries with role-based filtering
    leads_query = db.query(Lead).filter(Lead.deleted_at.is_(None))
    tasks_query = db.query(Task).filter(Task.deleted_at.is_(None))
    
    if current_user.role.name == "sales":
        leads_query = leads_query.filter(Lead.assigned_to == current_user.id)
    
    # Lead Statistics
    total_leads = leads_query.count()
    new_leads_this_month = leads_query.filter(Lead.created_at >= month_start).count()
    qualified_leads = leads_query.filter(Lead.status == 'qualified').count()
    converted_leads = leads_query.filter(Lead.status == 'converted').count()
    
    # Calculate lead conversion rate
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Sales Pipeline Value
    pipeline_value = db.query(func.sum(Lead.estimated_value)).filter(
        Lead.deleted_at.is_(None),
        Lead.stage.in_(['qualified', 'proposal', 'negotiation'])
    ).scalar() or 0
    
    # Client Statistics
    active_clients = db.query(Client).filter(
        Client.deleted_at.is_(None),
        Client.status == 'active'
    ).count()
    
    # Project Statistics
    active_projects = db.query(Project).filter(
        Project.deleted_at.is_(None),
        Project.status == 'in_progress'
    ).count()
    
    # Task Statistics
    pending_tasks = tasks_query.filter(Task.status.in_(['todo', 'in_progress'])).count()
    completed_tasks_this_month = tasks_query.filter(
        Task.status == 'completed',
        Task.completed_at >= month_start
    ).count()
    
    # Support Ticket Statistics
    open_tickets = db.query(Ticket).filter(Ticket.status.in_(['open', 'in_progress'])).count()
    tickets_this_month = db.query(Ticket).filter(Ticket.created_at >= month_start).count()
    
    # Financial Statistics
    revenue_this_month = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == 'paid',
        Invoice.created_at >= month_start
    ).scalar() or 0
    
    revenue_last_month = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.status == 'paid',
        Invoice.created_at >= last_month_start,
        Invoice.created_at < month_start
    ).scalar() or 0
    
    outstanding_invoices = db.query(func.sum(Invoice.total_amount - Invoice.amount_paid)).filter(
        Invoice.status.in_(['sent', 'overdue'])
    ).scalar() or 0
    
    overdue_invoices_count = db.query(Invoice).filter(
        Invoice.status == 'overdue'
    ).count()
    
    # Calculate revenue growth
    revenue_growth = 0
    if revenue_last_month > 0:
        revenue_growth = ((revenue_this_month - revenue_last_month) / revenue_last_month * 100)
    
    # Active Clients List (for tooltips)
    active_clients_list = db.query(Client.company_name).filter(
        Client.deleted_at.is_(None),
        Client.status == 'active'
    ).limit(5).all()
    
    # Projects Progress
    # Calculate average completion based on tasks
    active_projects_list = db.query(Project).filter(
        Project.deleted_at.is_(None),
        Project.status == 'in_progress'
    ).all()
    
    total_project_completion = 0
    projects_with_tasks = 0
    
    for project in active_projects_list:
        p_tasks_total = db.query(Task).filter(Task.project_id == project.id, Task.deleted_at.is_(None)).count()
        if p_tasks_total > 0:
            p_tasks_completed = db.query(Task).filter(Task.project_id == project.id, Task.status == 'completed', Task.deleted_at.is_(None)).count()
            total_project_completion += (p_tasks_completed / p_tasks_total * 100)
            projects_with_tasks += 1
            
    avg_project_completion = (total_project_completion / projects_with_tasks) if projects_with_tasks > 0 else 0

    return {
        "summary": {
            "total_leads": total_leads,
            "active_clients": active_clients,
            "active_clients_list": [c[0] for c in active_clients_list],
            "active_projects": active_projects,
            "avg_project_completion": round(avg_project_completion, 1),
            "pending_tasks": pending_tasks,
            "open_tickets": open_tickets
        },
        "leads": {
            "total": total_leads,
            "new_this_month": new_leads_this_month,
            "qualified": qualified_leads,
            "converted": converted_leads,
            "conversion_rate": round(conversion_rate, 2),
            "pipeline_value": float(pipeline_value)
        },
        "projects": {
            "active": active_projects,
            "total": db.query(Project).filter(Project.deleted_at.is_(None)).count()
        },
        "tasks": {
            "pending": pending_tasks,
            "completed_this_month": completed_tasks_this_month
        },
        "tickets": {
            "open": open_tickets,
            "created_this_month": tickets_this_month
        },
        "financial": {
            "revenue_this_month": float(revenue_this_month),
            "revenue_last_month": float(revenue_last_month),
            "revenue_growth_percent": round(revenue_growth, 2),
            "outstanding_amount": float(outstanding_invoices),
            "overdue_invoices": overdue_invoices_count
        }
    }


@router.get("/sales-pipeline")
async def get_sales_pipeline_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed sales pipeline report with leads by stage.
    """
    query = db.query(
        Lead.stage,
        func.count(Lead.id).label('count'),
        func.sum(Lead.estimated_value).label('total_value'),
        func.avg(Lead.score).label('avg_score')
    ).filter(Lead.deleted_at.is_(None))
    
    # Role-based filtering
    if current_user.role.name == "sales":
        query = query.filter(Lead.assigned_to == current_user.id)
    
    results = query.group_by(Lead.stage).all()
    
    # Define stage order
    stage_order = ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
    
    pipeline_data = []
    for stage in stage_order:
        stage_data = next((r for r in results if r[0] == stage), None)
        if stage_data:
            pipeline_data.append({
                "stage": stage,
                "count": stage_data[1],
                "value": float(stage_data[2]) if stage_data[2] else 0,
                "avg_score": round(float(stage_data[3]), 2) if stage_data[3] else 0
            })
        else:
            pipeline_data.append({
                "stage": stage,
                "count": 0,
                "value": 0,
                "avg_score": 0
            })
    
    return {
        "pipeline": pipeline_data,
        "total_leads": sum(p["count"] for p in pipeline_data),
        "total_value": sum(p["value"] for p in pipeline_data)
    }


@router.get("/revenue")
async def get_revenue_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period: str = Query("monthly", regex="^(weekly|monthly|quarterly)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get revenue report for specified date range and period.
    """
    # Default to current year if no dates provided
    if not start_date:
        start_date = date(datetime.now().year, 1, 1)
    if not end_date:
        end_date = date.today()
    
    # Base query for revenue
    base_query = db.query(
        func.sum(Invoice.total_amount).label('total'),
        func.count(Invoice.id).label('count')
    ).filter(
        Invoice.status == 'paid',
        Invoice.created_at >= start_date,
        Invoice.created_at <= end_date
    )
    
    revenue_data = []
    
    if period == "monthly":
        results = base_query.add_columns(
            extract('year', Invoice.created_at).label('year'),
            extract('month', Invoice.created_at).label('month')
        ).group_by('year', 'month').order_by('year', 'month').all()
        
        revenue_data = [
            {
                "label": f"{int(r.year)}-{int(r.month):02d}",
                "year": int(r.year),
                "month": int(r.month),
                "revenue": float(r.total),
                "invoice_count": r.count
            } for r in results
        ]
        
    elif period == "weekly":
        results = base_query.add_columns(
            extract('year', Invoice.created_at).label('year'),
            extract('week', Invoice.created_at).label('week')
        ).group_by('year', 'week').order_by('year', 'week').all()
        
        revenue_data = [
            {
                "label": f"{int(r.year)}-W{int(r.week):02d}",
                "year": int(r.year),
                "week": int(r.week),
                "revenue": float(r.total),
                "invoice_count": r.count
            } for r in results
        ]
        
    elif period == "quarterly":
        results = base_query.add_columns(
            extract('year', Invoice.created_at).label('year'),
            extract('quarter', Invoice.created_at).label('quarter')
        ).group_by('year', 'quarter').order_by('year', 'quarter').all()
        
        revenue_data = [
            {
                "label": f"{int(r.year)}-Q{int(r.quarter)}",
                "year": int(r.year),
                "quarter": int(r.quarter),
                "revenue": float(r.total),
                "invoice_count": r.count
            } for r in results
        ]
    
    # Payment method breakdown
    payment_methods = db.query(
        Payment.payment_method,
        func.sum(Payment.amount).label('total'),
        func.count(Payment.id).label('count')
    ).filter(
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date
    ).group_by(Payment.payment_method).all()
    
    return {
        "date_range": {
            "start": str(start_date),
            "end": str(end_date)
        },
        "period": period,
        "revenue_data": revenue_data,
        "payment_methods": [
            {
                "method": r[0] or "unspecified",
                "total": float(r[1]),
                "count": r[2]
            }
            for r in payment_methods
        ]
    }


@router.get("/team-performance")
async def get_team_performance_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get team performance metrics.
    
    Shows performance statistics per user.
    """
    # Only accessible to admin and managers
    if current_user.role.name not in ["admin", "manager"]:
        return {"error": "Insufficient permissions"}
    
    # Get all active users
    users = db.query(User).filter(
        User.is_active == True,
        User.deleted_at.is_(None)
    ).all()
    
    team_stats = []
    
    for user in users:
        # Leads assigned
        leads_count = db.query(Lead).filter(
            Lead.assigned_to == user.id,
            Lead.deleted_at.is_(None)
        ).count()
        
        # Leads converted
        converted_count = db.query(Lead).filter(
            Lead.assigned_to == user.id,
            Lead.status == 'converted',
            Lead.deleted_at.is_(None)
        ).count()
        
        # Tasks completed this month
        month_start = date.today().replace(day=1)
        tasks_completed = db.query(Task).filter(
            Task.assigned_to == user.id,
            Task.status == 'completed',
            Task.completed_at >= month_start,
            Task.deleted_at.is_(None)
        ).count()
        
        # Tickets handled
        tickets_resolved = db.query(Ticket).filter(
            Ticket.assigned_to == user.id,
            Ticket.status.in_(['resolved', 'closed'])
        ).count()
        
        # Hours logged this month
        hours_logged = db.query(func.sum(Timesheet.hours)).filter(
            Timesheet.user_id == user.id,
            Timesheet.date >= month_start
        ).scalar() or 0
        
        team_stats.append({
            "user_id": str(user.id),
            "name": user.full_name,
            "role": user.role.name,
            "leads_assigned": leads_count,
            "leads_converted": converted_count,
            "conversion_rate": round((converted_count / leads_count * 100), 2) if leads_count > 0 else 0,
            "tasks_completed_this_month": tasks_completed,
            "tickets_resolved": tickets_resolved,
            "hours_logged_this_month": float(hours_logged)
        })
    
    return {
        "team_performance": team_stats,
        "total_team_members": len(team_stats)
    }


@router.get("/project-profitability")
async def get_project_profitability_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get project profitability analysis.
    """
    projects = db.query(Project).filter(
        Project.deleted_at.is_(None)
    ).all()
    
    profitability_data = []
    
    for project in projects:
        profit = float(project.budget - project.actual_cost) if project.budget else None
        margin = ((profit / float(project.budget)) * 100) if project.budget and project.budget > 0 else 0
        
        # Get total hours logged
        total_hours = db.query(func.sum(Timesheet.hours)).filter(
            Timesheet.project_id == project.id
        ).scalar() or 0
        
        # Get tasks count
        tasks_count = db.query(Task).filter(
            Task.project_id == project.id,
            Task.deleted_at.is_(None)
        ).count()
        
        completed_tasks = db.query(Task).filter(
            Task.project_id == project.id,
            Task.status == 'completed',
            Task.deleted_at.is_(None)
        ).count()
        
        profitability_data.append({
            "project_id": str(project.id),
            "project_name": project.name,
            "client_id": str(project.client_id),
            "status": project.status,
            "budget": float(project.budget) if project.budget else 0,
            "actual_cost": float(project.actual_cost),
            "profit": profit if profit is not None else 0,
            "profit_margin_percent": round(margin, 2),
            "total_hours": float(total_hours),
            "tasks_total": tasks_count,
            "tasks_completed": completed_tasks,
            "completion_rate": round((completed_tasks / tasks_count * 100), 2) if tasks_count > 0 else 0
        })
    
    return {
        "projects": profitability_data,
        "summary": {
            "total_projects": len(profitability_data),
            "total_budget": sum(p["budget"] for p in profitability_data),
            "total_actual_cost": sum(p["actual_cost"] for p in profitability_data),
            "total_profit": sum(p["profit"] for p in profitability_data)
        }
    }


@router.get("/ticket-analytics")
async def get_ticket_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get support ticket analytics.
    """
    # Tickets by status
    tickets_by_status = db.query(
        Ticket.status,
        func.count(Ticket.id).label('count')
    ).group_by(Ticket.status).all()
    
    # Tickets by priority
    tickets_by_priority = db.query(
        Ticket.priority,
        func.count(Ticket.id).label('count')
    ).group_by(Ticket.priority).all()
    
    # Average resolution time (in hours)
    resolved_tickets = db.query(Ticket).filter(
        Ticket.resolved_at.isnot(None)
    ).all()
    
    resolution_times = []
    for ticket in resolved_tickets:
        resolution_time = (ticket.resolved_at - ticket.created_at).total_seconds() / 3600
        resolution_times.append(resolution_time)
    
    avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    
    # SLA compliance
    total_tickets = db.query(Ticket).count()
    tickets_within_sla = db.query(Ticket).filter(
        Ticket.resolved_at.isnot(None),
        Ticket.resolved_at <= Ticket.sla_due_at
    ).count()
    
    sla_compliance_rate = (tickets_within_sla / total_tickets * 100) if total_tickets > 0 else 0
    
    return {
        "by_status": [
            {"status": r[0], "count": r[1]}
            for r in tickets_by_status
        ],
        "by_priority": [
            {"priority": r[0], "count": r[1]}
            for r in tickets_by_priority
        ],
        "metrics": {
            "average_resolution_time_hours": round(avg_resolution_time, 2),
            "sla_compliance_rate": round(sla_compliance_rate, 2),
            "total_tickets": total_tickets,
            "tickets_within_sla": tickets_within_sla
        }
    }
