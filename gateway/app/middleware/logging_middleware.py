import time
from fastapi import Request
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable]
    ):
        start_time = time.time()
        
        # Get client IP
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"]
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            status_code = response.status_code
            
            # Log details
            logger.info(
                f"{request.method} {request.url.path} {status_code} "
                f"[{process_time:.4f}s] - {client_ip}"
            )
            
            # Add processing time header
            response.headers["X-Process-Time"] = str(process_time)
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"{request.method} {request.url.path} 500 "
                f"[{process_time:.4f}s] - {client_ip} - Error: {str(e)}"
            )
            raise 