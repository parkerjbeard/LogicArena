"""Database middleware for session management and error handling"""
import logging
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.exc import (
    DatabaseError, 
    OperationalError, 
    IntegrityError,
    DataError,
    ProgrammingError,
    InvalidRequestError
)

from app.db.session import pool_monitor

logger = logging.getLogger(__name__)


class DatabaseMiddleware(BaseHTTPMiddleware):
    """Middleware for database session management and error handling"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.db_errors = {
            "total": 0,
            "operational": 0,
            "integrity": 0,
            "programming": 0,
            "other": 0
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Handle database-related errors and monitor performance"""
        start_time = time.time()
        db_error_occurred = False
        error_type = None
        
        try:
            # Add pool stats to request state for debugging
            request.state.db_pool_stats = pool_monitor.get_pool_stats()
            
            response = await call_next(request)
            
            # Log slow database operations
            duration = time.time() - start_time
            if duration > 1.0:  # Log requests taking more than 1 second
                logger.warning(
                    f"Slow request detected: {request.method} {request.url.path} "
                    f"took {duration:.2f}s"
                )
            
            return response
            
        except OperationalError as e:
            # Database connection issues
            db_error_occurred = True
            error_type = "operational"
            logger.error(f"Database operational error: {e}")
            return Response(
                content="Database connection error. Please try again later.",
                status_code=503,
                headers={"Retry-After": "30"}
            )
            
        except IntegrityError as e:
            # Constraint violations
            db_error_occurred = True
            error_type = "integrity"
            logger.error(f"Database integrity error: {e}")
            return Response(
                content="Data integrity error. Please check your input.",
                status_code=400
            )
            
        except DataError as e:
            # Invalid data types
            db_error_occurred = True
            error_type = "data"
            logger.error(f"Database data error: {e}")
            return Response(
                content="Invalid data format.",
                status_code=400
            )
            
        except ProgrammingError as e:
            # SQL syntax errors
            db_error_occurred = True
            error_type = "programming"
            logger.error(f"Database programming error: {e}")
            return Response(
                content="Internal database error.",
                status_code=500
            )
            
        except InvalidRequestError as e:
            # SQLAlchemy session errors
            db_error_occurred = True
            error_type = "session"
            logger.error(f"Database session error: {e}")
            return Response(
                content="Database session error. Please try again.",
                status_code=500
            )
            
        except DatabaseError as e:
            # Generic database errors
            db_error_occurred = True
            error_type = "other"
            logger.error(f"Database error: {e}")
            return Response(
                content="Database error occurred.",
                status_code=500
            )
            
        except Exception as e:
            # Non-database errors
            logger.error(f"Unexpected error: {e}")
            raise
            
        finally:
            # Update error metrics
            if db_error_occurred:
                self.db_errors["total"] += 1
                if error_type == "operational":
                    self.db_errors["operational"] += 1
                elif error_type == "integrity":
                    self.db_errors["integrity"] += 1
                elif error_type == "programming":
                    self.db_errors["programming"] += 1
                else:
                    self.db_errors["other"] += 1
                
                # Log error metrics periodically
                if self.db_errors["total"] % 10 == 0:
                    logger.warning(f"Database error metrics: {self.db_errors}")
    
    def get_error_stats(self) -> dict:
        """Get database error statistics"""
        return self.db_errors.copy()


class ConnectionPoolMiddleware:
    """Middleware to monitor and log connection pool usage"""
    
    def __init__(self, app: ASGIApp):
        self.app = app
        self.high_usage_threshold = 0.8
        self.last_warning_time = 0
        self.warning_interval = 60  # Seconds between warnings
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Check pool usage before request
            pool_stats = pool_monitor.get_pool_stats()
            if pool_stats:
                total = pool_stats.get("total", 0)
                max_allowed = pool_stats.get("size", 0) + pool_stats.get("max_overflow", 0)
                
                if max_allowed > 0:
                    usage_ratio = total / max_allowed
                    
                    # Log warning if usage is high
                    if usage_ratio > self.high_usage_threshold:
                        current_time = time.time()
                        if current_time - self.last_warning_time > self.warning_interval:
                            logger.warning(
                                f"High connection pool usage: {usage_ratio:.1%} "
                                f"({total}/{max_allowed} connections)"
                            )
                            self.last_warning_time = current_time
        
        await self.app(scope, receive, send)