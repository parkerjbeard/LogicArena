"""
Token and session cleanup utilities

This module provides functions to clean up expired tokens and sessions
from the database. Can be run as a scheduled task or background job.
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import logging

from app.db.session import get_db
from app.models import RevokedToken, UserSession

logger = logging.getLogger(__name__)

async def cleanup_expired_tokens(db: AsyncSession) -> int:
    """
    Remove expired tokens from the revoked_token table.
    
    Returns:
        Number of tokens deleted
    """
    try:
        # Delete tokens that have passed their original expiration time
        # Convert to naive UTC datetime for PostgreSQL comparison
        current_time = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await db.execute(
            delete(RevokedToken).where(
                RevokedToken.expires_at < current_time
            )
        )
        await db.commit()
        
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired revoked tokens")
        
        return deleted_count
    except Exception as e:
        logger.error(f"Error cleaning up expired tokens: {e}")
        await db.rollback()
        return 0

async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """
    Remove expired and inactive sessions from the user_session table.
    
    Returns:
        Number of sessions deleted
    """
    try:
        # Delete sessions that have expired or are inactive
        # Convert to naive UTC datetime for PostgreSQL comparison
        current_time = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await db.execute(
            delete(UserSession).where(
                (UserSession.expires_at < current_time) |
                (UserSession.is_active == False)
            )
        )
        await db.commit()
        
        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired/inactive sessions")
        
        return deleted_count
    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {e}")
        await db.rollback()
        return 0

async def run_cleanup():
    """
    Run all cleanup tasks
    """
    async for db in get_db():
        try:
            # Run cleanup tasks
            tokens_deleted = await cleanup_expired_tokens(db)
            sessions_deleted = await cleanup_expired_sessions(db)
            
            logger.info(
                f"Cleanup completed: {tokens_deleted} tokens, "
                f"{sessions_deleted} sessions removed"
            )
        finally:
            await db.close()

def schedule_cleanup(interval_minutes: int = 60):
    """
    Schedule cleanup to run periodically
    
    Args:
        interval_minutes: How often to run cleanup (default: 60 minutes)
    """
    async def run_periodic_cleanup():
        while True:
            try:
                await run_cleanup()
            except Exception as e:
                logger.error(f"Cleanup task failed: {e}")
            
            # Wait for the specified interval
            await asyncio.sleep(interval_minutes * 60)
    
    # Create and return the task
    return asyncio.create_task(run_periodic_cleanup())

if __name__ == "__main__":
    # Run cleanup once when script is executed directly
    asyncio.run(run_cleanup())