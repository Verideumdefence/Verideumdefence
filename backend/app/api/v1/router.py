from fastapi import APIRouter

from app.api.v1 import auth, audit_logs, clients, documents, inquiries, messages, projects, reports, requests, scans, tickets, users, website, websocket

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(scans.router)
api_router.include_router(requests.router)
api_router.include_router(clients.router)
api_router.include_router(projects.router)
api_router.include_router(tickets.router)
api_router.include_router(messages.router)
api_router.include_router(documents.router)
api_router.include_router(inquiries.router)
api_router.include_router(audit_logs.router)
api_router.include_router(reports.router)
api_router.include_router(websocket.router)
api_router.include_router(website.router)
