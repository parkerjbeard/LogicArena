"""
Basic auth utilities stub for tests
"""
from typing import Optional
from app.models import User

async def get_current_active_user(token: Optional[str] = None) -> Optional[User]:
    """
    Stub implementation for get_current_active_user
    This is a placeholder to fix import errors in tests
    """
    return None

async def get_current_user_optional(token: Optional[str] = None) -> Optional[User]:
    """
    Optional user authentication - returns None if no valid user
    This allows endpoints to work with or without authentication
    """
    return None