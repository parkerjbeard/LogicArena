from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, delete, and_
from typing import List, Optional
import json
from datetime import datetime, date, timedelta
import bcrypt

from app.db.session import get_db
from app.models import (
    User, Game, Submission, UserPuzzleProgress, 
    UserTutorialProgress, UserAchievement, UserDailyStats, Puzzle
)
from app.users.profile_schemas import (
    UserProfileResponse, 
    UserProfileUpdate,
    PuzzleProgressResponse,
    TutorialProgressResponse,
    AchievementResponse,
    DailyStatsResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    UserStatsUpdate
)
from app.users.schemas import (
    UserStatsResponse, 
    UserSubmissionResponse,
    UserLogin,
    UserRegister,
    UserLoginResponse,
    SupabaseProfileCreate,
    SupabaseProfileResponse
)

router = APIRouter()

@router.post("/supabase-profile", response_model=SupabaseProfileResponse)
async def create_or_update_supabase_profile(
    profile_data: SupabaseProfileCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create or update a user profile from Supabase auth"""
    # Check if user already exists with this supabase_id
    result = await db.execute(
        select(User).filter(User.supabase_id == profile_data.supabase_id)
    )
    existing_user = result.scalars().first()
    
    if existing_user:
        # Update existing user
        existing_user.email = profile_data.email
        existing_user.handle = profile_data.handle
        existing_user.last_active = datetime.utcnow()
    else:
        # Check if email already exists (legacy user)
        email_result = await db.execute(
            select(User).filter(User.email == profile_data.email)
        )
        legacy_user = email_result.scalars().first()
        
        if legacy_user:
            # Link Supabase ID to existing user
            legacy_user.supabase_id = profile_data.supabase_id
            legacy_user.last_active = datetime.utcnow()
            existing_user = legacy_user
        else:
            # Create new user
            existing_user = User(
                handle=profile_data.handle,
                email=profile_data.email,
                supabase_id=profile_data.supabase_id
            )
            db.add(existing_user)
    
    await db.commit()
    await db.refresh(existing_user)
    
    return SupabaseProfileResponse(
        id=existing_user.id,
        handle=existing_user.handle,
        email=existing_user.email,
        supabase_id=existing_user.supabase_id,
        created=existing_user.created
    )

@router.get("/supabase-profile/{supabase_id}", response_model=SupabaseProfileResponse)
async def get_profile_by_supabase_id(
    supabase_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user profile by Supabase ID"""
    result = await db.execute(
        select(User).filter(User.supabase_id == supabase_id)
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return SupabaseProfileResponse(
        id=user.id,
        handle=user.handle,
        email=user.email,
        supabase_id=user.supabase_id,
        created=user.created
    )

@router.post("/register")
async def register_user(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user with email and password"""
    # Check if email already exists
    result = await db.execute(
        select(User).filter(User.email == user_data.email)
    )
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Hash the password
    password_hash = bcrypt.hashpw(
        user_data.password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')
    
    # Create new user
    new_user = User(
        handle=user_data.handle or user_data.email.split('@')[0],
        email=user_data.email,
        password_hash=password_hash
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "handle": new_user.handle,
        "email": new_user.email,
        "created": new_user.created
    }

@router.post("/login", response_model=UserLoginResponse)
async def login_user(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login a user with email and password"""
    result = await db.execute(
        select(User).filter(User.email == credentials.email)
    )
    user = result.scalars().first()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not bcrypt.checkpw(
        credentials.password.encode('utf-8'), 
        user.password_hash.encode('utf-8')
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last active
    user.last_active = datetime.utcnow()
    await db.commit()
    
    return UserLoginResponse(
        user={
            "id": user.id,
            "handle": user.handle,
            "email": user.email,
            "created": user.created
        },
        message="Login successful"
    )

@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's comprehensive profile by ID"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get total games and wins
    total_games_result = await db.execute(
        select(func.count(Game.id)).where(
            (Game.player_a == user_id) | (Game.player_b == user_id),
            Game.winner.isnot(None)
        )
    )
    total_games = total_games_result.scalar() or 0
    
    games_won_result = await db.execute(
        select(func.count(Game.id)).where(Game.winner == user_id)
    )
    games_won = games_won_result.scalar() or 0
    
    # Get total puzzles solved and unique puzzles solved
    puzzles_solved_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.verdict == True
        )
    )
    puzzles_solved = puzzles_solved_result.scalar() or 0
    
    unique_puzzles_result = await db.execute(
        select(func.count(func.distinct(Submission.puzzle_id))).where(
            Submission.user_id == user_id,
            Submission.verdict == True,
            Submission.puzzle_id.isnot(None)
        )
    )
    unique_puzzles_solved = unique_puzzles_result.scalar() or 0
    
    # Get recent puzzle progress
    recent_progress_result = await db.execute(
        select(UserPuzzleProgress, Puzzle)
        .join(Puzzle, UserPuzzleProgress.puzzle_id == Puzzle.id)
        .where(UserPuzzleProgress.user_id == user_id)
        .order_by(desc(UserPuzzleProgress.last_attempted_at))
        .limit(10)
    )
    recent_progress = recent_progress_result.all()
    
    recent_puzzle_progress = []
    for progress, puzzle in recent_progress:
        progress_resp = PuzzleProgressResponse.model_validate(progress)
        progress_resp.puzzle_difficulty = puzzle.difficulty
        progress_resp.puzzle_gamma = puzzle.gamma
        progress_resp.puzzle_phi = puzzle.phi
        recent_puzzle_progress.append(progress_resp)
    
    # Get completed tutorials
    tutorials_result = await db.execute(
        select(UserTutorialProgress.tutorial_id)
        .where(
            UserTutorialProgress.user_id == user_id,
            UserTutorialProgress.completed == True
        )
    )
    completed_tutorials = [row[0] for row in tutorials_result.all()]
    
    # Get achievements
    achievements_result = await db.execute(
        select(UserAchievement)
        .where(UserAchievement.user_id == user_id)
        .order_by(desc(UserAchievement.earned_at))
    )
    achievements = [
        AchievementResponse.model_validate(ach) 
        for ach in achievements_result.scalars().all()
    ]
    
    win_rate = (games_won / total_games * 100) if total_games > 0 else 0
    
    return UserProfileResponse(
        id=user.id,
        handle=user.handle,
        email=user.email,
        created=user.created,
        last_active=user.last_active,
        bio=user.bio,
        avatar_url=user.avatar_url,
        experience_points=user.experience_points,
        level=user.level,
        streak_days=user.streak_days,
        last_streak_date=user.last_streak_date,
        rating=user.rating,
        total_games=total_games,
        games_won=games_won,
        win_rate=win_rate,
        puzzles_solved=puzzles_solved,
        unique_puzzles_solved=unique_puzzles_solved,
        total_practice_time=user.total_practice_time,
        recent_puzzle_progress=recent_puzzle_progress,
        completed_tutorials=completed_tutorials,
        achievements=achievements
    )

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
    sort_by: str = Query("experience_points", enum=["experience_points", "rating", "puzzles_solved", "streak_days"]),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get the global leaderboard sorted by different criteria"""
    # Get total count of active users
    count_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    total_users = count_result.scalar() or 0
    
    # Determine sort order
    if sort_by == "experience_points":
        order_by = desc(User.experience_points)
    elif sort_by == "rating":
        order_by = desc(User.rating)
    elif sort_by == "streak_days":
        order_by = desc(User.streak_days)
    else:  # puzzles_solved - need to join with submissions
        order_by = desc(User.rating)  # fallback for now
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Get leaderboard entries
    result = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(order_by)
        .limit(per_page)
        .offset(offset)
    )
    users = result.scalars().all()
    
    entries = []
    for idx, user in enumerate(users):
        # Get games stats
        games_result = await db.execute(
            select(func.count(Game.id)).where(
                (Game.player_a == user.id) | (Game.player_b == user.id),
                Game.winner.isnot(None)
            )
        )
        games_played = games_result.scalar() or 0
        
        wins_result = await db.execute(
            select(func.count(Game.id)).where(Game.winner == user.id)
        )
        games_won = wins_result.scalar() or 0
        
        # Get puzzles solved count
        puzzles_result = await db.execute(
            select(func.count(Submission.id)).where(
                Submission.user_id == user.id,
                Submission.verdict == True
            )
        )
        puzzles_solved = puzzles_result.scalar() or 0
        
        win_rate = (games_won / games_played * 100) if games_played > 0 else 0
        
        entries.append(LeaderboardEntry(
            rank=offset + idx + 1,
            user_id=user.id,
            handle=user.handle,
            avatar_url=user.avatar_url,
            level=user.level,
            experience_points=user.experience_points,
            rating=user.rating,
            puzzles_solved=puzzles_solved,
            games_won=games_won,
            win_rate=win_rate,
            streak_days=user.streak_days
        ))
    
    return LeaderboardResponse(
        entries=entries,
        total_users=total_users,
        page=page,
        per_page=per_page,
        sort_by=sort_by
    )


@router.patch("/profile/{user_id}")
async def update_user_profile(
    user_id: int,
    profile_update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update user profile information"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update profile fields
    if profile_update.bio is not None:
        user.bio = profile_update.bio
    if profile_update.avatar_url is not None:
        user.avatar_url = profile_update.avatar_url
    
    await db.commit()
    await db.refresh(user)
    
    return {"message": "Profile updated successfully"}


@router.get("/puzzle-progress/{user_id}")
async def get_puzzle_progress(
    user_id: int,
    difficulty: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed puzzle progress for a user"""
    query = select(UserPuzzleProgress, Puzzle).join(
        Puzzle, UserPuzzleProgress.puzzle_id == Puzzle.id
    ).where(UserPuzzleProgress.user_id == user_id)
    
    if difficulty is not None:
        query = query.where(Puzzle.difficulty == difficulty)
    
    query = query.order_by(desc(UserPuzzleProgress.last_attempted_at)).limit(limit)
    
    result = await db.execute(query)
    progress_list = result.all()
    
    return [
        {
            "puzzle_id": progress.puzzle_id,
            "difficulty": puzzle.difficulty,
            "gamma": puzzle.gamma,
            "phi": puzzle.phi,
            "first_completed_at": progress.first_completed_at,
            "best_solution_length": progress.best_solution_length,
            "total_attempts": progress.total_attempts,
            "successful_attempts": progress.successful_attempts,
            "hints_used": progress.hints_used,
            "average_time_seconds": progress.average_time_seconds
        }
        for progress, puzzle in progress_list
    ]


@router.get("/tutorial-progress/{user_id}")
async def get_tutorial_progress(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get tutorial progress for a user"""
    result = await db.execute(
        select(UserTutorialProgress)
        .where(UserTutorialProgress.user_id == user_id)
        .order_by(UserTutorialProgress.started_at)
    )
    progress_list = result.scalars().all()
    
    return [
        TutorialProgressResponse.model_validate(progress)
        for progress in progress_list
    ]


@router.get("/daily-stats/{user_id}")
async def get_daily_stats(
    user_id: int,
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db)
):
    """Get daily statistics for a user"""
    start_date = date.today() - timedelta(days=days)
    
    result = await db.execute(
        select(UserDailyStats)
        .where(
            UserDailyStats.user_id == user_id,
            UserDailyStats.date >= start_date
        )
        .order_by(UserDailyStats.date)
    )
    stats = result.scalars().all()
    
    return [
        DailyStatsResponse.model_validate(stat)
        for stat in stats
    ]