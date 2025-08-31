import logging
import logging.handlers
import os
from datetime import datetime
from typing import Optional

class RateLimitedFilter(logging.Filter):
    """Filter that limits the rate of log messages with the same content."""
    def __init__(self, rate_limit_seconds: int = 5):
        super().__init__()
        self.rate_limit_seconds = rate_limit_seconds
        self._last_logged = {}

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter out log messages that were logged too recently."""
        now = datetime.now().timestamp()
        message = record.getMessage()
        
        # Always allow ERROR and above
        if record.levelno >= logging.ERROR:
            return True
            
        # Check rate limit for other messages
        last_logged = self._last_logged.get(message, 0)
        if now - last_logged >= self.rate_limit_seconds:
            self._last_logged[message] = now
            return True
        return False

def setup_logging(log_level: Optional[str] = None):
    """Configure logging for the application."""
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Clear any existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Set up formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    # Add rate limiting filter to console handler
    console_handler.addFilter(RateLimitedFilter(rate_limit_seconds=5))
    
    # Configure root logger
    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)
    
    # Set log level for common noisier libraries
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    
    # Disable overly verbose loggers
    logging.getLogger('botocore').setLevel(logging.WARNING)
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('s3transfer').setLevel(logging.WARNING)
    logging.getLogger('urllib3.connectionpool').setLevel(logging.WARNING)
    
    return root_logger
