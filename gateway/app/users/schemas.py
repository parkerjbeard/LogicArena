from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

class UserProfileResponse(BaseModel):
    id: int
    handle: str
    email: EmailStr
    rating: int
    created: datetime.datetime
    
    class Config:
        from_attributes = True

class UserStatsResponse(BaseModel):
    total_games: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    rating: int
    best_rating: Optional[int] = None
    total_submissions: int
    valid_submissions: int
    
class UserSubmissionResponse(BaseModel):
    id: int
    puzzle_id: Optional[int]
    game_id: Optional[int]
    payload: str
    verdict: bool
    processing_time: Optional[int]
    created: datetime.datetime
    
    class Config:
        from_attributes = True

class LeaderboardEntry(BaseModel):
    id: int
    handle: str
    rating: int
    games_won: int
    games_played: int
    
    class Config:
        from_attributes = True

class LeaderboardResponse(BaseModel):
    rankings: List[LeaderboardEntry]
    total: int
    page: int
    size: int

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    handle: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLoginResponse(BaseModel):
    user: dict
    message: str

class SupabaseProfileCreate(BaseModel):
    supabase_id: str
    email: EmailStr
    handle: str

class SupabaseProfileResponse(BaseModel):
    id: int
    handle: str
    email: EmailStr
    supabase_id: str
    created: datetime.datetime
    
    class Config:
        from_attributes = True 