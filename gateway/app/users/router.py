from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, delete
from typing import List, Optional
import json
from datetime import datetime

from app.db.session import get_db
from app.models import User, Game, Submission, LoginActivity
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

@router.delete("/me")
async def delete_own_account(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete the current user's account and all associated data"""
    try:
        # Delete all submissions
        await db.execute(delete(Submission).where(Submission.user_id == current_user.id))
        
        # Delete all games where user participated
        # Note: In production, you might want to anonymize rather than delete games
        await db.execute(
            delete(Game).where(
                (Game.player_a == current_user.id) | (Game.player_b == current_user.id)
            )
        )
        
        # Delete the user
        await db.execute(delete(User).where(User.id == current_user.id))
        
        await db.commit()
        
        return {"detail": "Account deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )

@router.get("/me/export")
async def export_user_data(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Export all user data in JSON format (GDPR compliance)"""
    # Get user profile data
    user_data = {
        "id": current_user.id,
        "handle": current_user.handle,
        "email": current_user.email,
        "rating": current_user.rating,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "google_id": current_user.google_id,
    }
    
    # Get all games
    games_result = await db.execute(
        select(Game).where(
            (Game.player_a == current_user.id) | (Game.player_b == current_user.id)
        ).order_by(desc(Game.created))
    )
    games = games_result.scalars().all()
    
    games_data = []
    for game in games:
        games_data.append({
            "id": game.id,
            "player_a": game.player_a,
            "player_b": game.player_b,
            "winner": game.winner,
            "rating_delta": game.rating_delta,
            "created": game.created.isoformat() if game.created else None,
            "completed": game.completed.isoformat() if game.completed else None,
        })
    
    # Get all submissions
    submissions_result = await db.execute(
        select(Submission).where(
            Submission.user_id == current_user.id
        ).order_by(desc(Submission.created))
    )
    submissions = submissions_result.scalars().all()
    
    submissions_data = []
    for submission in submissions:
        submissions_data.append({
            "id": submission.id,
            "game_id": submission.game_id,
            "puzzle_id": submission.puzzle_id,
            "user_id": submission.user_id,
            "payload": submission.payload,
            "verdict": submission.verdict,
            "created": submission.created.isoformat() if submission.created else None,
        })
    
    # Compile all data
    export_data = {
        "export_date": datetime.utcnow().isoformat(),
        "platform": "LogicArena",
        "user": user_data,
        "games": games_data,
        "submissions": submissions_data,
        "total_games": len(games_data),
        "total_submissions": len(submissions_data),
    }
    
    # Return as JSON download
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=logicarena_userdata_{current_user.handle}_{datetime.utcnow().strftime('%Y%m%d')}.json"
        }
    )

@router.get("/me/login-activity")
async def get_login_activity(
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get user's recent login activity"""
    result = await db.execute(
        select(LoginActivity)
        .filter(LoginActivity.user_id == current_user.id)
        .order_by(desc(LoginActivity.created))
        .limit(limit)
    )
    activities = result.scalars().all()
    
    return {
        "activities": [
            {
                "id": activity.id,
                "login_type": activity.login_type,
                "ip_address": activity.ip_address,
                "user_agent": activity.user_agent,
                "success": activity.success,
                "error_message": activity.error_message,
                "created": activity.created.isoformat() if activity.created else None
            }
            for activity in activities
        ]
    } 