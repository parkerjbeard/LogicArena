from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, asc
from typing import List, Optional
import time
import httpx
import logging
import random

from app.db.session import get_db
from app.models import User, Puzzle, Submission
from app.puzzles.schemas import (
    PuzzleResponse, 
    PuzzleDetail,
    ProofSubmission,
    ProofResponse,
    PuzzleListResponse,
    HintRequest,
    HintResponse,
    HintListResponse
)
from app.config import settings
from app.middleware.rate_limiter import RateLimiters
from app.hint_analyzer import generate_contextual_hints
import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=PuzzleListResponse,
           dependencies=[Depends(RateLimiters.puzzle_list)])
async def get_puzzles(
    difficulty: Optional[int] = Query(None, ge=1, le=10),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get a list of puzzles, optionally filtered by difficulty"""
    # Calculate offset
    offset = (page - 1) * size
    
    # Build query
    query = select(Puzzle)
    count_query = select(func.count()).select_from(Puzzle)
    
    if difficulty:
        query = query.filter(Puzzle.difficulty == difficulty)
        count_query = count_query.filter(Puzzle.difficulty == difficulty)
    
    # Get count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get puzzles
    result = await db.execute(
        query
        .order_by(asc(Puzzle.difficulty), asc(Puzzle.id))
        .limit(size)
        .offset(offset)
    )
    
    puzzles = result.scalars().all()
    
    return PuzzleListResponse(
        puzzles=puzzles,
        total=total,
        page=page,
        size=size
    )

@router.get("/random", response_model=PuzzleResponse)
async def get_random_puzzle(
    difficulty: Optional[int] = Query(None, ge=1, le=10),
    db: AsyncSession = Depends(get_db)
):
    """Get a random puzzle, optionally within a specific difficulty level"""
    # Build query
    query = select(Puzzle)
    
    if difficulty:
        query = query.filter(Puzzle.difficulty == difficulty)
    
    # Get puzzle count
    count_query = select(func.count()).select_from(Puzzle)
    if difficulty:
        count_query = count_query.filter(Puzzle.difficulty == difficulty)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No puzzles found matching the criteria"
        )
    
    # Select random puzzle
    random_offset = random.randint(0, total - 1)
    result = await db.execute(query.offset(random_offset).limit(1))
    puzzle = result.scalars().first()
    
    return puzzle

@router.get("/{puzzle_id}", response_model=PuzzleDetail)
async def get_puzzle(
    puzzle_id: int,
    show_solution: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get a puzzle by ID"""
    result = await db.execute(select(Puzzle).filter(Puzzle.id == puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Never show machine_proof without auth
    puzzle.machine_proof = None
    
    return puzzle

@router.post("/submit", response_model=ProofResponse, 
             dependencies=[Depends(RateLimiters.puzzle_submit)])
async def submit_proof(
    submission: ProofSubmission,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Submit a proof for verification"""
    # Check if puzzle exists
    result = await db.execute(select(Puzzle).filter(Puzzle.id == submission.puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Verify the proof using the proof-checker service
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
            syntax_info = result.get("syntax_info")
            
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
    
    # Store the submission (with anonymous user_id = 1)
    new_submission = Submission(
        user_id=1,  # Default anonymous user
        puzzle_id=puzzle.id,
        payload=submission.payload,
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time
    )
    
    db.add(new_submission)
    await db.commit()
    
    return ProofResponse(
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time,
        counter_model=counter_model,
        syntax_info=syntax_info
    )

async def update_user_stats_after_valid_submission(user_id: int, puzzle_id: int):
    """Update user statistics after a valid submission (run in background)"""
    # This would be implemented to update Elo ratings, etc.
    pass

@router.post("/hints", response_model=HintListResponse,
             dependencies=[Depends(RateLimiters.puzzle_submit)])
async def get_contextual_hints(
    hint_request: HintRequest,
    db: AsyncSession = Depends(get_db)
):
    """Get contextual hints for a proof in progress"""
    # Get the puzzle
    result = await db.execute(select(Puzzle).filter(Puzzle.id == hint_request.puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    try:
        # Generate contextual hints using the analyzer
        hint_data = generate_contextual_hints(
            gamma=puzzle.gamma,
            phi=puzzle.phi,
            current_proof=hint_request.current_proof,
            difficulty=puzzle.difficulty
        )
        
        # Convert to response format
        hints = [
            HintResponse(
                type=hint['type'],
                content=hint['content'],
                priority=hint['priority'],
                target_line=hint['target_line'],
                suggested_rule=hint['suggested_rule'],
                confidence=hint['confidence']
            )
            for hint in hint_data
        ]
        
        return HintListResponse(
            hints=hints,
            puzzle_id=puzzle.id,
            timestamp=datetime.datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error generating hints: {str(e)}")
        # Return a fallback hint if the analyzer fails
        fallback_hints = [
            HintResponse(
                type="strategic",
                content="Review the problem statement and think about what inference rules might help you progress toward the conclusion.",
                priority=5,
                confidence=0.5
            )
        ]
        
        return HintListResponse(
            hints=fallback_hints,
            puzzle_id=puzzle.id,
            timestamp=datetime.datetime.now()
        )