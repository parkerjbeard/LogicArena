import os
import logging
import logging.handlers
from datetime import datetime
from typing import Dict, Any, Optional
from pythonjsonlogger import jsonlogger
import uuid
from contextvars import ContextVar
from pathlib import Path

# Context variables for request tracking
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter that adds extra fields to log records"""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()
        
        # Add service info
        log_record['service'] = 'gateway'
        log_record['environment'] = os.getenv('ENVIRONMENT', 'development')
        
        # Add request context if available
        request_id = request_id_var.get()
        if request_id:
            log_record['request_id'] = request_id
            
        user_id = user_id_var.get()
        if user_id:
            log_record['user_id'] = user_id
            
        # Add log level as string
        log_record['level'] = record.levelname
        
        # Add source info
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Move 'message' to 'msg' for consistency
        if 'message' in log_record:
            log_record['msg'] = log_record.pop('message')

def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    enable_console: bool = True,
    enable_file: bool = True,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> None:
    """
    Set up structured JSON logging with rotation
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_dir: Directory to store log files
        enable_console: Whether to log to console
        enable_file: Whether to log to file
        max_bytes: Maximum size of each log file
        backup_count: Number of backup files to keep
    """
    # Create log directory if it doesn't exist
    if enable_file:
        Path(log_dir).mkdir(exist_ok=True)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers = []
    
    # Create formatter
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        json_ensure_ascii=False
    )
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if enable_file:
        # All logs file
        all_logs_handler = logging.handlers.RotatingFileHandler(
            filename=f"{log_dir}/gateway.log",
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        all_logs_handler.setFormatter(formatter)
        root_logger.addHandler(all_logs_handler)
        
        # Error logs file
        error_handler = logging.handlers.RotatingFileHandler(
            filename=f"{log_dir}/gateway-errors.log",
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        root_logger.addHandler(error_handler)
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name"""
    return logging.getLogger(name)

def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())

def set_request_context(request_id: Optional[str] = None, user_id: Optional[str] = None) -> None:
    """Set request context for logging"""
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)

def clear_request_context() -> None:
    """Clear request context"""
    request_id_var.set(None)
    user_id_var.set(None)

def log_with_context(
    logger: logging.Logger,
    level: str,
    message: str,
    **kwargs: Any
) -> None:
    """
    Log a message with additional context
    
    Args:
        logger: Logger instance
        level: Log level (info, warning, error, debug)
        message: Log message
        **kwargs: Additional context to include in the log
    """
    log_method = getattr(logger, level.lower())
    
    # Merge kwargs into extra dict for structured logging
    extra = {"extra_fields": kwargs} if kwargs else {}
    
    log_method(message, extra=extra)

class LogContext:
    """Context manager for setting request context"""
    
    def __init__(self, request_id: Optional[str] = None, user_id: Optional[str] = None):
        self.request_id = request_id
        self.user_id = user_id
        self.previous_request_id = None
        self.previous_user_id = None
    
    def __enter__(self):
        self.previous_request_id = request_id_var.get()
        self.previous_user_id = user_id_var.get()
        set_request_context(self.request_id, self.user_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        request_id_var.set(self.previous_request_id)
        user_id_var.set(self.previous_user_id)