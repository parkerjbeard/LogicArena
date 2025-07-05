from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import func, and_, or_, delete, update
from sqlalchemy.future import select
from typing import List, Optional
import json
import random
import string
import logging
from datetime import datetime

from app.db.session import get_db
from app.auth.utils import get_current_user, get_current_admin_user
from app.models import (
    User, InstructorRequest, Institution, Class, ClassEnrollment,
    Assignment, AssignmentSubmission, Submission, Puzzle
)
import redis.asyncio as redis
from app.config import settings
from app.instructor.schemas import (
    InstructorRequestCreate, InstructorRequestResponse, InstructorRequestReview,
    ClassCreate, ClassUpdate, ClassResponse, ClassJoinRequest,
    EnrollmentResponse, EnrollmentUpdate,
    AssignmentCreate, AssignmentUpdate, AssignmentResponse,
    AssignmentSubmissionCreate, AssignmentSubmissionGrade, AssignmentSubmissionResponse,
    ClassStatistics, StudentProgress,
    InstitutionCreate, InstitutionResponse
)

router = APIRouter()

logger = logging.getLogger(__name__)


def get_current_instructor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Verify the current user is an instructor"""
    if not current_user.is_instructor and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor access required"
        )
    return current_user


async def generate_class_code(db: AsyncSession) -> str:
    """Generate a unique 6-character class code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        result = await db.execute(
            select(Class).where(Class.code == code)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            return code


# Instructor Request Endpoints
@router.post("/request", response_model=InstructorRequestResponse)
async def request_instructor_access(
    request: InstructorRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Request instructor access"""
    # Check if user already has an active request
    result = await db.execute(
        select(InstructorRequest).where(
            InstructorRequest.user_id == current_user.id,
            InstructorRequest.status == "pending"
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending instructor request"
        )
    
    # Check if user is already an instructor
    if current_user.is_instructor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have instructor access"
        )
    
    # Check if institution exists
    institution = None
    if request.institution_name:
        result = await db.execute(
            select(Institution).where(
                func.lower(Institution.name) == func.lower(request.institution_name)
            )
        )
        institution = result.scalar_one_or_none()
    
    # Create the request
    instructor_request = InstructorRequest(
        user_id=current_user.id,
        institution_id=institution.id if institution else None,
        institution_name=request.institution_name,
        course_info=request.course_info,
        faculty_url=request.faculty_url,
        faculty_id=request.faculty_id,
        status="pending",
        submitted_at=datetime.utcnow()
    )
    
    db.add(instructor_request)
    await db.commit()
    await db.refresh(instructor_request)
    
    # Send notification to admins via Redis
    try:
        redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
        notification = {
            "type": "instructor_request",
            "request_id": instructor_request.id,
            "user_id": current_user.id,
            "user_handle": current_user.handle,
            "institution_name": instructor_request.institution_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        await redis_client.publish("admin_notifications", json.dumps(notification))
        await redis_client.close()
    except Exception as e:
        logger.warning(f"Failed to send admin notification: {e}")
    
    return instructor_request


@router.get("/request/status", response_model=Optional[InstructorRequestResponse])
async def get_instructor_request_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's instructor request status"""
    result = await db.execute(
        select(InstructorRequest)
        .where(InstructorRequest.user_id == current_user.id)
        .order_by(InstructorRequest.submitted_at.desc())
    )
    request = result.scalar_one_or_none()
    
    return request


@router.get("/requests", response_model=List[InstructorRequestResponse])
async def list_instructor_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """List all instructor requests (admin only)"""
    query = select(InstructorRequest)
    
    if status:
        query = query.where(InstructorRequest.status == status)
    
    query = query.order_by(InstructorRequest.submitted_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    
    return requests


@router.put("/requests/{request_id}/review", response_model=InstructorRequestResponse)
async def review_instructor_request(
    request_id: int,
    review: InstructorRequestReview,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Review an instructor request (admin only)"""
    result = await db.execute(
        select(InstructorRequest).where(InstructorRequest.id == request_id)
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request has already been reviewed"
        )
    
    # Update the request
    request.status = review.status
    request.reviewed_at = datetime.utcnow()
    request.reviewed_by = current_admin.id
    request.admin_notes = review.admin_notes
    request.denial_reason = review.denial_reason
    
    # If approved, grant instructor access
    if review.status == "approved":
        result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = result.scalar_one_or_none()
        user.is_instructor = True
        
        # Associate with institution if provided
        if request.institution_id:
            user.institution_id = request.institution_id
    
    await db.commit()
    await db.refresh(request)
    
    return request


# Class Management Endpoints
@router.post("/classes", response_model=ClassResponse)
async def create_class(
    class_data: ClassCreate,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Create a new class"""
    # Generate unique class code
    code = await generate_class_code(db)
    
    # Create the class
    new_class = Class(
        instructor_id=current_instructor.id,
        institution_id=class_data.institution_id or current_instructor.institution_id,
        code=code,
        name=class_data.name,
        description=class_data.description,
        is_public=class_data.is_public,
        require_approval=class_data.require_approval,
        created=datetime.utcnow(),
        archived=False,
        settings=json.dumps(class_data.settings) if class_data.settings else None
    )
    
    db.add(new_class)
    await db.commit()
    await db.refresh(new_class)
    
    # Convert settings back to dict
    if new_class.settings:
        new_class.settings = json.loads(new_class.settings)
    
    return new_class


@router.get("/classes", response_model=List[ClassResponse])
async def list_instructor_classes(
    archived: Optional[bool] = Query(False),
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """List classes for the current instructor"""
    query = select(Class).where(Class.instructor_id == current_instructor.id)
    
    if archived is not None:
        query = query.where(Class.archived == archived)
    
    query = query.order_by(Class.created.desc())
    
    result = await db.execute(query)
    classes = result.scalars().all()
    
    # Add student counts and parse settings
    for class_ in classes:
        count_result = await db.execute(
            select(func.count(ClassEnrollment.id))
            .where(
                ClassEnrollment.class_id == class_.id,
                ClassEnrollment.is_active == True
            )
        )
        class_.student_count = count_result.scalar()
        
        if class_.settings:
            class_.settings = json.loads(class_.settings)
    
    return classes


@router.get("/classes/{class_id}", response_model=ClassResponse)
async def get_class(
    class_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific class"""
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check access
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Add student count
    count_result = await db.execute(
        select(func.count(ClassEnrollment.id))
        .where(
            ClassEnrollment.class_id == class_.id,
            ClassEnrollment.is_active == True
        )
    )
    class_.student_count = count_result.scalar()
    
    if class_.settings:
        class_.settings = json.loads(class_.settings)
    
    return class_


@router.put("/classes/{class_id}", response_model=ClassResponse)
async def update_class(
    class_id: int,
    update_data: ClassUpdate,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Update a class"""
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check access
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    if 'settings' in update_dict and update_dict['settings'] is not None:
        update_dict['settings'] = json.dumps(update_dict['settings'])
    
    for field, value in update_dict.items():
        setattr(class_, field, value)
    
    await db.commit()
    await db.refresh(class_)
    
    # Add student count
    count_result = await db.execute(
        select(func.count(ClassEnrollment.id))
        .where(
            ClassEnrollment.class_id == class_.id,
            ClassEnrollment.is_active == True
        )
    )
    class_.student_count = count_result.scalar()
    
    if class_.settings:
        class_.settings = json.loads(class_.settings)
    
    return class_


@router.delete("/classes/{class_id}")
async def delete_class(
    class_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Delete a class (soft delete by archiving)"""
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check access
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Archive the class
    class_.archived = True
    await db.commit()
    
    return {"message": "Class archived successfully"}


# Student Enrollment Endpoints
@router.post("/classes/join", response_model=EnrollmentResponse)
async def join_class(
    join_request: ClassJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a class using a class code"""
    # Find the class
    result = await db.execute(
        select(Class).where(
            Class.code == join_request.class_code.upper(),
            Class.archived == False
        )
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid class code or class not found"
        )
    
    # Check if already enrolled
    result = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.user_id == current_user.id,
            ClassEnrollment.class_id == class_.id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already enrolled in this class"
            )
        else:
            # Reactivate enrollment
            existing.is_active = True
            existing.enrolled_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            return existing
    
    # Create enrollment
    enrollment = ClassEnrollment(
        user_id=current_user.id,
        class_id=class_.id,
        enrolled_at=datetime.utcnow(),
        is_active=True,
        is_approved=not class_.require_approval,
        role="student"
    )
    
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    
    # Add related data
    enrollment.class_name = class_.name
    enrollment.user_handle = current_user.handle
    enrollment.user_email = current_user.email
    
    return enrollment


@router.get("/classes/{class_id}/students", response_model=List[EnrollmentResponse])
async def list_class_students(
    class_id: int,
    include_inactive: bool = Query(False),
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """List students in a class"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get enrollments
    query = select(ClassEnrollment).options(
        selectinload(ClassEnrollment.user)
    ).where(ClassEnrollment.class_id == class_id)
    
    if not include_inactive:
        query = query.where(ClassEnrollment.is_active == True)
    
    query = query.order_by(ClassEnrollment.enrolled_at.desc())
    
    result = await db.execute(query)
    enrollments = result.scalars().all()
    
    # Add user data
    for enrollment in enrollments:
        enrollment.user_handle = enrollment.user.handle
        enrollment.user_email = enrollment.user.email
        enrollment.class_name = class_.name
    
    return enrollments


@router.put("/classes/{class_id}/students/{user_id}", response_model=EnrollmentResponse)
async def update_student_enrollment(
    class_id: int,
    user_id: int,
    update_data: EnrollmentUpdate,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Update a student's enrollment (approve, change role, grade)"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get enrollment
    result = await db.execute(
        select(ClassEnrollment)
        .options(selectinload(ClassEnrollment.user))
        .where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.user_id == user_id
        )
    )
    enrollment = result.scalar_one_or_none()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(enrollment, field, value)
    
    await db.commit()
    await db.refresh(enrollment)
    
    # Add user data
    enrollment.user_handle = enrollment.user.handle
    enrollment.user_email = enrollment.user.email
    enrollment.class_name = class_.name
    
    return enrollment


@router.delete("/classes/{class_id}/students/{user_id}")
async def remove_student(
    class_id: int,
    user_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Remove a student from class"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get enrollment
    result = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.user_id == user_id
        )
    )
    enrollment = result.scalar_one_or_none()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )
    
    # Soft delete
    enrollment.is_active = False
    await db.commit()
    
    return {"message": "Student removed from class"}


# Assignment Endpoints
@router.post("/assignments", response_model=AssignmentResponse)
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Create a new assignment"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == assignment_data.class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Verify puzzle exists if provided
    if assignment_data.puzzle_id:
        result = await db.execute(
            select(Puzzle).where(Puzzle.id == assignment_data.puzzle_id)
        )
        puzzle = result.scalar_one_or_none()
        if not puzzle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Puzzle not found"
            )
    
    # Create assignment
    assignment = Assignment(
        class_id=assignment_data.class_id,
        puzzle_id=assignment_data.puzzle_id,
        title=assignment_data.title,
        description=assignment_data.description,
        type=assignment_data.type,
        due_date=assignment_data.due_date,
        available_from=assignment_data.available_from or datetime.utcnow(),
        points=assignment_data.points,
        attempts_allowed=assignment_data.attempts_allowed,
        time_limit=assignment_data.time_limit,
        is_published=False,
        created=datetime.utcnow(),
        settings=json.dumps(assignment_data.settings) if assignment_data.settings else None
    )
    
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    
    if assignment.settings:
        assignment.settings = json.loads(assignment.settings)
    
    return assignment


@router.get("/classes/{class_id}/assignments", response_model=List[AssignmentResponse])
async def list_class_assignments(
    class_id: int,
    published_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List assignments for a class"""
    # Check if user is instructor or student
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    # Check access
    is_instructor = (
        current_user.is_instructor and 
        (class_.instructor_id == current_user.id or current_user.is_admin)
    )
    
    if not is_instructor:
        # Check if student is enrolled
        result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == class_id,
                ClassEnrollment.user_id == current_user.id,
                ClassEnrollment.is_active == True
            )
        )
        enrollment = result.scalar_one_or_none()
        
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Get assignments
    query = select(Assignment).where(Assignment.class_id == class_id)
    
    if published_only or not is_instructor:
        query = query.where(Assignment.is_published == True)
    
    query = query.order_by(Assignment.due_date.asc())
    
    result = await db.execute(query)
    assignments = result.scalars().all()
    
    # Add submission stats
    for assignment in assignments:
        count_result = await db.execute(
            select(func.count(AssignmentSubmission.id))
            .where(AssignmentSubmission.assignment_id == assignment.id)
        )
        assignment.submission_count = count_result.scalar()
        
        # Calculate average score
        avg_result = await db.execute(
            select(func.avg(AssignmentSubmission.score))
            .where(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.score.isnot(None)
            )
        )
        avg_score = avg_result.scalar()
        
        assignment.average_score = float(avg_score) if avg_score else None
        
        if assignment.settings:
            assignment.settings = json.loads(assignment.settings)
    
    return assignments


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific assignment"""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check access
    result = await db.execute(
        select(Class).where(Class.id == assignment.class_id)
    )
    class_ = result.scalar_one_or_none()
    is_instructor = (
        current_user.is_instructor and 
        (class_.instructor_id == current_user.id or current_user.is_admin)
    )
    
    if not is_instructor:
        # Check if student is enrolled
        result = await db.execute(
            select(ClassEnrollment).where(
                ClassEnrollment.class_id == assignment.class_id,
                ClassEnrollment.user_id == current_user.id,
                ClassEnrollment.is_active == True
            )
        )
        enrollment = result.scalar_one_or_none()
        
        if not enrollment or not assignment.is_published:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Add stats
    count_result = await db.execute(
        select(func.count(AssignmentSubmission.id))
        .where(AssignmentSubmission.assignment_id == assignment.id)
    )
    assignment.submission_count = count_result.scalar()
    
    avg_result = await db.execute(
        select(func.avg(AssignmentSubmission.score))
        .where(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.score.isnot(None)
        )
    )
    avg_score = avg_result.scalar()
    
    assignment.average_score = float(avg_score) if avg_score else None
    
    if assignment.settings:
        assignment.settings = json.loads(assignment.settings)
    
    return assignment


@router.put("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    update_data: AssignmentUpdate,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Update an assignment"""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == assignment.class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    if 'settings' in update_dict and update_dict['settings'] is not None:
        update_dict['settings'] = json.dumps(update_dict['settings'])
    
    for field, value in update_dict.items():
        setattr(assignment, field, value)
    
    await db.commit()
    await db.refresh(assignment)
    
    if assignment.settings:
        assignment.settings = json.loads(assignment.settings)
    
    return assignment


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Delete an assignment"""
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == assignment.class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if there are submissions
    count_result = await db.execute(
        select(func.count(AssignmentSubmission.id))
        .where(AssignmentSubmission.assignment_id == assignment_id)
    )
    submission_count = count_result.scalar()
    
    if submission_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete assignment with existing submissions"
        )
    
    await db.delete(assignment)
    await db.commit()
    
    return {"message": "Assignment deleted successfully"}


# Assignment Submission Endpoints
@router.post("/assignments/{assignment_id}/submit", response_model=AssignmentSubmissionResponse)
async def submit_assignment(
    assignment_id: int,
    submission_data: AssignmentSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a solution for an assignment"""
    # Get assignment
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check enrollment
    result = await db.execute(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == assignment.class_id,
            ClassEnrollment.user_id == current_user.id,
            ClassEnrollment.is_active == True,
            ClassEnrollment.is_approved == True
        )
    )
    enrollment = result.scalar_one_or_none()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this class"
        )
    
    # Check if assignment is available
    now = datetime.utcnow()
    if assignment.available_from and now < assignment.available_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment is not yet available"
        )
    
    if assignment.due_date and now > assignment.due_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment is past due"
        )
    
    # Check attempts
    count_result = await db.execute(
        select(func.count(AssignmentSubmission.id))
        .where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.user_id == current_user.id
        )
    )
    attempt_count = count_result.scalar()
    
    if assignment.attempts_allowed != -1 and attempt_count >= assignment.attempts_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum attempts ({assignment.attempts_allowed}) exceeded"
        )
    
    # Verify submission exists and belongs to user
    result = await db.execute(
        select(Submission).where(
            Submission.id == submission_data.submission_id,
            Submission.user_id == current_user.id,
            Submission.puzzle_id == assignment.puzzle_id
        )
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found or does not match assignment"
        )
    
    # Create assignment submission
    assignment_submission = AssignmentSubmission(
        assignment_id=assignment_id,
        user_id=current_user.id,
        submission_id=submission_data.submission_id,
        submitted_at=datetime.utcnow(),
        attempt_number=attempt_count + 1
    )
    
    # Auto-grade if verdict is correct
    if submission.verdict:
        assignment_submission.score = assignment.points
        assignment_submission.graded_at = datetime.utcnow()
    
    db.add(assignment_submission)
    await db.commit()
    await db.refresh(assignment_submission)
    
    # Add user data
    assignment_submission.user_handle = current_user.handle
    assignment_submission.proof_verdict = submission.verdict
    
    return assignment_submission


@router.get("/assignments/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse])
async def list_assignment_submissions(
    assignment_id: int,
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List submissions for an assignment"""
    # Get assignment
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check access
    result = await db.execute(
        select(Class).where(Class.id == assignment.class_id)
    )
    class_ = result.scalar_one_or_none()
    is_instructor = (
        current_user.is_instructor and 
        (class_.instructor_id == current_user.id or current_user.is_admin)
    )
    
    if not is_instructor:
        # Students can only see their own submissions
        user_id = current_user.id
    
    # Get submissions
    query = select(AssignmentSubmission).options(
        selectinload(AssignmentSubmission.user),
        selectinload(AssignmentSubmission.submission)
    ).where(AssignmentSubmission.assignment_id == assignment_id)
    
    if user_id:
        query = query.where(AssignmentSubmission.user_id == user_id)
    
    query = query.order_by(AssignmentSubmission.submitted_at.desc())
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    # Add user data
    for sub in submissions:
        sub.user_handle = sub.user.handle if sub.user else None
        sub.proof_verdict = sub.submission.verdict if sub.submission else None
    
    return submissions


@router.put("/submissions/{submission_id}/grade", response_model=AssignmentSubmissionResponse)
async def grade_submission(
    submission_id: int,
    grade_data: AssignmentSubmissionGrade,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Grade a student's submission"""
    # Get submission
    result = await db.execute(
        select(AssignmentSubmission)
        .options(
            selectinload(AssignmentSubmission.assignment),
            selectinload(AssignmentSubmission.user),
            selectinload(AssignmentSubmission.submission)
        )
        .where(AssignmentSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == submission.assignment.class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update grade
    submission.score = grade_data.score
    submission.feedback = grade_data.feedback
    submission.graded_at = datetime.utcnow()
    submission.graded_by = current_instructor.id
    
    await db.commit()
    await db.refresh(submission)
    
    # Add user data
    submission.user_handle = submission.user.handle if submission.user else None
    submission.proof_verdict = submission.submission.verdict if submission.submission else None
    
    return submission


# Class Statistics Endpoints
@router.get("/classes/{class_id}/stats", response_model=ClassStatistics)
async def get_class_statistics(
    class_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a class"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Calculate statistics
    total_result = await db.execute(
        select(func.count(ClassEnrollment.id))
        .where(ClassEnrollment.class_id == class_id)
    )
    total_students = total_result.scalar()
    
    active_result = await db.execute(
        select(func.count(ClassEnrollment.id))
        .where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.is_active == True
        )
    )
    active_students = active_result.scalar()
    
    assignments_result = await db.execute(
        select(func.count(Assignment.id))
        .where(Assignment.class_id == class_id)
    )
    total_assignments = assignments_result.scalar()
    
    published_result = await db.execute(
        select(func.count(Assignment.id))
        .where(
            Assignment.class_id == class_id,
            Assignment.is_published == True
        )
    )
    published_assignments = published_result.scalar()
    
    # Submissions today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count(AssignmentSubmission.id))
        .join(Assignment)
        .where(
            Assignment.class_id == class_id,
            AssignmentSubmission.submitted_at >= today_start
        )
    )
    submissions_today = today_result.scalar()
    
    # Average grade
    grades_result = await db.execute(
        select(ClassEnrollment.final_grade)
        .where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.final_grade.isnot(None)
        )
    )
    grades = grades_result.scalars().all()
    
    # Convert letter grades to points
    grade_points = {
        'A+': 4.3, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
    }
    
    if grades:
        total_points = sum(grade_points.get(g, 0) for g in grades)
        average_grade = total_points / len(grades)
    else:
        average_grade = None
    
    # Completion rate
    if published_assignments > 0 and active_students > 0:
        total_possible = published_assignments * active_students
        completed_result = await db.execute(
            select(func.count(AssignmentSubmission.id))
            .join(Assignment)
            .where(
                Assignment.class_id == class_id,
                AssignmentSubmission.score.isnot(None)
            )
        )
        completed = completed_result.scalar()
        completion_rate = (completed / total_possible) * 100
    else:
        completion_rate = None
    
    return ClassStatistics(
        total_students=total_students,
        active_students=active_students,
        total_assignments=total_assignments,
        published_assignments=published_assignments,
        submissions_today=submissions_today,
        average_class_grade=average_grade,
        completion_rate=completion_rate
    )


@router.get("/classes/{class_id}/progress", response_model=List[StudentProgress])
async def get_student_progress(
    class_id: int,
    current_instructor: User = Depends(get_current_instructor),
    db: AsyncSession = Depends(get_db)
):
    """Get progress for all students in a class"""
    # Verify class access
    result = await db.execute(
        select(Class).where(Class.id == class_id)
    )
    class_ = result.scalar_one_or_none()
    
    if not class_:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found"
        )
    
    if class_.instructor_id != current_instructor.id and not current_instructor.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get all active students
    result = await db.execute(
        select(ClassEnrollment)
        .options(selectinload(ClassEnrollment.user))
        .where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.is_active == True
        )
    )
    enrollments = result.scalars().all()
    
    # Get total assignments
    assignments_result = await db.execute(
        select(func.count(Assignment.id))
        .where(
            Assignment.class_id == class_id,
            Assignment.is_published == True
        )
    )
    total_assignments = assignments_result.scalar()
    
    progress_list = []
    
    for enrollment in enrollments:
        # Get completed assignments
        completed_result = await db.execute(
            select(func.count(AssignmentSubmission.id))
            .join(Assignment)
            .where(
                Assignment.class_id == class_id,
                AssignmentSubmission.user_id == enrollment.user_id,
                AssignmentSubmission.score.isnot(None)
            )
        )
        completed = completed_result.scalar()
        
        # Get average score
        avg_result = await db.execute(
            select(func.avg(AssignmentSubmission.score))
            .join(Assignment)
            .where(
                Assignment.class_id == class_id,
                AssignmentSubmission.user_id == enrollment.user_id,
                AssignmentSubmission.score.isnot(None)
            )
        )
        avg_score = avg_result.scalar()
        
        # Get last activity
        last_result = await db.execute(
            select(AssignmentSubmission.submitted_at)
            .join(Assignment)
            .where(
                Assignment.class_id == class_id,
                AssignmentSubmission.user_id == enrollment.user_id
            )
            .order_by(AssignmentSubmission.submitted_at.desc())
        )
        last_submission = last_result.scalar()
        
        progress = StudentProgress(
            user_id=enrollment.user_id,
            user_handle=enrollment.user.handle,
            enrollment_date=enrollment.enrolled_at,
            assignments_completed=completed,
            total_assignments=total_assignments,
            average_score=float(avg_score) if avg_score else None,
            current_grade=enrollment.final_grade,
            last_activity=last_submission
        )
        
        progress_list.append(progress)
    
    return progress_list


# Institution Management Endpoints (Admin only)
@router.post("/institutions", response_model=InstitutionResponse)
async def create_institution(
    institution_data: InstitutionCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new institution (admin only)"""
    # Check if institution exists
    result = await db.execute(
        select(Institution).where(
            or_(
                func.lower(Institution.name) == func.lower(institution_data.name),
                Institution.domain == institution_data.domain
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution with this name or domain already exists"
        )
    
    # Create institution
    institution = Institution(
        name=institution_data.name,
        domain=institution_data.domain,
        description=institution_data.description,
        created=datetime.utcnow(),
        is_active=True
    )
    
    db.add(institution)
    await db.commit()
    await db.refresh(institution)
    
    return institution


@router.get("/institutions", response_model=List[InstitutionResponse])
async def list_institutions(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """List all institutions"""
    query = select(Institution)
    
    if active_only:
        query = query.where(Institution.is_active == True)
    
    query = query.order_by(Institution.name)
    
    result = await db.execute(query)
    institutions = result.scalars().all()
    
    # Add stats
    for institution in institutions:
        instructor_result = await db.execute(
            select(func.count(User.id))
            .where(
                User.institution_id == institution.id,
                User.is_instructor == True
            )
        )
        institution.instructor_count = instructor_result.scalar()
        
        class_result = await db.execute(
            select(func.count(Class.id))
            .where(
                Class.institution_id == institution.id,
                Class.archived == False
            )
        )
        institution.class_count = class_result.scalar()
    
    return institutions