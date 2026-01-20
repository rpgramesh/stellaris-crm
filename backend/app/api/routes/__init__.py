"""
API routes package.
"""
from app.api.routes.auth import router as auth_router
from app.api.routes.leads import router as leads_router
from app.api.routes.clients import router as clients_router
from app.api.routes.projects import router as projects_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.invoices import router as invoices_router
from app.api.routes.reports import router as reports_router
from app.api.routes.users import router as users_router

__all__ = [
    "auth_router",
    "leads_router",
    "clients_router",
    "projects_router",
    "tasks_router",
    "tickets_router",
    "invoices_router",
    "reports_router",
    "users_router",
]
