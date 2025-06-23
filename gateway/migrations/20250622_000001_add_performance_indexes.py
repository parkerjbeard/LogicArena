"""
Add performance indexes for common queries

This migration adds indexes to optimize common query patterns in LogicArena.
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    """Add performance indexes"""
    
    # Game table indexes
    # Index for finding active games
    op.create_index('idx_game_ended', 'game', ['ended'])
    # Index for user game queries
    op.create_index('idx_game_player_a', 'game', ['player_a'])
    op.create_index('idx_game_player_b', 'game', ['player_b'])
    # Composite index for finding games by either player
    op.create_index('idx_game_players', 'game', ['player_a', 'player_b'])
    # Index for recent games
    op.create_index('idx_game_started_desc', 'game', [sa.text('started DESC')])
    
    # Round table indexes
    # Composite index for game rounds lookup
    op.create_index('idx_round_game_round_number', 'round', ['game_id', 'round_number'])
    # Index for unfinished rounds
    op.create_index('idx_round_ended', 'round', ['ended'])
    
    # Submission table indexes
    # Index for user submissions
    op.create_index('idx_submission_user_created', 'submission', ['user_id', 'created'])
    # Index for puzzle submissions
    op.create_index('idx_submission_puzzle_verdict', 'submission', ['puzzle_id', 'verdict'])
    # Index for game submissions
    op.create_index('idx_submission_game', 'submission', ['game_id'])
    # Index for round submissions
    op.create_index('idx_submission_round', 'submission', ['round_id'])
    # Composite index for finding submissions by user and puzzle
    op.create_index('idx_submission_user_puzzle', 'submission', ['user_id', 'puzzle_id'])
    
    # User table indexes
    # Index for user rating leaderboard
    op.create_index('idx_user_rating_desc', 'user', [sa.text('rating DESC')])
    # Index for active users
    op.create_index('idx_user_active_rating', 'user', ['is_active', 'rating'])
    
    # Puzzle table indexes
    # Index for puzzle difficulty queries
    op.create_index('idx_puzzle_difficulty', 'puzzle', ['difficulty'])
    # Index for recent puzzles
    op.create_index('idx_puzzle_created_desc', 'puzzle', [sa.text('created DESC')])
    
    # Login activity indexes
    # Index for user login history
    op.create_index('idx_login_activity_user_created', 'login_activity', ['user_id', 'created'])
    # Index for recent logins
    op.create_index('idx_login_activity_created_desc', 'login_activity', [sa.text('created DESC')])
    
    # Session management indexes
    # Index for active sessions
    op.create_index('idx_user_session_active_expires', 'user_session', ['is_active', 'expires_at'])
    # Index for user's sessions
    op.create_index('idx_user_session_user_active', 'user_session', ['user_id', 'is_active'])
    
    # Token blacklist indexes
    # Index for token expiration cleanup
    op.create_index('idx_revoked_token_expires', 'revoked_token', ['expires_at'])
    # Index for user's revoked tokens
    op.create_index('idx_revoked_token_user_type', 'revoked_token', ['user_id', 'token_type'])


def downgrade():
    """Remove performance indexes"""
    
    # Drop indexes in reverse order
    op.drop_index('idx_revoked_token_user_type', 'revoked_token')
    op.drop_index('idx_revoked_token_expires', 'revoked_token')
    op.drop_index('idx_user_session_user_active', 'user_session')
    op.drop_index('idx_user_session_active_expires', 'user_session')
    op.drop_index('idx_login_activity_created_desc', 'login_activity')
    op.drop_index('idx_login_activity_user_created', 'login_activity')
    op.drop_index('idx_puzzle_created_desc', 'puzzle')
    op.drop_index('idx_puzzle_difficulty', 'puzzle')
    op.drop_index('idx_user_active_rating', 'user')
    op.drop_index('idx_user_rating_desc', 'user')
    op.drop_index('idx_submission_user_puzzle', 'submission')
    op.drop_index('idx_submission_round', 'submission')
    op.drop_index('idx_submission_game', 'submission')
    op.drop_index('idx_submission_puzzle_verdict', 'submission')
    op.drop_index('idx_submission_user_created', 'submission')
    op.drop_index('idx_round_ended', 'round')
    op.drop_index('idx_round_game_round_number', 'round')
    op.drop_index('idx_game_started_desc', 'game')
    op.drop_index('idx_game_players', 'game')
    op.drop_index('idx_game_player_b', 'game')
    op.drop_index('idx_game_player_a', 'game')
    op.drop_index('idx_game_ended', 'game')