"""
Security configuration and middleware for LogicArena API Gateway
"""
from typing import List, Optional
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Define allowed origins based on environment
def get_allowed_origins() -> List[str]:
    """Get list of allowed CORS origins based on environment"""
    if settings.DEBUG:
        # In development, allow localhost variations
        return [
            "http://localhost:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            settings.FRONTEND_URL
        ]
    else:
        # In production, only allow specific origins
        allowed = [settings.FRONTEND_URL]
        
        # Add any additional production domains
        if hasattr(settings, 'ADDITIONAL_ORIGINS'):
            allowed.extend(settings.ADDITIONAL_ORIGINS.split(','))
            
        return allowed

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Only add HSTS in production
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Adjust as needed
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' " + " ".join(get_allowed_origins()),
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
        
        return response

# Request ID middleware for tracking
class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add unique request ID to each request for tracking"""
    
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(time.time()))
        
        # Log the request
        logger.info(f"Request {request_id}: {request.method} {request.url.path}")
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Process request
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Add headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log the response
        logger.info(f"Request {request_id} completed in {process_time:.3f}s with status {response.status_code}")
        
        return response

def configure_cors(app):
    """Configure CORS middleware with proper settings"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization", 
            "X-Request-ID",
            "X-CSRF-Token"
        ],
        expose_headers=[
            "X-Request-ID",
            "X-Process-Time"
        ],
        max_age=3600  # Cache preflight requests for 1 hour
    )

def configure_security_middleware(app):
    """Configure all security-related middleware"""
    # Add trusted host middleware (only in production)
    if not settings.DEBUG:
        allowed_hosts = [settings.FRONTEND_URL.replace("http://", "").replace("https://", "")]
        if hasattr(settings, 'ADDITIONAL_HOSTS'):
            allowed_hosts.extend(settings.ADDITIONAL_HOSTS.split(','))
        
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=allowed_hosts
        )
    
    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Add request ID tracking
    app.add_middleware(RequestIDMiddleware)
    
    # Configure CORS
    configure_cors(app)

# Rate limiting configurations for different endpoints
RATE_LIMIT_CONFIGS = {
    "auth": {
        "register": f"{settings.RATE_LIMIT_ACCOUNT_CREATION}/day",
        "login": "10/minute",
        "refresh": "30/hour"
    },
    "puzzle": {
        "submit": f"{settings.RATE_LIMIT_PROOF_SUBMISSIONS}/hour",
        "list": "100/minute",
        "get": "200/minute"
    },
    "game": {
        "join_queue": "5/minute",
        "submit": "60/minute",
        "list": "100/minute"
    },
    "user": {
        "profile": "100/minute",
        "leaderboard": "30/minute",
        "stats": "60/minute"
    }
}