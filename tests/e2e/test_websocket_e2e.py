"""
End-to-end tests for WebSocket functionality across the entire LogicArena system.
These tests verify the complete flow from frontend to backend services.
"""

import pytest
import asyncio
import json
import time
import websockets
import httpx
from unittest.mock import patch
import docker


class TestWebSocketE2E:
    """End-to-end tests for WebSocket functionality."""
    
    @pytest.fixture(scope="class")
    def docker_services(self):
        """Start required Docker services for e2e tests."""
        client = docker.from_env()
        
        # Start test services
        try:
            # Start Redis
            redis_container = client.containers.run(
                "redis:7-alpine",
                ports={"6379/tcp": 6379},
                detach=True,
                remove=True,
                name="test_redis"
            )
            
            # Start PostgreSQL  
            postgres_container = client.containers.run(
                "postgres:15",
                environment={
                    "POSTGRES_DB": "logicarena_test",
                    "POSTGRES_USER": "testuser",
                    "POSTGRES_PASSWORD": "testpass"
                },
                ports={"5432/tcp": 5433},
                detach=True,
                remove=True,
                name="test_postgres"
            )
            
            # Wait for services to be ready
            time.sleep(5)
            
            yield {
                "redis": redis_container,
                "postgres": postgres_container
            }
            
        finally:
            # Cleanup
            for container_name in ["test_redis", "test_postgres"]:
                try:
                    container = client.containers.get(container_name)
                    container.stop()
                except:
                    pass

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_complete_duel_flow(self, docker_services):
        """Test complete duel flow from matchmaking to game completion."""
        
        # Step 1: Create two users
        async with httpx.AsyncClient() as client:
            # Register first user
            user1_response = await client.post("http://localhost:8000/api/auth/register", json={
                "handle": "player1",
                "email": "player1@test.com",
                "password": "testpass123"
            })
            assert user1_response.status_code == 200
            user1_data = user1_response.json()
            user1_token = user1_data["access_token"]
            
            # Register second user
            user2_response = await client.post("http://localhost:8000/api/auth/register", json={
                "handle": "player2", 
                "email": "player2@test.com",
                "password": "testpass123"
            })
            assert user2_response.status_code == 200
            user2_data = user2_response.json()
            user2_token = user2_data["access_token"]

        # Step 2: Connect to notification WebSockets
        user1_notifications = []
        user2_notifications = []
        
        async def user1_notification_handler():
            uri = f"ws://localhost:8000/ws/notifications/1?token={user1_token}"
            async with websockets.connect(uri) as websocket:
                async for message in websocket:
                    data = json.loads(message)
                    user1_notifications.append(data)
                    if data.get("type") == "match_found":
                        break

        async def user2_notification_handler():
            uri = f"ws://localhost:8000/ws/notifications/2?token={user2_token}"
            async with websockets.connect(uri) as websocket:
                async for message in websocket:
                    data = json.loads(message)
                    user2_notifications.append(data)
                    if data.get("type") == "match_found":
                        break

        # Start notification listeners
        user1_task = asyncio.create_task(user1_notification_handler())
        user2_task = asyncio.create_task(user2_notification_handler())

        # Step 3: Join matchmaking queue
        async with httpx.AsyncClient() as client:
            # User 1 joins queue
            queue1_response = await client.post("http://localhost:8003/queue/join", json={
                "user_id": 1,
                "handle": "player1",
                "rating": 1000,
                "difficulty": 2
            })
            assert queue1_response.status_code == 200
            
            # User 2 joins queue
            queue2_response = await client.post("http://localhost:8003/queue/join", json={
                "user_id": 2,
                "handle": "player2", 
                "rating": 1000,
                "difficulty": 2
            })
            assert queue2_response.status_code == 200

        # Step 4: Wait for match notification
        await asyncio.wait_for(
            asyncio.gather(user1_task, user2_task),
            timeout=30.0  # Wait up to 30 seconds for match
        )

        # Verify match found notifications
        assert len(user1_notifications) > 0
        assert len(user2_notifications) > 0
        
        match_notification_1 = next(
            (n for n in user1_notifications if n.get("type") == "match_found"), 
            None
        )
        assert match_notification_1 is not None
        game_id = match_notification_1["game_id"]

        # Step 5: Connect to game WebSocket
        game_messages = []
        
        async def game_websocket_handler(user_id, token):
            uri = f"ws://localhost:8000/ws/duel/{game_id}?token={token}"
            async with websockets.connect(uri) as websocket:
                # Send a proof submission
                if user_id == 1:
                    proof_submission = {
                        "type": "proof_submission",
                        "user_id": user_id,
                        "game_id": game_id,
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
                    }
                    await websocket.send(json.dumps(proof_submission))
                
                # Listen for game events
                async for message in websocket:
                    data = json.loads(message)
                    game_messages.append(data)
                    if data.get("type") == "game_complete":
                        break

        # Start game WebSocket connections
        game_task1 = asyncio.create_task(game_websocket_handler(1, user1_token))
        game_task2 = asyncio.create_task(game_websocket_handler(2, user2_token))

        # Wait for game completion
        await asyncio.wait_for(
            asyncio.gather(game_task1, game_task2),
            timeout=60.0
        )

        # Step 6: Verify game completion
        game_complete_messages = [
            msg for msg in game_messages 
            if msg.get("type") == "game_complete"
        ]
        assert len(game_complete_messages) > 0

        # Step 7: Verify rating updates were sent
        # This would involve checking the notification WebSockets for rating updates

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_connection_resilience(self, docker_services):
        """Test WebSocket connection resilience and reconnection."""
        
        # Create a user and get token
        async with httpx.AsyncClient() as client:
            user_response = await client.post("http://localhost:8000/api/auth/register", json={
                "handle": "resilience_test",
                "email": "resilience@test.com", 
                "password": "testpass123"
            })
            token = user_response.json()["access_token"]

        # Test connection and forced disconnection
        uri = f"ws://localhost:8000/ws/notifications/1?token={token}"
        
        # First connection
        async with websockets.connect(uri) as websocket:
            # Send a ping
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Receive pong
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "pong"

        # Simulate network interruption and reconnection
        # This would be tested by the frontend WebSocket hooks

    @pytest.mark.asyncio
    @pytest.mark.e2e 
    async def test_websocket_authentication_security(self, docker_services):
        """Test WebSocket authentication and security measures."""
        
        # Test connection without token
        uri = "ws://localhost:8000/ws/notifications/1"
        with pytest.raises(websockets.exceptions.ConnectionClosedError):
            async with websockets.connect(uri) as websocket:
                await websocket.recv()

        # Test connection with invalid token
        uri = "ws://localhost:8000/ws/notifications/1?token=invalid_token"
        with pytest.raises(websockets.exceptions.ConnectionClosedError):
            async with websockets.connect(uri) as websocket:
                await websocket.recv()

        # Test connection with valid token
        async with httpx.AsyncClient() as client:
            user_response = await client.post("http://localhost:8000/api/auth/register", json={
                "handle": "security_test",
                "email": "security@test.com",
                "password": "testpass123"
            })
            token = user_response.json()["access_token"]

        uri = f"ws://localhost:8000/ws/notifications/1?token={token}"
        async with websockets.connect(uri) as websocket:
            # Should connect successfully
            await websocket.send(json.dumps({"type": "ping"}))
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "pong"

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_message_validation(self, docker_services):
        """Test WebSocket message validation and error handling."""
        
        # Create user and connect
        async with httpx.AsyncClient() as client:
            user_response = await client.post("http://localhost:8000/api/auth/register", json={
                "handle": "validation_test",
                "email": "validation@test.com",
                "password": "testpass123"
            })
            token = user_response.json()["access_token"]

        uri = f"ws://localhost:8000/ws/notifications/1?token={token}"
        async with websockets.connect(uri) as websocket:
            # Send invalid message (missing type)
            await websocket.send(json.dumps({"user_id": 1, "data": {}}))
            
            # Should receive error response
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "error"
            assert "Invalid message format" in data["error"]

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_performance_under_load(self, docker_services):
        """Test WebSocket performance under load with multiple connections."""
        
        # Create multiple users
        users = []
        async with httpx.AsyncClient() as client:
            for i in range(10):
                user_response = await client.post("http://localhost:8000/api/auth/register", json={
                    "handle": f"load_test_user_{i}",
                    "email": f"loadtest{i}@test.com",
                    "password": "testpass123"
                })
                users.append(user_response.json())

        # Connect all users simultaneously
        async def connect_user(user_data):
            token = user_data["access_token"]
            user_id = user_data["user"]["id"]
            uri = f"ws://localhost:8000/ws/notifications/{user_id}?token={token}"
            
            async with websockets.connect(uri) as websocket:
                # Send multiple messages
                for i in range(10):
                    await websocket.send(json.dumps({
                        "type": "ping",
                        "timestamp": time.time()
                    }))
                    
                    response = await websocket.recv()
                    data = json.loads(response)
                    assert data["type"] == "pong"

        # Run all connections concurrently
        start_time = time.time()
        await asyncio.gather(*[connect_user(user) for user in users])
        end_time = time.time()
        
        # Verify reasonable performance (should complete within 30 seconds)
        assert end_time - start_time < 30

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_cross_service_websocket_integration(self, docker_services):
        """Test WebSocket integration across all services."""
        
        # This test would verify:
        # 1. Match service publishes events to Redis
        # 2. Gateway WebSocket manager receives and broadcasts them
        # 3. Frontend receives the messages correctly
        # 4. Proof checker results flow back through the system
        
        # For now, this is a placeholder for a comprehensive integration test
        # that would test the entire event flow
        pass


class TestWebSocketErrorScenarios:
    """Test error scenarios and edge cases for WebSocket functionality."""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_service_unavailable(self):
        """Test WebSocket behavior when backend services are unavailable."""
        
        # Try to connect when gateway is down
        with pytest.raises(Exception):  # Connection error
            async with websockets.connect("ws://localhost:8000/ws/notifications/1") as ws:
                pass

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_redis_failure_recovery(self, docker_services):
        """Test WebSocket behavior when Redis fails and recovers."""
        
        # This would test the system's ability to handle Redis failures
        # and recover gracefully
        pass

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_websocket_database_failure_recovery(self, docker_services):
        """Test WebSocket behavior during database outages."""
        
        # This would test authentication and user data retrieval
        # during database issues
        pass


# Test fixtures and utilities
@pytest.fixture
def test_users():
    """Create test users for e2e testing."""
    return [
        {
            "handle": "e2e_user_1",
            "email": "e2e1@test.com",
            "password": "testpass123"
        },
        {
            "handle": "e2e_user_2", 
            "email": "e2e2@test.com",
            "password": "testpass123"
        }
    ]

@pytest.fixture
def sample_proof():
    """Sample proof for testing proof submission."""
    return {
        "premises": ["P", "P → Q", "Q → R"],
        "conclusion": "R",
        "steps": [
            {"line": 1, "formula": "P", "rule": "Premise"},
            {"line": 2, "formula": "P → Q", "rule": "Premise"},
            {"line": 3, "formula": "Q → R", "rule": "Premise"},
            {"line": 4, "formula": "Q", "rule": "MP", "deps": [1, 2]},
            {"line": 5, "formula": "R", "rule": "MP", "deps": [4, 3]}
        ]
    }


if __name__ == "__main__":
    # Run specific e2e tests
    pytest.main([__file__, "-v", "-m", "e2e"])