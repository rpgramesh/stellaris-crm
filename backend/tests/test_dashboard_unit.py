
import os
os.environ["DATABASE_URL"] = "postgresql://user:password@localhost/dbname"
os.environ["SECRET_KEY"] = "test_secret_key"

import pytest
import uuid
from unittest.mock import MagicMock, call
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime

from app.main import app
from app.api.dependencies import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.models.task import Task
from app.models.lead import Lead
from app.models.client import Client, Project
from app.models.ticket import Ticket
from app.models.invoice import Invoice, Payment

client_instance = TestClient(app)

@pytest.fixture
def client():
    return client_instance

@pytest.fixture
def mock_db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def mock_admin_user():
    mock_role = MagicMock()
    mock_role.name = "admin"
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.role = mock_role
    user.is_active = True
    return user

def test_list_tasks_with_due_before(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    # Mock query chain
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.outerjoin.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.offset.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.all.return_value = []
    mock_query.count.return_value = 0

    due_date = (date.today() + timedelta(days=7)).isoformat()
    response = client.get(f"/api/v1/tasks/?due_before={due_date}")

    assert response.status_code == 200
    # We can't easily verify the exact filter argument with simple mocks without complex side_effects,
    # but we can verify that query was called.
    assert mock_db_session.query.called
    
    app.dependency_overrides = {}

def test_get_dashboard_stats(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    # Create distinct mocks for different queries
    # We need to handle queries for Lead, Task, Client, Project, Ticket, Invoice
    
    def query_side_effect(*args):
        mock_q = MagicMock()
        mock_q.filter.return_value = mock_q
        mock_q.count.return_value = 5
        mock_q.scalar.return_value = 1000
        mock_q.limit.return_value = mock_q
        
        # Specific behavior based on model
        if args and args[0] is Client.company_name:
            # For active_clients_list
            mock_q.all.return_value = [("Client A",), ("Client B",)]
        elif args and args[0] is Project:
             # For active_projects_list
            p1 = MagicMock()
            p1.id = 1
            mock_q.all.return_value = [p1]
        elif args and args[0] is Task:
             # For project tasks logic
             # This is tricky because it's queried inside a loop
             mock_q.count.return_value = 10 # 10 tasks total, 10 completed (reused mock)
        else:
            mock_q.all.return_value = []
            
        return mock_q

    mock_db_session.query.side_effect = query_side_effect

    response = client.get("/api/v1/reports/dashboard")

    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert "summary" in data
    assert "leads" in data
    assert "projects" in data
    assert "tasks" in data
    assert "tickets" in data
    assert "financial" in data

    # Verify new fields
    assert "active_clients_list" in data["summary"]
    assert len(data["summary"]["active_clients_list"]) == 2
    assert "Client A" in data["summary"]["active_clients_list"]
    
    assert "avg_project_completion" in data["summary"]
    # 10 completed / 10 total * 100 = 100.0
    assert data["summary"]["avg_project_completion"] == 100.0
    
    app.dependency_overrides = {}

def test_get_revenue_report_monthly(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.add_columns.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    
    # Mock result row
    mock_row = MagicMock()
    mock_row.year = 2023
    mock_row.month = 10
    mock_row.total = 5000.00
    mock_row.count = 3
    
    mock_query.all.return_value = [mock_row]

    response = client.get("/api/v1/reports/revenue?period=monthly")

    assert response.status_code == 200
    data = response.json()
    
    assert "revenue_data" in data
    assert len(data["revenue_data"]) == 1
    assert data["revenue_data"][0]["label"] == "2023-10"
    assert data["revenue_data"][0]["revenue"] == 5000.0
    
    app.dependency_overrides = {}

def test_get_revenue_report_weekly(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.add_columns.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    
    # Mock result row for weekly
    mock_row = MagicMock()
    mock_row.year = 2023
    mock_row.week = 42
    mock_row.total = 2000.00
    mock_row.count = 5
    
    mock_query.all.return_value = [mock_row]

    response = client.get("/api/v1/reports/revenue?period=weekly")

    assert response.status_code == 200
    data = response.json()
    
    assert "revenue_data" in data
    assert len(data["revenue_data"]) == 1
    assert data["revenue_data"][0]["label"] == "2023-W42"
    
    app.dependency_overrides = {}

def test_get_revenue_report_quarterly(client, mock_db_session, mock_admin_user):
    app.dependency_overrides[get_current_active_user] = lambda: mock_admin_user
    app.dependency_overrides[get_db] = lambda: mock_db_session

    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.add_columns.return_value = mock_query
    mock_query.group_by.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    
    # Mock result row for quarterly
    mock_row = MagicMock()
    mock_row.year = 2023
    mock_row.quarter = 4
    mock_row.total = 15000.00
    mock_row.count = 10
    
    mock_query.all.return_value = [mock_row]

    response = client.get("/api/v1/reports/revenue?period=quarterly")

    assert response.status_code == 200
    data = response.json()
    
    assert "revenue_data" in data
    assert len(data["revenue_data"]) == 1
    assert data["revenue_data"][0]["label"] == "2023-Q4"
    
    app.dependency_overrides = {}
