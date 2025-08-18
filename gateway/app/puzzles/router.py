from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, asc, and_
from typing import List, Optional
import time
import httpx
import logging
import random

from app.csrf import validate_csrf_token

from app.db.session import get_db
from app.models import User, Puzzle, Submission, PuzzleVerificationLog
from app.puzzles.schemas import (
    PuzzleResponse, 
    PuzzleDetail,
    ProofSubmission,
    ProofResponse,
    PuzzleListResponse,
    HintRequest,
    HintResponse,
    HintListResponse,
    PuzzleCreate,
    PuzzleFilter,
    PuzzleCategory,
    PuzzleVerificationRequest,
    PuzzleVerificationResponse,
    PuzzleVerificationStats
)
from app.puzzles.verifier import (
    get_verification_service,
    BatchPuzzleVerifier
)
from app.config import settings
from app.middleware.rate_limiter import RateLimiters
try:
    # Try to use the bridge that connects to enhanced hints
    from app.hint_analyzer_bridge import generate_contextual_hints
except ImportError:
    # Fall back to original if bridge not available
    from app.hint_analyzer import generate_contextual_hints
from app.users.progress_tracker import ProgressTracker
import datetime
from app.tracing_utils import (
    trace_method, 
    trace_database_operation,
    trace_cache_operation,
    trace_external_call,
    add_business_event,
    add_user_context
)

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
    try:
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
        
        # Set default values for new fields if they don't exist
        if not hasattr(puzzle, 'category'):
            puzzle.category = 'any'
        if not hasattr(puzzle, 'chapter'):
            puzzle.chapter = None
        if not hasattr(puzzle, 'nested_depth'):
            puzzle.nested_depth = 0
        
        return puzzle
    except Exception as e:
        logger.error(f"Error getting random puzzle: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Full error details: {repr(e)}")
        # If there's a database schema issue, return a 503 with helpful message
        if "column" in str(e).lower() or "attribute" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database schema needs to be updated. Please run migrations."
            )
        raise

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
             dependencies=[Depends(RateLimiters.puzzle_submit), Depends(validate_csrf_token)])
@trace_method("submit_proof")
async def submit_proof(
    submission: ProofSubmission,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Submit a proof for verification"""
    # Add submission context to trace
    add_business_event("proof_submission_started", 
                      puzzle_id=submission.puzzle_id,
                      proof_length=len(submission.payload))
    
    # Check if puzzle exists
    with trace_database_operation("select"):
        result = await db.execute(select(Puzzle).filter(Puzzle.id == submission.puzzle_id))
        puzzle = result.scalars().first()
    
    if not puzzle:
        add_business_event("puzzle_not_found", puzzle_id=submission.puzzle_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Verify the proof using the proof-checker service
    start_time = time.time()
    error_message = None
    counter_model = None
    
    try:
        with trace_external_call("proof-checker", "/verify", "POST"):
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
    
    # Handle user ID - convert Supabase UUID to numeric ID if needed
    actual_user_id = submission.user_id
    if isinstance(actual_user_id, str) and '-' in str(actual_user_id):
        # This is a Supabase UUID, get the numeric ID
        user_result = await db.execute(
            select(User).filter(User.supabase_id == actual_user_id)
        )
        user = user_result.scalars().first()
        if user:
            actual_user_id = user.id
        else:
            # Default to anonymous if user not found
            actual_user_id = 1
    else:
        actual_user_id = int(actual_user_id) if actual_user_id else 1
    
    # Store the submission
    new_submission = Submission(
        user_id=actual_user_id,
        puzzle_id=puzzle.id,
        payload=submission.payload,
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time
    )
    
    db.add(new_submission)
    await db.commit()
    
    # Track progress and award XP
    xp_earned = 0
    if actual_user_id != 1:  # Not anonymous
        xp_earned = await ProgressTracker.track_puzzle_submission(
            db=db,
            user_id=actual_user_id,
            puzzle_id=puzzle.id,
            proof=submission.payload,
            verdict=verdict,
            processing_time=processing_time,
            hints_used=submission.hints_used
        )
        await db.commit()
    
    return ProofResponse(
        verdict=verdict,
        error_message=error_message,
        processing_time=processing_time,
        counter_model=counter_model,
        syntax_info=syntax_info,
        xp_earned=xp_earned
    )

async def update_user_stats_after_valid_submission(user_id: int, puzzle_id: int):
    """Update user statistics after a valid submission (run in background)"""
    # This would be implemented to update Elo ratings, etc.
    pass

@router.post("/hints", response_model=HintListResponse,
             dependencies=[Depends(RateLimiters.puzzle_submit), Depends(validate_csrf_token)])
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

@router.post("/", response_model=PuzzleDetail,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(validate_csrf_token)])
async def create_puzzle(
    puzzle: PuzzleCreate,
    verify: bool = Query(True, description="Verify puzzle after creation"),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db)
):
    """Create a new puzzle (admin only - add auth later)"""
    # Create new puzzle
    new_puzzle = Puzzle(
        gamma=puzzle.gamma,
        phi=puzzle.phi,
        difficulty=puzzle.difficulty,
        best_len=puzzle.best_len,
        machine_proof=puzzle.machine_proof,
        category=puzzle.category,
        chapter=puzzle.chapter,
        proof_pattern=puzzle.proof_pattern,
        nested_depth=puzzle.nested_depth,
        rules_required=puzzle.rules_required,
        learning_objective=puzzle.learning_objective,
        hint_sequence=puzzle.hint_sequence,
        puzzle_metadata=puzzle.puzzle_metadata or {}
    )
    
    db.add(new_puzzle)
    await db.commit()
    await db.refresh(new_puzzle)
    
    # Verify puzzle if requested
    if verify and background_tasks:
        verification_service = await get_verification_service()
        background_tasks.add_task(
            verification_service.update_puzzle_verification,
            db, new_puzzle, await verification_service.verify_puzzle(new_puzzle)
        )
    
    return new_puzzle

@router.get("/categories", response_model=List[PuzzleCategory])
async def get_puzzle_categories():
    """Get available puzzle categories with descriptions"""
    categories = [
        PuzzleCategory(
            name="chapter1",
            display_name="Chapter 1: Subject Matter of Logic",
            description="Basic validity and argument structure",
            chapter=1,
            difficulty_range=(1, 3)
        ),
        PuzzleCategory(
            name="chapter2",
            display_name="Chapter 2: Official & Unofficial Notation",
            description="Translation and notation exercises",
            chapter=2,
            difficulty_range=(2, 4)
        ),
        PuzzleCategory(
            name="chapter3",
            display_name="Chapter 3: Derivations",
            description="Basic inference rules: MP, MT, DN",
            chapter=3,
            difficulty_range=(3, 5)
        ),
        PuzzleCategory(
            name="chapter4",
            display_name="Chapter 4: Conditional Derivations",
            description="Proving conditionals with assumptions",
            chapter=4,
            difficulty_range=(4, 6)
        ),
        PuzzleCategory(
            name="chapter5",
            display_name="Chapter 5: Nested Derivations",
            description="Complex proofs with multiple nested assumptions",
            chapter=5,
            difficulty_range=(6, 8)
        ),
        PuzzleCategory(
            name="chapter6",
            display_name="Chapter 6: Indirect Derivations",
            description="Proof by contradiction",
            chapter=6,
            difficulty_range=(5, 8)
        ),
        PuzzleCategory(
            name="any",
            display_name="Mixed Difficulty",
            description="Puzzles from all chapters",
            chapter=None,
            difficulty_range=(1, 10)
        ),
        PuzzleCategory(
            name="hard",
            display_name="Expert Challenges",
            description="The most complex puzzles with deep nesting",
            chapter=None,
            difficulty_range=(8, 10)
        )
    ]
    return categories

@router.post("/filter", response_model=PuzzleListResponse)
async def filter_puzzles(
    filter_params: PuzzleFilter,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Filter puzzles by category, chapter, difficulty, and other criteria"""
    # Build query
    query = select(Puzzle)
    conditions = []
    
    # Apply filters
    if filter_params.category:
        conditions.append(Puzzle.category == filter_params.category)
    
    if filter_params.chapter:
        conditions.append(Puzzle.chapter == filter_params.chapter)
    
    if filter_params.difficulty_min:
        conditions.append(Puzzle.difficulty >= filter_params.difficulty_min)
    
    if filter_params.difficulty_max:
        conditions.append(Puzzle.difficulty <= filter_params.difficulty_max)
    
    if filter_params.nested_depth_min:
        conditions.append(Puzzle.nested_depth >= filter_params.nested_depth_min)
    
    if filter_params.rules_required:
        # Check if puzzle requires any of the specified rules
        for rule in filter_params.rules_required:
            conditions.append(Puzzle.rules_required.contains([rule]))
    
    if filter_params.verification_status:
        conditions.append(Puzzle.verification_status == filter_params.verification_status)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Get count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Pagination
    offset = (page - 1) * size
    
    # Get puzzles
    result = await db.execute(
        query
        .order_by(asc(Puzzle.category), asc(Puzzle.difficulty), asc(Puzzle.id))
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

@router.post("/generate/{category}", response_model=PuzzleDetail,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(validate_csrf_token)])
async def generate_puzzle(
    category: str,
    difficulty: Optional[int] = Query(None, ge=1, le=10),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new puzzle for the specified category using the advanced generator"""
    # Import the generator here to avoid circular imports
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../..', 'puzzle'))
    from advanced_puzzle_generator import AdvancedPuzzleGenerator, PuzzleCategory as GenCategory, convert_to_db_format
    
    # Map category string to enum
    category_map = {
        'chapter1': GenCategory.CHAPTER1,
        'chapter2': GenCategory.CHAPTER2,
        'chapter3': GenCategory.CHAPTER3,
        'chapter4': GenCategory.CHAPTER4,
        'chapter5': GenCategory.CHAPTER5,
        'chapter6': GenCategory.CHAPTER6,
        'any': GenCategory.ANY,
        'hard': GenCategory.HARD
    }
    
    if category not in category_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {list(category_map.keys())}"
        )
    
    generator = AdvancedPuzzleGenerator()
    
    try:
        # Generate puzzle
        puzzle_obj = generator.generate_puzzle(category_map[category], difficulty)
        puzzle_data = convert_to_db_format(puzzle_obj)
        
        # Create puzzle in database
        new_puzzle = Puzzle(**puzzle_data)
        db.add(new_puzzle)
        await db.commit()
        await db.refresh(new_puzzle)
        
        return new_puzzle
    except Exception as e:
        logger.error(f"Error generating puzzle: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate puzzle"
        )

@router.post("/verify/{puzzle_id}", response_model=PuzzleVerificationResponse,
             dependencies=[Depends(RateLimiters.puzzle_submit), Depends(validate_csrf_token)])
async def verify_puzzle(
    puzzle_id: int,
    request: PuzzleVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Verify a specific puzzle"""
    # Get puzzle
    result = await db.execute(select(Puzzle).filter(Puzzle.id == puzzle_id))
    puzzle = result.scalars().first()
    
    if not puzzle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Puzzle not found"
        )
    
    # Check if already verified and not forcing
    if puzzle.verification_status == 'verified' and not request.force:
        return PuzzleVerificationResponse(
            puzzle_id=puzzle_id,
            valid=True,
            errors=[],
            optimal_length=puzzle.actual_optimal_length or puzzle.best_len,
            actual_difficulty=puzzle.difficulty,
            verification_time_ms=0,
            cached=True
        )
    
    # Get verification service
    verification_service = await get_verification_service()
    
    # Perform verification
    try:
        result = await verification_service.verify_puzzle(puzzle)
        
        # Update database in background
        background_tasks.add_task(
            verification_service.update_puzzle_verification,
            db, puzzle, result
        )
        
        return PuzzleVerificationResponse(
            puzzle_id=puzzle_id,
            valid=result.valid,
            errors=result.errors,
            optimal_length=result.optimal_length,
            actual_difficulty=result.actual_difficulty,
            verification_time_ms=result.verification_time_ms,
            cached=result.metadata.get('cached', False) if result.metadata else False
        )
        
    except Exception as e:
        logger.error(f"Verification error for puzzle {puzzle_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification failed"
        )

@router.post("/verify/batch", response_model=List[PuzzleVerificationResponse],
             dependencies=[Depends(validate_csrf_token)])
async def verify_batch(
    puzzle_ids: List[int],
    db: AsyncSession = Depends(get_db)
):
    """Verify multiple puzzles in batch"""
    if len(puzzle_ids) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 puzzles per batch"
        )
    
    # Get puzzles
    result = await db.execute(
        select(Puzzle).filter(Puzzle.id.in_(puzzle_ids))
    )
    puzzles = result.scalars().all()
    
    if len(puzzles) != len(puzzle_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some puzzles not found"
        )
    
    # Get verification service
    verification_service = await get_verification_service()
    batch_verifier = BatchPuzzleVerifier(verification_service)
    
    # Verify batch
    try:
        results = await batch_verifier.verify_batch(db, puzzles, update_db=True)
        
        return [
            PuzzleVerificationResponse(
                puzzle_id=puzzle.id,
                valid=result.valid,
                errors=result.errors,
                optimal_length=result.optimal_length,
                actual_difficulty=result.actual_difficulty,
                verification_time_ms=result.verification_time_ms,
                cached=result.metadata.get('cached', False) if result.metadata else False
            )
            for puzzle, result in results
        ]
        
    except Exception as e:
        logger.error(f"Batch verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch verification failed"
        )

@router.get("/verification/stats", response_model=PuzzleVerificationStats)
async def get_verification_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get puzzle verification statistics"""
    # Get counts by status
    status_counts = await db.execute(
        select(
            Puzzle.verification_status,
            func.count(Puzzle.id)
        ).group_by(Puzzle.verification_status)
    )
    
    counts = dict(status_counts.all())
    
    # Get average verification time
    avg_time_result = await db.execute(
        select(func.avg(PuzzleVerificationLog.verification_time_ms))
        .where(PuzzleVerificationLog.status == 'verified')
    )
    avg_time = avg_time_result.scalar() or 0
    
    total = sum(counts.values())
    verified = counts.get('verified', 0)
    unverified = counts.get('unverified', 0)
    failed = counts.get('failed', 0)
    
    return PuzzleVerificationStats(
        total_puzzles=total,
        verified=verified,
        unverified=unverified,
        failed=failed,
        verification_rate=verified / total if total > 0 else 0,
        average_verification_time_ms=avg_time
    )