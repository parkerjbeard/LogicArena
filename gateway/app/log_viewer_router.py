from fastapi import APIRouter, Query, HTTPException, Depends
from datetime import datetime, timedelta
from typing import Optional, Any
from pydantic import BaseModel, Field

from app.log_aggregator import log_aggregator
from app.auth.utils import get_current_user_optional

router = APIRouter()

class LogSearchParams(BaseModel):
    """Parameters for log search"""
    query: Optional[str] = Field(None, description="Search text in log messages")
    level: Optional[str] = Field(None, pattern="^(DEBUG|INFO|WARNING|ERROR)$")
    service: Optional[str] = Field(None, description="Service name (gateway, frontend)")
    start_time: Optional[datetime] = Field(None, description="Start time for log search")
    end_time: Optional[datetime] = Field(None, description="End time for log search")
    user_id: Optional[str] = Field(None, description="Filter by user ID")
    request_id: Optional[str] = Field(None, description="Filter by request ID")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of logs to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")

@router.post("/search")
async def search_logs(
    params: LogSearchParams,
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Search through aggregated logs with various filters
    
    Note: In production, this endpoint should be restricted to admin users
    """
    try:
        results = await log_aggregator.search_logs(
            query=params.query,
            level=params.level,
            service=params.service,
            start_time=params.start_time,
            end_time=params.end_time,
            user_id=params.user_id,
            request_id=params.request_id,
            limit=params.limit,
            offset=params.offset
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching logs: {str(e)}")

@router.get("/statistics")
async def get_log_statistics(
    start_time: Optional[datetime] = Query(None, description="Start time for statistics"),
    end_time: Optional[datetime] = Query(None, description="End time for statistics"),
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Get statistics about logs
    
    Returns counts by level, service, time, top errors, and response time percentiles
    """
    try:
        stats = await log_aggregator.get_log_statistics(
            start_time=start_time,
            end_time=end_time
        )
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")

@router.get("/trace/{request_id}")
async def get_request_trace(
    request_id: str,
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Get all logs for a specific request ID
    
    This shows the complete flow of a request through the system
    """
    try:
        logs = await log_aggregator.get_request_trace(request_id)
        return {
            "request_id": request_id,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting request trace: {str(e)}")

@router.get("/recent")
async def get_recent_logs(
    minutes: int = Query(5, ge=1, le=60, description="Number of minutes to look back"),
    level: Optional[str] = Query(None, pattern="^(DEBUG|INFO|WARNING|ERROR)$"),
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Get recent logs from the last N minutes
    """
    try:
        start_time = datetime.utcnow() - timedelta(minutes=minutes)
        results = await log_aggregator.search_logs(
            level=level,
            start_time=start_time,
            limit=100
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recent logs: {str(e)}")

@router.get("/errors")
async def get_recent_errors(
    hours: int = Query(1, ge=1, le=24, description="Number of hours to look back"),
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Get recent error logs
    """
    try:
        start_time = datetime.utcnow() - timedelta(hours=hours)
        results = await log_aggregator.search_logs(
            level="ERROR",
            start_time=start_time,
            limit=100
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting error logs: {str(e)}")

@router.post("/cleanup")
async def cleanup_old_logs(
    days: int = Query(7, ge=1, le=30, description="Delete logs older than N days"),
    current_user: Optional[Any] = Depends(get_current_user_optional)
):
    """
    Clean up old log files
    
    Note: In production, this should be restricted to admin users
    """
    try:
        deleted_count = await log_aggregator.cleanup_old_logs(days)
        return {
            "message": f"Cleaned up {deleted_count} old log files",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning up logs: {str(e)}")