from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, update
from typing import List, Optional
import httpx
import time
import redis.asyncio as redis
import json
import logging
import datetime
import random

from app.db.session import get_db
from app.models import User, Game, Round, Puzzle, Submission
from app.games.schemas import (
    GameResponse,
    GameDetail,
    GameListResponse,
    DuelSubmission,
    DuelResponse,
    DuelQueueRequest,
    DuelQueueResponse,
    DuelMatchResponse
)
from app.auth.utils import get_current_active_user
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Redis client for publishing events
redis_client = None

async def get_redis_client():
    """Get or create Redis client"""
    global redis_client
    if not redis_client:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client

async def publish_game_event(event_type: str, data: dict):
    """Publish a game event to Redis for WebSocket broadcast"""
    try:
        client = await get_redis_client()
        event = {
            "type": event_type,
            "timestamp": time.time(),
            **data
        }
        await client.publish("game_events", json.dumps(event))
        logger.info(f"Published game event: {event_type}")
    except Exception as e:
        logger.error(f"Failed to publish game event: {e}")

async def notify_opponent_of_submission(game_id: int, submitter_id: int, opponent_id: int, is_valid: bool):
    """Notify opponent when a player submits a proof"""
    try:
        await publish_game_event("opponent_submission", {
            "game_id": game_id,
            "submitter_id": submitter_id,
            "opponent_id": opponent_id,
            "is_valid": is_valid
        })
    except Exception as e:
        logger.error(f"Failed to notify opponent: {e}")

@router.get("/", response_model=GameListResponse)
async def get_games(
    user_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get a list of games, optionally filtered by user ID"""
    # Calculate offset
    offset = (page - 1) * size
    
    # Build query
    query = select(
        Game,
        User.handle.label("player_a_handle"),
        User.handle.label("player_b_handle")
    ).join(
        User, 
        Game.player_a == User.id
    ).join(
        User, 
        Game.player_b == User.id,
        isouter=True
    )
    
    count_query = select(func.count()).select_from(Game)
    
    if user_id:
        query = query.filter((Game.player_a == user_id) | (Game.player_b == user_id))
        count_query = count_query.filter((Game.player_a == user_id) | (Game.player_b == user_id))
    
    # Get count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get games
    result = await db.execute(
        query
        .order_by(desc(Game.started))
        .limit(size)
        .offset(offset)
    )
    
    games = []
    for row in result:
        game = row[0]
        game.player_a_handle = row[1]
        game.player_b_handle = row[2]
        games.append(game)
    
    return GameListResponse(
        games=games,
        total=total,
        page=page,
        size=size
    )

@router.get("/{game_id}", response_model=GameDetail)
async def get_game(
    game_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a game by ID with its rounds"""
    # Get game
    result = await db.execute(
        select(
            Game,
            User.handle.label("player_a_handle"),
            User.handle.label("player_b_handle")
        )
        .join(User, Game.player_a == User.id)
        .join(User, Game.player_b == User.id, isouter=True)
        .filter(Game.id == game_id)
    )
    
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    game = row[0]
    game.player_a_handle = row[1]
    game.player_b_handle = row[2]
    
    # Get rounds
    rounds_result = await db.execute(
        select(Round)
        .filter(Round.game_id == game_id)
        .order_by(Round.round_number)
    )
    
    game_rounds = rounds_result.scalars().all()
    game.game_rounds = game_rounds
    
    return game

@router.post("/duel/queue", response_model=DuelQueueResponse)
async def join_duel_queue(
    request: DuelQueueRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Join the duel queue"""
    # Connect to Redis
    r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    
    # Add user to queue with timestamp
    user_data = {
        "user_id": current_user.id,
        "rating": current_user.rating,
        "handle": current_user.handle,
        "joined_at": time.time(),
        "difficulty": request.difficulty
    }
    
    # Store in Redis sorted set by rating for matchmaking
    await r.zadd("duel_queue", {json.dumps(user_data): current_user.rating})
    
    # Get queue position
    position = await r.zrevrank("duel_queue", json.dumps(user_data))
    if position is None:
        position = 0
    else:
        position += 1
    
    # Calculate estimated wait time based on queue position
    estimated_wait = position * 5  # Simple estimate: 5 seconds per position
    
    return DuelQueueResponse(position=position, estimated_wait=estimated_wait)

@router.delete("/duel/queue", status_code=status.HTTP_204_NO_CONTENT)
async def leave_duel_queue(
    current_user: User = Depends(get_current_active_user)
):
    """Leave the duel queue"""
    # Connect to Redis
    r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    
    # Remove user from queue
    # We need to scan the queue to find the user's entry
    cursor = 0
    user_id_str = str(current_user.id)
    
    while True:
        cursor, keys = await r.zscan("duel_queue", cursor)
        
        for key in keys:
            user_data = json.loads(key[0])
            if str(user_data.get("user_id")) == user_id_str:
                await r.zrem("duel_queue", key[0])
        
        if cursor == 0:
            break
    
    return None

@router.post("/duel/submit", response_model=DuelResponse)
async def submit_duel_proof(
    submission: DuelSubmission,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a proof for a duel round"""
    # Check if game and round exist
    game_result = await db.execute(select(Game).filter(Game.id == submission.game_id))
    game = game_result.scalars().first()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    # Verify user is part of the game
    if game.player_a != current_user.id and game.player_b != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this game"
        )
    
    # Check if round exists
    round_result = await db.execute(select(Round).filter(Round.id == submission.round_id))
    round_obj = round_result.scalars().first()
    
    if not round_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Round not found"
        )
    
    # Check if round is part of the game
    if round_obj.game_id != game.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Round does not belong to the specified game"
        )
    
    # Check if round already has a winner
    if round_obj.winner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Round already has a winner"
        )
    
    # Get the puzzle for this round
    puzzle_result = await db.execute(select(Puzzle).filter(Puzzle.id == round_obj.puzzle_id))
    puzzle = puzzle_result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Verify the proof
    start_time = time.time()
    error_message = None
    counter_model = None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.PROOF_CHECKER_URL}/verify",
                json={
                    "gamma": puzzle.gamma,
                    "phi": puzzle.phi,
                    "proof": submission.payload
                },
                timeout=5.0
            )
            
            result = response.json()
            verdict = result.get("ok", False)
            
            if not verdict:
                error_message = result.get("error")
                counter_model = result.get("counterModel")
                
    except Exception as e:
        logger.error(f"Error verifying proof: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify proof"
        )
        
    processing_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
    
    # Store the submission
    new_submission = Submission(
        user_id=current_user.id,
        puzzle_id=puzzle.id,
        game_id=game.id,
        round_id=round_obj.id,
        payload=submission.payload,
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time
    )
    
    db.add(new_submission)
    
    # Initialize response
    response = DuelResponse(
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time,
        counter_model=counter_model,
        round_winner=None,
        game_winner=None,
        rating_change=None
    )
    
    # If the proof is valid, update round and game
    if verdict:
        # Set round winner
        round_obj.winner = current_user.id
        round_obj.ended = datetime.datetime.utcnow()
        
        # Count rounds won by each player
        rounds_won_a = await db.execute(
            select(func.count())
            .where(Round.game_id == game.id, Round.winner == game.player_a)
        )
        rounds_won_a_count = rounds_won_a.scalar() + (1 if current_user.id == game.player_a else 0)
        
        rounds_won_b = await db.execute(
            select(func.count())
            .where(Round.game_id == game.id, Round.winner == game.player_b)
        )
        rounds_won_b_count = rounds_won_b.scalar() + (1 if current_user.id == game.player_b else 0)
        
        # Check if game is over (best of 3)
        if rounds_won_a_count > game.rounds / 2 or rounds_won_b_count > game.rounds / 2:
            # Game is over
            game.ended = datetime.datetime.utcnow()
            game.winner = game.player_a if rounds_won_a_count > rounds_won_b_count else game.player_b
            
            # Calculate Elo rating changes
            rating_changes = await calculate_elo_rating_changes(
                player_a_id=game.player_a,
                player_b_id=game.player_b,
                winner_id=game.winner,
                db=db
            )
            
            # Update game with rating changes
            game.player_a_rating_change = rating_changes["player_a_change"]
            game.player_b_rating_change = rating_changes["player_b_change"]
            
            # Update user ratings
            await db.execute(
                update(User)
                .where(User.id == game.player_a)
                .values(rating=User.rating + rating_changes["player_a_change"])
            )
            
            await db.execute(
                update(User)
                .where(User.id == game.player_b)
                .values(rating=User.rating + rating_changes["player_b_change"])
            )
            
            # Set game winner and rating change in response
            response.game_winner = game.winner
            response.rating_change = rating_changes["player_a_change"] if current_user.id == game.player_a else rating_changes["player_b_change"]
        
        # Set round winner in response
        response.round_winner = current_user.id
    else:
        # Invalid submission, apply time penalty
        # In a real implementation, we would update a time counter in Redis
        pass
    
    await db.commit()
    
    # Notify players via WebSocket about round/game results
    if verdict:
        # Broadcast round completion
        await publish_game_event("round_complete", {
            "game_id": game.id,
            "round_id": round_obj.id,
            "round_winner": current_user.id,
            "round_number": round_obj.round_number,
            "submission": {
                "user_id": current_user.id,
                "verdict": verdict,
                "timestamp": new_submission.created.isoformat()
            }
        })
        
        # If game is over, broadcast game completion
        if response.game_winner:
            await publish_game_event("game_complete", {
                "game_id": game.id,
                "game_winner": response.game_winner,
                "player_a_rating_change": game.player_a_rating_change,
                "player_b_rating_change": game.player_b_rating_change,
                "final_score": {
                    "player_a": rounds_won_a_count,
                    "player_b": rounds_won_b_count
                }
            })
    else:
        # Notify about invalid submission (time penalty)
        await publish_game_event("submission_failed", {
            "game_id": game.id,
            "user_id": current_user.id,
            "round_id": round_obj.id,
            "error": error_message
        })
    
    return response

async def calculate_elo_rating_changes(
    player_a_id: int, 
    player_b_id: int, 
    winner_id: int,
    db: AsyncSession
):
    """Calculate Elo rating changes based on game outcome"""
    # Get current ratings
    player_a_result = await db.execute(select(User.rating).filter(User.id == player_a_id))
    player_a_rating = player_a_result.scalar()
    
    player_b_result = await db.execute(select(User.rating).filter(User.id == player_b_id))
    player_b_rating = player_b_result.scalar()
    
    # Calculate expected scores
    expected_a = 1 / (1 + 10 ** ((player_b_rating - player_a_rating) / 400))
    expected_b = 1 / (1 + 10 ** ((player_a_rating - player_b_rating) / 400))
    
    # Calculate actual scores
    score_a = 1 if winner_id == player_a_id else 0
    score_b = 1 if winner_id == player_b_id else 0
    
    # Calculate rating changes
    player_a_change = round(settings.ELO_K_FACTOR * (score_a - expected_a))
    player_b_change = round(settings.ELO_K_FACTOR * (score_b - expected_b))
    
    return {
        "player_a_change": player_a_change,
        "player_b_change": player_b_change
    }


@router.post("/duel/check-match", response_model=Optional[DuelMatchResponse])
async def check_duel_match(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if a match has been found for the user"""
    # Connect to Redis
    r = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    
    # Check if user has a pending match
    match_key = f"duel_match:{current_user.id}"
    match_data = await r.get(match_key)
    
    if not match_data:
        return None
    
    # Parse match data
    match = json.loads(match_data)
    game_id = match.get("game_id")
    opponent_id = match.get("opponent_id")
    
    # Get opponent data
    opponent_result = await db.execute(
        select(User.handle, User.rating).filter(User.id == opponent_id)
    )
    opponent_data = opponent_result.first()
    
    if not opponent_data:
        # Opponent not found, remove match
        await r.delete(match_key)
        return None
    
    opponent_handle, opponent_rating = opponent_data
    
    # Return match data
    return DuelMatchResponse(
        game_id=game_id,
        opponent_id=opponent_id,
        opponent_handle=opponent_handle,
        opponent_rating=opponent_rating
    ) 