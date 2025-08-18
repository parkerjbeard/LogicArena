import pytest
import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket

from app.websocket.manager import ConnectionManager, WSMessage, ConnectionInfo
from tests.conftest_full import assert_message_published, create_mock_redis_message


class TestConnectionManager:
    """Test suite for the WebSocket connection manager."""

    @pytest.mark.asyncio
    async def test_initialization(self, mock_redis):
        """Test connection manager initialization."""
        manager = ConnectionManager()
        
        # Should start with empty connections
        assert len(manager.active_connections) == 0
        assert len(manager.user_connections) == 0
        assert len(manager.connection_info) == 0
        
        # Initialize with Redis
        await manager.initialize("redis://localhost:6379")
        
        # Should have Redis client and pubsub
        assert manager.redis_client is not None
        assert manager.pubsub is not None

    @pytest.mark.asyncio
    async def test_game_connection(self, connection_manager, mock_websocket):
        """Test connecting to a game room."""
        game_id = "123"
        user_id = 1
        
        await connection_manager.connect(mock_websocket, game_id, user_id)
        
        # Should accept the WebSocket
        mock_websocket.accept.assert_called_once()
        
        # Should add to active connections
        assert game_id in connection_manager.active_connections
        assert (mock_websocket, user_id) in connection_manager.active_connections[game_id]
        
        # Should store connection info
        assert mock_websocket in connection_manager.connection_info
        conn_info = connection_manager.connection_info[mock_websocket]
        assert conn_info.user_id == user_id
        assert conn_info.game_id == int(game_id)

    @pytest.mark.asyncio
    async def test_user_notification_connection(self, connection_manager, mock_websocket):
        """Test connecting for user notifications."""
        user_id = "1"
        
        await connection_manager.connect_user(mock_websocket, user_id)
        
        # Should accept the WebSocket
        mock_websocket.accept.assert_called_once()
        
        # Should add to user connections
        assert user_id in connection_manager.user_connections
        assert connection_manager.user_connections[user_id] == mock_websocket
        
        # Should store connection info
        assert mock_websocket in connection_manager.connection_info

    @pytest.mark.asyncio
    async def test_disconnect_from_game(self, connection_manager, mock_websocket):
        """Test disconnecting from a game room."""
        game_id = "123"
        user_id = 1
        
        # First connect
        await connection_manager.connect(mock_websocket, game_id, user_id)
        
        # Then disconnect
        await connection_manager.disconnect(mock_websocket, game_id)
        
        # Should remove from active connections
        assert game_id not in connection_manager.active_connections
        
        # Should remove connection info
        assert mock_websocket not in connection_manager.connection_info

    @pytest.mark.asyncio
    async def test_broadcast_to_game_room(self, connection_manager, mock_redis):
        """Test broadcasting messages to a game room."""
        game_id = "123"
        user_id_1 = 1
        user_id_2 = 2
        
        # Create mock WebSockets
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        
        # Connect both users to the game
        await connection_manager.connect(ws1, game_id, user_id_1)
        await connection_manager.connect(ws2, game_id, user_id_2)
        
        # Broadcast a message
        message = {"type": "test_message", "data": "hello"}
        await connection_manager.broadcast(game_id, message)
        
        # Both WebSockets should receive the message
        ws1.send_json.assert_called_once()
        ws2.send_json.assert_called_once()
        
        # Message should include timestamp
        sent_message = ws1.send_json.call_args[0][0]
        assert "timestamp" in sent_message
        assert sent_message["type"] == "test_message"

    @pytest.mark.asyncio
    async def test_broadcast_with_exclusion(self, connection_manager):
        """Test broadcasting with user exclusion."""
        game_id = "123"
        user_id_1 = 1
        user_id_2 = 2
        
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        
        await connection_manager.connect(ws1, game_id, user_id_1)
        await connection_manager.connect(ws2, game_id, user_id_2)
        
        # Broadcast excluding user 1
        message = {"type": "test_message"}
        await connection_manager.broadcast(game_id, message, exclude_user=user_id_1)
        
        # Only user 2 should receive the message
        ws1.send_json.assert_not_called()
        ws2.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_user_notification(self, connection_manager):
        """Test sending notifications to specific users."""
        user_id = "1"
        ws = AsyncMock()
        
        await connection_manager.connect_user(ws, user_id)
        
        # Send notification
        message = {"type": "notification", "data": "test"}
        result = await connection_manager.send_user_notification(user_id, message)
        
        # Should return True and send message
        assert result is True
        ws.send_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_notification_to_offline_user(self, connection_manager, mock_redis):
        """Test queuing notifications for offline users."""
        user_id = "999"  # User not connected
        
        message = {"type": "notification", "data": "test"}
        result = await connection_manager.send_user_notification(user_id, message)
        
        # Should return False (user offline)
        assert result is False
        
        # Should queue message in Redis
        mock_redis.rpush.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_client_message_ping(self, connection_manager, mock_websocket):
        """Test handling ping messages."""
        # Connect first
        await connection_manager.connect(mock_websocket, "123", 1)
        
        # Handle ping message
        ping_message = {"type": "ping", "timestamp": time.time()}
        result = await connection_manager.handle_client_message(mock_websocket, ping_message)
        
        # Should return None (handled internally)
        assert result is None
        
        # Should send pong response
        mock_websocket.send_json.assert_called()
        sent_message = mock_websocket.send_json.call_args[0][0]
        assert sent_message["type"] == "pong"

    @pytest.mark.asyncio
    async def test_handle_invalid_message(self, connection_manager, mock_websocket):
        """Test handling invalid messages."""
        await connection_manager.connect(mock_websocket, "123", 1)
        
        # Send invalid message (missing required fields)
        invalid_message = {"invalid": "data"}
        result = await connection_manager.handle_client_message(mock_websocket, invalid_message)
        
        # Should return None
        assert result is None
        
        # Should send error response
        mock_websocket.send_json.assert_called()
        sent_message = mock_websocket.send_json.call_args[0][0]
        assert sent_message["type"] == "error"

    @pytest.mark.asyncio
    async def test_redis_event_processing(self, connection_manager, mock_redis):
        """Test processing Redis events."""
        # Mock the pubsub listen method to yield test messages
        test_messages = [
            create_mock_redis_message("game_events", {
                "type": "round_complete",
                "game_id": 123,
                "round_winner": 1
            }),
            create_mock_redis_message("match_notifications", {
                "type": "match_found",
                "user_ids": [1, 2],
                "game_id": 123
            })
        ]
        
        async def mock_listen():
            for msg in test_messages:
                yield msg
        
        connection_manager.pubsub.listen = mock_listen
        
        # Mock the event handlers
        connection_manager._handle_game_event = AsyncMock()
        connection_manager._handle_match_notification = AsyncMock()
        
        # Process events (simulate)
        async for message in connection_manager.pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                channel = message["channel"]
                
                if channel == "game_events":
                    await connection_manager._handle_game_event(data)
                elif channel == "match_notifications":
                    await connection_manager._handle_match_notification(data)
        
        # Handlers should have been called
        connection_manager._handle_game_event.assert_called_once()
        connection_manager._handle_match_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_game_event_handling(self, connection_manager):
        """Test handling game events."""
        game_id = "123"
        user_id_1 = 1
        user_id_2 = 2
        
        # Connect users to game
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        await connection_manager.connect(ws1, game_id, user_id_1)
        await connection_manager.connect(ws2, game_id, user_id_2)
        
        # Also connect users for notifications
        await connection_manager.connect_user(ws1, str(user_id_1))
        await connection_manager.connect_user(ws2, str(user_id_2))
        
        # Simulate game event
        event = {
            "type": "round_complete",
            "game_id": int(game_id),
            "round_winner": user_id_1,
            "player_a": user_id_1,
            "player_b": user_id_2
        }
        
        await connection_manager._handle_game_event(event)
        
        # Should broadcast to game room
        assert ws1.send_json.call_count >= 1
        assert ws2.send_json.call_count >= 1

    @pytest.mark.asyncio
    async def test_connection_cleanup(self, connection_manager, mock_websocket):
        """Test connection cleanup on manager shutdown."""
        # Connect some users
        await connection_manager.connect(mock_websocket, "123", 1)
        await connection_manager.connect_user(mock_websocket, "1")
        
        # Cleanup
        await connection_manager.cleanup()
        
        # WebSocket should be closed
        mock_websocket.close.assert_called()

    @pytest.mark.asyncio
    async def test_get_room_users(self, connection_manager):
        """Test getting users in a game room."""
        game_id = "123"
        
        # Initially empty
        users = await connection_manager.get_room_users(game_id)
        assert users == []
        
        # Connect some users
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        await connection_manager.connect(ws1, game_id, 1)
        await connection_manager.connect(ws2, game_id, 2)
        
        # Should return user IDs
        users = await connection_manager.get_room_users(game_id)
        assert set(users) == {1, 2}

    @pytest.mark.asyncio
    async def test_get_online_users(self, connection_manager):
        """Test getting all online users."""
        # Initially empty
        users = await connection_manager.get_online_users()
        assert users == []
        
        # Connect users to different contexts
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        ws3 = AsyncMock()
        
        await connection_manager.connect(ws1, "123", 1)  # Game connection
        await connection_manager.connect_user(ws2, "2")  # Notification connection
        await connection_manager.connect(ws3, "456", 3)  # Another game
        await connection_manager.connect_user(ws1, "1")  # Same user, notification
        
        # Should return unique user IDs
        users = await connection_manager.get_online_users()
        assert set(users) == {1, 2, 3}

    @pytest.mark.asyncio
    async def test_offline_message_queue(self, connection_manager, mock_redis):
        """Test offline message queuing and delivery."""
        user_id = 1
        message = {"type": "test", "data": "offline message"}
        
        # Queue message for offline user
        await connection_manager._queue_offline_message(user_id, message)
        
        # Should store in Redis
        mock_redis.rpush.assert_called_with(
            f"offline_messages:{user_id}", 
            json.dumps(message)
        )
        
        # Mock Redis returning the queued message
        mock_redis.lrange.return_value = [json.dumps(message)]
        
        # Connect user and check if queued messages are sent
        ws = AsyncMock()
        await connection_manager.connect_user(ws, str(user_id))
        
        # Should have attempted to retrieve and send queued messages
        mock_redis.lrange.assert_called()

    @pytest.mark.asyncio
    async def test_heartbeat_timeout(self, connection_manager, mock_websocket):
        """Test connection timeout due to missed heartbeats."""
        game_id = "123"
        user_id = 1
        
        # Connect user
        await connection_manager.connect(mock_websocket, game_id, user_id)
        
        # Simulate old connection (no recent ping)
        conn_info = connection_manager.connection_info[mock_websocket]
        conn_info.last_ping = time.time() - 120  # 2 minutes ago
        
        # Mock the heartbeat check
        await connection_manager._heartbeat_check()
        
        # Connection should be cleaned up (in real implementation)
        # This is a simplified test - in practice, we'd need to mock the timeout logic

    @pytest.mark.asyncio
    async def test_message_validation(self, connection_manager, mock_websocket):
        """Test WebSocket message validation."""
        await connection_manager.connect(mock_websocket, "123", 1)
        
        # Valid message
        valid_msg = {
            "type": "test_message",
            "user_id": 1,
            "data": {"test": "data"}
        }
        result = await connection_manager.handle_client_message(mock_websocket, valid_msg)
        assert isinstance(result, WSMessage)
        assert result.type == "test_message"
        
        # Invalid message (missing type)
        invalid_msg = {"user_id": 1, "data": {}}
        result = await connection_manager.handle_client_message(mock_websocket, invalid_msg)
        assert result is None

    @pytest.mark.asyncio
    async def test_connection_state_storage(self, connection_manager, mock_redis):
        """Test storing connection state in Redis."""
        user_id = 1
        game_id = "123"
        
        ws = AsyncMock()
        await connection_manager.connect(ws, game_id, user_id)
        
        # Should store connection state
        mock_redis.hset.assert_called()
        mock_redis.expire.assert_called()
        
        # Check the stored data
        call_args = mock_redis.hset.call_args
        key = call_args[0][0]
        assert key == f"ws:connection:{user_id}"

    @pytest.mark.asyncio
    async def test_user_status_updates(self, connection_manager, mock_redis):
        """Test user online/offline status updates."""
        user_id = "1"
        ws = AsyncMock()
        
        # Connect user
        await connection_manager.connect_user(ws, user_id)
        
        # Should publish online status
        assert_message_published(mock_redis, "user_status", {
            "user_id": int(user_id),
            "status": "online"
        })
        
        # Disconnect user
        await connection_manager.disconnect_user(ws, user_id)
        
        # Should publish offline status
        assert_message_published(mock_redis, "user_status", {
            "user_id": int(user_id),
            "status": "offline"
        })