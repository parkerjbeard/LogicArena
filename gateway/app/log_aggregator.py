import json
import gzip
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
from collections import defaultdict

class LogAggregator:
    """Simple log aggregation service that reads from log files"""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
    def _get_log_files(self, service: Optional[str] = None) -> List[Path]:
        """Get all log files for a given service"""
        if service:
            pattern = f"{service}*.log*"
        else:
            pattern = "*.log*"
            
        files = list(self.log_dir.glob(pattern))
        # Sort by modification time, newest first
        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        return files
    
    def _read_log_file(self, file_path: Path, limit: int = 1000) -> List[Dict[str, Any]]:
        """Read log entries from a file"""
        logs = []
        
        # Check if file is gzipped
        if file_path.suffix == '.gz':
            open_func = gzip.open
            mode = 'rt'
        else:
            open_func = open
            mode = 'r'
            
        try:
            with open_func(file_path, mode, encoding='utf-8') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        logs.append(log_entry)
                        if len(logs) >= limit:
                            break
                    except json.JSONDecodeError:
                        # Skip malformed lines
                        continue
        except Exception as e:
            print(f"Error reading log file {file_path}: {e}")
            
        return logs
    
    async def search_logs(
        self,
        query: Optional[str] = None,
        level: Optional[str] = None,
        service: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search through logs with various filters"""
        matching_logs = []
        total_count = 0
        
        # Get relevant log files
        files = self._get_log_files(service)
        
        for file_path in files:
            logs = self._read_log_file(file_path, limit=10000)  # Read more to filter
            
            for log in logs:
                # Apply filters
                if level and log.get('level') != level.upper():
                    continue
                    
                if user_id and log.get('user_id') != user_id:
                    continue
                    
                if request_id and log.get('request_id') != request_id:
                    continue
                    
                # Time filtering
                if 'timestamp' in log:
                    try:
                        log_time = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
                        if start_time and log_time < start_time:
                            continue
                        if end_time and log_time > end_time:
                            continue
                    except Exception:
                        # Best-effort timestamp parsing
                        pass
                
                # Text search in message
                if query:
                    message = log.get('msg', '') + str(log.get('extra_fields', {}))
                    if query.lower() not in message.lower():
                        continue
                
                total_count += 1
                
                # Apply pagination
                if total_count > offset and len(matching_logs) < limit:
                    matching_logs.append(log)
                    
                if len(matching_logs) >= limit:
                    break
                    
            if len(matching_logs) >= limit:
                break
        
        # Sort by timestamp, newest first
        matching_logs.sort(
            key=lambda x: x.get('timestamp', ''),
            reverse=True
        )
        
        return {
            "logs": matching_logs,
            "total": total_count,
            "offset": offset,
            "limit": limit
        }
    
    async def get_log_statistics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics about logs"""
        if not start_time:
            start_time = datetime.utcnow() - timedelta(hours=24)
        if not end_time:
            end_time = datetime.utcnow()
            
        stats = {
            "total_logs": 0,
            "by_level": defaultdict(int),
            "by_service": defaultdict(int),
            "by_hour": defaultdict(int),
            "top_errors": [],
            "response_times": []
        }
        
        error_counts = defaultdict(int)
        response_times = []
        
        files = self._get_log_files()
        
        for file_path in files:
            logs = self._read_log_file(file_path, limit=100000)
            
            for log in logs:
                # Time filtering
                if 'timestamp' in log:
                    try:
                        log_time = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
                        if log_time < start_time or log_time > end_time:
                            continue
                            
                        # Group by hour
                        hour_key = log_time.replace(minute=0, second=0, microsecond=0).isoformat()
                        stats["by_hour"][hour_key] += 1
                    except Exception:
                        pass
                
                stats["total_logs"] += 1
                stats["by_level"][log.get('level', 'UNKNOWN')] += 1
                stats["by_service"][log.get('service', 'unknown')] += 1
                
                # Collect error messages
                if log.get('level') == 'ERROR':
                    error_msg = log.get('msg', 'Unknown error')
                    error_counts[error_msg] += 1
                
                # Collect response times
                extra = log.get('extra_fields', {})
                if 'process_time_ms' in extra:
                    response_times.append(extra['process_time_ms'])
        
        # Get top errors
        stats["top_errors"] = [
            {"message": msg, "count": count}
            for msg, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Calculate response time percentiles
        if response_times:
            response_times.sort()
            stats["response_times"] = {
                "count": len(response_times),
                "min": response_times[0],
                "max": response_times[-1],
                "avg": sum(response_times) / len(response_times),
                "p50": response_times[len(response_times) // 2],
                "p95": response_times[int(len(response_times) * 0.95)],
                "p99": response_times[int(len(response_times) * 0.99)]
            }
        
        return stats
    
    async def get_request_trace(self, request_id: str) -> List[Dict[str, Any]]:
        """Get all logs for a specific request ID"""
        result = await self.search_logs(request_id=request_id, limit=1000)
        logs = result["logs"]
        
        # Sort by timestamp to show request flow
        logs.sort(key=lambda x: x.get('timestamp', ''))
        
        return logs
    
    async def cleanup_old_logs(self, days: int = 7) -> int:
        """Clean up log files older than specified days"""
        cutoff_time = datetime.now() - timedelta(days=days)
        deleted_count = 0
        
        for file_path in self.log_dir.glob("*.log*"):
            if file_path.stat().st_mtime < cutoff_time.timestamp():
                try:
                    file_path.unlink()
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting {file_path}: {e}")
                    
        return deleted_count

# Create singleton instance
log_aggregator = LogAggregator()