from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool
from typing import AsyncGenerator, Optional
import logging
import asyncio
from contextlib import asynccontextmanager
from app.config import settings

# Configure logging for connection pool monitoring
logger = logging.getLogger(__name__)

# Connection pool configuration from settings
POOL_SIZE = settings.DB_POOL_SIZE  # Number of connections to maintain in pool
MAX_OVERFLOW = settings.DB_MAX_OVERFLOW  # Maximum overflow connections beyond pool_size
POOL_TIMEOUT = settings.DB_POOL_TIMEOUT  # Seconds to wait before timing out
POOL_RECYCLE = settings.DB_POOL_RECYCLE  # Recycle connections after 1 hour
POOL_PRE_PING = settings.DB_POOL_PRE_PING  # Test connections before using them

# Convert standard PostgreSQL URL to async URL
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
logger.info(f"Using database URL: {database_url.split('@')[0]}@[REDACTED]")

# Create async engine with connection pooling
engine: AsyncEngine = create_async_engine(
    database_url,
    echo=settings.DEBUG,
    future=True,
    # Connection pool settings
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=POOL_PRE_PING,
    # Connection arguments for asyncpg
    connect_args={
        "server_settings": {
            "application_name": "LogicArena",
            "jit": "off"
        },
        "command_timeout": 60,
        "timeout": 30,
    },
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Connection pool monitoring
class ConnectionPoolMonitor:
    """Monitor and log connection pool statistics"""
    
    def __init__(self, engine: AsyncEngine):
        self.engine = engine
        self._monitoring_task: Optional[asyncio.Task] = None
        self._stop_monitoring = False
    
    async def start_monitoring(self, interval: int = 60):
        """Start monitoring connection pool statistics"""
        self._stop_monitoring = False
        self._monitoring_task = asyncio.create_task(self._monitor_loop(interval))
        logger.info("Started connection pool monitoring")
    
    async def stop_monitoring(self):
        """Stop monitoring connection pool statistics"""
        self._stop_monitoring = True
        if self._monitoring_task:
            await self._monitoring_task
        logger.info("Stopped connection pool monitoring")
    
    async def _monitor_loop(self, interval: int):
        """Monitoring loop that logs pool statistics"""
        while not self._stop_monitoring:
            try:
                stats = self.get_pool_stats()
                if stats:
                    # Log pool statistics
                    logger.info(
                        f"Connection Pool Stats - "
                        f"Size: {stats['size']}, "
                        f"Checked out: {stats['checked_out']}, "
                        f"Overflow: {stats['overflow']}, "
                        f"Total: {stats['total']}"
                    )
                    
                    # Warn if pool is near capacity
                    if stats['overflow'] > MAX_OVERFLOW * 0.8:
                        logger.warning(
                            f"Connection pool overflow is high: {stats['overflow']}/{MAX_OVERFLOW}"
                        )
            except Exception as e:
                logger.error(f"Error monitoring connection pool: {e}")
            
            await asyncio.sleep(interval)
    
    def get_pool_stats(self) -> dict:
        """Get current pool statistics"""
        pool = self.engine.pool
        if pool:
            try:
                # Different attributes for async pools
                size = 0
                checked_out = 0
                overflow = 0
                
                # Try to get size
                if hasattr(pool, 'size'):
                    try:
                        size = pool.size()
                    except:
                        pass
                
                # Try to get checked out - different methods for different pool types
                if hasattr(pool, 'checked_out'):
                    try:
                        checked_out = pool.checked_out()
                    except:
                        pass
                elif hasattr(pool, 'checkedout'):
                    try:
                        checked_out = pool.checkedout()
                    except:
                        pass
                
                # Try to get overflow
                if hasattr(pool, 'overflow'):
                    try:
                        overflow = pool.overflow
                    except:
                        pass
                
                return {
                    "size": size,
                    "checked_out": checked_out,
                    "overflow": overflow,
                    "total": size + overflow,
                    "max_overflow": MAX_OVERFLOW,
                }
            except Exception as e:
                logger.debug(f"Could not get pool stats: {e}")
                # Return empty stats if pool doesn't support these attributes
                return {
                    "size": 0,
                    "checked_out": 0,
                    "overflow": 0,
                    "total": 0,
                    "max_overflow": MAX_OVERFLOW,
                }
        return {}

# Create global monitor instance
pool_monitor = ConnectionPoolMonitor(engine)

@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for database sessions with proper error handling"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function that yields db sessions with connection pool
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

async def close_db_connections():
    """Close all database connections and dispose of the engine"""
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")

async def verify_db_connection() -> bool:
    """Verify database connectivity"""
    try:
        logger.info("Attempting database connection...")
        from sqlalchemy import text
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection verification failed: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False 