import os
import json
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import logging
from typing import List, Dict, Any, Optional
import time
import httpx
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter

from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.puzzles.router import router as puzzles_router
from app.games.router import router as games_router
from app.admin.router import router as admin_router
from app.config import settings
from app.db.session import engine, get_db
from app.models import Base
from app.websocket.manager import ConnectionManager
from app.middleware.logging_middleware import LoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="LogicArena API Gateway",
    description="API Gateway for the LogicArena platform",
    version="0.1.0",
)

# Configure security middleware (includes CORS)
from app.security import configure_security_middleware
configure_security_middleware(app)

# Add rate limit header middleware
from app.middleware.rate_limiter import RateLimitHeaderMiddleware
app.add_middleware(RateLimitHeaderMiddleware)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Initialize WebSocket connection manager
connection_manager = ConnectionManager()

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(
    users_router, 
    prefix="/api/users", 
    tags=["Users"]
)
app.include_router(
    puzzles_router, 
    prefix="/api/puzzles", 
    tags=["Puzzles"]
)
app.include_router(
    games_router, 
    prefix="/api/games", 
    tags=["Games"]
)
app.include_router(
    admin_router, 
    prefix="/api/admin", 
    tags=["Admin"]
)

@app.on_event("startup")
async def startup():
    # Create database tables
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # Uncomment for clean start
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize rate limiter with Redis
    redis_instance = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_instance)
    
    # Initialize WebSocket manager with Redis
    await connection_manager.initialize(settings.REDIS_URL)
    
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown():
    # Cleanup WebSocket manager
    await connection_manager.cleanup()
    
    # Close any connections
    logger.info("Application shutdown")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "LogicArena API Gateway"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "timestamp": time.time()}

# WebSocket endpoint for duel matches
@app.websocket("/ws/duel/{game_id}")
async def websocket_duel_endpoint(
    websocket: WebSocket, 
    game_id: str,
    token: str = None,  # Token passed as query param
    db=Depends(get_db)
):
    # Validate token before accepting connection
    if not token:
        await websocket.close(code=1008, reason="Missing authentication")
        return
    
    try:
        from app.auth.utils import verify_token
        user_id = verify_token(token)
        if not user_id:
            await websocket.close(code=1008, reason="Invalid authentication")
            return
    except Exception:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Connect with enhanced manager (includes user_id)
    await connection_manager.connect(websocket, game_id, user_id)
    try:
        while True:
            raw_data = await websocket.receive_json()
            
            # Validate and process the message
            message = await connection_manager.handle_client_message(websocket, raw_data)
            if not message:
                continue  # Invalid message or ping/pong handled
            
            # Add authentication info
            message.user_id = user_id
            message.game_id = int(game_id)
            
            # Handle different message types
            if message.type == "proof_submission":
                # Forward to proof checker via Redis
                await publish_game_event("proof_submitted", {
                    "game_id": int(game_id),
                    "user_id": user_id,
                    "proof": message.data.get("proof"),
                    "timestamp": time.time()
                })
            elif message.type == "time_update":
                # Broadcast time updates to other players
                await connection_manager.broadcast(game_id, {
                    "type": "time_update",
                    "user_id": user_id,
                    "time_left": message.data.get("time_left"),
                    "timestamp": time.time()
                }, exclude_user=user_id)
            elif message.type == "chat_message":
                # Broadcast chat to all players in game
                await connection_manager.broadcast(game_id, {
                    "type": "chat_message", 
                    "user_id": user_id,
                    "message": message.data.get("message"),
                    "timestamp": time.time()
                })
            elif message.type == "surrender":
                # Handle game surrender
                await publish_game_event("player_surrendered", {
                    "game_id": int(game_id),
                    "user_id": user_id,
                    "timestamp": time.time()
                })
                
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket, game_id)

# WebSocket endpoint for general notifications
@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(
    websocket: WebSocket, 
    user_id: str,
    token: str = None  # Token passed as query param
):
    # Validate token and ensure user_id matches
    if not token:
        await websocket.close(code=1008, reason="Missing authentication")
        return
    
    try:
        from app.auth.utils import verify_token
        token_user_id = verify_token(token)
        if not token_user_id or str(token_user_id) != user_id:
            await websocket.close(code=1008, reason="Invalid authentication")
            return
    except Exception:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    await connection_manager.connect_user(websocket, user_id)
    try:
        while True:
            raw_data = await websocket.receive_json()
            
            # Handle client messages (mostly ping/pong)
            message = await connection_manager.handle_client_message(websocket, raw_data)
            if not message:
                continue
                
            # Handle any specific notification commands if needed
            if message.type == "mark_read":
                # Mark notifications as read
                notification_ids = message.data.get("notification_ids", [])
                # TODO: Update database to mark notifications as read
                
    except WebSocketDisconnect:
        await connection_manager.disconnect_user(websocket, user_id)

# Helper function to publish game events to Redis
async def publish_game_event(event_type: str, data: Dict[str, Any]):
    """Publish a game event to Redis for processing by other services"""
    if not connection_manager.redis_client:
        logger.warning("Redis client not available for publishing game event")
        return
        
    event = {
        "type": event_type,
        "timestamp": time.time(),
        **data
    }
    
    try:
        await connection_manager.redis_client.publish("game_events", json.dumps(event))
        logger.info(f"Published game event: {event_type} for game {data.get('game_id')}")
    except Exception as e:
        logger.error(f"Failed to publish game event: {e}")

# API endpoint to get online users (for admin or debugging)
@app.get("/api/websocket/online-users", tags=["WebSocket"])
async def get_online_users():
    """Get list of currently online users"""
    try:
        online_users = await connection_manager.get_online_users()
        return {"online_users": online_users, "count": len(online_users)}
    except Exception as e:
        logger.error(f"Failed to get online users: {e}")
        return {"error": "Failed to retrieve online users"}

# API endpoint to get users in a specific game
@app.get("/api/websocket/game/{game_id}/users", tags=["WebSocket"])
async def get_game_users(game_id: str):
    """Get list of users in a specific game room"""
    try:
        room_users = await connection_manager.get_room_users(game_id)
        return {"game_id": game_id, "users": room_users, "count": len(room_users)}
    except Exception as e:
        logger.error(f"Failed to get game users: {e}")
        return {"error": "Failed to retrieve game users"}

# Mount static files (in production, this would be handled by a proper web server)
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=int(os.getenv("GATEWAY_PORT", 8000)),
        reload=True
    ) 