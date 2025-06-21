# LogicArena WebSocket Testing Documentation

This document describes the comprehensive testing strategy for LogicArena's WebSocket implementation.

## Overview

The WebSocket testing suite covers all aspects of real-time communication in LogicArena:

- **Connection Management**: User connections, authentication, and session handling
- **Message Validation**: Input validation and error handling
- **Game Events**: Real-time duel updates and proof submissions
- **Notifications**: Match found, rating updates, and system announcements
- **Integration**: Cross-service communication via Redis pub/sub
- **Performance**: Load testing and connection resilience

## Test Architecture

### Backend Tests (Python/FastAPI)

#### Gateway WebSocket Tests
- **Location**: `gateway/tests/`
- **Framework**: pytest, pytest-asyncio
- **Components Tested**:
  - Connection Manager (`test_websocket_manager.py`)
  - WebSocket Endpoints (`test_websocket_endpoints.py`)
  - Integration Flows (`test_websocket_integration.py`)

#### Match Service Tests
- **Location**: `match/tests/`
- **Framework**: pytest, pytest-asyncio
- **Components Tested**:
  - Event Processing
  - Queue Management
  - Redis Integration
  - HTTP Client Mocking

### Frontend Tests (TypeScript/React)

#### WebSocket Hook Tests
- **Location**: `front/src/lib/__tests__/`
- **Framework**: Jest, React Testing Library
- **Components Tested**:
  - `useDuelWebSocket` hook
  - `useNotificationsWebSocket` hook
  - Message handling
  - Reconnection logic

### End-to-End Tests

#### Full System Integration
- **Location**: `tests/e2e/`
- **Framework**: pytest, websockets, docker
- **Scenarios Tested**:
  - Complete duel flow
  - Matchmaking to game start
  - Connection resilience
  - Security and authentication

## Running Tests

### Quick Start

```bash
# Run all WebSocket tests
./scripts/run_tests.sh

# Unit tests only
./scripts/run_tests.sh --unit-only

# With coverage
./scripts/run_tests.sh --coverage

# Include e2e tests (requires Docker)
./scripts/run_tests.sh --with-e2e
```

### Individual Test Suites

#### Backend Tests

```bash
# Gateway tests
cd gateway
pytest tests/ -v

# Match service tests  
cd match
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

#### Frontend Tests

```bash
cd front
npm test

# With coverage
npm test -- --coverage --watchAll=false
```

#### E2E Tests

```bash
# Start services first
docker-compose -f docker-compose.dev.yml up -d

# Run e2e tests
cd tests/e2e
pytest test_websocket_e2e.py -v -m "e2e"
```

## Test Categories

### Unit Tests

Test individual components in isolation with mocked dependencies.

**Gateway Unit Tests:**
- Connection manager functionality
- Message validation
- Event handling
- Redis client mocking

**Match Service Unit Tests:**
- Queue processing logic
- Event routing
- HTTP client mocking
- Data model validation

**Frontend Unit Tests:**
- WebSocket hook behavior
- Message handling
- State management
- Error scenarios

### Integration Tests

Test interactions between components within a service.

**Backend Integration Tests:**
- WebSocket endpoint authentication
- Redis pub/sub integration
- Database interactions
- Cross-service HTTP calls

**Frontend Integration Tests:**
- Component interaction with WebSocket hooks
- State synchronization
- Error propagation

### End-to-End Tests

Test complete user flows across the entire system.

**E2E Test Scenarios:**
- User registration → matchmaking → duel completion
- WebSocket connection resilience
- Real-time message delivery
- Authentication and security
- Performance under load

## Test Data and Fixtures

### Shared Fixtures

#### Backend (`conftest.py`)
```python
@pytest.fixture
async def mock_redis():
    """Mock Redis client with pub/sub support"""

@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection"""

@pytest.fixture
def sample_user():
    """Sample user data for testing"""

@pytest.fixture
def websocket_messages():
    """Sample WebSocket messages"""
```

#### Frontend (`jest.setup.js`)
```javascript
// Mock WebSocket API
global.WebSocket = MockWebSocket;

// Mock localStorage
global.localStorage = mockLocalStorage;

// Mock Notification API
global.Notification = mockNotification;
```

### Test Data Patterns

**Game Events:**
```python
{
    "type": "round_complete",
    "game_id": 123,
    "round_winner": 1,
    "game_winner": 1,
    "timestamp": 1640995200.0
}
```

**Proof Submissions:**
```python
{
    "type": "proof_submission",
    "user_id": 1,
    "game_id": 123,
    "data": {
        "proof": {
            "premises": ["P", "P → Q"],
            "conclusion": "Q",
            "steps": [...]
        }
    }
}
```

## Mocking Strategy

### Redis Mocking

Uses `fakeredis` and `AsyncMock` for Redis operations:

```python
@pytest.fixture
async def mock_redis():
    mock_redis = AsyncMock()
    mock_redis.publish = AsyncMock()
    mock_redis.subscribe = AsyncMock()
    # ... other Redis methods
    return mock_redis
```

### WebSocket Mocking

#### Backend
```python
class MockWebSocket:
    async def accept(self): pass
    async def send_json(self, data): pass
    async def receive_json(self): pass
    async def close(self, code=None, reason=None): pass
```

#### Frontend
```javascript
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = WebSocket.CONNECTING;
        setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.onopen?.(new Event('open'));
        }, 0);
    }
    
    send(data) { /* mock implementation */ }
    close(code, reason) { /* mock implementation */ }
}
```

### HTTP Client Mocking

Uses `httpx.AsyncClient` mocking for service-to-service calls:

```python
@patch('httpx.AsyncClient')
async def test_proof_forwarding(mock_client):
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"is_valid": True}
    mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
```

## Performance Testing

### Load Testing

Tests system behavior under high load:

```python
async def test_concurrent_connections():
    """Test 100+ concurrent WebSocket connections"""
    connections = []
    for i in range(100):
        ws = await connect_websocket(f"user_{i}")
        connections.append(ws)
    
    # Verify all connections work
    for ws in connections:
        await ws.send({"type": "ping"})
        response = await ws.recv()
        assert response["type"] == "pong"
```

### Memory Testing

Monitors memory usage during tests:

```python
def test_memory_leaks():
    """Ensure no memory leaks in connection management"""
    import psutil
    import gc
    
    initial_memory = psutil.Process().memory_info().rss
    
    # Create and destroy many connections
    for _ in range(1000):
        # ... connection lifecycle
        pass
    
    gc.collect()
    final_memory = psutil.Process().memory_info().rss
    
    # Memory should not grow significantly
    assert final_memory - initial_memory < 50 * 1024 * 1024  # 50MB
```

## Continuous Integration

### GitHub Actions Workflow

The CI pipeline runs all test types:

1. **Backend Tests**: Unit and integration tests for all services
2. **Frontend Tests**: Jest tests with coverage
3. **E2E Tests**: Full system tests (on main branch only)
4. **Test Summary**: Aggregate results and coverage

### Test Environment

CI uses Docker services:
- Redis 7-alpine
- PostgreSQL 15
- Node.js 18.x/20.x
- Python 3.11

### Coverage Requirements

- **Backend**: 80% line coverage minimum
- **Frontend**: 70% line coverage minimum
- **Critical paths**: 95% coverage required

## Debugging Tests

### Backend Debugging

```bash
# Run specific test with verbose output
pytest tests/test_websocket_manager.py::TestConnectionManager::test_game_connection -v -s

# Run with debugger
pytest tests/test_websocket_manager.py -v -s --pdb

# Run with coverage and HTML report
pytest tests/ --cov=app --cov-report=html
```

### Frontend Debugging

```bash
# Run specific test file
npm test -- websocket.test.tsx

# Run with debugger
npm test -- --runInBand --no-cache websocket.test.tsx

# Update snapshots
npm test -- --updateSnapshot
```

### E2E Debugging

```bash
# Run with service logs
docker-compose -f docker-compose.dev.yml up -d
docker-compose logs -f

# Run single e2e test
pytest tests/e2e/test_websocket_e2e.py::TestWebSocketE2E::test_complete_duel_flow -v -s
```

## Test Maintenance

### Adding New Tests

1. **Identify Test Type**: Unit, integration, or e2e
2. **Create Test File**: Follow naming convention `test_*.py` or `*.test.tsx`
3. **Use Appropriate Fixtures**: Reuse existing fixtures when possible
4. **Mock Dependencies**: Mock external services and I/O
5. **Assert Behavior**: Test both happy path and error cases
6. **Update Documentation**: Document new test scenarios

### Test Data Management

- **Keep Tests Independent**: Each test should be able to run in isolation
- **Use Factories**: Create test data using factory patterns
- **Clean Up**: Ensure tests clean up after themselves
- **Avoid Flaky Tests**: Use deterministic test data and proper waits

### Performance Considerations

- **Fast Feedback**: Unit tests should run in < 5 seconds
- **Parallel Execution**: Tests should be parallelizable
- **Resource Cleanup**: Properly close connections and clean up resources
- **Timeout Handling**: Set appropriate timeouts for async operations

## Troubleshooting

### Common Issues

**WebSocket Connection Failures:**
- Check authentication token validity
- Verify service is running and accessible
- Check firewall/network settings

**Test Timeouts:**
- Increase timeout values for slow operations
- Check for deadlocks in async code
- Verify proper cleanup of resources

**Flaky Tests:**
- Add proper waits for async operations
- Use deterministic test data
- Avoid time-dependent assertions

**Memory Issues:**
- Ensure proper cleanup of WebSocket connections
- Check for circular references
- Monitor memory usage during tests

### Getting Help

- Check test logs for detailed error messages
- Review the test documentation and examples
- Use debugging tools and breakpoints
- Run tests in isolation to identify issues
- Check CI logs for environment-specific problems