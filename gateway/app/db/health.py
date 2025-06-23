"""Database health checks and connection pool utilities"""
import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import engine, get_db_context, pool_monitor

logger = logging.getLogger(__name__)


class DatabaseHealthChecker:
    """Performs database health checks and monitors connection pool performance"""
    
    def __init__(self):
        self.last_check: Optional[datetime] = None
        self.last_status: bool = True
        self.consecutive_failures: int = 0
        self.performance_metrics: Dict[str, float] = {}
    
    async def check_database_health(self) -> Dict:
        """Comprehensive database health check"""
        health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "unknown",
            "checks": {},
            "pool_stats": pool_monitor.get_pool_stats(),
            "performance_metrics": {}
        }
        
        try:
            # Basic connectivity check
            start_time = asyncio.get_event_loop().time()
            connectivity_ok = await self._check_connectivity()
            connectivity_time = asyncio.get_event_loop().time() - start_time
            
            health_report["checks"]["connectivity"] = {
                "status": "pass" if connectivity_ok else "fail",
                "duration_ms": connectivity_time * 1000
            }
            
            if connectivity_ok:
                # Query performance check
                query_perf = await self._check_query_performance()
                health_report["checks"]["query_performance"] = query_perf
                
                # Table access check
                table_access = await self._check_table_access()
                health_report["checks"]["table_access"] = table_access
                
                # Connection pool health
                pool_health = self._check_pool_health()
                health_report["checks"]["connection_pool"] = pool_health
                
                # Overall status
                all_checks_passed = all(
                    check.get("status") == "pass" 
                    for check in health_report["checks"].values()
                )
                health_report["status"] = "healthy" if all_checks_passed else "degraded"
                
                # Update metrics
                self.last_check = datetime.utcnow()
                self.last_status = all_checks_passed
                if all_checks_passed:
                    self.consecutive_failures = 0
                else:
                    self.consecutive_failures += 1
            else:
                health_report["status"] = "unhealthy"
                self.consecutive_failures += 1
                
        except Exception as e:
            logger.error(f"Health check failed with error: {e}")
            health_report["status"] = "error"
            health_report["error"] = str(e)
            self.consecutive_failures += 1
        
        # Add alert if too many consecutive failures
        if self.consecutive_failures >= 3:
            health_report["alert"] = f"Database has failed {self.consecutive_failures} consecutive health checks"
        
        return health_report
    
    async def _check_connectivity(self) -> bool:
        """Check basic database connectivity"""
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Connectivity check failed: {e}")
            return False
    
    async def _check_query_performance(self) -> Dict:
        """Check query performance with a simple benchmark"""
        try:
            async with get_db_context() as session:
                # Simple query benchmark
                start_time = asyncio.get_event_loop().time()
                result = await session.execute(
                    text("SELECT COUNT(*) FROM user")
                )
                count = result.scalar()
                duration = asyncio.get_event_loop().time() - start_time
                
                # Performance thresholds
                is_fast = duration < 0.1  # 100ms threshold
                
                return {
                    "status": "pass" if is_fast else "slow",
                    "duration_ms": duration * 1000,
                    "row_count": count,
                    "threshold_ms": 100
                }
        except Exception as e:
            return {
                "status": "fail",
                "error": str(e)
            }
    
    async def _check_table_access(self) -> Dict:
        """Check access to critical tables"""
        critical_tables = ["user", "puzzle", "game", "submission"]
        table_status = {}
        
        try:
            async with get_db_context() as session:
                for table in critical_tables:
                    try:
                        await session.execute(
                            text(f"SELECT 1 FROM {table} LIMIT 1")
                        )
                        table_status[table] = "accessible"
                    except Exception as e:
                        table_status[table] = f"error: {str(e)}"
                
                all_accessible = all(
                    status == "accessible" 
                    for status in table_status.values()
                )
                
                return {
                    "status": "pass" if all_accessible else "fail",
                    "tables": table_status
                }
        except Exception as e:
            return {
                "status": "fail",
                "error": str(e)
            }
    
    def _check_pool_health(self) -> Dict:
        """Check connection pool health"""
        pool_stats = pool_monitor.get_pool_stats()
        
        if not pool_stats:
            return {"status": "unknown", "message": "No pool statistics available"}
        
        # Calculate pool utilization
        total_connections = pool_stats.get("total", 0)
        max_connections = pool_stats.get("size", 0) + pool_stats.get("max_overflow", 0)
        utilization = (total_connections / max_connections * 100) if max_connections > 0 else 0
        
        # Check for issues
        issues = []
        if utilization > 80:
            issues.append(f"High pool utilization: {utilization:.1f}%")
        if pool_stats.get("overflow", 0) > 0:
            issues.append(f"Pool overflow active: {pool_stats['overflow']} connections")
        
        return {
            "status": "pass" if not issues else "warning",
            "utilization_percent": utilization,
            "issues": issues,
            "stats": pool_stats
        }
    
    async def get_connection_metrics(self) -> Dict:
        """Get detailed connection pool metrics"""
        metrics = {
            "pool_stats": pool_monitor.get_pool_stats(),
            "last_health_check": self.last_check.isoformat() if self.last_check else None,
            "consecutive_failures": self.consecutive_failures,
            "uptime_status": "healthy" if self.consecutive_failures == 0 else "degraded"
        }
        
        # Add connection timing metrics
        try:
            timings = []
            for _ in range(5):  # Sample 5 connections
                start = asyncio.get_event_loop().time()
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))
                timings.append((asyncio.get_event_loop().time() - start) * 1000)
            
            metrics["connection_timings_ms"] = {
                "min": min(timings),
                "max": max(timings),
                "avg": sum(timings) / len(timings)
            }
        except Exception as e:
            metrics["connection_timings_ms"] = {"error": str(e)}
        
        return metrics


# Global health checker instance
db_health_checker = DatabaseHealthChecker()


async def cleanup_idle_connections():
    """Clean up idle connections in the pool"""
    try:
        # This will close idle connections
        await engine.dispose()
        # Recreate the pool
        logger.info("Cleaned up idle database connections")
    except Exception as e:
        logger.error(f"Failed to cleanup idle connections: {e}")


async def optimize_pool_size(current_stats: Dict):
    """Dynamically adjust pool size based on usage patterns"""
    # This is a placeholder for future dynamic pool sizing
    # You could implement logic to adjust pool size based on:
    # - Time of day patterns
    # - Current load
    # - Historical usage data
    pass