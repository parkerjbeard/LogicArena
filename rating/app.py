import os
import asyncio
import json
import time
import redis
import psycopg2
import psycopg2.extras
from loguru import logger
from dotenv import load_dotenv
import signal
import sys

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
ELO_K_FACTOR = int(os.getenv("ELO_K_FACTOR", "40"))
UPDATE_INTERVAL = 5  # seconds

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

def calculate_elo_change(rating_a, rating_b, score_a, score_b):
    """Calculate Elo rating changes."""
    # Calculate expected scores
    expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
    expected_b = 1 / (1 + 10 ** ((rating_a - rating_b) / 400))
    
    # Calculate rating changes
    change_a = round(ELO_K_FACTOR * (score_a - expected_a))
    change_b = round(ELO_K_FACTOR * (score_b - expected_b))
    
    return change_a, change_b

def update_elo_ratings(game_id):
    """Update Elo ratings for a completed game."""
    try:
        conn = get_db_connection()
        
        # First, get the game data
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(
                """
                SELECT g.*, 
                       ua.rating as rating_a, 
                       ub.rating as rating_b
                FROM game g
                JOIN "user" ua ON g.player_a = ua.id
                JOIN "user" ub ON g.player_b = ub.id
                WHERE g.id = %s AND g.ended IS NOT NULL AND g.winner IS NOT NULL
                """,
                (game_id,)
            )
            
            game = cur.fetchone()
            
            if not game:
                logger.warning(f"Game {game_id} not found or not completed")
                return
            
            # Calculate scores
            score_a = 1 if game["winner"] == game["player_a"] else 0
            score_b = 1 if game["winner"] == game["player_b"] else 0
            
            # Calculate rating changes
            change_a, change_b = calculate_elo_change(
                game["rating_a"],
                game["rating_b"],
                score_a,
                score_b
            )
            
            # Update ratings
            cur.execute(
                """
                UPDATE "user" SET rating = rating + %s WHERE id = %s
                """,
                (change_a, game["player_a"])
            )
            
            cur.execute(
                """
                UPDATE "user" SET rating = rating + %s WHERE id = %s
                """,
                (change_b, game["player_b"])
            )
            
            # Update game with rating changes
            cur.execute(
                """
                UPDATE game SET 
                    player_a_rating_change = %s,
                    player_b_rating_change = %s
                WHERE id = %s
                """,
                (change_a, change_b, game_id)
            )
            
            logger.info(f"Updated ratings for game {game_id}: {change_a} for player {game['player_a']}, {change_b} for player {game['player_b']}")
            
            # Publish rating update event
            rating_update = {
                "type": "rating_update",
                "game_id": game_id,
                "player_a": {
                    "id": game["player_a"],
                    "change": change_a,
                    "new_rating": game["rating_a"] + change_a
                },
                "player_b": {
                    "id": game["player_b"],
                    "change": change_b,
                    "new_rating": game["rating_b"] + change_b
                },
                "timestamp": time.time()
            }
            
            redis_client.publish("rating_updates", json.dumps(rating_update))
    
    except Exception as e:
        logger.error(f"Error updating ratings for game {game_id}: {str(e)}")
    
    finally:
        close_db_connection(conn)

async def handle_game_completions():
    """Listen for game completion events and update ratings."""
    pubsub = redis_client.pubsub()
    pubsub.subscribe("game_events")
    
    logger.info("Listening for game events")
    
    for message in pubsub.listen():
        if message["type"] == "message":
            try:
                data = json.loads(message["data"])
                event_type = data.get("type")
                
                if event_type == "game_completed":
                    game_id = data.get("game_id")
                    logger.info(f"Processing rating update for completed game {game_id}")
                    
                    # Update ratings
                    update_elo_ratings(game_id)
            
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error handling game event: {str(e)}")

async def periodic_rating_updates():
    """Periodically check for completed games that need rating updates."""
    logger.info("Starting periodic rating updates")
    
    while True:
        try:
            conn = get_db_connection()
            
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                # Find games that are completed but don't have rating changes
                cur.execute(
                    """
                    SELECT id FROM game
                    WHERE ended IS NOT NULL 
                    AND winner IS NOT NULL
                    AND (player_a_rating_change IS NULL OR player_b_rating_change IS NULL)
                    """
                )
                
                games = cur.fetchall()
                
                for game in games:
                    logger.info(f"Processing missed rating update for game {game['id']}")
                    update_elo_ratings(game["id"])
        
        except Exception as e:
            logger.error(f"Error in periodic rating updates: {str(e)}")
        
        finally:
            close_db_connection(conn)
            
            # Wait before next check
            await asyncio.sleep(UPDATE_INTERVAL)

def recalculate_all_ratings():
    """Recalculate all user ratings from scratch (for maintenance)."""
    try:
        conn = get_db_connection()
        
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Reset all ratings to 1000
            cur.execute('UPDATE "user" SET rating = 1000')
            
            # Get all completed games in chronological order
            cur.execute(
                """
                SELECT id FROM game
                WHERE ended IS NOT NULL AND winner IS NOT NULL
                ORDER BY ended ASC
                """
            )
            
            games = cur.fetchall()
            
            for game in games:
                update_elo_ratings(game["id"])
                
            logger.info(f"Recalculated ratings for {len(games)} games")
    
    except Exception as e:
        logger.error(f"Error recalculating ratings: {str(e)}")
    
    finally:
        close_db_connection(conn)

def signal_handler(sig, frame):
    """Handle termination signals."""
    logger.info("Shutting down rating service...")
    sys.exit(0)

async def main():
    """Main function to start the service."""
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("LogicArena Rating Service starting...")
    
    # Start tasks
    events_task = asyncio.create_task(handle_game_completions())
    periodic_task = asyncio.create_task(periodic_rating_updates())
    
    # Wait for tasks
    await asyncio.gather(events_task, periodic_task)

if __name__ == "__main__":
    asyncio.run(main()) 