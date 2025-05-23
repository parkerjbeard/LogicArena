import os
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
from fastapi_limiter.depends import RateLimiter

from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.puzzles.router import router as puzzles_router
from app.games.router import router as games_router
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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Initialize WebSocket connection manager
connection_manager = ConnectionManager()

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(
    users_router, 
    prefix="/api/users", 
    tags=["Users"],
    dependencies=[Depends(RateLimiter(times=100, seconds=3600))]
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

@app.on_event("startup")
async def startup():
    # Create database tables
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # Uncomment for clean start
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize rate limiter with Redis
    redis_instance = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_instance)
    
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown():
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
    db=Depends(get_db)
):
    await connection_manager.connect(websocket, game_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Process the received message
            # Forward relevant messages to the match service
            await connection_manager.broadcast(game_id, data)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, game_id)

# WebSocket endpoint for general notifications
@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(
    websocket: WebSocket, 
    user_id: str
):
    await connection_manager.connect_user(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
            # Keep connection alive, actual messages sent from server
    except WebSocketDisconnect:
        connection_manager.disconnect_user(websocket, user_id)

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