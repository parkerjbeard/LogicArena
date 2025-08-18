import logging
import json
import asyncio
import time
from typing import List, Dict, Set, Optional, Any
from fastapi import WebSocket
import redis.asyncio as redis
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

# WebSocket message models for validation
class WSMessage(BaseModel):
    type: str
    user_id: Optional[int] = None
    game_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[float] = None

class ConnectionInfo(BaseModel):
    user_id: int
    game_id: Optional[int] = None
    connected_at: float
    last_ping: float
    
class ConnectionManager:
    def __init__(self):
        # Game room connections - game_id -> set of (websocket, user_id) tuples
        self.active_connections: Dict[str, Set[tuple[WebSocket, int]]] = {}
        # User notification connections - user_id -> websocket
        self.user_connections: Dict[str, WebSocket] = {}
        # Connection metadata - websocket -> ConnectionInfo
        self.connection_info: Dict[WebSocket, ConnectionInfo] = {}
        # Redis clients
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        # Background tasks
        self.tasks: List[asyncio.Task] = []
        # Message queue for offline users
        self.offline_queue: Dict[int, List[Dict]] = {}
        
    async def initialize(self, redis_url: str):
        """Initialize Redis connection and start background tasks"""
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            
            # Subscribe to relevant channels
            await self.pubsub.subscribe(
                "game_events",
                "match_notifications", 
                "user_notifications",
                "system_broadcast"
            )
            
            # Start background tasks
            self.tasks.append(asyncio.create_task(self._process_redis_events()))
            self.tasks.append(asyncio.create_task(self._heartbeat_check()))
            self.tasks.append(asyncio.create_task(self._process_offline_queue()))
            
            logger.info("WebSocket manager initialized with Redis integration")
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket manager: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources on shutdown"""
        # Cancel background tasks
        for task in self.tasks:
            task.cancel()
        
        # Close Redis connections
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
            
        # Close all WebSocket connections
        for connections in self.active_connections.values():
            for ws, _ in connections:
                await ws.close()
        for ws in self.user_connections.values():
            await ws.close()

    async def connect(self, websocket: WebSocket, game_id: str, user_id: int):
        """Accept a new connection to a game room"""
        await websocket.accept()
        
        # Store connection info
        conn_info = ConnectionInfo(
            user_id=user_id,
            game_id=int(game_id),
            connected_at=time.time(),
            last_ping=time.time()
        )
        self.connection_info[websocket] = conn_info
        
        # Add to game room
        if game_id not in self.active_connections:
            self.active_connections[game_id] = set()
        self.active_connections[game_id].add((websocket, user_id))
        
        # Store connection state in Redis
        await self._store_connection_state(user_id, game_id, "game")
        
        # Send any queued messages
        await self._send_queued_messages(user_id, websocket)
        
        # Notify others in the room
        await self._notify_room_event(game_id, "user_joined", {
            "user_id": user_id,
            "timestamp": time.time()
        }, exclude_user=user_id)
        
        logger.info(f"User {user_id} connected to game {game_id}")

    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Accept a new connection for user notifications"""
        await websocket.accept()
        
        # Store connection info
        conn_info = ConnectionInfo(
            user_id=int(user_id),
            connected_at=time.time(),
            last_ping=time.time()
        )
        self.connection_info[websocket] = conn_info
        
        # Store user connection
        self.user_connections[user_id] = websocket
        
        # Store connection state in Redis
        await self._store_connection_state(int(user_id), None, "notification")
        
        # Send any queued messages
        await self._send_queued_messages(int(user_id), websocket)
        
        # Update user online status
        await self._update_user_status(int(user_id), "online")
        
        logger.info(f"User {user_id} connected for notifications")

    async def disconnect(self, websocket: WebSocket, game_id: str):
        """Remove a connection from a game room"""
        conn_info = self.connection_info.get(websocket)
        if not conn_info:
            return
            
        user_id = conn_info.user_id
        
        # Remove from game room
        if game_id in self.active_connections:
            self.active_connections[game_id].discard((websocket, user_id))
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
        
        # Remove connection info
        del self.connection_info[websocket]
        
        # Clear connection state from Redis
        await self._clear_connection_state(user_id, "game")
        
        # Notify others in the room
        await self._notify_room_event(game_id, "user_left", {
            "user_id": user_id,
            "timestamp": time.time()
        })
        
        logger.info(f"User {user_id} disconnected from game {game_id}")

    async def disconnect_user(self, websocket: WebSocket, user_id: str):
        """Remove a user notification connection"""
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        
        # Clear connection state from Redis
        await self._clear_connection_state(int(user_id), "notification")
        
        # Update user online status
        await self._update_user_status(int(user_id), "offline")
        
        logger.info(f"User {user_id} disconnected from notifications")

    async def send_personal_message(self, message: Dict, websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            # Add timestamp if not present
            if "timestamp" not in message:
                message["timestamp"] = time.time()
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            # Connection is likely dead, will be cleaned up by heartbeat

    async def broadcast(self, game_id: str, message: Dict, exclude_user: Optional[int] = None):
        """Broadcast a message to all connections in a game room"""
        if game_id not in self.active_connections:
            return
            
        # Add timestamp if not present
        if "timestamp" not in message:
            message["timestamp"] = time.time()
            
        disconnected = []
        for websocket, user_id in self.active_connections[game_id]:
            if exclude_user and user_id == exclude_user:
                continue
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to user {user_id}: {e}")
                disconnected.append((websocket, user_id))
        
        # Remove disconnected connections
        for conn in disconnected:
            self.active_connections[game_id].discard(conn)

    async def send_user_notification(self, user_id: str, message: Dict):
        """Send a notification to a specific user"""
        # Add timestamp if not present
        if "timestamp" not in message:
            message["timestamp"] = time.time()
            
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"Failed to send notification to user {user_id}: {e}")
                del self.user_connections[user_id]
        
        # Queue message for offline user
        await self._queue_offline_message(int(user_id), message)
        return False

    async def handle_client_message(self, websocket: WebSocket, raw_message: Dict) -> Optional[WSMessage]:
        """Validate and process a client message"""
        try:
            # Validate message structure
            message = WSMessage(**raw_message)
            
            # Update last ping time
            if websocket in self.connection_info:
                self.connection_info[websocket].last_ping = time.time()
            
            # Handle different message types
            if message.type == "ping":
                await self.send_personal_message({"type": "pong", "timestamp": time.time()}, websocket)
                return None
                
            return message
            
        except ValidationError as e:
            logger.error(f"Invalid message format: {e}")
            await self.send_personal_message({
                "type": "error",
                "error": "Invalid message format",
                "details": str(e)
            }, websocket)
            return None

    # Private helper methods
    async def _process_redis_events(self):
        """Process events from Redis and broadcast to appropriate connections"""
        try:
            async for message in self.pubsub.listen():
                if message["type"] != "message":
                    continue
                    
                try:
                    data = json.loads(message["data"])
                    channel = message["channel"]
                    
                    if channel == "game_events":
                        await self._handle_game_event(data)
                    elif channel == "match_notifications":
                        await self._handle_match_notification(data)
                    elif channel == "user_notifications":
                        await self._handle_user_notification(data)
                    elif channel == "system_broadcast":
                        await self._handle_system_broadcast(data)
                        
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON in Redis message: {message['data']}")
                except Exception as e:
                    logger.error(f"Error processing Redis event: {e}")
                    
        except asyncio.CancelledError:
            logger.info("Redis event processing cancelled")
        except Exception as e:
            logger.error(f"Redis event processing error: {e}")

    async def _handle_game_event(self, event: Dict):
        """Handle game events from Redis"""
        game_id = str(event.get("game_id"))
        if not game_id:
            return
            
        # Broadcast to all connections in the game room
        await self.broadcast(game_id, event)
        
        # Also send notifications to individual players if needed
        if event.get("type") in ["round_complete", "game_complete"]:
            for player_id in [event.get("player_a"), event.get("player_b")]:
                if player_id:
                    await self.send_user_notification(str(player_id), {
                        "type": "game_update",
                        "game_id": game_id,
                        "event": event
                    })

    async def _handle_match_notification(self, data: Dict):
        """Handle match notifications from Redis"""
        # Send to specific users involved in the match
        for user_id in data.get("user_ids", []):
            await self.send_user_notification(str(user_id), data)

    async def _handle_user_notification(self, data: Dict):
        """Handle user-specific notifications from Redis"""
        user_id = data.get("user_id")
        if user_id:
            await self.send_user_notification(str(user_id), data)

    async def _handle_system_broadcast(self, data: Dict):
        """Handle system-wide broadcasts"""
        # Send to all connected users
        for user_id, websocket in self.user_connections.items():
            try:
                await websocket.send_json(data)
            except Exception as e:
                logger.error(f"Failed to send system broadcast to user {user_id}: {e}")

    async def _heartbeat_check(self):
        """Periodically check connection health"""
        try:
            while True:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                current_time = time.time()
                timeout = 60  # 60 seconds timeout
                
                disconnected = []
                
                # Check all connections
                for websocket, info in list(self.connection_info.items()):
                    if current_time - info.last_ping > timeout:
                        logger.warning(f"Connection timeout for user {info.user_id}")
                        disconnected.append((websocket, info))
                
                # Clean up dead connections
                for websocket, info in disconnected:
                    if info.game_id:
                        await self.disconnect(websocket, str(info.game_id))
                    else:
                        await self.disconnect_user(websocket, str(info.user_id))
                        
        except asyncio.CancelledError:
            logger.info("Heartbeat check cancelled")

    async def _store_connection_state(self, user_id: int, game_id: Optional[str], conn_type: str):
        """Store connection state in Redis"""
        if not self.redis_client:
            return
            
        key = f"ws:connection:{user_id}"
        data = {
            "type": conn_type,
            "connected_at": time.time(),
            "server_id": "gateway-1"  # TODO: Make this dynamic for multiple instances
        }
        if game_id:
            data["game_id"] = game_id
            
        try:
            await self.redis_client.hset(key, mapping=data)
            await self.redis_client.expire(key, 3600)  # 1 hour TTL
        except Exception as e:
            logger.error(f"Failed to store connection state: {e}")

    async def _clear_connection_state(self, user_id: int, conn_type: str):
        """Clear connection state from Redis"""
        if not self.redis_client:
            return
            
        key = f"ws:connection:{user_id}"
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Failed to clear connection state: {e}")

    async def _update_user_status(self, user_id: int, status: str):
        """Update user online status in Redis"""
        if not self.redis_client:
            return
            
        key = f"user:status:{user_id}"
        try:
            await self.redis_client.setex(key, 300, status)  # 5 minute TTL
            
            # Publish status change event
            await self.redis_client.publish("user_status", json.dumps({
                "user_id": user_id,
                "status": status,
                "timestamp": time.time()
            }))
        except Exception as e:
            logger.error(f"Failed to update user status: {e}")

    async def _notify_room_event(self, game_id: str, event_type: str, data: Dict, exclude_user: Optional[int] = None):
        """Notify room members of an event"""
        message = {
            "type": event_type,
            "game_id": game_id,
            **data
        }
        await self.broadcast(game_id, message, exclude_user)

    async def _queue_offline_message(self, user_id: int, message: Dict):
        """Queue a message for an offline user"""
        if not self.redis_client:
            # Fall back to in-memory queue
            if user_id not in self.offline_queue:
                self.offline_queue[user_id] = []
            self.offline_queue[user_id].append(message)
            return
            
        key = f"offline_messages:{user_id}"
        try:
            await self.redis_client.rpush(key, json.dumps(message))
            await self.redis_client.expire(key, 86400)  # 24 hour TTL
        except Exception as e:
            logger.error(f"Failed to queue offline message: {e}")

    async def _send_queued_messages(self, user_id: int, websocket: WebSocket):
        """Send any queued messages to a newly connected user"""
        # Check Redis queue
        if self.redis_client:
            key = f"offline_messages:{user_id}"
            try:
                messages = await self.redis_client.lrange(key, 0, -1)
                if messages:
                    for msg_str in messages:
                        msg = json.loads(msg_str)
                        await websocket.send_json(msg)
                    await self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Failed to send queued messages: {e}")
        
        # Check in-memory queue
        if user_id in self.offline_queue:
            for msg in self.offline_queue[user_id]:
                try:
                    await websocket.send_json(msg)
                except Exception as e:
                    logger.error(f"Failed to send queued message: {e}")
            del self.offline_queue[user_id]

    async def _process_offline_queue(self):
        """Periodically clean up old offline messages"""
        try:
            while True:
                await asyncio.sleep(3600)  # Run every hour
                
                # Clean up in-memory queue
                current_time = time.time()
                for user_id, messages in list(self.offline_queue.items()):
                    # Remove messages older than 24 hours
                    self.offline_queue[user_id] = [
                        msg for msg in messages
                        if current_time - msg.get("timestamp", 0) < 86400
                    ]
                    if not self.offline_queue[user_id]:
                        del self.offline_queue[user_id]
                        
        except asyncio.CancelledError:
            logger.info("Offline queue processing cancelled")

    async def get_room_users(self, game_id: str) -> List[int]:
        """Get list of users in a game room"""
        if game_id not in self.active_connections:
            return []
        return [user_id for _, user_id in self.active_connections[game_id]]

    async def get_online_users(self) -> List[int]:
        """Get list of all online users"""
        online = set()
        
        # Users with notification connections
        for user_id in self.user_connections:
            online.add(int(user_id))
        
        # Users in game rooms
        for connections in self.active_connections.values():
            for _, user_id in connections:
                online.add(user_id)
                
        return list(online)
    
    # Backwards compatibility methods
    async def send_notification(self, user_id: str, message: Any):
        """Legacy method - redirect to send_user_notification"""
        if isinstance(message, str):
            message = {"type": "notification", "message": message}
        return await self.send_user_notification(user_id, message)