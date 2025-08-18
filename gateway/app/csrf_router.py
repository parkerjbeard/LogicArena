"""
CSRF Token Management Router
"""
from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from app.csrf import csrf_protection
from app.middleware.auth import auth_optional
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/token")
async def get_csrf_token(
    request: Request,
    current_user: Optional[User] = Depends(auth_optional)
):
    """
    Get a CSRF token for the current session
    
    Returns:
        CSRF token that should be included in X-CSRF-Token header for state-changing requests
    """
    # Determine session ID
    session_id = None
    user_id = None
    
    if current_user:
        # Authenticated user
        session_id = f"user:{current_user.id}"
        user_id = str(current_user.id)
    else:
        # Anonymous user - prioritize IP for cross-origin compatibility
        # (cookies don't work well across different ports)
        if request.client:
            session_id = f"ip:{request.client.host}"
        elif request.cookies.get("session_id"):
            session_id = f"session:{request.cookies.get('session_id')}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to establish session for CSRF token"
            )
    
    try:
        # Get or create token
        token = await csrf_protection.get_or_create_token(
            session_id=session_id,
            user_id=user_id
        )
        
        response = JSONResponse(content={
            "csrf_token": token,
            "header_name": "X-CSRF-Token"
        })
        
        # Also set as httpOnly cookie for form submissions
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="strict",
            max_age=3600  # 1 hour
        )
        
        # Set session cookie if not present
        if not current_user and not request.cookies.get("session_id"):
            import uuid
            session_id = str(uuid.uuid4())
            response.set_cookie(
                key="session_id",
                value=session_id,
                httponly=True,
                secure=request.url.scheme == "https",
                samesite="strict",
                max_age=86400  # 24 hours
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to generate CSRF token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate CSRF token"
        )

@router.post("/refresh")
async def refresh_csrf_token(
    request: Request,
    current_user: Optional[User] = Depends(auth_optional)
):
    """
    Refresh CSRF token for the current session
    
    Returns:
        New CSRF token
    """
    # Determine session ID
    session_id = None
    user_id = None
    
    if current_user:
        session_id = f"user:{current_user.id}"
        user_id = str(current_user.id)
    else:
        # Anonymous user - prioritize IP for cross-origin compatibility
        # (cookies don't work well across different ports)
        if request.client:
            session_id = f"ip:{request.client.host}"
        elif request.cookies.get("session_id"):
            session_id = f"session:{request.cookies.get('session_id')}"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to establish session for CSRF token"
            )
    
    try:
        # Refresh token
        token = await csrf_protection.refresh_token(
            session_id=session_id,
            user_id=user_id
        )
        
        response = JSONResponse(content={
            "csrf_token": token,
            "header_name": "X-CSRF-Token"
        })
        
        # Update cookie
        response.set_cookie(
            key="csrf_token",
            value=token,
            httponly=True,
            secure=request.url.scheme == "https",
            samesite="strict",
            max_age=3600
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to refresh CSRF token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh CSRF token"
        )

@router.get("/info")
async def csrf_info():
    """
    Get information about CSRF protection configuration
    
    Returns:
        CSRF protection configuration details
    """
    return {
        "enabled": True,
        "header_name": "X-CSRF-Token",
        "cookie_name": "csrf_token",
        "token_lifetime": csrf_protection.token_lifetime,
        "protected_methods": ["POST", "PUT", "DELETE", "PATCH"],
        "info": "Include the CSRF token in the X-CSRF-Token header for all state-changing requests"
    }