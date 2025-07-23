from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from typing import List, Optional
import json
import time
from datetime import datetime
import logging
import httpx
import random

from app.db.session import get_db
from app.models import Game, Round, Submission, User
from app.games.schemas import (
    GameResponse,
    GameDetail,
    DuelSubmission,
    DuelResponse
)
from app.config import settings
from app.middleware.rate_limiter import RateLimiters

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[GameResponse])
async def list_games(
    status: Optional[str] = Query(None, description="Filter by game status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List all games, optionally filtered by status"""
    query = select(Game).order_by(desc(Game.created))
    
    if status:
        query = query.filter(Game.status == status)
    
    result = await db.execute(query.limit(limit).offset(offset))
    games = result.scalars().all()
    
    # Fetch player details
    game_responses = []
    for game in games:
        # Get player handles
        player_a_result = await db.execute(select(User).filter(User.id == game.player_a))
        player_b_result = await db.execute(select(User).filter(User.id == game.player_b))
        
        player_a = player_a_result.scalars().first()
        player_b = player_b_result.scalars().first()
        
        game_responses.append(GameResponse(
            id=game.id,
            player_a=game.player_a,
            player_b=game.player_b,
            player_a_handle=player_a.handle if player_a else "Unknown",
            player_b_handle=player_b.handle if player_b else "Unknown",
            player_a_rating=player_a.rating if player_a else 0,
            player_b_rating=player_b.rating if player_b else 0,
            status=game.status,
            current_round=game.current_round,
            winner=game.winner,
            created=game.created,
            completed=game.completed
        ))
    
    return game_responses

@router.get("/{game_id}", response_model=GameDetail)
async def get_game(
    game_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific game"""
    # Get game
    result = await db.execute(select(Game).filter(Game.id == game_id))
    game = result.scalars().first()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    # Get player details
    player_a_result = await db.execute(select(User).filter(User.id == game.player_a))
    player_b_result = await db.execute(select(User).filter(User.id == game.player_b))
    
    player_a = player_a_result.scalars().first()
    player_b = player_b_result.scalars().first()
    
    # Get rounds
    rounds_result = await db.execute(
        select(Round).filter(Round.game_id == game_id).order_by(Round.round_number)
    )
    rounds = rounds_result.scalars().all()
    
    # Get submissions for each round
    rounds_data = []
    for round_obj in rounds:
        # Get submissions
        submissions_result = await db.execute(
            select(Submission).filter(
                Submission.game_id == game_id,
                Submission.puzzle_id == round_obj.puzzle_id
            )
        )
        submissions = submissions_result.scalars().all()
        
        rounds_data.append({
            "round_number": round_obj.round_number,
            "puzzle_id": round_obj.puzzle_id,
            "winner": round_obj.winner,
            "started": round_obj.started,
            "completed": round_obj.completed,
            "submissions": [
                {
                    "user_id": sub.user_id,
                    "verdict": sub.verdict,
                    "created": sub.created
                }
                for sub in submissions
            ]
        })
    
    return GameDetail(
        id=game.id,
        player_a=game.player_a,
        player_b=game.player_b,
        player_a_handle=player_a.handle if player_a else "Unknown",
        player_b_handle=player_b.handle if player_b else "Unknown",
        player_a_rating=player_a.rating if player_a else 0,
        player_b_rating=player_b.rating if player_b else 0,
        status=game.status,
        current_round=game.current_round,
        winner=game.winner,
        rating_delta=game.rating_delta,
        created=game.created,
        completed=game.completed,
        rounds=rounds_data
    )

@router.get("/active/list", response_model=List[GameResponse])
async def list_active_games(
    db: AsyncSession = Depends(get_db)
):
    """List all active games (for spectating)"""
    result = await db.execute(
        select(Game)
        .filter(Game.status == "active")
        .order_by(desc(Game.created))
    )
    games = result.scalars().all()
    
    active_games = []
    for game in games:
        # Get player details
        player_a_result = await db.execute(select(User).filter(User.id == game.player_a))
        player_b_result = await db.execute(select(User).filter(User.id == game.player_b))
        
        player_a = player_a_result.scalars().first()
        player_b = player_b_result.scalars().first()
        
        # Get current round
        round_result = await db.execute(
            select(Round)
            .filter(Round.game_id == game.id, Round.round_number == game.current_round)
        )
        current_round_obj = round_result.scalars().first()
        
        active_games.append(GameResponse(
            id=game.id,
            player_a=game.player_a,
            player_b=game.player_b,
            player_a_handle=player_a.handle if player_a else "Unknown",
            player_b_handle=player_b.handle if player_b else "Unknown",
            rounds=game.rounds,
            winner=game.winner,
            started=game.started,
            ended=game.ended,
            player_a_rating_change=game.player_a_rating_change,
            player_b_rating_change=game.player_b_rating_change
        ))
    
    return active_games