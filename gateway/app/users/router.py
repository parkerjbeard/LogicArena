from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, delete
from typing import List, Optional
import json
from datetime import datetime

from app.db.session import get_db
from app.models import User, Game, Submission
from app.users.schemas import (
    UserProfileResponse, 
    UserStatsResponse, 
    UserSubmissionResponse,
    LeaderboardEntry,
    LeaderboardResponse
)

router = APIRouter()

@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's profile by ID"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.get("/stats/{user_id}", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's statistics"""
    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get total games played
    total_games_result = await db.execute(
        select(func.count(Game.id)).where(
            (Game.player_a == user_id) | (Game.player_b == user_id),
            Game.winner.isnot(None)
        )
    )
    total_games = total_games_result.scalar() or 0
    
    # Get games won
    games_won_result = await db.execute(
        select(func.count(Game.id)).where(Game.winner == user_id)
    )
    games_won = games_won_result.scalar() or 0
    
    # Get total puzzles solved
    puzzles_solved_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.verdict == True
        )
    )
    puzzles_solved = puzzles_solved_result.scalar() or 0
    
    # Get recent form (last 10 games)
    recent_games_result = await db.execute(
        select(Game).where(
            (Game.player_a == user_id) | (Game.player_b == user_id),
            Game.winner.isnot(None)
        ).order_by(desc(Game.completed)).limit(10)
    )
    recent_games = recent_games_result.scalars().all()
    recent_wins = sum(1 for game in recent_games if game.winner == user_id)
    
    # Get win rate
    win_rate = (games_won / total_games * 100) if total_games > 0 else 0
    
    return UserStatsResponse(
        user_id=user_id,
        rating=user.rating,
        total_games=total_games,
        games_won=games_won,
        puzzles_solved=puzzles_solved,
        win_rate=round(win_rate, 1),
        recent_form=f"{recent_wins}/{len(recent_games)}"
    )

@router.get("/submissions/{user_id}", response_model=List[UserSubmissionResponse])
async def get_user_submissions(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get a user's submission history"""
    result = await db.execute(
        select(Submission)
        .filter(Submission.user_id == user_id)
        .order_by(desc(Submission.created))
        .limit(limit)
        .offset(offset)
    )
    submissions = result.scalars().all()
    
    return [
        UserSubmissionResponse(
            id=submission.id,
            puzzle_id=submission.puzzle_id,
            game_id=submission.game_id,
            verdict=submission.verdict,
            created=submission.created,
            processing_time_ms=submission.payload.get("processing_time_ms", 0) if submission.payload else 0
        )
        for submission in submissions
    ]

@router.get("/recent-games/{user_id}")
async def get_recent_games(
    user_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get a user's recent games"""
    result = await db.execute(
        select(Game).where(
            (Game.player_a == user_id) | (Game.player_b == user_id)
        ).order_by(desc(Game.created)).limit(limit)
    )
    games = result.scalars().all()
    
    # Fetch opponent details
    game_list = []
    for game in games:
        opponent_id = game.player_b if game.player_a == user_id else game.player_a
        opponent_result = await db.execute(select(User).filter(User.id == opponent_id))
        opponent = opponent_result.scalars().first()
        
        game_list.append({
            "id": game.id,
            "opponent": opponent.handle if opponent else "Unknown",
            "opponent_rating": opponent.rating if opponent else 0,
            "winner": game.winner,
            "rating_delta": game.rating_delta,
            "created": game.created,
            "completed": game.completed,
            "won": game.winner == user_id
        })
    
    return game_list

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get the global leaderboard"""
    # Get total count of active users
    count_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    total_users = count_result.scalar() or 0
    
    # Get leaderboard entries
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(desc(User.rating))
        .limit(limit)
        .offset(offset)
    )
    users = result.scalars().all()
    
    entries = []
    for idx, user in enumerate(users):
        # Get games played
        games_result = await db.execute(
            select(func.count(Game.id)).where(
                (Game.player_a == user.id) | (Game.player_b == user.id),
                Game.winner.isnot(None)
            )
        )
        games_played = games_result.scalar() or 0
        
        # Get games won
        wins_result = await db.execute(
            select(func.count(Game.id)).where(Game.winner == user.id)
        )
        games_won = wins_result.scalar() or 0
        
        entries.append(LeaderboardEntry(
            rank=offset + idx + 1,
            user_id=user.id,
            handle=user.handle,
            rating=user.rating,
            games_played=games_played,
            games_won=games_won
        ))
    
    return LeaderboardResponse(
        total_users=total_users,
        entries=entries,
        offset=offset,
        limit=limit
    )