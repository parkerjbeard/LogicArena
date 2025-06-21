"""
Authentication middleware and dependencies for protected endpoints
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import logging

from app.auth.utils import get_current_active_user
from app.models import User

logger = logging.getLogger(__name__)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)

class AuthRequired:
    """Dependency for endpoints that require authentication"""
    
    def __init__(self, optional: bool = False):
        """
        Args:
            optional: If True, authentication is optional (endpoint works with or without auth)
        """
        self.optional = optional
    
    async def __call__(
        self, 
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> Optional[User]:
        """
        Validate authentication and return current user
        
        Returns:
            User object if authenticated, None if optional and not authenticated
            
        Raises:
            HTTPException: If authentication is required but not provided or invalid
        """
        if not credentials:
            if self.optional:
                return None
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Use the existing get_current_active_user function
        try:
            user = await get_current_active_user(token=credentials.credentials)
            
            # Store user ID in request state for rate limiting
            request.state.user_id = user.id
            
            return user
        except HTTPException:
            if self.optional:
                return None
            raise

# Predefined auth dependencies
auth_required = AuthRequired(optional=False)
auth_optional = AuthRequired(optional=True)

class RoleRequired:
    """Dependency for endpoints that require specific roles"""
    
    def __init__(self, allowed_roles: List[str]):
        """
        Args:
            allowed_roles: List of roles that are allowed to access the endpoint
        """
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        current_user: User = Depends(auth_required)
    ) -> User:
        """
        Check if user has required role
        
        Returns:
            User object if authorized
            
        Raises:
            HTTPException: If user doesn't have required role
        """
        # Check if user has required role
        user_role = getattr(current_user, 'role', 'user')
        
        if user_role not in self.allowed_roles:
            logger.warning(f"User {current_user.id} attempted to access endpoint requiring roles {self.allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return current_user

# Predefined role dependencies
admin_required = RoleRequired(['admin'])
moderator_required = RoleRequired(['admin', 'moderator'])

def public_endpoint():
    """Marker dependency for public endpoints (no auth required)"""
    return None