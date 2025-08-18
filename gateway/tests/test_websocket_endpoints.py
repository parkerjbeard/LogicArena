import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import WebSocket, WebSocketDisconnect

from main import app, connection_manager, publish_game_event
from tests.conftest_full import assert_message_published


class MockWebSocket:
    """Mock WebSocket for testing."""
    
    def __init__(self):
        self.accepted = False
        self.closed = False
        self.sent_messages = []
        self.received_messages = []
        self.close_code = None
        self.close_reason = None
    
    async def accept(self):
        self.accepted = True
    
    async def close(self, code=None, reason=None):
        self.closed = True
        self.close_code = code
        self.close_reason = reason
    
    async def send_json(self, data):
        self.sent_messages.append(data)
    
    async def send_text(self, data):
        self.sent_messages.append(data)
    
    async def receive_json(self):
        if not self.received_messages:
            raise WebSocketDisconnect()
        return self.received_messages.pop(0)
    
    async def receive_text(self):
        if not self.received_messages:
            raise WebSocketDisconnect()
        return self.received_messages.pop(0)
    
    def add_received_message(self, message):
        self.received_messages.append(message)


class TestWebSocketEndpoints:
    """Test suite for WebSocket endpoints."""

    @pytest.mark.asyncio
    async def test_duel_websocket_authentication_missing_token(self):
        """Test duel WebSocket rejects connection without token."""
        mock_ws = MockWebSocket()
        
        # Import the endpoint function
        from app.main import websocket_duel_endpoint
        
        # Call without token
        await websocket_duel_endpoint(mock_ws, "123", None, None)
        
        # Should close with authentication error
        assert mock_ws.closed
        assert mock_ws.close_code == 1008
        assert "Missing authentication" in mock_ws.close_reason

    @pytest.mark.asyncio
    async def test_duel_websocket_authentication_invalid_token(self):
        """Test duel WebSocket rejects invalid token."""
        mock_ws = MockWebSocket()
        
        from app.main import websocket_duel_endpoint
        
        # Call with invalid token
        await websocket_duel_endpoint(mock_ws, "123", "invalid_token", None)
        
        # Should close with authentication error
        assert mock_ws.closed
        assert mock_ws.close_code == 1008

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_duel_websocket_successful_connection(self, mock_verify_token, mock_manager):
        """Test successful duel WebSocket connection."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1  # Valid user ID
        mock_manager.connect = AsyncMock()
        mock_manager.handle_client_message = AsyncMock(return_value=None)
        mock_manager.disconnect = AsyncMock()
        
        from app.main import websocket_duel_endpoint
        
        # Add a disconnect message to end the loop
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_duel_endpoint(mock_ws, "123", "valid_token", None)
        except WebSocketDisconnect:
            pass
        
        # Should connect successfully
        assert mock_ws.accepted
        mock_manager.connect.assert_called_once_with(mock_ws, "123", 1)

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    @patch('app.main.publish_game_event')
    async def test_duel_websocket_proof_submission(self, mock_publish, mock_verify_token, mock_manager):
        """Test proof submission through duel WebSocket."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        
        # Mock message handling to return proof submission
        from app.websocket.manager import WSMessage
        proof_message = WSMessage(
            type="proof_submission",
            user_id=1,
            game_id=123,
            data={"proof": {"premises": ["P"], "conclusion": "P"}}
        )
        mock_manager.handle_client_message = AsyncMock(return_value=proof_message)
        
        from app.main import websocket_duel_endpoint
        
        # Add proof submission message
        mock_ws.add_received_message({
            "type": "proof_submission",
            "data": {"proof": {"premises": ["P"], "conclusion": "P"}}
        })
        mock_ws.add_received_message({"type": "disconnect"})  # End loop
        
        try:
            await websocket_duel_endpoint(mock_ws, "123", "valid_token", None)
        except WebSocketDisconnect:
            pass
        
        # Should publish proof submission event
        mock_publish.assert_called_with("proof_submitted", {
            "game_id": 123,
            "user_id": 1,
            "proof": {"premises": ["P"], "conclusion": "P"},
            "timestamp": pytest.approx(time.time(), abs=5)
        })

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_duel_websocket_time_update(self, mock_verify_token, mock_manager):
        """Test time update through duel WebSocket."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        mock_manager.broadcast = AsyncMock()
        
        from app.websocket.manager import WSMessage
        time_message = WSMessage(
            type="time_update",
            user_id=1,
            game_id=123,
            data={"time_left": 150}
        )
        mock_manager.handle_client_message = AsyncMock(return_value=time_message)
        
        from app.main import websocket_duel_endpoint
        
        mock_ws.add_received_message({
            "type": "time_update",
            "data": {"time_left": 150}
        })
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_duel_endpoint(mock_ws, "123", "valid_token", None)
        except WebSocketDisconnect:
            pass
        
        # Should broadcast time update to other players
        mock_manager.broadcast.assert_called()
        call_args = mock_manager.broadcast.call_args
        assert call_args[0][0] == "123"  # game_id
        assert call_args[0][1]["type"] == "time_update"
        assert call_args[1]["exclude_user"] == 1  # Exclude sender

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_duel_websocket_chat_message(self, mock_verify_token, mock_manager):
        """Test chat message through duel WebSocket."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        mock_manager.broadcast = AsyncMock()
        
        from app.websocket.manager import WSMessage
        chat_message = WSMessage(
            type="chat_message",
            user_id=1,
            game_id=123,
            data={"message": "Good luck!"}
        )
        mock_manager.handle_client_message = AsyncMock(return_value=chat_message)
        
        from app.main import websocket_duel_endpoint
        
        mock_ws.add_received_message({
            "type": "chat_message",
            "data": {"message": "Good luck!"}
        })
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_duel_endpoint(mock_ws, "123", "valid_token", None)
        except WebSocketDisconnect:
            pass
        
        # Should broadcast chat message to all players
        mock_manager.broadcast.assert_called()
        call_args = mock_manager.broadcast.call_args
        assert call_args[0][1]["type"] == "chat_message"
        assert call_args[0][1]["message"] == "Good luck!"

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    @patch('app.main.publish_game_event')
    async def test_duel_websocket_surrender(self, mock_publish, mock_verify_token, mock_manager):
        """Test surrender through duel WebSocket."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect = AsyncMock()
        mock_manager.disconnect = AsyncMock()
        
        from app.websocket.manager import WSMessage
        surrender_message = WSMessage(
            type="surrender",
            user_id=1,
            game_id=123
        )
        mock_manager.handle_client_message = AsyncMock(return_value=surrender_message)
        
        from app.main import websocket_duel_endpoint
        
        mock_ws.add_received_message({"type": "surrender"})
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_duel_endpoint(mock_ws, "123", "valid_token", None)
        except WebSocketDisconnect:
            pass
        
        # Should publish surrender event
        mock_publish.assert_called_with("player_surrendered", {
            "game_id": 123,
            "user_id": 1,
            "timestamp": pytest.approx(time.time(), abs=5)
        })

    @pytest.mark.asyncio
    async def test_notifications_websocket_authentication(self):
        """Test notifications WebSocket authentication."""
        mock_ws = MockWebSocket()
        
        from app.main import websocket_notifications_endpoint
        
        # Test missing token
        await websocket_notifications_endpoint(mock_ws, "1", None)
        assert mock_ws.closed
        assert mock_ws.close_code == 1008

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_notifications_websocket_user_mismatch(self, mock_verify_token, mock_manager):
        """Test notifications WebSocket rejects mismatched user ID."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 2  # Different user ID
        
        from app.main import websocket_notifications_endpoint
        
        await websocket_notifications_endpoint(mock_ws, "1", "valid_token")
        
        # Should close due to user ID mismatch
        assert mock_ws.closed
        assert mock_ws.close_code == 1008

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_notifications_websocket_successful_connection(self, mock_verify_token, mock_manager):
        """Test successful notifications WebSocket connection."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect_user = AsyncMock()
        mock_manager.disconnect_user = AsyncMock()
        mock_manager.handle_client_message = AsyncMock(return_value=None)
        
        from app.main import websocket_notifications_endpoint
        
        mock_ws.add_received_message({"type": "ping"})
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_notifications_endpoint(mock_ws, "1", "valid_token")
        except WebSocketDisconnect:
            pass
        
        # Should connect successfully
        mock_manager.connect_user.assert_called_once_with(mock_ws, "1")

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    @patch('app.auth.utils.verify_token')
    async def test_notifications_websocket_mark_read(self, mock_verify_token, mock_manager):
        """Test marking notifications as read."""
        mock_ws = MockWebSocket()
        mock_verify_token.return_value = 1
        mock_manager.connect_user = AsyncMock()
        mock_manager.disconnect_user = AsyncMock()
        
        from app.websocket.manager import WSMessage
        mark_read_message = WSMessage(
            type="mark_read",
            user_id=1,
            data={"notification_ids": [1, 2, 3]}
        )
        mock_manager.handle_client_message = AsyncMock(return_value=mark_read_message)
        
        from app.main import websocket_notifications_endpoint
        
        mock_ws.add_received_message({
            "type": "mark_read",
            "data": {"notification_ids": [1, 2, 3]}
        })
        mock_ws.add_received_message({"type": "disconnect"})
        
        try:
            await websocket_notifications_endpoint(mock_ws, "1", "valid_token")
        except WebSocketDisconnect:
            pass
        
        # Should handle mark_read message
        mock_manager.handle_client_message.assert_called()

    @pytest.mark.asyncio
    @patch('app.main.connection_manager')
    async def test_publish_game_event(self, mock_manager):
        """Test publishing game events to Redis."""
        mock_redis = AsyncMock()
        mock_manager.redis_client = mock_redis
        
        # Test publishing an event
        await publish_game_event("test_event", {
            "game_id": 123,
            "user_id": 1,
            "data": "test"
        })
        
        # Should publish to Redis
        mock_redis.publish.assert_called_once()
        call_args = mock_redis.publish.call_args
        assert call_args[0][0] == "game_events"
        
        # Parse the published message
        published_data = json.loads(call_args[0][1])
        assert published_data["type"] == "test_event"
        assert published_data["game_id"] == 123
        assert "timestamp" in published_data

    @pytest.mark.asyncio
    async def test_publish_game_event_no_redis(self):
        """Test publishing game event when Redis is not available."""
        # Temporarily set connection_manager.redis_client to None
        original_client = connection_manager.redis_client
        connection_manager.redis_client = None
        
        try:
            # Should not raise an exception
            await publish_game_event("test_event", {"data": "test"})
        finally:
            # Restore original client
            connection_manager.redis_client = original_client

    def test_websocket_online_users_endpoint(self, test_client):
        """Test the online users API endpoint."""
        with patch.object(connection_manager, 'get_online_users') as mock_get_users:
            mock_get_users.return_value = [1, 2, 3]
            
            response = test_client.get("/api/websocket/online-users")
            
            assert response.status_code == 200
            data = response.json()
            assert data["online_users"] == [1, 2, 3]
            assert data["count"] == 3

    def test_websocket_game_users_endpoint(self, test_client):
        """Test the game users API endpoint."""
        with patch.object(connection_manager, 'get_room_users') as mock_get_users:
            mock_get_users.return_value = [1, 2]
            
            response = test_client.get("/api/websocket/game/123/users")
            
            assert response.status_code == 200
            data = response.json()
            assert data["game_id"] == "123"
            assert data["users"] == [1, 2]
            assert data["count"] == 2

    def test_websocket_endpoints_error_handling(self, test_client):
        """Test error handling in WebSocket API endpoints."""
        with patch.object(connection_manager, 'get_online_users') as mock_get_users:
            mock_get_users.side_effect = Exception("Redis error")
            
            response = test_client.get("/api/websocket/online-users")
            
            assert response.status_code == 200
            data = response.json()
            assert "error" in data


# Additional test for WebSocket client integration
class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""

    @pytest.mark.asyncio
    async def test_full_duel_flow(self, mock_redis):
        """Test a complete duel flow through WebSocket."""
        # This would be a more comprehensive integration test
        # involving multiple WebSocket connections, message flow, etc.
        pass

    @pytest.mark.asyncio
    async def test_notification_flow(self, mock_redis):
        """Test notification flow through WebSocket."""
        # Test match found notifications, rating updates, etc.
        pass