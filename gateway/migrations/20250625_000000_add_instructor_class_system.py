"""
Add instructor verification and class management system

This migration adds support for:
- Instructor role and verification requests
- Institutions for academic organizations
- Classes with enrollment management
- Assignments linked to puzzles
- Gradebook functionality
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    """Add instructor and class management tables"""
    
    # Add new columns to user table
    op.add_column('user', sa.Column('is_instructor', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('institution_id', sa.Integer(), nullable=True))
    
    # Create institution table
    op.create_table('institution',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('domain', sa.String(100), nullable=True, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1')
    )
    
    # Create instructor_request table
    op.create_table('instructor_request',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('institution_id', sa.Integer(), sa.ForeignKey('institution.id'), nullable=True),
        sa.Column('institution_name', sa.String(255), nullable=False),
        sa.Column('course_info', sa.Text(), nullable=False),
        sa.Column('faculty_url', sa.String(500), nullable=True),
        sa.Column('faculty_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('denial_reason', sa.Text(), nullable=True)
    )
    
    # Create class table
    op.create_table('class',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('instructor_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('institution_id', sa.Integer(), sa.ForeignKey('institution.id'), nullable=True),
        sa.Column('code', sa.String(6), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('require_approval', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created', sa.DateTime(), nullable=False),
        sa.Column('archived', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('settings', sa.Text(), nullable=True)
    )
    
    # Create class_enrollment table
    op.create_table('class_enrollment',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('class_id', sa.Integer(), sa.ForeignKey('class.id'), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_approved', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('role', sa.String(20), nullable=False, server_default='student'),
        sa.Column('final_grade', sa.String(3), nullable=True),
        sa.UniqueConstraint('user_id', 'class_id', name='_user_class_uc')
    )
    
    # Create assignment table
    op.create_table('assignment',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('class_id', sa.Integer(), sa.ForeignKey('class.id'), nullable=False),
        sa.Column('puzzle_id', sa.Integer(), sa.ForeignKey('puzzle.id'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(20), nullable=False, server_default='puzzle'),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('available_from', sa.DateTime(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('attempts_allowed', sa.Integer(), nullable=False, server_default='-1'),
        sa.Column('time_limit', sa.Integer(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created', sa.DateTime(), nullable=False),
        sa.Column('settings', sa.Text(), nullable=True)
    )
    
    # Create assignment_submission table
    op.create_table('assignment_submission',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assignment_id', sa.Integer(), sa.ForeignKey('assignment.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('submission_id', sa.Integer(), sa.ForeignKey('submission.id'), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('graded_at', sa.DateTime(), nullable=True),
        sa.Column('graded_by', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('attempt_number', sa.Integer(), nullable=False, server_default='1')
    )
    
    # Add foreign key constraint for user.institution_id
    op.create_foreign_key('fk_user_institution', 'user', 'institution', ['institution_id'], ['id'])
    
    # Create indexes for performance
    op.create_index('idx_instructor_request_status', 'instructor_request', ['status'])
    op.create_index('idx_instructor_request_user', 'instructor_request', ['user_id'])
    op.create_index('idx_class_instructor', 'class', ['instructor_id'])
    op.create_index('idx_class_institution', 'class', ['institution_id'])
    op.create_index('idx_class_archived', 'class', ['archived'])
    op.create_index('idx_enrollment_user', 'class_enrollment', ['user_id'])
    op.create_index('idx_enrollment_class', 'class_enrollment', ['class_id'])
    op.create_index('idx_enrollment_active', 'class_enrollment', ['is_active'])
    op.create_index('idx_assignment_class', 'assignment', ['class_id'])
    op.create_index('idx_assignment_published', 'assignment', ['is_published'])
    op.create_index('idx_assignment_due_date', 'assignment', ['due_date'])
    op.create_index('idx_assignment_submission_assignment', 'assignment_submission', ['assignment_id'])
    op.create_index('idx_assignment_submission_user', 'assignment_submission', ['user_id'])
    op.create_index('idx_assignment_submission_submitted', 'assignment_submission', ['submitted_at'])


def downgrade():
    """Remove instructor and class management tables"""
    
    # Drop indexes first
    op.drop_index('idx_assignment_submission_submitted', 'assignment_submission')
    op.drop_index('idx_assignment_submission_user', 'assignment_submission')
    op.drop_index('idx_assignment_submission_assignment', 'assignment_submission')
    op.drop_index('idx_assignment_due_date', 'assignment')
    op.drop_index('idx_assignment_published', 'assignment')
    op.drop_index('idx_assignment_class', 'assignment')
    op.drop_index('idx_enrollment_active', 'class_enrollment')
    op.drop_index('idx_enrollment_class', 'class_enrollment')
    op.drop_index('idx_enrollment_user', 'class_enrollment')
    op.drop_index('idx_class_archived', 'class')
    op.drop_index('idx_class_institution', 'class')
    op.drop_index('idx_class_instructor', 'class')
    op.drop_index('idx_instructor_request_user', 'instructor_request')
    op.drop_index('idx_instructor_request_status', 'instructor_request')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_user_institution', 'user', type_='foreignkey')
    
    # Drop tables in reverse dependency order
    op.drop_table('assignment_submission')
    op.drop_table('assignment')
    op.drop_table('class_enrollment')
    op.drop_table('class')
    op.drop_table('instructor_request')
    op.drop_table('institution')
    
    # Drop columns from user table
    op.drop_column('user', 'institution_id')
    op.drop_column('user', 'is_instructor')