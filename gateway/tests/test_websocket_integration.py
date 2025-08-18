import pytest
import asyncio
import json
import time
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import WebSocket
from fastapi.testclient import TestClient

from main import app, connection_manager
from app.websocket.manager import ConnectionManager
from tests.conftest_full import create_mock_redis_message


class TestWebSocketIntegration:
    """Integration tests for the complete WebSocket system."""

    @pytest.mark.asyncio
    async def test_complete_duel_flow(self, mock_redis):
        """Test complete duel flow: connection -> proof submission -> result -> notification."""
        # Setup
        manager = ConnectionManager()
        manager.redis_client = mock_redis
        manager.pubsub = mock_redis.pubsub()

        # Mock WebSockets for two players
        player1_ws = AsyncMock()
        player2_ws = AsyncMock()
        
        game_id = "123"
        player1_id = 1
        player2_id = 2

        # Step 1: Both players connect to the game
        await manager.connect(player1_ws, game_id, player1_id)
        await manager.connect(player2_ws, game_id, player2_id)

        # Verify connections
        assert len(manager.active_connections[game_id]) == 2
        
        # Step 2: Player 1 submits a proof (simulate via message handling)
        proof_message = {
            "type": "proof_submission",
            "user_id": player1_id,
            "game_id": int(game_id),
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

        # This would normally be handled by the WebSocket endpoint
        # but we'll simulate the direct manager call
        validated_message = await manager.handle_client_message(player1_ws, proof_message)
        assert validated_message is not None
        assert validated_message.type == "proof_submission"

        # Step 3: Simulate proof checker result coming back via Redis
        proof_result = {
            "type": "round_complete",
            "game_id": int(game_id),
            "round_winner": player1_id,
            "game_winner": player1_id,
            "player_a": player1_id,
            "player_b": player2_id,
            "submission": {
                "user_id": player1_id,
                "is_valid": True,
                "proof_steps": 3,
                "processing_time": 0.5
            },
            "timestamp": time.time()
        }

        # Simulate receiving this event from Redis
        await manager._handle_game_event(proof_result)

        # Step 4: Verify both players received the game event
        assert player1_ws.send_json.call_count >= 1
        assert player2_ws.send_json.call_count >= 1

        # Check that the correct message was sent
        sent_messages = [call.args[0] for call in player1_ws.send_json.call_args_list]
        game_event_sent = any(msg.get("type") == "round_complete" for msg in sent_messages)
        assert game_event_sent

    @pytest.mark.asyncio
    async def test_matchmaking_to_game_flow(self, mock_redis):
        """Test flow from matchmaking to game start."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis
        manager.pubsub = mock_redis.pubsub()

        # Mock notification WebSocket connections
        player1_ws = AsyncMock()
        player2_ws = AsyncMock()
        
        player1_id = "1"
        player2_id = "2"

        # Step 1: Players connect for notifications
        await manager.connect_user(player1_ws, player1_id)
        await manager.connect_user(player2_ws, player2_id)

        # Step 2: Simulate match found notification from match service
        match_notification = {
            "type": "match_found",
            "user_ids": [1, 2],
            "game_id": 123,
            "players": {
                "player_a": {"id": 1, "handle": "player1"},
                "player_b": {"id": 2, "handle": "player2"}
            },
            "timestamp": time.time()
        }

        await manager._handle_match_notification(match_notification)

        # Step 3: Verify both players received match notification
        player1_ws.send_json.assert_called()
        player2_ws.send_json.assert_called()

        # Step 4: Simulate players connecting to the game WebSocket
        game_ws1 = AsyncMock()
        game_ws2 = AsyncMock()
        
        await manager.connect(game_ws1, "123", 1)
        await manager.connect(game_ws2, "123", 2)

        # Verify game room setup
        assert len(manager.active_connections["123"]) == 2

    @pytest.mark.asyncio
    async def test_player_disconnect_and_reconnect(self, mock_redis):
        """Test player disconnection and reconnection with message queuing."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis
        manager.pubsub = mock_redis.pubsub()

        player_ws = AsyncMock()
        user_id = 1
        game_id = "123"

        # Step 1: Player connects to game
        await manager.connect(player_ws, game_id, user_id)
        assert len(manager.active_connections[game_id]) == 1

        # Step 2: Player disconnects
        await manager.disconnect(player_ws, game_id)
        assert game_id not in manager.active_connections

        # Step 3: Send a message while player is offline
        offline_message = {
            "type": "game_update",
            "message": "Your opponent made a move",
            "timestamp": time.time()
        }
        
        # This should queue the message
        await manager.send_user_notification(str(user_id), offline_message)
        
        # Verify message was queued in Redis
        mock_redis.rpush.assert_called()

        # Step 4: Player reconnects
        new_ws = AsyncMock()
        # Mock Redis returning the queued message
        mock_redis.lrange.return_value = [json.dumps(offline_message)]
        
        await manager.connect_user(new_ws, str(user_id))

        # Verify queued message was sent
        new_ws.send_json.assert_called()
        sent_message = new_ws.send_json.call_args[0][0]
        assert sent_message["type"] == "game_update"

    @pytest.mark.asyncio
    async def test_rating_update_flow(self, mock_redis):
        """Test rating update flow after game completion."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis
        manager.pubsub = mock_redis.pubsub()

        # Connect players for notifications
        player1_ws = AsyncMock()
        player2_ws = AsyncMock()
        
        await manager.connect_user(player1_ws, "1")
        await manager.connect_user(player2_ws, "2")

        # Simulate rating update notifications
        rating_update_1 = {
            "user_id": 1,
            "type": "rating_update",
            "old_rating": 1000,
            "new_rating": 1025,
            "change": 25,
            "timestamp": time.time()
        }

        rating_update_2 = {
            "user_id": 2,
            "type": "rating_update", 
            "old_rating": 1000,
            "new_rating": 975,
            "change": -25,
            "timestamp": time.time()
        }

        # Process rating updates
        await manager._handle_user_notification(rating_update_1)
        await manager._handle_user_notification(rating_update_2)

        # Verify notifications were sent
        player1_ws.send_json.assert_called()
        player2_ws.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_heartbeat_and_timeout_handling(self, mock_redis):
        """Test heartbeat mechanism and connection timeouts."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        player_ws = AsyncMock()
        user_id = 1
        game_id = "123"

        # Connect player
        await manager.connect(player_ws, game_id, user_id)
        
        # Simulate heartbeat ping
        ping_message = {"type": "ping", "timestamp": time.time()}
        result = await manager.handle_client_message(player_ws, ping_message)
        
        # Should handle ping and return None
        assert result is None
        
        # Should send pong response
        player_ws.send_json.assert_called()
        pong_response = player_ws.send_json.call_args[0][0]
        assert pong_response["type"] == "pong"

        # Simulate old connection (no recent heartbeat)
        conn_info = manager.connection_info[player_ws]
        conn_info.last_ping = time.time() - 120  # 2 minutes ago

        # Note: In a real test, we'd need to actually run the heartbeat check
        # which involves timing and would be more complex to test

    @pytest.mark.asyncio
    async def test_concurrent_connections_and_broadcasting(self, mock_redis):
        """Test handling multiple concurrent connections and broadcasting."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        # Create multiple WebSocket connections
        game_id = "123"
        connections = []
        for i in range(5):
            ws = AsyncMock()
            await manager.connect(ws, game_id, i + 1)
            connections.append(ws)

        # Broadcast a message to all connections
        broadcast_message = {
            "type": "announcement",
            "message": "Game starting soon!",
            "timestamp": time.time()
        }

        await manager.broadcast(game_id, broadcast_message)

        # Verify all connections received the message
        for ws in connections:
            ws.send_json.assert_called()
            sent_message = ws.send_json.call_args[0][0]
            assert sent_message["type"] == "announcement"

        # Test broadcasting with exclusion
        player_ws.send_json.reset_mock()
        await manager.broadcast(game_id, broadcast_message, exclude_user=1)

        # First player should not receive the message
        connections[0].send_json.assert_not_called()
        
        # Others should receive it
        for ws in connections[1:]:
            ws.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_system_broadcast_to_all_users(self, mock_redis):
        """Test system-wide broadcasts to all connected users."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        # Connect users to different contexts
        notification_users = []
        game_users = []
        
        # Some users connected for notifications only
        for i in range(3):
            ws = AsyncMock()
            await manager.connect_user(ws, str(i + 1))
            notification_users.append(ws)

        # Some users connected to games
        for i in range(2):
            ws = AsyncMock()
            await manager.connect(ws, "456", i + 4)
            game_users.append(ws)

        # Simulate system broadcast
        system_announcement = {
            "type": "system_announcement",
            "message": "Server maintenance in 10 minutes",
            "timestamp": time.time()
        }

        await manager._handle_system_broadcast(system_announcement)

        # All notification users should receive the broadcast
        for ws in notification_users:
            ws.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(self, mock_redis):
        """Test error handling and system recovery."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        # Create a connection
        player_ws = AsyncMock()
        await manager.connect(player_ws, "123", 1)

        # Simulate WebSocket send error
        player_ws.send_json.side_effect = Exception("Connection lost")

        # Try to send a message
        message = {"type": "test", "data": "error test"}
        await manager.send_personal_message(message, player_ws)

        # Should handle the error gracefully (logged but not raised)
        # Connection should still be tracked until cleanup

        # Simulate Redis error
        mock_redis.publish.side_effect = Exception("Redis connection lost")
        
        # Should handle Redis errors gracefully
        await manager._queue_offline_message(1, message)

        # Should fall back to in-memory queue
        assert 1 in manager.offline_queue
        assert len(manager.offline_queue[1]) > 0

    @pytest.mark.asyncio
    async def test_message_validation_and_security(self, mock_redis):
        """Test message validation and security features."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        player_ws = AsyncMock()
        await manager.connect(player_ws, "123", 1)

        # Test valid message
        valid_message = {
            "type": "chat_message",
            "user_id": 1,
            "data": {"message": "Hello!"}
        }
        
        result = await manager.handle_client_message(player_ws, valid_message)
        assert result is not None
        assert result.type == "chat_message"

        # Test invalid message (missing required fields)
        invalid_message = {
            "data": {"message": "Hello!"}
            # Missing 'type' field
        }
        
        result = await manager.handle_client_message(player_ws, invalid_message)
        assert result is None
        
        # Should send error response
        player_ws.send_json.assert_called()
        error_response = player_ws.send_json.call_args[0][0]
        assert error_response["type"] == "error"

        # Test malformed JSON handling would be at the WebSocket endpoint level
        # and is tested in the endpoint tests

    @pytest.mark.asyncio
    async def test_scalability_features(self, mock_redis):
        """Test features that support horizontal scaling."""
        manager = ConnectionManager()
        manager.redis_client = mock_redis

        # Test connection state storage
        user_id = 1
        game_id = "123"
        ws = AsyncMock()
        
        await manager.connect(ws, game_id, user_id)

        # Verify connection state was stored in Redis
        mock_redis.hset.assert_called()
        call_args = mock_redis.hset.call_args
        key = call_args[0][0]
        assert key == f"ws:connection:{user_id}"

        # Test user status publishing
        await manager.connect_user(ws, str(user_id))
        
        # Should publish user online status
        mock_redis.publish.assert_called()
        status_calls = [call for call in mock_redis.publish.call_args_list 
                       if call[0][0] == "user_status"]
        assert len(status_calls) > 0

        # Test cross-instance message routing (via Redis pub/sub)
        # This is implicitly tested by the _handle_* methods