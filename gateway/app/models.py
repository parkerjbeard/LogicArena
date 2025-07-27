from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, func, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY
from datetime import datetime, timezone

Base = declarative_base()

def utc_now():
    """Return current UTC datetime as naive datetime for PostgreSQL"""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    handle = Column(String(30), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    rating = Column(Integer, default=1000, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255))  # For authentication
    supabase_id = Column(String(255), unique=True, index=True)  # Supabase UUID
    
    # Profile fields
    experience_points = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    bio = Column(Text)
    avatar_url = Column(String(500))
    total_practice_time = Column(Integer, default=0, nullable=False)  # in seconds
    last_active = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    preferences = Column(JSON, default=dict)
    streak_days = Column(Integer, default=0, nullable=False)
    last_streak_date = Column(Date)
    
    # Relationships
    submissions = relationship("Submission", back_populates="user")
    games_as_player_a = relationship("Game", foreign_keys="Game.player_a", back_populates="player_a_user")
    games_as_player_b = relationship("Game", foreign_keys="Game.player_b", back_populates="player_b_user")
    won_rounds = relationship("Round", foreign_keys="Round.winner", back_populates="winner_user")
    won_games = relationship("Game", foreign_keys="Game.winner", back_populates="winner_user")
    puzzle_progress = relationship("UserPuzzleProgress", back_populates="user", cascade="all, delete-orphan")
    tutorial_progress = relationship("UserTutorialProgress", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    daily_stats = relationship("UserDailyStats", back_populates="user", cascade="all, delete-orphan")

class Puzzle(Base):
    __tablename__ = "puzzle"
    
    id = Column(Integer, primary_key=True, index=True)
    gamma = Column(Text, nullable=False)  # Premises
    phi = Column(Text, nullable=False)    # Conclusion
    difficulty = Column(Integer, nullable=False)
    best_len = Column(Integer, nullable=False)
    machine_proof = Column(Text)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # New fields for enhanced puzzle system
    category = Column(String(50), nullable=False, default='any', index=True)  # 'chapter1', 'chapter2', ..., 'chapter6', 'any', 'hard'
    chapter = Column(Integer, index=True)  # 1-6 for chapter-specific puzzles, null for any/hard
    proof_pattern = Column(String(100))  # 'modus_ponens', 'nested_cd_3_levels', etc.
    nested_depth = Column(Integer, nullable=False, default=0)  # Depth of nested derivations
    rules_required = Column(ARRAY(String))  # ['MP', 'CD', 'IP', 'DNE', etc.]
    learning_objective = Column(Text)  # Description of what this puzzle teaches
    hint_sequence = Column(JSON)  # Structured hints for progressive learning
    puzzle_metadata = Column(JSON, default=dict)  # Additional metadata (e.g., tutorial alignment, prerequisites)
    
    # Verification fields
    verified_at = Column(DateTime(timezone=True))
    verification_status = Column(String(20), default='unverified', nullable=False)  # unverified, verified, failed, pending
    verification_metadata = Column(JSON)
    alternative_proofs = Column(ARRAY(Text))
    actual_optimal_length = Column(Integer)
    hint_text = Column(Text)  # Basic hint text
    
    # Relationships
    submissions = relationship("Submission", back_populates="puzzle")
    rounds = relationship("Round", back_populates="puzzle")
    progress = relationship("UserPuzzleProgress", back_populates="puzzle")
    verification_logs = relationship("PuzzleVerificationLog", back_populates="puzzle", cascade="all, delete-orphan")

class Game(Base):
    __tablename__ = "game"
    
    id = Column(Integer, primary_key=True, index=True)
    player_a = Column(Integer, ForeignKey("user.id"), nullable=False)
    player_b = Column(Integer, ForeignKey("user.id"), nullable=False)
    rounds = Column(Integer, default=3, nullable=False)
    winner = Column(Integer, ForeignKey("user.id"))
    started = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended = Column(DateTime(timezone=True))
    player_a_rating_change = Column(Integer)
    player_b_rating_change = Column(Integer)
    
    # Relationships
    player_a_user = relationship("User", foreign_keys=[player_a], back_populates="games_as_player_a")
    player_b_user = relationship("User", foreign_keys=[player_b], back_populates="games_as_player_b")
    winner_user = relationship("User", foreign_keys=[winner], back_populates="won_games")
    game_rounds = relationship("Round", back_populates="game")
    submissions = relationship("Submission", back_populates="game")

class Round(Base):
    __tablename__ = "round"
    
    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("game.id"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzle.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    winner = Column(Integer, ForeignKey("user.id"))
    started = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended = Column(DateTime(timezone=True))
    
    # Relationships
    game = relationship("Game", back_populates="game_rounds")
    puzzle = relationship("Puzzle", back_populates="rounds")
    winner_user = relationship("User", foreign_keys=[winner], back_populates="won_rounds")
    submissions = relationship("Submission", back_populates="round")

class Submission(Base):
    __tablename__ = "submission"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzle.id"))
    game_id = Column(Integer, ForeignKey("game.id"))
    round_id = Column(Integer, ForeignKey("round.id"))
    payload = Column(Text, nullable=False)
    verdict = Column(Boolean, nullable=False)
    error_message = Column(Text)
    processing_time = Column(Integer)  # in milliseconds
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="submissions")
    puzzle = relationship("Puzzle", back_populates="submissions")
    game = relationship("Game", back_populates="submissions")
    round = relationship("Round", back_populates="submissions")


class UserPuzzleProgress(Base):
    __tablename__ = "user_puzzle_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzle.id", ondelete="CASCADE"), nullable=False)
    first_completed_at = Column(DateTime(timezone=True))
    best_solution_length = Column(Integer)
    best_solution_proof = Column(Text)
    total_attempts = Column(Integer, default=0, nullable=False)
    successful_attempts = Column(Integer, default=0, nullable=False)
    average_time_seconds = Column(Integer)
    hints_used = Column(Integer, default=0, nullable=False)
    last_attempted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="puzzle_progress")
    puzzle = relationship("Puzzle")


class UserTutorialProgress(Base):
    __tablename__ = "user_tutorial_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    tutorial_id = Column(String(100), nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True))
    progress_data = Column(JSON, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="tutorial_progress")


class UserAchievement(Base):
    __tablename__ = "user_achievement"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(String(100), nullable=False)
    earned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    target = Column(Integer, default=100, nullable=False)
    achievement_metadata = Column(JSON, default=dict, name='metadata')
    
    # Relationships
    user = relationship("User", back_populates="achievements")


class UserDailyStats(Base):
    __tablename__ = "user_daily_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    puzzles_attempted = Column(Integer, default=0, nullable=False)
    puzzles_solved = Column(Integer, default=0, nullable=False)
    practice_time_seconds = Column(Integer, default=0, nullable=False)
    experience_gained = Column(Integer, default=0, nullable=False)
    games_played = Column(Integer, default=0, nullable=False)
    games_won = Column(Integer, default=0, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="daily_stats")


class PuzzleVerificationLog(Base):
    __tablename__ = "puzzle_verification_log"
    
    id = Column(Integer, primary_key=True, index=True)
    puzzle_id = Column(Integer, ForeignKey("puzzle.id", ondelete="CASCADE"), nullable=False)
    verified_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(String(20), nullable=False)  # verified, failed
    errors = Column(ARRAY(Text))
    optimal_length = Column(Integer)
    optimal_proof = Column(Text)
    verification_time_ms = Column(Integer)
    verification_metadata = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    puzzle = relationship("Puzzle")