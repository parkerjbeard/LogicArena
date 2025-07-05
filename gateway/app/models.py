from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

Base = declarative_base()

def utc_now():
    """Return current UTC datetime as naive datetime for PostgreSQL"""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    handle = Column(String(30), unique=True, nullable=False, index=True)
    pwd_hash = Column(String(128), nullable=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    rating = Column(Integer, default=1000, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_instructor = Column(Boolean, default=False, nullable=False)
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    
    # Relationships
    institution = relationship("Institution", back_populates="users")
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
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
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

class LoginActivity(Base):
    __tablename__ = "login_activity"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    login_type = Column(String(20), nullable=False)  # 'standard' or 'google'
    ip_address = Column(String(45))  # IPv6 max length
    user_agent = Column(String(255))
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(String(255))
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="login_activities")

class RevokedToken(Base):
    __tablename__ = "revoked_token"
    
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    token_type = Column(String(20), nullable=False)  # 'access' or 'refresh'
    revoked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)  # Original token expiration
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
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_activity = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User")


class Institution(Base):
    __tablename__ = "institution"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    domain = Column(String(100), unique=True, nullable=True)  # e.g., "mit.edu"
    description = Column(Text)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="institution")
    classes = relationship("Class", back_populates="institution")
    instructor_requests = relationship("InstructorRequest", back_populates="institution")


class Class(Base):
    __tablename__ = "class"
    
    id = Column(Integer, primary_key=True, index=True)
    instructor_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    code = Column(String(6), unique=True, nullable=False, index=True)  # 6-char join code
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=True, nullable=False)
    require_approval = Column(Boolean, default=False, nullable=False)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    archived = Column(Boolean, default=False, nullable=False)
    settings = Column(Text)  # JSON for class-specific settings
    
    # Relationships
    instructor = relationship("User", foreign_keys=[instructor_id])
    institution = relationship("Institution", back_populates="classes")
    enrollments = relationship("ClassEnrollment", back_populates="class_obj")
    assignments = relationship("Assignment", back_populates="class_obj")


class ClassEnrollment(Base):
    __tablename__ = "class_enrollment"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("class.id"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_approved = Column(Boolean, default=True, nullable=False)  # For classes requiring approval
    role = Column(String(20), default="student", nullable=False)  # student, ta, instructor
    final_grade = Column(String(3))  # A+, A, A-, B+, etc.
    
    # Relationships
    user = relationship("User")
    class_obj = relationship("Class", back_populates="enrollments")
    
    # Unique constraint for user-class combination
    __table_args__ = (
        UniqueConstraint('user_id', 'class_id', name='_user_class_uc'),
    )


class Assignment(Base):
    __tablename__ = "assignment"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("class.id"), nullable=False)
    puzzle_id = Column(Integer, ForeignKey("puzzle.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(20), default="puzzle", nullable=False)  # puzzle, practice_set, exam
    due_date = Column(DateTime(timezone=True))
    available_from = Column(DateTime(timezone=True), default=utc_now)
    points = Column(Integer, default=100, nullable=False)
    attempts_allowed = Column(Integer, default=-1)  # -1 = unlimited
    time_limit = Column(Integer)  # in minutes, null = no limit
    is_published = Column(Boolean, default=False, nullable=False)
    created = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    settings = Column(Text)  # JSON for assignment-specific settings
    
    # Relationships
    class_obj = relationship("Class", back_populates="assignments")
    puzzle = relationship("Puzzle")
    submissions = relationship("AssignmentSubmission", back_populates="assignment")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submission"
    
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignment.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submission.id"), nullable=True)
    score = Column(Integer)  # Points earned
    feedback = Column(Text)  # Instructor feedback
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    graded_at = Column(DateTime(timezone=True))
    graded_by = Column(Integer, ForeignKey("user.id"))
    attempt_number = Column(Integer, default=1, nullable=False)
    
    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    user = relationship("User", foreign_keys=[user_id])
    grader = relationship("User", foreign_keys=[graded_by])
    submission = relationship("Submission")


class InstructorRequest(Base):
    __tablename__ = "instructor_request"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institution.id"), nullable=True)
    institution_name = Column(String(255), nullable=False)
    course_info = Column(Text, nullable=False)
    faculty_url = Column(String(500))  # Faculty page or verification URL
    faculty_id = Column(String(100))  # Faculty/employee ID
    status = Column(String(20), default="pending", nullable=False)  # pending, approved, denied
    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(Integer, ForeignKey("user.id"))
    admin_notes = Column(Text)
    denial_reason = Column(Text)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    institution = relationship("Institution", back_populates="instructor_requests") 