"""
CSRF Middleware for FastAPI
"""
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, List, Optional, Set
import logging
import json

from app.csrf import csrf_protection
from app.config import settings

logger = logging.getLogger(__name__)

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically validate CSRF tokens on state-changing requests
    """
    
    def __init__(
        self, 
        app: ASGIApp,
        exempt_paths: Optional[List[str]] = None,
        exempt_methods: Optional[Set[str]] = None,
        header_name: str = "X-CSRF-Token",
        cookie_name: str = "csrf_token",
        enforce: bool = True
    ):
        """
        Initialize CSRF middleware
        
        Args:
            app: FastAPI application
            exempt_paths: List of path prefixes to exempt from CSRF checks
            exempt_methods: Set of HTTP methods to exempt (default: GET, HEAD, OPTIONS)
            header_name: Name of the CSRF token header
            cookie_name: Name of the CSRF token cookie
            enforce: Whether to enforce CSRF protection (set False for testing)
        """
        super().__init__(app)
        self.exempt_paths = exempt_paths or [
            "/api/users/login",
            "/api/users/register",
            "/api/auth/refresh",
            "/api/csrf/token",
            "/api/csrf/refresh",
            "/api/csrf/info",
            "/api/logs/client",  # Client-side logging endpoint
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/ws/",  # WebSocket endpoints
        ]
        self.exempt_methods = exempt_methods or {"GET", "HEAD", "OPTIONS"}
        self.header_name = header_name
        self.cookie_name = cookie_name
        self.enforce = enforce
        
    def is_exempt(self, request: Request) -> bool:
        """Check if request is exempt from CSRF protection"""
        # Check method
        if request.method in self.exempt_methods:
            return True
            
        # Check path
        path = request.url.path
        for exempt_path in self.exempt_paths:
            if path.startswith(exempt_path):
                return True
                
        return False
    
    def get_session_id(self, request: Request) -> Optional[str]:
        """Extract session ID from request"""
        # Try to get from authenticated user
        if hasattr(request.state, 'user_id') and request.state.user_id:
            return f"user:{request.state.user_id}"
            
        # For anonymous users, prioritize IP-based session for cross-origin compatibility
        # (cookies don't work well across different ports in development)
        if request.client:
            return f"ip:{request.client.host}"
            
        # Fallback to session cookie if no IP
        session_cookie = request.cookies.get("session_id")
        if session_cookie:
            return f"session:{session_cookie}"
            
        # Try to get from authorization header (for API clients)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Use a hash of the token as session ID
            import hashlib
            token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
            return f"bearer:{token_hash}"
            
        return None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and validate CSRF token if needed"""
        # Skip if not enforcing
        if not self.enforce:
            return await call_next(request)
            
        # Skip if exempt
        if self.is_exempt(request):
            return await call_next(request)
            
        # Get session ID
        session_id = self.get_session_id(request)
        if not session_id:
            logger.warning(f"No session ID found for CSRF validation on {request.url.path}")
            if settings.DEBUG:
                # In debug mode, allow but warn
                return await call_next(request)
            else:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "No session found for CSRF validation"}
                )
        
        # Store session ID in request state for later use
        request.state.csrf_session_id = session_id
        
        # Get CSRF token from request
        csrf_token = None
        
        # Check header first
        csrf_token = request.headers.get(self.header_name)
        
        # Check cookie if not in header
        if not csrf_token:
            csrf_token = request.cookies.get(self.cookie_name)
            
        # For JSON requests, check body
        if not csrf_token and request.headers.get("content-type") == "application/json":
            try:
                # Read body and restore it
                body = await request.body()
                if body:
                    data = json.loads(body)
                    csrf_token = data.get("csrf_token")
                    # Restore body for downstream handlers
                    async def receive():
                        return {"type": "http.request", "body": body}
                    request._receive = receive
            except Exception:
                pass
        
        # Validate token
        if not csrf_token:
            logger.warning(f"CSRF token missing for {request.method} {request.url.path}")
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing", "error": "csrf_token_missing"}
            )
        
        # Validate with Redis
        user_id = getattr(request.state, 'user_id', None)
        is_valid = await csrf_protection.validate_token(
            session_id=session_id,
            token=csrf_token,
            user_id=user_id
        )
        
        if not is_valid:
            logger.warning(f"Invalid CSRF token for {request.method} {request.url.path}")
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid CSRF token", "error": "csrf_token_invalid"}
            )
        
        # Token is valid, continue with request
        response = await call_next(request)
        
        # Optionally set CSRF cookie on response
        if hasattr(request.state, 'csrf_token_generated'):
            response.set_cookie(
                key=self.cookie_name,
                value=request.state.csrf_token_generated,
                httponly=True,
                secure=not settings.DEBUG,  # Use secure cookies in production
                samesite="strict",
                max_age=3600  # 1 hour
            )
        
        return response

class CSRFTokenInjectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject CSRF tokens into responses for authenticated users
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Inject CSRF token into response headers for authenticated requests"""
        response = await call_next(request)
        
        # Only inject for authenticated users
        if hasattr(request.state, 'user_id') and request.state.user_id:
            session_id = getattr(request.state, 'csrf_session_id', None)
            if not session_id:
                session_id = f"user:{request.state.user_id}"
                
            try:
                # Get or create token
                token = await csrf_protection.get_or_create_token(
                    session_id=session_id,
                    user_id=request.state.user_id
                )
                
                # Add to response header
                response.headers["X-CSRF-Token"] = token
                
            except Exception as e:
                logger.error(f"Failed to inject CSRF token: {e}")
        
        return response