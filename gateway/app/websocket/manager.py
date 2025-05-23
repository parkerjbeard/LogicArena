from fastapi import WebSocket
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Dictionary of game_id -> list of connected websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Dictionary of user_id -> websocket for notifications
        self.user_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, game_id: str):
        """Connect a websocket to a game room"""
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)
        logger.info(f"Client connected to game room {game_id}. Total connections: {len(self.active_connections[game_id])}")
        
    def disconnect(self, websocket: WebSocket, game_id: str):
        """Disconnect a websocket from a game room"""
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)
            # Clean up empty game rooms
            if len(self.active_connections[game_id]) == 0:
                del self.active_connections[game_id]
        logger.info(f"Client disconnected from game room {game_id}")
        
    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Connect a user's notification websocket"""
        await websocket.accept()
        self.user_connections[user_id] = websocket
        logger.info(f"User {user_id} connected for notifications")
        
    def disconnect_user(self, websocket: WebSocket, user_id: str):
        """Disconnect a user's notification websocket"""
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"User {user_id} disconnected from notifications")
        
    async def send_personal_message(self, message: Any, websocket: WebSocket):
        """Send a message to a specific websocket"""
        try:
            if isinstance(message, dict):
                await websocket.send_json(message)
            else:
                await websocket.send_text(str(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            
    async def broadcast(self, game_id: str, message: Any):
        """Broadcast a message to all connected clients in a game room"""
        if game_id in self.active_connections:
            disconnected_websockets = []
            for websocket in self.active_connections[game_id]:
                try:
                    if isinstance(message, dict):
                        await websocket.send_json(message)
                    else:
                        await websocket.send_text(str(message))
                except Exception as e:
                    logger.error(f"Error in broadcast to game {game_id}: {e}")
                    disconnected_websockets.append(websocket)
            
            # Clean up any disconnected websockets
            for ws in disconnected_websockets:
                self.disconnect(ws, game_id)
                
    async def send_notification(self, user_id: str, message: Any):
        """Send a notification to a specific user"""
        if user_id in self.user_connections:
            try:
                websocket = self.user_connections[user_id]
                if isinstance(message, dict):
                    await websocket.send_json(message)
                else:
                    await websocket.send_text(str(message))
            except Exception as e:
                logger.error(f"Error sending notification to user {user_id}: {e}")
                del self.user_connections[user_id] 