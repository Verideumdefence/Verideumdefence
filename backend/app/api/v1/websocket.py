"""WebSocket endpoints for real-time updates."""

import json
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User

router = APIRouter(prefix="/ws", tags=["websocket"])


class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users."""
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/scan/{scan_id}")
async def websocket_scan_updates(
    websocket: WebSocket,
    scan_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time scan progress updates."""
    # Verify user from token
    try:
        from app.core.security import decode_token
        user_id = decode_token(token)
        user = db.get(User, user_id)
        if not user:
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    await manager.connect(user_id, websocket)
    
    try:
        # Send initial status
        from app.models import Scan
        scan = db.get(Scan, scan_id)
        if scan and (scan.owner_id == user_id or user.is_admin):
            await websocket.send_json({
                "type": "status",
                "scan_id": scan_id,
                "status": scan.status.value,
                "progress": 0 if scan.status.value == "pending" else (100 if scan.status.value == "completed" else 50)
            })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Echo back or handle client messages
            await websocket.send_json({"type": "echo", "data": data})
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)
