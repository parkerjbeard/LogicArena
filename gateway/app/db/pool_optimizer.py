"""Database connection pool optimization and maintenance"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import statistics

from app.db.session import pool_monitor, engine
from app.config import settings

logger = logging.getLogger(__name__)


class PoolOptimizer:
    """Optimizes database connection pool based on usage patterns"""
    
    def __init__(self):
        self.usage_history: List[Dict] = []
        self.max_history_size = 1440  # 24 hours of minute-by-minute data
        self.optimization_task: Optional[asyncio.Task] = None
        self.maintenance_task: Optional[asyncio.Task] = None
    
    async def start_optimization(self, interval_minutes: int = 5):
        """Start the pool optimization background task"""
        self.optimization_task = asyncio.create_task(
            self._optimization_loop(interval_minutes * 60)
        )
        logger.info(f"Started pool optimization task (interval: {interval_minutes} minutes)")
    
    async def start_maintenance(self, interval_minutes: int = 30):
        """Start the pool maintenance background task"""
        self.maintenance_task = asyncio.create_task(
            self._maintenance_loop(interval_minutes * 60)
        )
        logger.info(f"Started pool maintenance task (interval: {interval_minutes} minutes)")
    
    async def stop(self):
        """Stop all background tasks"""
        if self.optimization_task:
            self.optimization_task.cancel()
            try:
                await self.optimization_task
            except asyncio.CancelledError:
                pass
        
        if self.maintenance_task:
            self.maintenance_task.cancel()
            try:
                await self.maintenance_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Stopped pool optimization and maintenance tasks")
    
    async def _optimization_loop(self, interval: int):
        """Main optimization loop"""
        while True:
            try:
                await self._collect_usage_metrics()
                await self._analyze_and_optimize()
            except Exception as e:
                logger.error(f"Error in pool optimization: {e}")
            
            await asyncio.sleep(interval)
    
    async def _maintenance_loop(self, interval: int):
        """Main maintenance loop"""
        while True:
            try:
                await self._perform_maintenance()
            except Exception as e:
                logger.error(f"Error in pool maintenance: {e}")
            
            await asyncio.sleep(interval)
    
    async def _collect_usage_metrics(self):
        """Collect current pool usage metrics"""
        stats = pool_monitor.get_pool_stats()
        if stats:
            metric = {
                "timestamp": datetime.utcnow(),
                "total_connections": stats.get("total", 0),
                "checked_out": stats.get("checked_out", 0),
                "overflow": stats.get("overflow", 0),
                "pool_size": stats.get("size", 0),
                "max_overflow": stats.get("max_overflow", 0)
            }
            
            # Calculate utilization percentage
            max_connections = metric["pool_size"] + metric["max_overflow"]
            if max_connections > 0:
                metric["utilization"] = (metric["total_connections"] / max_connections) * 100
            else:
                metric["utilization"] = 0
            
            # Add to history
            self.usage_history.append(metric)
            
            # Trim history if too large
            if len(self.usage_history) > self.max_history_size:
                self.usage_history = self.usage_history[-self.max_history_size:]
    
    async def _analyze_and_optimize(self):
        """Analyze usage patterns and optimize pool settings"""
        if len(self.usage_history) < 12:  # Need at least 1 hour of data
            return
        
        # Calculate statistics for the last hour
        recent_history = self.usage_history[-12:]  # Last hour (12 * 5 minutes)
        utilizations = [m["utilization"] for m in recent_history]
        overflows = [m["overflow"] for m in recent_history]
        
        avg_utilization = statistics.mean(utilizations)
        max_utilization = max(utilizations)
        avg_overflow = statistics.mean(overflows)
        
        logger.info(
            f"Pool usage stats - Avg utilization: {avg_utilization:.1f}%, "
            f"Max utilization: {max_utilization:.1f}%, "
            f"Avg overflow: {avg_overflow:.1f}"
        )
        
        # Optimization recommendations
        recommendations = []
        
        if avg_utilization > 80:
            recommendations.append("High average utilization - consider increasing pool size")
        elif avg_utilization < 20 and len(self.usage_history) > 288:  # Full day of data
            recommendations.append("Low utilization - consider decreasing pool size")
        
        if avg_overflow > 5:
            recommendations.append("Frequent overflow usage - increase pool size or max_overflow")
        
        if max_utilization >= 95:
            recommendations.append("Near capacity peaks detected - monitor for connection exhaustion")
        
        if recommendations:
            logger.warning(f"Pool optimization recommendations: {', '.join(recommendations)}")
        
        # Auto-scaling logic (if enabled)
        if getattr(settings, "DB_POOL_AUTO_SCALE", False):
            await self._apply_auto_scaling(avg_utilization, max_utilization, avg_overflow)
    
    async def _apply_auto_scaling(self, avg_utilization: float, max_utilization: float, avg_overflow: float):
        """Apply automatic pool scaling based on metrics"""
        # This is a placeholder for future auto-scaling implementation
        # In production, you would need to:
        # 1. Gradually adjust pool parameters
        # 2. Ensure minimum and maximum bounds
        # 3. Implement cooldown periods between adjustments
        # 4. Properly recreate the engine with new settings
        pass
    
    async def _perform_maintenance(self):
        """Perform periodic maintenance tasks"""
        logger.info("Performing connection pool maintenance")
        
        # Log current pool state
        stats = pool_monitor.get_pool_stats()
        if stats:
            logger.info(f"Pool maintenance - Current stats: {stats}")
        
        # Check for stale connections
        # In a real implementation, you might want to:
        # 1. Identify connections that have been idle too long
        # 2. Test connections for validity
        # 3. Replace invalid connections
        
        # For now, we'll just ensure the pool is healthy
        try:
            async with engine.connect() as conn:
                await conn.execute("SELECT 1")
            logger.info("Pool maintenance - Connection test successful")
        except Exception as e:
            logger.error(f"Pool maintenance - Connection test failed: {e}")
    
    def get_usage_report(self, hours: int = 24) -> Dict:
        """Generate a usage report for the specified time period"""
        if not self.usage_history:
            return {"error": "No usage data available"}
        
        # Filter data for the requested time period
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        filtered_history = [
            m for m in self.usage_history 
            if m["timestamp"] > cutoff_time
        ]
        
        if not filtered_history:
            return {"error": f"No data available for the last {hours} hours"}
        
        # Calculate statistics
        utilizations = [m["utilization"] for m in filtered_history]
        overflows = [m["overflow"] for m in filtered_history]
        total_connections = [m["total_connections"] for m in filtered_history]
        
        report = {
            "period_hours": hours,
            "data_points": len(filtered_history),
            "utilization": {
                "average": statistics.mean(utilizations),
                "min": min(utilizations),
                "max": max(utilizations),
                "std_dev": statistics.stdev(utilizations) if len(utilizations) > 1 else 0
            },
            "overflow": {
                "average": statistics.mean(overflows),
                "max": max(overflows),
                "frequency": sum(1 for o in overflows if o > 0) / len(overflows) * 100
            },
            "connections": {
                "average": statistics.mean(total_connections),
                "min": min(total_connections),
                "max": max(total_connections)
            },
            "recommendations": self._generate_recommendations(filtered_history)
        }
        
        return report
    
    def _generate_recommendations(self, history: List[Dict]) -> List[str]:
        """Generate recommendations based on usage history"""
        recommendations = []
        
        if not history:
            return recommendations
        
        # Analyze patterns
        utilizations = [m["utilization"] for m in history]
        avg_util = statistics.mean(utilizations)
        max_util = max(utilizations)
        
        if avg_util > 70:
            recommendations.append(
                f"Consider increasing pool size (current avg utilization: {avg_util:.1f}%)"
            )
        elif avg_util < 30 and len(history) > 100:
            recommendations.append(
                f"Pool may be over-provisioned (avg utilization: {avg_util:.1f}%)"
            )
        
        if max_util >= 90:
            peak_count = sum(1 for u in utilizations if u >= 90)
            recommendations.append(
                f"Detected {peak_count} high utilization peaks (≥90%)"
            )
        
        # Check for patterns by hour
        if len(history) >= 288:  # At least 24 hours of data
            hourly_stats = self._calculate_hourly_patterns(history)
            if hourly_stats:
                peak_hours = [h for h, stats in hourly_stats.items() if stats["avg"] > 70]
                if peak_hours:
                    recommendations.append(
                        f"Peak usage hours: {', '.join(map(str, sorted(peak_hours)))}"
                    )
        
        return recommendations
    
    def _calculate_hourly_patterns(self, history: List[Dict]) -> Dict[int, Dict]:
        """Calculate usage patterns by hour of day"""
        hourly_data = {}
        
        for metric in history:
            hour = metric["timestamp"].hour
            if hour not in hourly_data:
                hourly_data[hour] = []
            hourly_data[hour].append(metric["utilization"])
        
        hourly_stats = {}
        for hour, utilizations in hourly_data.items():
            if utilizations:
                hourly_stats[hour] = {
                    "avg": statistics.mean(utilizations),
                    "max": max(utilizations),
                    "samples": len(utilizations)
                }
        
        return hourly_stats


# Global pool optimizer instance
pool_optimizer = PoolOptimizer()