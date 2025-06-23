from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any

# User Schemas
class UserUpdate(BaseModel):
    handle: Optional[str] = Field(None, min_length=3, max_length=30)
    email: Optional[str] = Field(None, regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    rating: Optional[int] = Field(None, ge=0, le=5000)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    handle: str
    email: str
    rating: int
    is_active: bool
    is_admin: bool
    created: datetime
    google_id: Optional[str] = None
    total_games: Optional[int] = 0
    total_submissions: Optional[int] = 0
    
    class Config:
        orm_mode = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "handle": obj.handle,
            "email": obj.email,
            "rating": obj.rating,
            "is_active": obj.is_active,
            "is_admin": obj.is_admin,
            "created": obj.created,
            "google_id": obj.google_id
        }
        
        # Calculate totals if relationships are loaded
        if hasattr(obj, 'games_as_player_a') and hasattr(obj, 'games_as_player_b'):
            data["total_games"] = len(obj.games_as_player_a) + len(obj.games_as_player_b)
        if hasattr(obj, 'submissions'):
            data["total_submissions"] = len(obj.submissions)
            
        return cls(**data)

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    skip: int
    limit: int

# Puzzle Schemas
class PuzzleCreate(BaseModel):
    gamma: str = Field(..., min_length=1, description="Premises")
    phi: str = Field(..., min_length=1, description="Conclusion")
    difficulty: int = Field(..., ge=1, le=10)
    best_len: int = Field(..., ge=1)
    machine_proof: Optional[str] = None

class PuzzleUpdate(BaseModel):
    gamma: Optional[str] = Field(None, min_length=1)
    phi: Optional[str] = Field(None, min_length=1)
    difficulty: Optional[int] = Field(None, ge=1, le=10)
    best_len: Optional[int] = Field(None, ge=1)
    machine_proof: Optional[str] = None

class PuzzleResponse(BaseModel):
    id: int
    gamma: str
    phi: str
    difficulty: int
    best_len: int
    machine_proof: Optional[str] = None
    created: datetime
    total_submissions: Optional[int] = 0
    success_rate: Optional[float] = None
    
    class Config:
        orm_mode = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "gamma": obj.gamma,
            "phi": obj.phi,
            "difficulty": obj.difficulty,
            "best_len": obj.best_len,
            "machine_proof": obj.machine_proof,
            "created": obj.created
        }
        
        # Calculate stats if relationships are loaded
        if hasattr(obj, 'submissions'):
            total = len(obj.submissions)
            data["total_submissions"] = total
            if total > 0:
                successful = sum(1 for s in obj.submissions if s.verdict)
                data["success_rate"] = round(successful / total * 100, 2)
                
        return cls(**data)

class PuzzleListResponse(BaseModel):
    puzzles: List[PuzzleResponse]
    total: int
    skip: int
    limit: int

# Game Schemas
class RoundResponse(BaseModel):
    id: int
    round_number: int
    puzzle_id: int
    winner: Optional[int] = None
    started: datetime
    ended: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class GameResponse(BaseModel):
    id: int
    player_a: int
    player_a_handle: Optional[str] = None
    player_b: int
    player_b_handle: Optional[str] = None
    rounds: int
    winner: Optional[int] = None
    winner_handle: Optional[str] = None
    started: datetime
    ended: Optional[datetime] = None
    player_a_rating_change: Optional[int] = None
    player_b_rating_change: Optional[int] = None
    game_rounds: Optional[List[RoundResponse]] = []
    
    class Config:
        orm_mode = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "player_a": obj.player_a,
            "player_b": obj.player_b,
            "rounds": obj.rounds,
            "winner": obj.winner,
            "started": obj.started,
            "ended": obj.ended,
            "player_a_rating_change": obj.player_a_rating_change,
            "player_b_rating_change": obj.player_b_rating_change
        }
        
        # Add player handles if relationships are loaded
        if hasattr(obj, 'player_a_user') and obj.player_a_user:
            data["player_a_handle"] = obj.player_a_user.handle
        if hasattr(obj, 'player_b_user') and obj.player_b_user:
            data["player_b_handle"] = obj.player_b_user.handle
        if hasattr(obj, 'winner_user') and obj.winner_user:
            data["winner_handle"] = obj.winner_user.handle
            
        # Add rounds if loaded
        if hasattr(obj, 'game_rounds'):
            data["game_rounds"] = [RoundResponse.from_orm(r) for r in obj.game_rounds]
            
        return cls(**data)

class GameListResponse(BaseModel):
    games: List[GameResponse]
    total: int
    skip: int
    limit: int

# Submission Schemas
class SubmissionResponse(BaseModel):
    id: int
    user_id: int
    user_handle: Optional[str] = None
    puzzle_id: Optional[int] = None
    game_id: Optional[int] = None
    round_id: Optional[int] = None
    payload: str
    verdict: bool
    error_message: Optional[str] = None
    processing_time: Optional[int] = None
    created: datetime
    
    class Config:
        orm_mode = True
        
    @classmethod
    def from_orm(cls, obj):
        data = {
            "id": obj.id,
            "user_id": obj.user_id,
            "puzzle_id": obj.puzzle_id,
            "game_id": obj.game_id,
            "round_id": obj.round_id,
            "payload": obj.payload,
            "verdict": obj.verdict,
            "error_message": obj.error_message,
            "processing_time": obj.processing_time,
            "created": obj.created
        }
        
        # Add user handle if relationship is loaded
        if hasattr(obj, 'user') and obj.user:
            data["user_handle"] = obj.user.handle
            
        return cls(**data)

class SubmissionListResponse(BaseModel):
    submissions: List[SubmissionResponse]
    total: int
    skip: int
    limit: int

# Proof Testing Schemas
class ProofTestRequest(BaseModel):
    gamma: str = Field(..., min_length=1, description="Premises (comma-separated)")
    phi: str = Field(..., min_length=1, description="Conclusion")
    proof: str = Field(..., min_length=1, description="Proof text to test")
    best_len: Optional[int] = Field(None, ge=1, description="Expected optimal length for comparison")

class ProofTestResponse(BaseModel):
    valid: bool = Field(..., description="Whether the proof is valid")
    error: Optional[str] = Field(None, description="Error message if proof is invalid")
    lines: Optional[int] = Field(None, description="Number of lines in the proof")
    depth: Optional[int] = Field(None, description="Maximum depth of subproofs")
    rules_used: Optional[List[str]] = Field(None, description="List of inference rules used")
    syntax_info: Optional[str] = Field(None, description="Syntax format detected")
    optimality: Optional[Dict[str, Any]] = Field(None, description="Optimality metrics")
    suggestions: Optional[List[str]] = Field(None, description="Improvement suggestions")
    counter_model: Optional[Dict[str, bool]] = Field(None, description="Counter-model if sequent is invalid")

# Puzzle Testing Schemas
class PuzzleTestRequest(BaseModel):
    gamma: str = Field(..., min_length=1, description="Premises (comma-separated)")
    phi: str = Field(..., min_length=1, description="Conclusion")
    difficulty: int = Field(..., ge=1, le=10, description="Puzzle difficulty")
    best_len: int = Field(..., ge=1, description="Expected optimal proof length")
    generate_proof: bool = Field(False, description="Whether to generate a machine proof")

class PuzzleTestResponse(BaseModel):
    valid: bool = Field(..., description="Whether the puzzle is valid (premises entail conclusion)")
    solvable: bool = Field(..., description="Whether a proof was found")
    machine_proof: Optional[str] = Field(None, description="Machine-generated proof if requested")
    actual_best_len: Optional[int] = Field(None, description="Actual shortest proof found")
    best_len_matches: bool = Field(..., description="Whether claimed best_len matches found proof")
    counter_model: Optional[Dict[str, bool]] = Field(None, description="Counter-model if invalid")
    warnings: List[str] = Field(default_factory=list, description="Any warnings about the puzzle")

# System Statistics Schema
class SystemStats(BaseModel):
    users: Dict[str, int]
    puzzles: Dict[str, float]
    games: Dict[str, int]
    submissions: Dict[str, float]