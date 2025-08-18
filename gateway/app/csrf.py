"""
CSRF Protection implementation for LogicArena API
"""
import secrets
import json
from typing import Optional
from datetime import datetime
import redis.asyncio as redis
from fastapi import Request, HTTPException, status, Header
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class CSRFProtection:
    """CSRF token generation and validation"""
    
    def __init__(self, redis_url: str, token_lifetime: int = 3600):
        """
        Initialize CSRF protection
        
        Args:
            redis_url: Redis connection URL
            token_lifetime: Token lifetime in seconds (default: 1 hour)
        """
        self.redis_url = redis_url
        self.token_lifetime = token_lifetime
        self.redis_client: Optional[redis.Redis] = None
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            await self.redis_client.ping()
            logger.info("CSRF protection initialized with Redis")
        except Exception as e:
            logger.error(f"Failed to initialize CSRF Redis connection: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            
    def generate_token(self) -> str:
        """Generate a secure CSRF token"""
        return secrets.token_urlsafe(32)
    
    def get_token_key(self, session_id: str) -> str:
        """Get Redis key for storing CSRF token"""
        return f"csrf:token:{session_id}"
    
    async def create_token(self, session_id: str, user_id: Optional[str] = None) -> str:
        """
        Create and store a CSRF token for a session
        
        Args:
            session_id: Session identifier (can be user ID or session token)
            user_id: Optional user ID for additional validation
            
        Returns:
            Generated CSRF token
        """
        if not self.redis_client:
            raise RuntimeError("CSRF protection not initialized")
            
        token = self.generate_token()
        token_data = {
            "token": token,
            "created_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "session_id": session_id
        }
        
        # Store in Redis with expiration
        key = self.get_token_key(session_id)
        await self.redis_client.setex(
            key,
            self.token_lifetime,
            json.dumps(token_data)
        )
        
        logger.debug(f"Created CSRF token for session {session_id}")
        return token
    
    async def validate_token(
        self, 
        session_id: str, 
        token: str,
        user_id: Optional[str] = None,
        delete_after_use: bool = False
    ) -> bool:
        """
        Validate a CSRF token
        
        Args:
            session_id: Session identifier
            token: CSRF token to validate
            user_id: Optional user ID for additional validation
            delete_after_use: Whether to delete token after successful validation
            
        Returns:
            True if token is valid, False otherwise
        """
        if not self.redis_client:
            raise RuntimeError("CSRF protection not initialized")
            
        if not token or not session_id:
            return False
            
        key = self.get_token_key(session_id)
        stored_data = await self.redis_client.get(key)
        
        if not stored_data:
            logger.warning(f"No CSRF token found for session {session_id}")
            return False
            
        try:
            token_data = json.loads(stored_data)
            stored_token = token_data.get("token")
            stored_user_id = token_data.get("user_id")
            
            # Validate token
            if not secrets.compare_digest(stored_token, token):
                logger.warning(f"CSRF token mismatch for session {session_id}")
                logger.debug(f"Expected token: {stored_token[:10]}... Got: {token[:10]}...")
                return False
                
            # Validate user ID if provided
            if user_id and stored_user_id and str(user_id) != str(stored_user_id):
                logger.warning(f"User ID mismatch in CSRF token for session {session_id}")
                return False
                
            # Delete token if requested (for one-time use tokens)
            if delete_after_use:
                await self.redis_client.delete(key)
                
            return True
            
        except Exception as e:
            logger.error(f"Error validating CSRF token: {e}")
            return False
    
    async def refresh_token(self, session_id: str, user_id: Optional[str] = None) -> str:
        """
        Refresh CSRF token for a session
        
        Args:
            session_id: Session identifier
            user_id: Optional user ID
            
        Returns:
            New CSRF token
        """
        # Delete old token if exists
        key = self.get_token_key(session_id)
        if self.redis_client:
            await self.redis_client.delete(key)
            
        # Create new token
        return await self.create_token(session_id, user_id)
    
    async def get_or_create_token(self, session_id: str, user_id: Optional[str] = None) -> str:
        """
        Get existing token or create new one if not exists
        
        Args:
            session_id: Session identifier
            user_id: Optional user ID
            
        Returns:
            CSRF token
        """
        if not self.redis_client:
            raise RuntimeError("CSRF protection not initialized")
            
        key = self.get_token_key(session_id)
        stored_data = await self.redis_client.get(key)
        
        if stored_data:
            try:
                token_data = json.loads(stored_data)
                return token_data.get("token")
            except Exception:
                pass
                
        # Create new token if not exists or invalid
        return await self.create_token(session_id, user_id)

# Global CSRF protection instance
csrf_protection = CSRFProtection(
    redis_url=settings.REDIS_URL,
    token_lifetime=getattr(settings, 'CSRF_TOKEN_LIFETIME', 3600)
)

# CSRF validation dependency
async def validate_csrf_token(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token")
) -> str:
    """
    FastAPI dependency to validate CSRF tokens
    
    Args:
        request: FastAPI request object
        x_csrf_token: CSRF token from header
        
    Returns:
        The validated token
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    # Skip CSRF check for safe methods
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return ""
        
    # Skip CSRF check for excluded paths
    excluded_paths = getattr(settings, 'CSRF_EXEMPT_PATHS', [])
    if any(request.url.path.startswith(path) for path in excluded_paths):
        return ""
    
    # Get session ID from request
    # In a real implementation, this would come from a session cookie or auth token
    session_id = getattr(request.state, 'session_id', None)
    if not session_id and hasattr(request.state, 'user_id'):
        session_id = f"user:{request.state.user_id}"
    
    if not session_id:
        # For public endpoints that still need CSRF, use IP-based session
        client_ip = request.client.host if request.client else "unknown"
        session_id = f"ip:{client_ip}"
    
    # Check for CSRF token in header
    if not x_csrf_token:
        # Also check in form data for form submissions
        if request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            form_data = await request.form()
            x_csrf_token = form_data.get("csrf_token")
            
    if not x_csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing"
        )
    
    # Validate token
    user_id = getattr(request.state, 'user_id', None)
    is_valid = await csrf_protection.validate_token(
        session_id=session_id,
        token=x_csrf_token,
        user_id=user_id
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token"
        )
        
    return x_csrf_token

# Optional CSRF validation (for endpoints that work with or without CSRF)
async def validate_csrf_token_optional(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token")
) -> Optional[str]:
    """
    Optional CSRF validation - logs warning but doesn't fail
    """
    try:
        return await validate_csrf_token(request, x_csrf_token)
    except HTTPException:
        logger.warning(f"CSRF token validation failed for {request.url.path}")
        return None