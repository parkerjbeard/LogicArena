from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Tuple, Union
import datetime

class PuzzleBase(BaseModel):
    gamma: str
    phi: str
    difficulty: int = Field(..., ge=1, le=10)
    
class PuzzleCreate(PuzzleBase):
    best_len: int
    machine_proof: Optional[str] = None
    category: str = 'any'  # 'chapter1', 'chapter2', ..., 'chapter6', 'any', 'hard'
    chapter: Optional[int] = None
    proof_pattern: Optional[str] = None
    nested_depth: int = 0
    rules_required: Optional[List[str]] = None
    learning_objective: Optional[str] = None
    hint_sequence: Optional[List[Dict]] = None
    puzzle_metadata: Optional[Dict] = None
    
class PuzzleResponse(PuzzleBase):
    id: int
    best_len: int
    created: datetime.datetime
    category: str = 'any'
    chapter: Optional[int] = None
    nested_depth: int = 0
    verification_status: str = 'unverified'
    verified_at: Optional[datetime.datetime] = None
    actual_optimal_length: Optional[int] = None
    
    class Config:
        from_attributes = True
        
class PuzzleDetail(PuzzleResponse):
    machine_proof: Optional[str] = None
    proof_pattern: Optional[str] = None
    rules_required: Optional[List[str]] = None
    learning_objective: Optional[str] = None
    hint_sequence: Optional[List[Dict]] = None
    puzzle_metadata: Optional[Dict] = None
    verification_metadata: Optional[Dict] = None
    hint_text: Optional[str] = None
    
    class Config:
        from_attributes = True

class ProofSubmission(BaseModel):
    puzzle_id: int
    payload: str
    user_id: Union[int, str] = 1  # Can be numeric ID or Supabase UUID, default to anonymous
    hints_used: int = 0  # Track hints used for this submission
    
class ProofResponse(BaseModel):
    verdict: bool
    error_message: Optional[str] = None
    processing_time: int
    counter_model: Optional[Dict] = None
    syntax_info: Optional[str] = None
    xp_earned: int = 0  # Experience points earned from this submission
    
class PuzzleListResponse(BaseModel):
    puzzles: List[PuzzleResponse]
    total: int
    page: int
    size: int 

class HintRequest(BaseModel):
    puzzle_id: int
    current_proof: str

class HintResponse(BaseModel):
    type: str
    content: str
    priority: int
    target_line: Optional[int] = None
    suggested_rule: Optional[str] = None
    confidence: float

class HintListResponse(BaseModel):
    hints: List[HintResponse]
    puzzle_id: int
    timestamp: datetime.datetime

class PuzzleCategory(BaseModel):
    """Schema for puzzle categories"""
    name: str
    display_name: str
    description: str
    chapter: Optional[int] = None
    difficulty_range: Tuple[int, int]
    
class PuzzleFilter(BaseModel):
    """Schema for filtering puzzles"""
    category: Optional[str] = None
    chapter: Optional[int] = None
    difficulty_min: Optional[int] = Field(None, ge=1, le=10)
    difficulty_max: Optional[int] = Field(None, ge=1, le=10)
    nested_depth_min: Optional[int] = Field(None, ge=0)
    rules_required: Optional[List[str]] = None
    verification_status: Optional[str] = None  # 'verified', 'unverified', 'failed'

class PuzzleVerificationRequest(BaseModel):
    """Request to verify a puzzle"""
    puzzle_id: int
    force: bool = False  # Force re-verification even if already verified

class PuzzleVerificationResponse(BaseModel):
    """Response from puzzle verification"""
    puzzle_id: int
    valid: bool
    errors: List[str] = []
    optimal_length: Optional[int] = None
    actual_difficulty: Optional[int] = None
    verification_time_ms: int
    cached: bool = False

class PuzzleVerificationStats(BaseModel):
    """Verification statistics"""
    total_puzzles: int
    verified: int
    unverified: int
    failed: int
    verification_rate: float
    average_verification_time_ms: float