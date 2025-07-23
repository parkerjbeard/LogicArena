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
import asyncio

from app.users.router import router as users_router
from app.puzzles.router import router as puzzles_router
from app.games.router import router as games_router
from app.config import settings
from app.db.session import engine, get_db, pool_monitor, close_db_connections, verify_db_connection
from app.db.health import db_health_checker
from app.db.pool_optimizer import pool_optimizer
from app.models import Base
from app.websocket.manager import ConnectionManager
from app.middleware.logging_middleware import LoggingMiddleware

# Configure logging - simplified for demo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("gateway")

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

# Add database middleware for error handling and monitoring
from app.middleware.database import DatabaseMiddleware, ConnectionPoolMiddleware
app.add_middleware(DatabaseMiddleware)
# Temporarily disable ConnectionPoolMiddleware due to compatibility issues
# app.add_middleware(ConnectionPoolMiddleware)

# Initialize WebSocket connection manager
connection_manager = ConnectionManager()

# Game event processor task
game_event_processor_task = None

async def process_game_events():
    """Subscribe to Redis game events and broadcast to WebSocket connections"""
    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("game_events")
        
        logger.info("Game event processor started")
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    event = json.loads(message['data'])
                    event_type = event.get('type')
                    game_id = event.get('game_id')
                    
                    if not game_id:
                        continue
                    
                    logger.info(f"Processing game event: {event_type} for game {game_id}")
                    
                    # Broadcast to all players in the game
                    if event_type in ["round_complete", "game_complete", "submission_failed"]:
                        await connection_manager.broadcast(str(game_id), event)
                    
                except Exception as e:
                    logger.error(f"Error processing game event: {e}")
                    
    except asyncio.CancelledError:
        logger.info("Game event processor cancelled")
        await pubsub.unsubscribe("game_events")
        await redis_client.close()
    except Exception as e:
        logger.error(f"Game event processor error: {e}")

# Include routers
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

@app.on_event("startup")
async def startup():
    # Validate configuration
    from app.validate_config import validate_config
    if not validate_config():
        logger.error("Configuration validation failed")
        raise RuntimeError("Invalid configuration - missing required secrets")
    
    # Verify database connection with retries
    max_retries = 5
    retry_delay = 2
    for attempt in range(max_retries):
        if await verify_db_connection():
            break
        if attempt < max_retries - 1:
            logger.warning(f"Database connection failed, retrying in {retry_delay} seconds... (attempt {attempt + 1}/{max_retries})")
            await asyncio.sleep(retry_delay)
        else:
            logger.error("Failed to connect to database after all retries")
            raise RuntimeError("Database connection failed")
    
    # Create database tables
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all)  # Uncomment for clean start
        await conn.run_sync(Base.metadata.create_all)
    
    # Start connection pool monitoring
    await pool_monitor.start_monitoring(interval=60)  # Monitor every minute
    
    # Initialize rate limiter with Redis
    redis_instance = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_instance)
    
    # Initialize WebSocket manager with Redis
    await connection_manager.initialize(settings.REDIS_URL)
    
    # Start game event processor
    global game_event_processor_task
    game_event_processor_task = asyncio.create_task(process_game_events())
    
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown():
    # Cancel game event processor
    global game_event_processor_task
    if game_event_processor_task:
        game_event_processor_task.cancel()
        try:
            await game_event_processor_task
        except asyncio.CancelledError:
            pass
    
    # Stop connection pool monitoring
    await pool_monitor.stop_monitoring()
    
    # Cleanup WebSocket manager
    await connection_manager.cleanup()
    
    # Close database connections
    await close_db_connections()
    
    logger.info("Application shutdown complete")

@app.get("/", tags=["Health"])
async def root():
    return {"message": "LogicArena API Gateway"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/health/db", tags=["Health"])
async def health_db():
    """Comprehensive database health check with connection pool status"""
    health_report = await db_health_checker.check_database_health()
    
    # Determine HTTP status code based on health
    if health_report["status"] == "healthy":
        status_code = 200
    elif health_report["status"] == "degraded":
        status_code = 200  # Still operational but with warnings
    else:
        status_code = 503
    
    if status_code == 503:
        raise HTTPException(status_code=status_code, detail=health_report)
    
    return health_report

@app.get("/health/db/metrics", tags=["Health"])
async def health_db_metrics():
    """Get detailed database connection metrics"""
    metrics = await db_health_checker.get_connection_metrics()
    return metrics

# WebSocket endpoint for duel matches - NO AUTHENTICATION
@app.websocket("/ws/duel/{game_id}")
async def websocket_duel_endpoint(
    websocket: WebSocket, 
    game_id: str,
    db=Depends(get_db)
):
    # Accept all connections without authentication
    user_id = "anonymous"  # Default user ID for all connections
    
    # Connect with enhanced manager
    await connection_manager.connect(websocket, game_id, user_id)
    try:
        while True:
            raw_data = await websocket.receive_json()
            
            # Validate and process the message
            message = await connection_manager.handle_client_message(websocket, raw_data)
            if not message:
                continue  # Invalid message or ping/pong handled
            
            # Add user info
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

# WebSocket endpoint for general notifications - NO AUTHENTICATION
@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(
    websocket: WebSocket, 
    user_id: str,
    db=Depends(get_db)
):
    # Accept all connections without authentication
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