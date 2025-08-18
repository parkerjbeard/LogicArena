import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, Awaitable
import traceback

from app.logging_config import (
    get_logger, 
    generate_request_id, 
    set_request_context, 
    clear_request_context,
    log_with_context
)

logger = get_logger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable]
    ):
        start_time = time.time()
        
        # Generate request ID
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        
        # Get user ID from request state if available
        user_id = None
        if hasattr(request.state, "user") and hasattr(request.state.user, "id"):
            user_id = str(request.state.user.id)
        
        # Set request context for logging
        set_request_context(request_id=request_id, user_id=user_id)
        
        # Get client IP
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Get request body size
        content_length = request.headers.get("content-length", 0)
        
        # Log request details
        log_with_context(
            logger,
            "info",
            "Incoming request",
            method=request.method,
            path=str(request.url.path),
            query_params=str(request.url.query) if request.url.query else None,
            client_ip=client_ip,
            user_agent=request.headers.get("user-agent"),
            content_length=content_length,
            request_id=request_id
        )
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            status_code = response.status_code
            
            # Log response details
            log_with_context(
                logger,
                "info",
                "Request completed",
                method=request.method,
                path=str(request.url.path),
                status_code=status_code,
                process_time_ms=round(process_time * 1000, 2),
                client_ip=client_ip,
                request_id=request_id
            )
            
            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Log error with full context
            log_with_context(
                logger,
                "error",
                "Request failed",
                method=request.method,
                path=str(request.url.path),
                process_time_ms=round(process_time * 1000, 2),
                client_ip=client_ip,
                error_type=type(e).__name__,
                error_message=str(e),
                traceback=traceback.format_exc(),
                request_id=request_id
            )
            
            raise
        finally:
            # Clear request context
            clear_request_context() 