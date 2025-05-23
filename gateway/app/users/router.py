from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from typing import List, Optional

from app.db.session import get_db
from app.models import User, Game, Submission
from app.users.schemas import (
    UserProfileResponse, 
    UserStatsResponse, 
    UserSubmissionResponse,
    LeaderboardEntry,
    LeaderboardResponse
)
from app.auth.utils import get_current_active_user

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
    
    # Get games data
    total_games_a = await db.execute(select(func.count()).where(Game.player_a == user_id))
    total_games_b = await db.execute(select(func.count()).where(Game.player_b == user_id))
    total_games = total_games_a.scalar() + total_games_b.scalar()
    
    wins = await db.execute(select(func.count()).where(Game.winner == user_id))
    wins_count = wins.scalar()
    
    # Get submission data
    total_submissions = await db.execute(
        select(func.count()).where(Submission.user_id == user_id)
    )
    valid_submissions = await db.execute(
        select(func.count()).where(Submission.user_id == user_id, Submission.verdict == True)
    )
    
    # Calculate stats
    losses = total_games - wins_count - 0  # No draws for now
    win_rate = (wins_count / total_games) * 100 if total_games > 0 else 0
    
    return UserStatsResponse(
        total_games=total_games,
        wins=wins_count,
        losses=losses,
        draws=0,  # No draws in the current implementation
        win_rate=win_rate,
        rating=user.rating,
        best_rating=None,  # We don't track this yet
        total_submissions=total_submissions.scalar(),
        valid_submissions=valid_submissions.scalar()
    )

@router.get("/submissions/{user_id}", response_model=List[UserSubmissionResponse])
async def get_user_submissions(
    user_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get a user's recent submissions"""
    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get submissions
    result = await db.execute(
        select(Submission)
        .filter(Submission.user_id == user_id)
        .order_by(desc(Submission.created))
        .limit(limit)
        .offset(offset)
    )
    
    submissions = result.scalars().all()
    
    return submissions

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get the top users by rating"""
    # Calculate offset
    offset = (page - 1) * size
    
    # Get total users
    total_result = await db.execute(select(func.count()).select_from(User))
    total = total_result.scalar()
    
    # Get top users by rating
    result = await db.execute(
        select(
            User.id,
            User.handle,
            User.rating,
            func.count(Game.id).filter(Game.winner == User.id).label("games_won"),
            func.count(
                func.distinct(
                    func.coalesce(Game.id, 0)
                )
            ).label("games_played")
        )
        .outerjoin(Game, (Game.player_a == User.id) | (Game.player_b == User.id))
        .group_by(User.id)
        .order_by(desc(User.rating))
        .limit(size)
        .offset(offset)
    )
    
    rankings = []
    for row in result.all():
        rankings.append(
            LeaderboardEntry(
                id=row.id,
                handle=row.handle,
                rating=row.rating,
                games_won=row.games_won,
                games_played=row.games_played
            )
        )
    
    return LeaderboardResponse(
        rankings=rankings,
        total=total,
        page=page,
        size=size
    ) 