"""
Example of how to integrate centralized logging in the Gateway service.
"""

import os
import sys
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4

# Add shared module to path
sys.path.append('/app/shared')
from logging_config import setup_logging, log_request

# Initialize logging
logger = setup_logging(
    service_name="gateway",
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    environment=os.getenv("ENVIRONMENT", "production"),
    logstash_host=os.getenv("LOGSTASH_HOST", "logstash"),
    sentry_dsn=os.getenv("SENTRY_DSN")
)

app = FastAPI(title="LogicArena Gateway")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all HTTP requests."""
    request_id = str(uuid4())
    request.state.request_id = request_id
    
    # Log request start
    logger.info(
        f"Request started: {request.method} {request.url.path}",
        extra={
            "request_id": request_id,
            "http_method": request.method,
            "http_path": request.url.path,
            "client_host": request.client.host if request.client else None,
        }
    )
    
    # Process request
    start_time = time.time()
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        # Log request completion
        log_request(
            logger=logger,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            request_id=request_id,
            user_id=getattr(request.state, "user_id", None)
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response
        
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        # Log error
        logger.error(
            f"Request failed: {request.method} {request.url.path}",
            exc_info=True,
            extra={
                "request_id": request_id,
                "http_method": request.method,
                "http_path": request.url.path,
                "duration_ms": duration_ms,
                "error_type": type(e).__name__,
                "error_message": str(e),
            }
        )
        
        # Re-raise exception
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    logger.debug("Health check requested")
    return {"status": "healthy", "service": "gateway"}


@app.get("/test-logging")
async def test_logging():
    """Test different log levels."""
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message (not a real error)")
    
    # Test structured logging
    logger.info(
        "Structured log example",
        extra={
            "user_id": "123",
            "action": "test_logging",
            "metadata": {"key": "value"},
        }
    )
    
    return {"message": "Check logs in Kibana!"}


@app.get("/test-error")
async def test_error():
    """Test error logging and Sentry integration."""
    logger.error("About to raise an exception for testing")
    raise HTTPException(
        status_code=500,
        detail="This is a test error for monitoring"
    )


# Example of logging in route handlers
@app.post("/api/users/login")
async def login(request: Request, username: str, password: str):
    """Example login endpoint with logging."""
    request_id = request.state.request_id
    
    logger.info(
        f"Login attempt for user: {username}",
        extra={
            "request_id": request_id,
            "username": username,
            "action": "login_attempt",
        }
    )
    
    # Simulate authentication logic
    if username == "test" and password == "test":
        user_id = "user_123"
        
        logger.info(
            f"Login successful for user: {username}",
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "username": username,
                "action": "login_success",
            }
        )
        
        return {"user_id": user_id, "token": "fake_token"}
    else:
        logger.warning(
            f"Login failed for user: {username}",
            extra={
                "request_id": request_id,
                "username": username,
                "action": "login_failed",
                "reason": "invalid_credentials",
            }
        )
        
        raise HTTPException(status_code=401, detail="Invalid credentials")


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Gateway service")
    uvicorn.run(app, host="0.0.0.0", port=8000)