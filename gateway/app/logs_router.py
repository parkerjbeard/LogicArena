from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.logging_config import get_logger, log_with_context, LogContext
from app.auth.utils import get_current_user_optional

router = APIRouter()
logger = get_logger(__name__)

class LogEntry(BaseModel):
    """Client-side log entry"""
    timestamp: datetime
    level: str = Field(..., pattern="^(DEBUG|INFO|WARNING|ERROR)$")
    message: str
    context: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    user_agent: Optional[str] = None
    url: Optional[str] = None

class ClientLogRequest(BaseModel):
    """Request to log multiple entries from client"""
    logs: List[LogEntry]
    session_id: Optional[str] = None
    client_info: Optional[Dict[str, Any]] = None

@router.post("/client")
async def log_client_events(
    request: Request,
    log_request: ClientLogRequest,
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Receive and process logs from client applications
    """
    # Get client IP
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    
    # Get request ID from header if available
    request_id = request.headers.get("X-Request-ID")
    user_id = str(current_user.id) if current_user else None
    
    # Process each log entry
    processed_count = 0
    errors = []
    
    with LogContext(request_id=request_id, user_id=user_id):
        for log_entry in log_request.logs:
            try:
                # Build context for the log
                context = {
                    "source": "frontend",
                    "client_ip": client_ip,
                    "session_id": log_request.session_id,
                    "user_agent": log_entry.user_agent or request.headers.get("user-agent"),
                    "url": log_entry.url,
                    "client_timestamp": log_entry.timestamp.isoformat(),
                    "client_info": log_request.client_info,
                }
                
                # Add custom context from log entry
                if log_entry.context:
                    context.update(log_entry.context)
                
                # Add error details if present
                if log_entry.error:
                    context["error_details"] = log_entry.error
                
                # Log the message with appropriate level
                log_with_context(
                    logger,
                    log_entry.level.lower(),
                    f"[CLIENT] {log_entry.message}",
                    **context
                )
                
                processed_count += 1
                
            except Exception as e:
                errors.append({
                    "index": log_request.logs.index(log_entry),
                    "error": str(e)
                })
                logger.error(f"Failed to process client log: {e}")
    
    return {
        "processed": processed_count,
        "total": len(log_request.logs),
        "errors": errors if errors else None
    }

@router.get("/health")
async def logs_health_check():
    """Check if logging system is healthy"""
    try:
        # Test logging
        logger.info("Health check log test")
        return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        logger.error(f"Logging health check failed: {e}")
        raise HTTPException(status_code=500, detail="Logging system unhealthy")