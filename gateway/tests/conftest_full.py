import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import text
from unittest.mock import AsyncMock, MagicMock
import json
import os
import tempfile
from datetime import datetime, timezone

from main import app
from app.db.session import get_db
from app.models import Base, User, Puzzle, Game, Round, Submission
from app.websocket.manager import ConnectionManager

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


# Additional comprehensive fixtures
@pytest.fixture
async def sample_users(test_db: AsyncSession):
    """Create sample users for testing."""
    users = []
    for i in range(5):
        user = User(
            handle=f"testuser{i}",
            email=f"test{i}@example.com",
            rating=1000 + (i * 100)
        )
        test_db.add(user)
        users.append(user)
    
    await test_db.commit()
    for user in users:
        await test_db.refresh(user)
    
    return users


@pytest.fixture
async def sample_puzzles(test_db: AsyncSession):
    """Create sample puzzles for testing."""
    puzzles = []
    puzzle_data = [
        {"gamma": "P", "phi": "P", "difficulty": 1, "best_len": 1},
        {"gamma": "P → Q, P", "phi": "Q", "difficulty": 2, "best_len": 3},
        {"gamma": "P → Q, Q → R, P", "phi": "R", "difficulty": 3, "best_len": 5},
        {"gamma": "P ∧ Q", "phi": "P", "difficulty": 1, "best_len": 2},
        {"gamma": "P ∨ Q, ¬P", "phi": "Q", "difficulty": 2, "best_len": 3}
    ]
    
    for data in puzzle_data:
        puzzle = Puzzle(**data)
        test_db.add(puzzle)
        puzzles.append(puzzle)
    
    await test_db.commit()
    for puzzle in puzzles:
        await test_db.refresh(puzzle)
    
    return puzzles


@pytest.fixture
async def sample_game(test_db: AsyncSession, sample_users):
    """Create a sample game for testing."""
    if len(sample_users) < 2:
        raise ValueError("Need at least 2 users to create a game")
    
    game = Game(
        player_a=sample_users[0].id,
        player_b=sample_users[1].id,
        rounds=3
    )
    test_db.add(game)
    await test_db.commit()
    await test_db.refresh(game)
    
    return game


@pytest.fixture
async def sample_rounds(test_db: AsyncSession, sample_game, sample_puzzles):
    """Create sample rounds for testing."""
    rounds = []
    for i in range(3):
        round_obj = Round(
            game_id=sample_game.id,
            puzzle_id=sample_puzzles[i].id,
            round_number=i + 1
        )
        test_db.add(round_obj)
        rounds.append(round_obj)
    
    await test_db.commit()
    for round_obj in rounds:
        await test_db.refresh(round_obj)
    
    return rounds


@pytest.fixture
async def sample_submissions(test_db: AsyncSession, sample_users, sample_puzzles):
    """Create sample submissions for testing."""
    submissions = []
    for i in range(10):
        submission = Submission(
            user_id=sample_users[i % len(sample_users)].id,
            puzzle_id=sample_puzzles[i % len(sample_puzzles)].id,
            payload=f'{{"test": "data{i}"}}',
            verdict=(i % 2 == 0),  # Alternate between True and False
            processing_time=100 + (i * 10)
        )
        test_db.add(submission)
        submissions.append(submission)
    
    await test_db.commit()
    for submission in submissions:
        await test_db.refresh(submission)
    
    return submissions


@pytest.fixture
def mock_proof_checker():
    """Create a mock proof checker response."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "verdict": True,
        "processing_time": 150,
        "error_message": None,
        "counter_model": None,
        "syntax_info": None
    }
    return mock_response


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx client."""
    client = AsyncMock()
    client.post.return_value = AsyncMock(
        status_code=200,
        json=AsyncMock(return_value={
            "verdict": True,
            "processing_time": 150,
            "error_message": None
        })
    )
    return client


@pytest.fixture
async def populated_database(test_db: AsyncSession):
    """Create a fully populated database for comprehensive testing."""
    # Create users
    users = []
    for i in range(20):
        user = User(
            handle=f"user{i}",
            email=f"user{i}@example.com",
            rating=1000 + (i * 25)
        )
        test_db.add(user)
        users.append(user)
    
    # Create puzzles
    puzzles = []
    for difficulty in range(1, 6):
        for i in range(5):
            puzzle = Puzzle(
                gamma=f"P{difficulty}_{i}",
                phi=f"Q{difficulty}_{i}",
                difficulty=difficulty,
                best_len=difficulty + i
            )
            test_db.add(puzzle)
            puzzles.append(puzzle)
    
    await test_db.commit()
    for user in users:
        await test_db.refresh(user)
    for puzzle in puzzles:
        await test_db.refresh(puzzle)
    
    # Create games
    games = []
    for i in range(10):
        game = Game(
            player_a=users[i].id,
            player_b=users[i+1].id,
            rounds=3,
            winner=users[i].id if i % 2 == 0 else users[i+1].id
        )
        test_db.add(game)
        games.append(game)
    
    await test_db.commit()
    for game in games:
        await test_db.refresh(game)
    
    # Create rounds
    rounds = []
    for i, game in enumerate(games):
        for round_num in range(3):
            round_obj = Round(
                game_id=game.id,
                puzzle_id=puzzles[i * 3 + round_num].id,
                round_number=round_num + 1,
                winner=game.winner if round_num < 2 else None
            )
            test_db.add(round_obj)
            rounds.append(round_obj)
    
    await test_db.commit()
    for round_obj in rounds:
        await test_db.refresh(round_obj)
    
    # Create submissions
    submissions = []
    for i in range(50):
        submission = Submission(
            user_id=users[i % len(users)].id,
            puzzle_id=puzzles[i % len(puzzles)].id,
            payload=f'{{"submission": {i}}}',
            verdict=(i % 3 != 0),  # 2/3 success rate
            processing_time=100 + (i * 5)
        )
        test_db.add(submission)
        submissions.append(submission)
    
    await test_db.commit()
    for submission in submissions:
        await test_db.refresh(submission)
    
    return {
        "users": users,
        "puzzles": puzzles,
        "games": games,
        "rounds": rounds,
        "submissions": submissions
    }


@pytest.fixture
def temp_file():
    """Create a temporary file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write("test content")
        temp_filename = f.name
    
    yield temp_filename
    
    # Cleanup
    if os.path.exists(temp_filename):
        os.unlink(temp_filename)


@pytest.fixture
def mock_settings():
    """Create mock settings for testing."""
    class MockSettings:
        DATABASE_URL = "sqlite+aiosqlite:///:memory:"
        REDIS_URL = "redis://localhost:6379/0"
        PROOF_CHECKER_URL = "http://proof-checker:3000"
        DEBUG = True
        ELO_K_FACTOR = 40
        ELO_INITIAL = 1000
        DUEL_TIME_LIMIT = 180
        DUEL_ROUND_COUNT = 3
        DUEL_PENALTY_SECONDS = 15
        RATE_LIMIT_PROOF_SUBMISSIONS = 100
        RATE_LIMIT_ACCOUNT_CREATION = 5
        DB_POOL_SIZE = 20
        DB_MAX_OVERFLOW = 10
        DB_POOL_TIMEOUT = 30
        DB_POOL_RECYCLE = 3600
        DB_POOL_PRE_PING = True
    
    return MockSettings()


@pytest.fixture
def mock_logger():
    """Create a mock logger for testing."""
    logger = MagicMock()
    logger.info = MagicMock()
    logger.warning = MagicMock()
    logger.error = MagicMock()
    logger.debug = MagicMock()
    return logger


@pytest.fixture
async def test_data_cleanup(test_db: AsyncSession):
    """Fixture to clean up test data after each test."""
    yield
    
    # Cleanup all data after test
    await test_db.execute(text("DELETE FROM submission"))
    await test_db.execute(text("DELETE FROM round"))
    await test_db.execute(text("DELETE FROM game"))
    await test_db.execute(text("DELETE FROM puzzle"))
    await test_db.execute(text("DELETE FROM user"))
    await test_db.commit()


@pytest.fixture
def performance_timer():
    """Timer fixture for performance testing."""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        def elapsed(self):
            if self.start_time is None or self.end_time is None:
                return None
            return self.end_time - self.start_time
    
    return Timer()


@pytest.fixture
def mock_game_event():
    """Create a mock game event for testing."""
    return {
        "type": "round_complete",
        "game_id": 123,
        "round_number": 1,
        "winner": 1,
        "timestamp": 1640995200.0
    }


@pytest.fixture
def mock_notification():
    """Create a mock notification for testing."""
    return {
        "type": "notification",
        "user_id": 1,
        "message": "Test notification",
        "timestamp": datetime.now(timezone.utc)
    }


# Test markers
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.performance = pytest.mark.performance
pytest.mark.slow = pytest.mark.slow
pytest.mark.websocket = pytest.mark.websocket