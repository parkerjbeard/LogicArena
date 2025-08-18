import pytest
import pytest_asyncio
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock

from app.models import Base
from httpx import AsyncClient

# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Clean up
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_db(test_engine):
    """Create a test database session."""
    async with AsyncSession(test_engine) as session:
        try:
            yield session
        finally:
            await session.close()


@pytest.fixture
def mock_redis():
    """Create a mock Redis client."""
    mock_redis = AsyncMock()
    mock_redis.from_url = AsyncMock(return_value=mock_redis)
    mock_redis.publish = AsyncMock()
    mock_redis.subscribe = AsyncMock()
    mock_redis.hset = AsyncMock()
    mock_redis.hget = AsyncMock()
    mock_redis.hgetall = AsyncMock(return_value={})
    mock_redis.delete = AsyncMock()
    mock_redis.setex = AsyncMock()
    mock_redis.rpush = AsyncMock()
    mock_redis.lrange = AsyncMock(return_value=[])
    mock_redis.keys = AsyncMock(return_value=[])
    mock_redis.close = AsyncMock()
    
    # Mock pubsub
    mock_pubsub = AsyncMock()
    mock_pubsub.subscribe = AsyncMock()
    mock_pubsub.unsubscribe = AsyncMock()
    mock_pubsub.close = AsyncMock()
    mock_pubsub.listen = AsyncMock()
    mock_redis.pubsub = AsyncMock(return_value=mock_pubsub)
    
    return mock_redis


@pytest.fixture
def mock_websocket():
    """Create a mock WebSocket connection."""
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.send_text = AsyncMock()
    ws.receive_json = AsyncMock()
    ws.receive_text = AsyncMock()
    ws.close = AsyncMock()
    return ws


@pytest_asyncio.fixture
async def test_client(test_db):
    """Create a test client with mocked dependencies."""
    from main import app
    
    # Override database dependency
    async def override_get_session():
        yield test_db
    
    # Import get_db from where it's actually defined
    from app.db.session import get_db
    app.dependency_overrides[get_db] = override_get_session
    
    # Mock Redis for WebSocket manager
    # Skip WebSocket manager mocking for now since it's not used in these tests
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()