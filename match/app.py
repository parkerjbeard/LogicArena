import os
import asyncio
import json
import time
import random
import redis
import psycopg2
import psycopg2.extras
import httpx
from loguru import logger
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Dict, List, Optional, Tuple, Set
import signal
import sys

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://gateway:8000")
PUZZLE_SERVICE_URL = os.getenv("PUZZLE_SERVICE_URL", "http://puzzle:5000")
MATCH_TIMEOUT = int(os.getenv("DUEL_MATCH_TIMEOUT", "60"))
MATCH_CHECK_INTERVAL = 2  # seconds
ELO_RANGE_INITIAL = 200   # Initial Elo range for matchmaking
ELO_RANGE_INCREMENT = 50  # Increment Elo range after each interval
MAX_ELO_RANGE = 500       # Maximum Elo range for matchmaking

# Initialize Redis client
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Database connection
def get_db_connection():
    """Create a new database connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    return conn

def close_db_connection(conn):
    """Close a database connection."""
    if conn:
        conn.close()

async def fetch_random_puzzle(difficulty: Optional[int] = None) -> dict:
    """Fetch a random puzzle from the puzzle service."""
    try:
        url = f"{PUZZLE_SERVICE_URL}/random"
        if difficulty:
            url += f"?difficulty={difficulty}"
            
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch puzzle: {response.text}")
                return None
    except Exception as e:
        logger.error(f"Error fetching puzzle: {str(e)}")
        return None

async def create_game(player_a_id: int, player_b_id: int) -> Optional[int]:
    """Create a new game in the database."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO game (player_a, player_b, rounds, started)
                VALUES (%s, %s, 3, NOW())
                RETURNING id
                """,
                (player_a_id, player_b_id)
            )
            game_id = cur.fetchone()[0]
            
            # Create rounds for the game
            for round_num in range(1, 4):  # 3 rounds
                # Fetch a random puzzle for this round
                puzzle = await fetch_random_puzzle()
                if not puzzle:
                    raise Exception("Failed to fetch puzzle for round")
                
                cur.execute(
                    """
                    INSERT INTO round (game_id, puzzle_id, round_number, started)
                    VALUES (%s, %s, %s, NOW())
                    RETURNING id
                    """,
                    (game_id, puzzle["id"], round_num)
                )
            
            return game_id
    except Exception as e:
        logger.error(f"Error creating game: {str(e)}")
        return None
    finally:
        close_db_connection(conn)

async def notify_players_of_match(player_a_id: int, player_b_id: int, game_id: int):
    """Notify players of a match."""
    try:
        # Store match data in Redis
        match_data_a = json.dumps({
            "game_id": game_id,
            "opponent_id": player_b_id,
            "created_at": time.time()
        })
        
        match_data_b = json.dumps({
            "game_id": game_id,
            "opponent_id": player_a_id,
            "created_at": time.time()
        })
        
        # Set match data with expiration
        redis_client.setex(f"duel_match:{player_a_id}", MATCH_TIMEOUT, match_data_a)
        redis_client.setex(f"duel_match:{player_b_id}", MATCH_TIMEOUT, match_data_b)
        
        # Publish match notification to Redis
        match_notification = json.dumps({
            "type": "match_found",
            "game_id": game_id,
            "player_a": player_a_id,
            "player_b": player_b_id,
            "timestamp": time.time()
        })
        
        redis_client.publish("match_notifications", match_notification)
        
        logger.info(f"Match created: Game {game_id} between players {player_a_id} and {player_b_id}")
        
    except Exception as e:
        logger.error(f"Error notifying players: {str(e)}")

async def find_match(player_data: dict, elo_range: int) -> Optional[dict]:
    """Find a match for a player within the given Elo range."""
    try:
        # Get all players in queue
        queue_members = redis_client.zrange("duel_queue", 0, -1)
        
        for member in queue_members:
            try:
                other_player = json.loads(member)
                
                # Skip self
                if other_player["user_id"] == player_data["user_id"]:
                    continue
                
                # Check Elo range
                elo_diff = abs(player_data["rating"] - other_player["rating"])
                if elo_diff <= elo_range:
                    # Check difficulty preference if both players specified it
                    if (player_data.get("difficulty") is not None and 
                        other_player.get("difficulty") is not None and 
                        player_data["difficulty"] != other_player["difficulty"]):
                        continue
                    
                    # Found a match
                    return other_player
            except json.JSONDecodeError:
                continue
        
        return None
    
    except Exception as e:
        logger.error(f"Error finding match: {str(e)}")
        return None

async def process_matchmaking():
    """Process the match queue and pair players."""
    logger.info("Starting matchmaking process")
    
    while True:
        try:
            # Get all players in queue
            queue_members = redis_client.zrange("duel_queue", 0, -1)
            processed_players = set()
            
            for member in queue_members:
                try:
                    player_data = json.loads(member)
                    player_id = player_data["user_id"]
                    
                    # Skip if already processed
                    if player_id in processed_players:
                        continue
                    
                    # Calculate how long they've been waiting
                    joined_at = player_data.get("joined_at", time.time())
                    wait_time = time.time() - joined_at
                    
                    # Calculate Elo range based on wait time
                    wait_intervals = int(wait_time / MATCH_CHECK_INTERVAL)
                    elo_range = min(
                        ELO_RANGE_INITIAL + (wait_intervals * ELO_RANGE_INCREMENT),
                        MAX_ELO_RANGE
                    )
                    
                    # Try to find a match
                    match = await find_match(player_data, elo_range)
                    
                    if match:
                        # Remove both players from queue
                        redis_client.zrem("duel_queue", member)
                        redis_client.zrem("duel_queue", json.dumps(match))
                        
                        # Add both to processed set
                        processed_players.add(player_id)
                        processed_players.add(match["user_id"])
                        
                        # Create game
                        game_id = await create_game(player_id, match["user_id"])
                        
                        if game_id:
                            # Notify players
                            await notify_players_of_match(player_id, match["user_id"], game_id)
                
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    logger.error(f"Error processing player in queue: {str(e)}")
            
            # Clean up expired matches
            await clean_expired_matches()
            
            # Wait before next processing
            await asyncio.sleep(MATCH_CHECK_INTERVAL)
            
        except Exception as e:
            logger.error(f"Error in matchmaking process: {str(e)}")
            await asyncio.sleep(MATCH_CHECK_INTERVAL)

async def clean_expired_matches():
    """Clean up expired matches."""
    try:
        # Scan all match keys
        cursor = 0
        pattern = "duel_match:*"
        
        while True:
            cursor, keys = redis_client.scan(cursor, match=pattern)
            
            for key in keys:
                try:
                    # Get match data
                    match_data = redis_client.get(key)
                    if match_data:
                        match = json.loads(match_data)
                        created_at = match.get("created_at", 0)
                        
                        # Check if match has expired
                        if time.time() - created_at > MATCH_TIMEOUT:
                            redis_client.delete(key)
                except Exception as e:
                    logger.error(f"Error cleaning match {key}: {str(e)}")
            
            if cursor == 0:
                break
    
    except Exception as e:
        logger.error(f"Error cleaning expired matches: {str(e)}")

async def handle_game_events():
    """Handle game-related events from Redis pubsub."""
    pubsub = redis_client.pubsub()
    pubsub.subscribe("game_events")
    
    logger.info("Listening for game events")
    
    for message in pubsub.listen():
        if message["type"] == "message":
            try:
                data = json.loads(message["data"])
                event_type = data.get("type")
                
                if event_type == "game_completed":
                    # Handle game completion
                    game_id = data.get("game_id")
                    logger.info(f"Game {game_id} completed")
                
                elif event_type == "round_completed":
                    # Handle round completion
                    game_id = data.get("game_id")
                    round_id = data.get("round_id")
                    logger.info(f"Round {round_id} in game {game_id} completed")
            
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error handling game event: {str(e)}")

def signal_handler(sig, frame):
    """Handle termination signals."""
    logger.info("Shutting down match service...")
    sys.exit(0)

async def main():
    """Main function to start the service."""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("LogicArena Match Service starting...")
    
    # Start tasks
    matchmaking_task = asyncio.create_task(process_matchmaking())
    events_task = asyncio.create_task(handle_game_events())
    
    # Wait for tasks
    await asyncio.gather(matchmaking_task, events_task)

if __name__ == "__main__":
    asyncio.run(main()) 