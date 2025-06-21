import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_client():
    """Create a test client for the match service."""
    with TestClient(app) as client:
        yield client

@pytest.fixture
async def mock_redis():
    """Create a mock Redis client for match service."""
    mock_redis = AsyncMock()
    mock_redis.from_url = AsyncMock(return_value=mock_redis)
    mock_redis.publish = AsyncMock()
    mock_redis.subscribe = AsyncMock()
    mock_redis.hset = AsyncMock()
    mock_redis.hget = AsyncMock()
    mock_redis.hgetall = AsyncMock(return_value={})
    mock_redis.hdel = AsyncMock()
    mock_redis.hlen = AsyncMock(return_value=0)
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
def sample_queue_entry():
    """Sample queue entry for testing."""
    return {
        "user_id": 1,
        "handle": "testuser",
        "rating": 1000,
        "difficulty": None,
        "timestamp": 1640995200.0
    }

@pytest.fixture
def sample_match_data():
    """Sample match data for testing."""
    return {
        "player_a": "1",
        "player_b": "2",
        "player_a_handle": "player1",
        "player_b_handle": "player2",
        "status": "active",
        "created_at": "1640995200.0"
    }

@pytest.fixture
def game_events():
    """Sample game events for testing."""
    return {
        "proof_submitted": {
            "type": "proof_submitted",
            "game_id": 123,
            "user_id": 1,
            "proof": {
                "premises": ["P", "P → Q"],
                "conclusion": "Q",
                "steps": []
            },
            "timestamp": 1640995200.0
        },
        "player_surrendered": {
            "type": "player_surrendered",
            "game_id": 123,
            "user_id": 1,
            "timestamp": 1640995200.0
        },
        "round_timeout": {
            "type": "round_timeout",
            "game_id": 123,
            "timestamp": 1640995200.0
        }
    }

@pytest.fixture
def proof_checker_result():
    """Sample proof checker result for testing."""
    return {
        "game_id": 123,
        "user_id": 1,
        "is_valid": True,
        "proof_steps": 3,
        "processing_time": 0.5,
        "timestamp": 1640995200.0
    }

def create_mock_redis_message(channel, data):
    """Create a mock Redis message."""
    return {
        "type": "message",
        "channel": channel,
        "data": json.dumps(data)
    }