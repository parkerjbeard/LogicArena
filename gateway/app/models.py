from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    handle = Column(String(30), unique=True, nullable=False, index=True)
    pwd_hash = Column(String(128), nullable=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    created = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    rating = Column(Integer, default=1000, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    submissions = relationship("Submission", back_populates="user")
    games_as_player_a = relationship("Game", foreign_keys="Game.player_a", back_populates="player_a_user")
    games_as_player_b = relationship("Game", foreign_keys="Game.player_b", back_populates="player_b_user")
    won_rounds = relationship("Round", foreign_keys="Round.winner", back_populates="winner_user")
    won_games = relationship("Game", foreign_keys="Game.winner", back_populates="winner_user")
    login_activities = relationship("LoginActivity", back_populates="user")

class Puzzle(Base):
    __tablename__ = "puzzle"
    
    id = Column(Integer, primary_key=True, index=True)
    gamma = Column(Text, nullable=False)  # Premises
    phi = Column(Text, nullable=False)    # Conclusion
    difficulty = Column(Integer, nullable=False)
    best_len = Column(Integer, nullable=False)
    machine_proof = Column(Text)
    created = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    submissions = relationship("Submission", back_populates="puzzle")
    rounds = relationship("Round", back_populates="puzzle")

class Game(Base):
    __tablename__ = "game"
    
    id = Column(Integer, primary_key=True, index=True)
    player_a = Column(Integer, ForeignKey("user.id"), nullable=False)
    player_b = Column(Integer, ForeignKey("user.id"), nullable=False)
    rounds = Column(Integer, default=3, nullable=False)
    winner = Column(Integer, ForeignKey("user.id"))
    started = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ended = Column(DateTime)
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
    started = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    ended = Column(DateTime)
    
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
    created = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="submissions")
    puzzle = relationship("Puzzle", back_populates="submissions")
    game = relationship("Game", back_populates="submissions")
    round = relationship("Round", back_populates="submissions")

class LoginActivity(Base):
    __tablename__ = "login_activity"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    login_type = Column(String(20), nullable=False)  # 'standard' or 'google'
    ip_address = Column(String(45))  # IPv6 max length
    user_agent = Column(String(255))
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(String(255))
    created = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="login_activities")

class RevokedToken(Base):
    __tablename__ = "revoked_token"
    
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    token_type = Column(String(20), nullable=False)  # 'access' or 'refresh'
    revoked_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # Original token expiration
    reason = Column(String(255))  # logout, security, admin_action, etc.
    
    # Relationships
    user = relationship("User")

class UserSession(Base):
    __tablename__ = "user_session"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token_jti = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))  # IPv6 max length
    user_agent = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    last_activity = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User") 