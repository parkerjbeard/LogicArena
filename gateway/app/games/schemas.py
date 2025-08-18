from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import datetime

class GameCreate(BaseModel):
    player_a: int
    player_b: int

class RoundCreate(BaseModel):
    game_id: int
    puzzle_id: int
    round_number: int

class RoundResponse(BaseModel):
    id: int
    game_id: int
    puzzle_id: int
    round_number: int
    winner: Optional[int] = None
    started: datetime.datetime
    ended: Optional[datetime.datetime] = None
    
    class Config:
        from_attributes = True

class GameResponse(BaseModel):
    id: int
    player_a: int
    player_b: int
    player_a_handle: str
    player_b_handle: str
    rounds: int
    winner: Optional[int] = None
    started: datetime.datetime
    ended: Optional[datetime.datetime] = None
    player_a_rating_change: Optional[int] = None
    player_b_rating_change: Optional[int] = None
    
    class Config:
        from_attributes = True

class GameDetail(GameResponse):
    game_rounds: List[RoundResponse]
    
    class Config:
        from_attributes = True

class GameListResponse(BaseModel):
    games: List[GameResponse]
    total: int
    page: int
    size: int

class DuelSubmission(BaseModel):
    game_id: int
    round_id: int
    payload: str

class DuelResponse(BaseModel):
    verdict: bool
    error_message: Optional[str] = None
    processing_time: int
    counter_model: Optional[Dict] = None
    round_winner: Optional[int] = None
    game_winner: Optional[int] = None
    rating_change: Optional[int] = None

class DuelQueueRequest(BaseModel):
    difficulty: Optional[int] = Field(None, ge=1, le=10)

class DuelQueueResponse(BaseModel):
    position: int
    estimated_wait: int  # in seconds
    
class DuelMatchResponse(BaseModel):
    game_id: int
    opponent_id: int
    opponent_handle: str
    opponent_rating: int 