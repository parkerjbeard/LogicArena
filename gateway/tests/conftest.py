import pytest
import asyncio
import redis.asyncio as redis
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, MagicMock
import json

from app.main import app
from app.db.session import get_db
from app.models import Base
from app.websocket.manager import ConnectionManager
from app.config import settings

# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
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

@pytest.fixture
async def test_db(test_engine):
    """Create a test database session."""
    async with AsyncSession(test_engine) as session:
        yield session

@pytest.fixture
def override_get_db(test_db):
    """Override the get_db dependency."""
    async def _override_get_db():
        yield test_db
    return _override_get_db

@pytest.fixture
def test_client(override_get_db):
    """Create a test client with overridden dependencies."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
async def mock_redis():
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
async def connection_manager(mock_redis):
    """Create a connection manager with mocked Redis."""
    manager = ConnectionManager()
    manager.redis_client = mock_redis
    manager.pubsub = mock_redis.pubsub()
    yield manager
    await manager.cleanup()

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

@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return {
        "id": 1,
        "handle": "testuser",
        "email": "test@example.com",
        "rating": 1000
    }

@pytest.fixture
def sample_game():
    """Sample game data for testing."""
    return {
        "id": 1,
        "player_a": 1,
        "player_b": 2,
        "status": "active",
        "created_at": "2024-01-01T00:00:00"
    }

@pytest.fixture
def valid_jwt_token():
    """Generate a valid JWT token for testing."""
    from app.auth.utils import create_access_token
    return create_access_token(data={"sub": "1"})

@pytest.fixture
def auth_headers(valid_jwt_token):
    """Create authorization headers with valid token."""
    return {"Authorization": f"Bearer {valid_jwt_token}"}

@pytest.fixture
def websocket_messages():
    """Sample WebSocket messages for testing."""
    return {
        "ping": {"type": "ping", "timestamp": 1640995200.0},
        "proof_submission": {
            "type": "proof_submission",
            "user_id": 1,
            "game_id": 1,
            "data": {
                "proof": {
                    "premises": ["P", "P → Q"],
                    "conclusion": "Q",
                    "steps": [
                        {"line": 1, "formula": "P", "rule": "Premise"},
                        {"line": 2, "formula": "P → Q", "rule": "Premise"},
                        {"line": 3, "formula": "Q", "rule": "MP", "deps": [1, 2]}
                    ]
                }
            }
        },
        "time_update": {
            "type": "time_update",
            "user_id": 1,
            "game_id": 1,
            "data": {"time_left": 150}
        },
        "chat_message": {
            "type": "chat_message",
            "user_id": 1,
            "game_id": 1,
            "data": {"message": "Good luck!"}
        },
        "surrender": {
            "type": "surrender",
            "user_id": 1,
            "game_id": 1
        }
    }

# Utility functions for tests
def assert_message_published(mock_redis, channel, expected_data=None):
    """Assert that a message was published to Redis."""
    mock_redis.publish.assert_called()
    calls = mock_redis.publish.call_args_list
    
    # Check if any call matches the channel
    for call in calls:
        args, kwargs = call
        if args[0] == channel:
            if expected_data:
                published_data = json.loads(args[1])
                for key, value in expected_data.items():
                    assert published_data.get(key) == value
            return True
    
    raise AssertionError(f"No message published to channel '{channel}'")

def create_mock_redis_message(channel, data):
    """Create a mock Redis message."""
    return {
        "type": "message",
        "channel": channel,
        "data": json.dumps(data)
    }