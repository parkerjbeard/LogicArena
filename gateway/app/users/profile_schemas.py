from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class UserProfileBase(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserProfileUpdate(UserProfileBase):
    """Schema for updating user profile"""
    pass


class PuzzleProgressBase(BaseModel):
    puzzle_id: int
    first_completed_at: Optional[datetime] = None
    best_solution_length: Optional[int] = None
    best_solution_proof: Optional[str] = None
    total_attempts: int = 0
    successful_attempts: int = 0
    average_time_seconds: Optional[int] = None
    hints_used: int = 0
    last_attempted_at: datetime


class PuzzleProgressResponse(PuzzleProgressBase):
    """Schema for puzzle progress in API responses"""
    model_config = ConfigDict(from_attributes=True)
    
    # Include puzzle details
    puzzle_difficulty: Optional[int] = None
    puzzle_gamma: Optional[str] = None
    puzzle_phi: Optional[str] = None


class TutorialProgressBase(BaseModel):
    tutorial_id: str
    completed: bool = False
    started_at: datetime
    completed_at: Optional[datetime] = None
    progress_data: Dict[str, Any] = Field(default_factory=dict)


class TutorialProgressResponse(TutorialProgressBase):
    """Schema for tutorial progress in API responses"""
    model_config = ConfigDict(from_attributes=True)


class AchievementBase(BaseModel):
    achievement_id: str
    earned_at: datetime
    progress: int = 0
    target: int = 100
    achievement_metadata: Dict[str, Any] = Field(default_factory=dict, alias="metadata")


class AchievementResponse(AchievementBase):
    """Schema for achievements in API responses"""
    model_config = ConfigDict(from_attributes=True)
    
    # Computed fields
    is_completed: bool = Field(default=False)
    percentage: float = Field(default=0.0)
    
    def __init__(self, **data):
        super().__init__(**data)
        self.is_completed = self.progress >= self.target
        self.percentage = (self.progress / self.target * 100) if self.target > 0 else 0.0


class DailyStatsBase(BaseModel):
    date: date
    puzzles_attempted: int = 0
    puzzles_solved: int = 0
    practice_time_seconds: int = 0
    experience_gained: int = 0
    games_played: int = 0
    games_won: int = 0


class DailyStatsResponse(DailyStatsBase):
    """Schema for daily stats in API responses"""
    model_config = ConfigDict(from_attributes=True)
    
    # Computed fields
    solve_rate: float = Field(default=0.0)
    game_win_rate: float = Field(default=0.0)
    
    def __init__(self, **data):
        super().__init__(**data)
        self.solve_rate = (self.puzzles_solved / self.puzzles_attempted * 100) if self.puzzles_attempted > 0 else 0.0
        self.game_win_rate = (self.games_won / self.games_played * 100) if self.games_played > 0 else 0.0


class UserProfileResponse(BaseModel):
    """Comprehensive user profile response"""
    model_config = ConfigDict(from_attributes=True)
    
    # Basic info
    id: int
    handle: str
    email: str
    created: datetime
    last_active: datetime
    
    # Profile fields
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    experience_points: int = 0
    level: int = 1
    streak_days: int = 0
    last_streak_date: Optional[date] = None
    
    # Competitive stats
    rating: int = 1000
    total_games: int = 0
    games_won: int = 0
    win_rate: float = 0.0
    
    # Practice stats
    puzzles_solved: int = 0
    unique_puzzles_solved: int = 0
    total_practice_time: int = 0  # seconds
    
    # Progress tracking
    recent_puzzle_progress: List[PuzzleProgressResponse] = Field(default_factory=list)
    completed_tutorials: List[str] = Field(default_factory=list)
    achievements: List[AchievementResponse] = Field(default_factory=list)
    
    # Computed fields
    next_level_xp: int = Field(default=100)
    xp_progress: float = Field(default=0.0)
    rank_title: str = Field(default="Novice")
    
    def __init__(self, **data):
        super().__init__(**data)
        # Calculate level-related fields
        self.next_level_xp = self.calculate_xp_for_level(self.level + 1)
        current_level_xp = self.calculate_xp_for_level(self.level)
        xp_in_current_level = self.experience_points - current_level_xp
        xp_needed_for_next = self.next_level_xp - current_level_xp
        self.xp_progress = (xp_in_current_level / xp_needed_for_next * 100) if xp_needed_for_next > 0 else 0.0
        
        # Determine rank title based on level
        self.rank_title = self.get_rank_title(self.level)
    
    @staticmethod
    def calculate_xp_for_level(level: int) -> int:
        """Calculate total XP required for a given level"""
        # Simple quadratic progression: 100 * level^2
        return 100 * (level ** 2)
    
    @staticmethod
    def get_rank_title(level: int) -> str:
        """Get rank title based on level"""
        if level < 5:
            return "Novice"
        elif level < 10:
            return "Apprentice"
        elif level < 20:
            return "Journeyman"
        elif level < 30:
            return "Expert"
        elif level < 50:
            return "Master"
        else:
            return "Grandmaster"


class LeaderboardEntry(BaseModel):
    """Schema for leaderboard entries"""
    model_config = ConfigDict(from_attributes=True)
    
    rank: int
    user_id: int
    handle: str
    avatar_url: Optional[str] = None
    level: int = 1
    experience_points: int = 0
    rating: int = 1000
    puzzles_solved: int = 0
    games_won: int = 0
    win_rate: float = 0.0
    streak_days: int = 0


class LeaderboardResponse(BaseModel):
    """Schema for leaderboard API response"""
    entries: List[LeaderboardEntry]
    total_users: int
    page: int = 1
    per_page: int = 50
    sort_by: str = "experience_points"  # experience_points, rating, puzzles_solved, streak_days


class UserStatsUpdate(BaseModel):
    """Schema for updating user stats (internal use)"""
    experience_gained: Optional[int] = None
    puzzle_completed: Optional[bool] = None
    tutorial_completed: Optional[str] = None
    game_result: Optional[bool] = None  # True for win, False for loss
    practice_time_seconds: Optional[int] = None