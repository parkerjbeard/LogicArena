from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import httpx
import time

from app.db.session import get_db
from app.models import User, Puzzle, Game, Round, Submission
from app.auth.utils import get_current_admin_user
from app.config import settings
from app.admin.schemas import (
    UserUpdate, UserResponse, UserListResponse,
    PuzzleCreate, PuzzleUpdate, PuzzleResponse, PuzzleListResponse,
    GameResponse, GameListResponse,
    SubmissionResponse, SubmissionListResponse,
    SystemStats,
    ProofTestRequest, ProofTestResponse,
    PuzzleTestRequest, PuzzleTestResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)]
)

# User Management Endpoints
@router.get("/users", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    sort_by: str = Query("created", regex="^(created|rating|handle|email)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List all users with filtering and pagination"""
    query = select(User)
    
    # Apply filters
    filters = []
    if search:
        search_pattern = f"%{search}%"
        filters.append(
            or_(
                User.handle.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
    if is_active is not None:
        filters.append(User.is_active == is_active)
    if is_admin is not None:
        filters.append(User.is_admin == is_admin)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Count total
    count_query = select(func.count()).select_from(User)
    if filters:
        count_query = count_query.filter(and_(*filters))
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Apply sorting
    sort_column = getattr(User, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        users=[UserResponse.from_orm(user) for user in users],
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific user by ID"""
    result = await db.execute(
        select(User)
        .filter(User.id == user_id)
        .options(
            selectinload(User.submissions),
            selectinload(User.games_as_player_a),
            selectinload(User.games_as_player_b)
        )
    )
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Update a user's details"""
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from removing their own admin status
    if user_id == current_admin.id and user_update.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status"
        )
    
    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Delete a user (soft delete by deactivating)"""
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    await db.commit()
    
    return {"message": "User deactivated successfully"}

# Puzzle Management Endpoints
@router.get("/puzzles", response_model=PuzzleListResponse)
async def list_puzzles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    difficulty: Optional[int] = Query(None, ge=1, le=10),
    sort_by: str = Query("created", regex="^(created|difficulty|best_len|id)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List all puzzles with filtering and pagination"""
    query = select(Puzzle)
    
    # Apply filters
    if difficulty is not None:
        query = query.filter(Puzzle.difficulty == difficulty)
    
    # Count total
    count_query = select(func.count()).select_from(Puzzle)
    if difficulty is not None:
        count_query = count_query.filter(Puzzle.difficulty == difficulty)
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Apply sorting
    sort_column = getattr(Puzzle, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    puzzles = result.scalars().all()
    
    return PuzzleListResponse(
        puzzles=[PuzzleResponse.from_orm(puzzle) for puzzle in puzzles],
        total=total,
        skip=skip,
        limit=limit
    )

@router.post("/puzzles", response_model=PuzzleResponse)
async def create_puzzle(
    puzzle: PuzzleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new puzzle"""
    new_puzzle = Puzzle(**puzzle.dict())
    db.add(new_puzzle)
    await db.commit()
    await db.refresh(new_puzzle)
    
    return PuzzleResponse.from_orm(new_puzzle)

@router.get("/puzzles/{puzzle_id}", response_model=PuzzleResponse)
async def get_puzzle(
    puzzle_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific puzzle by ID"""
    result = await db.execute(
        select(Puzzle)
        .filter(Puzzle.id == puzzle_id)
        .options(selectinload(Puzzle.submissions))
    )
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    return PuzzleResponse.from_orm(puzzle)

@router.patch("/puzzles/{puzzle_id}", response_model=PuzzleResponse)
async def update_puzzle(
    puzzle_id: int,
    puzzle_update: PuzzleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a puzzle"""
    result = await db.execute(select(Puzzle).filter(Puzzle.id == puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    update_data = puzzle_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(puzzle, field, value)
    
    await db.commit()
    await db.refresh(puzzle)
    
    return PuzzleResponse.from_orm(puzzle)

@router.delete("/puzzles/{puzzle_id}")
async def delete_puzzle(
    puzzle_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a puzzle"""
    result = await db.execute(select(Puzzle).filter(Puzzle.id == puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Check if puzzle is used in any games
    game_count_result = await db.execute(
        select(func.count()).select_from(Round).filter(Round.puzzle_id == puzzle_id)
    )
    game_count = game_count_result.scalar()
    
    if game_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete puzzle used in {game_count} games"
        )
    
    await db.delete(puzzle)
    await db.commit()
    
    return {"message": "Puzzle deleted successfully"}

# Game Management Endpoints
@router.get("/games", response_model=GameListResponse)
async def list_games(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    player_id: Optional[int] = None,
    status: Optional[str] = Query(None, regex="^(active|completed)$"),
    sort_by: str = Query("started", regex="^(started|ended|id)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List all games with filtering and pagination"""
    query = select(Game).options(
        selectinload(Game.player_a_user),
        selectinload(Game.player_b_user),
        selectinload(Game.winner_user)
    )
    
    # Apply filters
    filters = []
    if player_id:
        filters.append(
            or_(Game.player_a == player_id, Game.player_b == player_id)
        )
    if status == "active":
        filters.append(Game.ended.is_(None))
    elif status == "completed":
        filters.append(Game.ended.isnot(None))
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Count total
    count_query = select(func.count()).select_from(Game)
    if filters:
        count_query = count_query.filter(and_(*filters))
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Apply sorting
    sort_column = getattr(Game, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    games = result.scalars().all()
    
    return GameListResponse(
        games=[GameResponse.from_orm(game) for game in games],
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific game with all details"""
    result = await db.execute(
        select(Game)
        .filter(Game.id == game_id)
        .options(
            selectinload(Game.player_a_user),
            selectinload(Game.player_b_user),
            selectinload(Game.winner_user),
            selectinload(Game.game_rounds).selectinload(Round.puzzle),
            selectinload(Game.submissions)
        )
    )
    game = result.scalars().first()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    return GameResponse.from_orm(game)

# Submission Management Endpoints
@router.get("/submissions", response_model=SubmissionListResponse)
async def list_submissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    puzzle_id: Optional[int] = None,
    game_id: Optional[int] = None,
    verdict: Optional[bool] = None,
    sort_by: str = Query("created", regex="^(created|processing_time|id)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    """List all submissions with filtering and pagination"""
    query = select(Submission).options(
        selectinload(Submission.user),
        selectinload(Submission.puzzle),
        selectinload(Submission.game)
    )
    
    # Apply filters
    filters = []
    if user_id is not None:
        filters.append(Submission.user_id == user_id)
    if puzzle_id is not None:
        filters.append(Submission.puzzle_id == puzzle_id)
    if game_id is not None:
        filters.append(Submission.game_id == game_id)
    if verdict is not None:
        filters.append(Submission.verdict == verdict)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Count total
    count_query = select(func.count()).select_from(Submission)
    if filters:
        count_query = count_query.filter(and_(*filters))
    result = await db.execute(count_query)
    total = result.scalar()
    
    # Apply sorting
    sort_column = getattr(Submission, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    return SubmissionListResponse(
        submissions=[SubmissionResponse.from_orm(sub) for sub in submissions],
        total=total,
        skip=skip,
        limit=limit
    )

# Proof Testing Endpoints
@router.post("/test-proof", response_model=ProofTestResponse)
async def test_proof(
    proof_test: ProofTestRequest,
    current_admin: User = Depends(get_current_admin_user)
):
    """Test a proof for validity - useful when creating puzzles"""
    try:
        # Call the proof checker service
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.PROOF_CHECKER_URL}/verify",
                json={
                    "gamma": proof_test.gamma,
                    "phi": proof_test.phi,
                    "proof": proof_test.proof
                },
                timeout=10.0
            )
            
            result = response.json()
            
            # Extract relevant information from the proof checker response
            details = result.get("details", {})
            
            return ProofTestResponse(
                valid=result.get("ok", False),
                error=result.get("error"),
                lines=result.get("lines"),
                depth=result.get("depth"),
                rules_used=details.get("rules_used", []),
                syntax_info=result.get("syntax_info"),
                optimality=details.get("optimality"),
                suggestions=details.get("suggestions", []),
                counter_model=result.get("counterModel")
            )
            
    except httpx.RequestError as e:
        logger.error(f"Error connecting to proof checker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Proof checker service is unavailable"
        )
    except Exception as e:
        logger.error(f"Error testing proof: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test proof: {str(e)}"
        )

@router.post("/test-puzzle", response_model=PuzzleTestResponse)
async def test_puzzle(
    puzzle_test: PuzzleTestRequest,
    current_admin: User = Depends(get_current_admin_user)
):
    """Test a puzzle configuration before creating it"""
    try:
        warnings = []
        
        # First, verify that the puzzle is valid (premises entail conclusion)
        async with httpx.AsyncClient() as client:
            # Try to find a proof to verify the puzzle is solvable
            solve_response = await client.post(
                f"{settings.PROOF_CHECKER_URL}/solve",
                json={
                    "gamma": puzzle_test.gamma,
                    "phi": puzzle_test.phi,
                    "proof": ""  # Empty proof for solving
                },
                timeout=30.0  # Give more time for proof search
            )
            
            solve_result = solve_response.json()
            
            if not solve_result.get("success", False):
                # No proof found - check if it's because the sequent is invalid
                # Generate a counter-model to see if premises don't entail conclusion
                verify_response = await client.post(
                    f"{settings.PROOF_CHECKER_URL}/verify",
                    json={
                        "gamma": puzzle_test.gamma,
                        "phi": puzzle_test.phi,
                        "proof": "dummy"  # Dummy proof to trigger counter-model generation
                    },
                    timeout=10.0
                )
                
                verify_result = verify_response.json()
                counter_model = verify_result.get("counterModel")
                
                return PuzzleTestResponse(
                    valid=False,
                    solvable=False,
                    machine_proof=None,
                    actual_best_len=None,
                    best_len_matches=False,
                    counter_model=counter_model,
                    warnings=["Puzzle appears to be unsolvable - premises may not entail conclusion"]
                )
            
            # Puzzle is solvable
            machine_proof = solve_result.get("proof", "") if puzzle_test.generate_proof else None
            actual_length = solve_result.get("length", 0)
            
            # Compare with claimed best length
            best_len_matches = actual_length == puzzle_test.best_len
            
            if actual_length < puzzle_test.best_len:
                warnings.append(f"Found shorter proof ({actual_length} steps) than claimed best_len ({puzzle_test.best_len})")
            elif actual_length > puzzle_test.best_len:
                warnings.append(f"Could not find proof as short as claimed best_len ({puzzle_test.best_len}), shortest found: {actual_length}")
            
            # Additional validation checks
            
            # Check puzzle difficulty is appropriate
            if puzzle_test.difficulty <= 3 and actual_length > 5:
                warnings.append(f"Difficulty {puzzle_test.difficulty} may be too low for a {actual_length}-step proof")
            elif puzzle_test.difficulty >= 8 and actual_length < 5:
                warnings.append(f"Difficulty {puzzle_test.difficulty} may be too high for a {actual_length}-step proof")
            
            # Check for trivial puzzles
            if actual_length == 1:
                warnings.append("Puzzle is trivial (1-step proof) - consider making it more challenging")
            
            # Check for overly complex premises
            premise_count = len([p.strip() for p in puzzle_test.gamma.split(',') if p.strip()])
            if premise_count > 5:
                warnings.append(f"High number of premises ({premise_count}) may make puzzle confusing")
            
            # Verify optimal length claim if requested
            if puzzle_test.best_len and puzzle_test.generate_proof:
                # Try to verify the optimal length claim
                optimal_response = await client.post(
                    f"{settings.PROOF_CHECKER_URL}/verify-optimal",
                    json={
                        "premises": [p.strip() for p in puzzle_test.gamma.split(',') if p.strip()],
                        "conclusion": puzzle_test.phi,
                        "claimed_length": puzzle_test.best_len
                    },
                    timeout=30.0
                )
                
                optimal_result = optimal_response.json()
                if not optimal_result.get("valid", True):
                    warnings.append("Could not verify that the claimed best_len is actually optimal")
            
            return PuzzleTestResponse(
                valid=True,
                solvable=True,
                machine_proof=machine_proof,
                actual_best_len=actual_length,
                best_len_matches=best_len_matches,
                counter_model=None,
                warnings=warnings
            )
            
    except httpx.RequestError as e:
        logger.error(f"Error connecting to proof checker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Proof checker service is unavailable"
        )
    except Exception as e:
        logger.error(f"Error testing puzzle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test puzzle: {str(e)}"
        )

# System Statistics Endpoint
@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get system-wide statistics"""
    # User stats
    total_users = await db.execute(select(func.count()).select_from(User))
    active_users = await db.execute(
        select(func.count()).select_from(User).filter(User.is_active == True)
    )
    admin_users = await db.execute(
        select(func.count()).select_from(User).filter(User.is_admin == True)
    )
    
    # Recent activity (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_signups = await db.execute(
        select(func.count()).select_from(User).filter(User.created >= yesterday)
    )
    
    # Puzzle stats
    total_puzzles = await db.execute(select(func.count()).select_from(Puzzle))
    avg_difficulty = await db.execute(select(func.avg(Puzzle.difficulty)).select_from(Puzzle))
    
    # Game stats
    total_games = await db.execute(select(func.count()).select_from(Game))
    active_games = await db.execute(
        select(func.count()).select_from(Game).filter(Game.ended.is_(None))
    )
    completed_games = await db.execute(
        select(func.count()).select_from(Game).filter(Game.ended.isnot(None))
    )
    
    # Submission stats
    total_submissions = await db.execute(select(func.count()).select_from(Submission))
    successful_submissions = await db.execute(
        select(func.count()).select_from(Submission).filter(Submission.verdict == True)
    )
    failed_submissions = await db.execute(
        select(func.count()).select_from(Submission).filter(Submission.verdict == False)
    )
    
    # Average processing time
    avg_processing_time = await db.execute(
        select(func.avg(Submission.processing_time)).select_from(Submission)
    )
    
    return SystemStats(
        users={
            "total": total_users.scalar() or 0,
            "active": active_users.scalar() or 0,
            "admins": admin_users.scalar() or 0,
            "recent_signups": recent_signups.scalar() or 0
        },
        puzzles={
            "total": total_puzzles.scalar() or 0,
            "avg_difficulty": round(avg_difficulty.scalar() or 0, 2)
        },
        games={
            "total": total_games.scalar() or 0,
            "active": active_games.scalar() or 0,
            "completed": completed_games.scalar() or 0
        },
        submissions={
            "total": total_submissions.scalar() or 0,
            "successful": successful_submissions.scalar() or 0,
            "failed": failed_submissions.scalar() or 0,
            "avg_processing_time_ms": round(avg_processing_time.scalar() or 0, 2)
        }
    )