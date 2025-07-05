from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import datetime

class PuzzleBase(BaseModel):
    gamma: str
    phi: str
    difficulty: int = Field(..., ge=1, le=10)
    
class PuzzleCreate(PuzzleBase):
    best_len: int
    machine_proof: Optional[str] = None
    
class PuzzleResponse(PuzzleBase):
    id: int
    best_len: int
    created: datetime.datetime
    
    class Config:
        from_attributes = True
        
class PuzzleDetail(PuzzleResponse):
    machine_proof: Optional[str] = None
    
    class Config:
        from_attributes = True

class ProofSubmission(BaseModel):
    puzzle_id: int
    payload: str
    
class ProofResponse(BaseModel):
    verdict: bool
    error_message: Optional[str] = None
    processing_time: int
    counter_model: Optional[Dict] = None
    syntax_info: Optional[str] = None
    
class PuzzleListResponse(BaseModel):
    puzzles: List[PuzzleResponse]
    total: int
    page: int
    size: int 