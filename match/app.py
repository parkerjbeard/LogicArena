import asyncio
import json
import logging
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import time
import uuid

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Match Service", version="1.0.0")

# Redis client
redis_client = None
pubsub = None

class QueueEntry(BaseModel):
    user_id: int
    handle: str
    rating: int
    difficulty: Optional[int] = None
    timestamp: float

class MatchRequest(BaseModel):
    user_id: int
    handle: str
    rating: int
    difficulty: Optional[int] = None

class MatchResponse(BaseModel):
    matched: bool
    game_id: Optional[int] = None
    opponent_id: Optional[int] = None
    opponent_handle: Optional[str] = None
    queue_position: Optional[int] = None
    estimated_wait: Optional[int] = None

@app.on_event("startup")
async def startup():
    global redis_client, pubsub
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    
    # Subscribe to game events
    await pubsub.subscribe("game_events", "proof_checker_results")
    
    # Start background tasks
    asyncio.create_task(handle_game_events())
    asyncio.create_task(process_queue())
    logger.info("Match service started")

@app.on_event("shutdown")
async def shutdown():
    if pubsub:
        await pubsub.unsubscribe()
        await pubsub.close()
    if redis_client:
        await redis_client.close()
    logger.info("Match service stopped")

async def handle_game_events():
    """Handle game events from Redis"""
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
                
            try:
                data = json.loads(message["data"])
                channel = message["channel"]
                
                if channel == "game_events":
                    await process_game_event(data)
                elif channel == "proof_checker_results":
                    await process_proof_result(data)
                    
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in game event: {message['data']}")
            except Exception as e:
                logger.error(f"Error processing game event: {e}")
                
    except asyncio.CancelledError:
        logger.info("Game event handler cancelled")
    except Exception as e:
        logger.error(f"Game event handler error: {e}")

async def process_game_event(event: Dict[str, Any]):
    """Process incoming game events"""
    event_type = event.get("type")
    game_id = event.get("game_id")
    
    if event_type == "proof_submitted":
        # Forward proof to proof checker
        await forward_proof_to_checker(event)
    elif event_type == "player_surrendered":
        # Handle surrender
        await handle_player_surrender(game_id, event.get("user_id"))
    elif event_type == "round_timeout":
        # Handle round timeout
        await handle_round_timeout(game_id)
        
    logger.info(f"Processed game event: {event_type} for game {game_id}")

async def process_proof_result(result: Dict[str, Any]):
    """Process proof checker results"""
    game_id = result.get("game_id")
    user_id = result.get("user_id")
    is_valid = result.get("is_valid")
    
    if game_id and user_id is not None:
        # Publish round result
        await publish_round_result(game_id, user_id, is_valid, result)

async def forward_proof_to_checker(event: Dict[str, Any]):
    """Forward proof submission to proof checker service"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://proof-checker:8002/check-proof",
                json={
                    "premises": event.get("proof", {}).get("premises", []),
                    "conclusion": event.get("proof", {}).get("conclusion", ""),
                    "proof_steps": event.get("proof", {}).get("steps", []),
                    "game_id": event.get("game_id"),
                    "user_id": event.get("user_id"),
                    "timestamp": event.get("timestamp")
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                # Publish the result back to game events
                await redis_client.publish("proof_checker_results", json.dumps(result))
            else:
                logger.error(f"Proof checker error: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Failed to forward proof to checker: {e}")

async def handle_player_surrender(game_id: int, user_id: int):
    """Handle player surrender"""
    try:
        # Get game info
        match_data = await redis_client.hgetall(f"match:{game_id}")
        if not match_data:
            return
            
        # Determine winner (the other player)
        player_a = int(match_data.get("player_a", 0))
        player_b = int(match_data.get("player_b", 0))
        winner = player_b if user_id == player_a else player_a
        
        # Publish game completion event
        await redis_client.publish("game_events", json.dumps({
            "type": "game_complete",
            "game_id": game_id,
            "winner": winner,
            "reason": "surrender",
            "player_a": player_a,
            "player_b": player_b,
            "timestamp": time.time()
        }))
        
        # Update game status
        await redis_client.hset(f"match:{game_id}", "status", "completed")
        await redis_client.hset(f"match:{game_id}", "winner", winner)
        await redis_client.hset(f"match:{game_id}", "end_reason", "surrender")
        
    except Exception as e:
        logger.error(f"Failed to handle surrender: {e}")

async def handle_round_timeout(game_id: int):
    """Handle round timeout"""
    try:
        # For now, just end the game as a draw
        match_data = await redis_client.hgetall(f"match:{game_id}")
        if not match_data:
            return
            
        player_a = int(match_data.get("player_a", 0))
        player_b = int(match_data.get("player_b", 0))
        
        # Publish game completion event
        await redis_client.publish("game_events", json.dumps({
            "type": "game_complete",
            "game_id": game_id,
            "winner": None,  # Draw
            "reason": "timeout",
            "player_a": player_a,
            "player_b": player_b,
            "timestamp": time.time()
        }))
        
        # Update game status
        await redis_client.hset(f"match:{game_id}", "status", "completed")
        await redis_client.hset(f"match:{game_id}", "end_reason", "timeout")
        
    except Exception as e:
        logger.error(f"Failed to handle timeout: {e}")

async def publish_round_result(game_id: int, user_id: int, is_valid: bool, result: Dict[str, Any]):
    """Publish round completion result"""
    try:
        # Get match info
        match_data = await redis_client.hgetall(f"match:{game_id}")
        if not match_data:
            return
            
        player_a = int(match_data.get("player_a", 0))
        player_b = int(match_data.get("player_b", 0))
        
        # Determine if this submission wins the round
        round_winner = user_id if is_valid else None
        
        # Check if this wins the game (first to solve wins)
        game_winner = user_id if is_valid else None
        
        # Publish round result
        event = {
            "type": "round_complete",
            "game_id": game_id,
            "round_winner": round_winner,
            "game_winner": game_winner,
            "player_a": player_a,
            "player_b": player_b,
            "submission": {
                "user_id": user_id,
                "is_valid": is_valid,
                **result
            },
            "timestamp": time.time()
        }
        
        await redis_client.publish("game_events", json.dumps(event))
        
        # If someone won, update game status
        if game_winner:
            await redis_client.hset(f"match:{game_id}", "status", "completed")
            await redis_client.hset(f"match:{game_id}", "winner", game_winner)
            await redis_client.hset(f"match:{game_id}", "end_reason", "solved")
            
            # Update ratings (simplified ELO calculation)
            await update_player_ratings(player_a, player_b, game_winner)
        
    except Exception as e:
        logger.error(f"Failed to publish round result: {e}")

async def update_player_ratings(player_a: int, player_b: int, winner: int):
    """Update player ratings after game completion"""
    try:
        # Simple ELO-style rating update
        K = 32  # K-factor
        
        # For now, assume equal ratings (should fetch from database)
        rating_a = 1000
        rating_b = 1000
        
        # Calculate expected scores
        expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
        expected_b = 1 - expected_a
        
        # Actual scores
        score_a = 1 if winner == player_a else 0
        score_b = 1 if winner == player_b else 0
        
        # New ratings
        new_rating_a = rating_a + K * (score_a - expected_a)
        new_rating_b = rating_b + K * (score_b - expected_b)
        
        # Publish rating updates
        await redis_client.publish("user_notifications", json.dumps({
            "user_id": player_a,
            "type": "rating_update",
            "old_rating": rating_a,
            "new_rating": int(new_rating_a),
            "change": int(new_rating_a - rating_a),
            "timestamp": time.time()
        }))
        
        await redis_client.publish("user_notifications", json.dumps({
            "user_id": player_b,
            "type": "rating_update",
            "old_rating": rating_b,
            "new_rating": int(new_rating_b),
            "change": int(new_rating_b - rating_b),
            "timestamp": time.time()
        }))
        
    except Exception as e:
        logger.error(f"Failed to update ratings: {e}")

async def process_queue():
    """Process the matchmaking queue periodically"""
    while True:
        try:
            await asyncio.sleep(1)  # Check every second
            
            # Get all queue entries
            queue_data = await redis_client.hgetall("queue")
            if len(queue_data) < 2:
                continue
            
            # Parse queue entries
            entries = []
            for user_id, data in queue_data.items():
                try:
                    entry = QueueEntry(**json.loads(data))
                    entries.append((user_id, entry))
                except Exception as e:
                    logger.error(f"Failed to parse queue entry: {e}")
                    # Remove bad entry
                    await redis_client.hdel("queue", user_id)
            
            # Sort by rating for balanced matches
            entries.sort(key=lambda x: x[1].rating)
            
            # Try to match players
            matched_users = []
            for i in range(0, len(entries) - 1):
                user_a_id, user_a = entries[i]
                user_b_id, user_b = entries[i + 1]
                
                # Check if already matched
                if user_a_id in matched_users or user_b_id in matched_users:
                    continue
                
                # Check rating difference (allow up to 200 points difference)
                rating_diff = abs(user_a.rating - user_b.rating)
                if rating_diff <= 200:
                    # Create match
                    game_id = await create_match(user_a_id, user_a, user_b_id, user_b)
                    if game_id:
                        matched_users.extend([user_a_id, user_b_id])
                        
                        # Remove from queue
                        await redis_client.hdel("queue", user_a_id, user_b_id)
                        
                        # Notify players
                        await notify_players_of_match(user_a_id, user_b_id, game_id, user_a, user_b)
                        
                        logger.info(f"Created match {game_id} between {user_a.handle} and {user_b.handle}")
            
        except Exception as e:
            logger.error(f"Error in process_queue: {e}")
            await asyncio.sleep(5)  # Wait longer on error

async def create_match(user_a_id: str, user_a: QueueEntry, user_b_id: str, user_b: QueueEntry) -> Optional[int]:
    """Create a new game match"""
    try:
        # Call game service to create new game
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://gateway:8000/api/games/create",
                json={
                    "player_a": int(user_a_id),
                    "player_b": int(user_b_id),
                    "difficulty": user_a.difficulty or user_b.difficulty
                }
            )
            if response.status_code == 200:
                game_data = response.json()
                return game_data.get("id")
    except Exception as e:
        logger.error(f"Failed to create match: {e}")
    return None

async def notify_players_of_match(user_a_id: str, user_b_id: str, game_id: int, user_a: QueueEntry, user_b: QueueEntry):
    """Notify players that a match has been found"""
    # Store match information in Redis
    await redis_client.hset(f"match:{game_id}", mapping={
        "player_a": user_a_id,
        "player_b": user_b_id,
        "player_a_handle": user_a.handle,
        "player_b_handle": user_b.handle,
        "status": "active",
        "created_at": time.time()
    })
    
    # Publish match notification
    await redis_client.publish("match_notifications", json.dumps({
        "type": "match_found",
        "user_ids": [int(user_a_id), int(user_b_id)],
        "game_id": game_id,
        "players": {
            "player_a": {"id": int(user_a_id), "handle": user_a.handle},
            "player_b": {"id": int(user_b_id), "handle": user_b.handle}
        },
        "timestamp": time.time()
    }))
    
    # Send individual notifications
    await redis_client.publish("user_notifications", json.dumps({
        "user_id": int(user_a_id),
        "type": "match_found",
        "game_id": game_id,
        "opponent": {"id": int(user_b_id), "handle": user_b.handle},
        "timestamp": time.time()
    }))
    
    await redis_client.publish("user_notifications", json.dumps({
        "user_id": int(user_b_id),
        "type": "match_found", 
        "game_id": game_id,
        "opponent": {"id": int(user_a_id), "handle": user_a.handle},
        "timestamp": time.time()
    }))

@app.post("/queue/join", response_model=MatchResponse)
async def join_queue(request: MatchRequest):
    """Join the matchmaking queue"""
    try:
        # Check if user is already in queue
        existing = await redis_client.hget("queue", str(request.user_id))
        if existing:
            # Return current queue status
            queue_size = await redis_client.hlen("queue")
            return MatchResponse(
                matched=False,
                queue_position=queue_size,
                estimated_wait=queue_size * 15  # Rough estimate: 15 seconds per player
            )
        
        # Add to queue
        queue_entry = QueueEntry(
            user_id=request.user_id,
            handle=request.handle,
            rating=request.rating,
            difficulty=request.difficulty,
            timestamp=time.time()
        )
        
        await redis_client.hset("queue", str(request.user_id), queue_entry.json())
        
        # Return queue status
        queue_size = await redis_client.hlen("queue")
        return MatchResponse(
            matched=False,
            queue_position=queue_size,
            estimated_wait=queue_size * 15
        )
        
    except Exception as e:
        logger.error(f"Error joining queue: {e}")
        raise HTTPException(status_code=500, detail="Failed to join queue")

@app.post("/queue/leave")
async def leave_queue(user_id: int):
    """Leave the matchmaking queue"""
    try:
        result = await redis_client.hdel("queue", str(user_id))
        return {"success": result > 0}
    except Exception as e:
        logger.error(f"Error leaving queue: {e}")
        raise HTTPException(status_code=500, detail="Failed to leave queue")

@app.get("/queue/status")
async def queue_status(user_id: int):
    """Get current queue status for a user"""
    try:
        # Check if user is in queue
        entry = await redis_client.hget("queue", str(user_id))
        if not entry:
            return {"in_queue": False}
        
        # Get queue position (approximate)
        queue_data = await redis_client.hgetall("queue")
        entries = []
        for uid, data in queue_data.items():
            try:
                parsed = QueueEntry(**json.loads(data))
                entries.append((uid, parsed))
            except:
                continue
        
        # Sort by timestamp to get position
        entries.sort(key=lambda x: x[1].timestamp)
        position = next((i for i, (uid, _) in enumerate(entries) if uid == str(user_id)), -1)
        
        return {
            "in_queue": True,
            "position": position + 1,
            "estimated_wait": position * 15,
            "queue_size": len(entries)
        }
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get queue status")

@app.get("/match/check")
async def check_match(user_id: int):
    """Check if a match has been found for the user"""
    try:
        # Look for matches involving this user
        match_keys = await redis_client.keys("match:*")
        for key in match_keys:
            match_data = await redis_client.hgetall(key)
            if match_data.get("player_a") == str(user_id) or match_data.get("player_b") == str(user_id):
                game_id = int(key.split(":")[1])
                
                # Get opponent info
                if match_data.get("player_a") == str(user_id):
                    opponent_id = match_data.get("player_b")
                    opponent_handle = match_data.get("player_b_handle")
                else:
                    opponent_id = match_data.get("player_a")
                    opponent_handle = match_data.get("player_a_handle")
                
                return MatchResponse(
                    matched=True,
                    game_id=game_id,
                    opponent_id=int(opponent_id) if opponent_id else None,
                    opponent_handle=opponent_handle
                )
        
        return MatchResponse(matched=False)
        
    except Exception as e:
        logger.error(f"Error checking match: {e}")
        raise HTTPException(status_code=500, detail="Failed to check match")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)