"""
Enhanced rate limiting middleware for LogicArena
"""
from fastapi import Request, HTTPException, status
from fastapi_limiter.depends import RateLimiter as FastAPIRateLimiter
import redis.asyncio as redis
from typing import Optional, Dict, Any
import json
import time
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class EnhancedRateLimiter:
    """Enhanced rate limiter with user-specific and IP-based limiting"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
    
    async def get_redis(self) -> redis.Redis:
        """Get Redis client instance"""
        if not self.redis:
            self.redis = await redis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True
            )
        return self.redis
    
    async def check_rate_limit(
        self, 
        key: str, 
        limit: int, 
        window: int,
        cost: int = 1
    ) -> Dict[str, Any]:
        """
        Check if request is within rate limit
        
        Args:
            key: Unique identifier for the rate limit bucket
            limit: Maximum number of requests allowed
            window: Time window in seconds
            cost: Cost of this request (default 1)
            
        Returns:
            Dict with rate limit info
        """
        r = await self.get_redis()
        
        now = time.time()
        window_start = now - window
        
        # Remove old entries
        await r.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        current_count = await r.zcard(key)
        
        # Calculate remaining quota
        remaining = max(0, limit - current_count)
        
        # Check if limit exceeded
        if current_count >= limit:
            reset_time = await r.zrange(key, 0, 0, withscores=True)
            if reset_time:
                reset_at = reset_time[0][1] + window
            else:
                reset_at = now + window
                
            return {
                "allowed": False,
                "limit": limit,
                "remaining": 0,
                "reset": int(reset_at),
                "retry_after": int(reset_at - now)
            }
        
        # Add current request
        await r.zadd(key, {f"{now}:{cost}": now})
        await r.expire(key, window)
        
        return {
            "allowed": True,
            "limit": limit,
            "remaining": remaining - cost,
            "reset": int(now + window)
        }
    
    async def get_identifier(self, request: Request) -> str:
        """Get identifier for rate limiting (user ID or IP)"""
        # Try to get user ID from request state (set by auth middleware)
        if hasattr(request.state, "user_id"):
            return f"user:{request.state.user_id}"
        
        # Fall back to IP address
        client_ip = request.client.host
        if "X-Forwarded-For" in request.headers:
            # Get real IP if behind proxy
            client_ip = request.headers["X-Forwarded-For"].split(",")[0].strip()
        
        return f"ip:{client_ip}"

# Global rate limiter instance
rate_limiter = EnhancedRateLimiter()

def create_rate_limit_dependency(
    times: int, 
    seconds: int,
    cost: int = 1,
    key_prefix: str = "api"
):
    """
    Create a rate limit dependency for FastAPI routes
    
    Args:
        times: Number of requests allowed
        seconds: Time window in seconds
        cost: Cost of the request
        key_prefix: Prefix for the rate limit key
    """
    async def rate_limit_check(request: Request):
        identifier = await rate_limiter.get_identifier(request)
        key = f"rate_limit:{key_prefix}:{identifier}"
        
        result = await rate_limiter.check_rate_limit(
            key=key,
            limit=times,
            window=seconds,
            cost=cost
        )
        
        # Add rate limit headers to response
        request.state.rate_limit_headers = {
            "X-RateLimit-Limit": str(result["limit"]),
            "X-RateLimit-Remaining": str(result["remaining"]),
            "X-RateLimit-Reset": str(result["reset"])
        }
        
        if not result["allowed"]:
            logger.warning(f"Rate limit exceeded for {identifier} on {key_prefix}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "Retry-After": str(result["retry_after"]),
                    "X-RateLimit-Limit": str(result["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(result["reset"])
                }
            )
    
    return rate_limit_check

# Predefined rate limiters for common endpoints
class RateLimiters:
    """Collection of predefined rate limiters"""
    
    # Authentication endpoints
    login = create_rate_limit_dependency(10, 60, key_prefix="auth:login")
    register = create_rate_limit_dependency(5, 86400, key_prefix="auth:register")
    refresh = create_rate_limit_dependency(30, 3600, key_prefix="auth:refresh")
    
    # Puzzle endpoints
    puzzle_submit = create_rate_limit_dependency(100, 3600, key_prefix="puzzle:submit")
    puzzle_list = create_rate_limit_dependency(100, 60, key_prefix="puzzle:list")
    
    # Game endpoints
    join_queue = create_rate_limit_dependency(5, 60, key_prefix="game:queue")
    game_submit = create_rate_limit_dependency(60, 60, key_prefix="game:submit")
    
    # User endpoints
    profile = create_rate_limit_dependency(100, 60, key_prefix="user:profile")
    leaderboard = create_rate_limit_dependency(30, 60, key_prefix="user:leaderboard")
    
    # General API
    general = create_rate_limit_dependency(1000, 3600, key_prefix="api:general")

# Middleware to add rate limit headers to responses
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitHeaderMiddleware(BaseHTTPMiddleware):
    """Add rate limit headers to responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add rate limit headers if they exist
        if hasattr(request.state, "rate_limit_headers"):
            for header, value in request.state.rate_limit_headers.items():
                response.headers[header] = value
        
        return response