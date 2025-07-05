from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"


class InstructorRequestCreate(BaseModel):
    institution_name: str = Field(..., min_length=1, max_length=255, description="Name of your institution")
    course_info: str = Field(..., min_length=10, description="Information about courses you plan to teach")
    faculty_url: Optional[str] = Field(None, max_length=500, description="Link to faculty page or verification")
    faculty_id: Optional[str] = Field(None, max_length=100, description="Faculty or employee ID")


class InstructorRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    institution_name: str
    course_info: str
    faculty_url: Optional[str]
    faculty_id: Optional[str]
    status: RequestStatus
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    denial_reason: Optional[str]


class InstructorRequestReview(BaseModel):
    status: RequestStatus
    admin_notes: Optional[str] = Field(None, description="Internal notes about the decision")
    denial_reason: Optional[str] = Field(None, description="Reason shown to user if denied")


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Class name")
    description: Optional[str] = Field(None, description="Class description")
    institution_id: Optional[int] = Field(None, description="Associated institution ID")
    is_public: bool = Field(True, description="Whether class is publicly visible")
    require_approval: bool = Field(False, description="Whether students need approval to join")
    settings: Optional[Dict[str, Any]] = Field(None, description="Class-specific settings")


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    require_approval: Optional[bool] = None
    archived: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class ClassResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    instructor_id: int
    institution_id: Optional[int]
    code: str
    name: str
    description: Optional[str]
    is_public: bool
    require_approval: bool
    created: datetime
    archived: bool
    settings: Optional[Dict[str, Any]]
    student_count: Optional[int] = 0


class ClassJoinRequest(BaseModel):
    class_code: str = Field(..., min_length=6, max_length=6, description="6-character class code")


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    class_id: int
    enrolled_at: datetime
    is_active: bool
    is_approved: bool
    role: str
    final_grade: Optional[str]
    
    # Include related data
    user_handle: Optional[str] = None
    user_email: Optional[str] = None
    class_name: Optional[str] = None


class EnrollmentUpdate(BaseModel):
    is_approved: Optional[bool] = None
    role: Optional[str] = Field(None, pattern="^(student|ta|instructor)$")
    final_grade: Optional[str] = Field(None, max_length=3)


class AssignmentType(str, Enum):
    PUZZLE = "puzzle"
    PRACTICE_SET = "practice_set"
    EXAM = "exam"


class AssignmentCreate(BaseModel):
    class_id: int
    puzzle_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: AssignmentType = AssignmentType.PUZZLE
    due_date: Optional[datetime] = None
    available_from: Optional[datetime] = None
    points: int = Field(100, ge=0)
    attempts_allowed: int = Field(-1, description="-1 for unlimited attempts")
    time_limit: Optional[int] = Field(None, ge=1, description="Time limit in minutes")
    settings: Optional[Dict[str, Any]] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    available_from: Optional[datetime] = None
    points: Optional[int] = Field(None, ge=0)
    attempts_allowed: Optional[int] = None
    time_limit: Optional[int] = Field(None, ge=1)
    is_published: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    class_id: int
    puzzle_id: Optional[int]
    title: str
    description: Optional[str]
    type: AssignmentType
    due_date: Optional[datetime]
    available_from: Optional[datetime]
    points: int
    attempts_allowed: int
    time_limit: Optional[int]
    is_published: bool
    created: datetime
    settings: Optional[Dict[str, Any]]
    
    # Computed fields
    submission_count: Optional[int] = 0
    average_score: Optional[float] = None


class AssignmentSubmissionCreate(BaseModel):
    submission_id: int = Field(..., description="ID of the proof submission")


class AssignmentSubmissionGrade(BaseModel):
    score: int = Field(..., ge=0, description="Score in points")
    feedback: Optional[str] = Field(None, description="Feedback for the student")


class AssignmentSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    assignment_id: int
    user_id: int
    submission_id: Optional[int]
    score: Optional[int]
    feedback: Optional[str]
    submitted_at: datetime
    graded_at: Optional[datetime]
    graded_by: Optional[int]
    attempt_number: int
    
    # Include related data
    user_handle: Optional[str] = None
    proof_verdict: Optional[bool] = None


class ClassStatistics(BaseModel):
    total_students: int
    active_students: int
    total_assignments: int
    published_assignments: int
    submissions_today: int
    average_class_grade: Optional[float]
    completion_rate: Optional[float]


class StudentProgress(BaseModel):
    user_id: int
    user_handle: str
    enrollment_date: datetime
    assignments_completed: int
    total_assignments: int
    average_score: Optional[float]
    current_grade: Optional[str]
    last_activity: Optional[datetime]


class InstitutionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: Optional[str] = Field(None, max_length=100, description="Email domain like 'mit.edu'")
    description: Optional[str] = None


class InstitutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    domain: Optional[str]
    description: Optional[str]
    created: datetime
    is_active: bool
    
    # Stats
    instructor_count: Optional[int] = 0
    class_count: Optional[int] = 0