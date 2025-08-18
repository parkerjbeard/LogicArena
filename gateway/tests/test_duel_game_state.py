import pytest
import asyncio
import json
import redis.asyncio as redis
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket
from fastapi.testclient import TestClient

from main import app, process_game_events, connection_manager, publish_game_event
from app.websocket.manager import ConnectionManager


class TestDuelGameState:
    """Test suite for duel game state management and WebSocket broadcasting"""
    
    @pytest.fixture
    async def redis_client(self):
        """Mock Redis client"""
        client = AsyncMock()
        client.publish = AsyncMock()
        client.pubsub = MagicMock()
        
        # Mock pubsub
        pubsub = AsyncMock()
        pubsub.subscribe = AsyncMock()
        pubsub.unsubscribe = AsyncMock()
        pubsub.listen = AsyncMock()
        client.pubsub.return_value = pubsub
        
        return client
    
    @pytest.fixture
    async def websocket_manager(self):
        """Create a test WebSocket manager"""
        manager = ConnectionManager()
        await manager.initialize("redis://localhost:6379")
        return manager
    
    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket connection"""
        ws = AsyncMock(spec=WebSocket)
        ws.send_json = AsyncMock()
        ws.send_text = AsyncMock()
        ws.receive_json = AsyncMock()
        ws.close = AsyncMock()
        return ws
    
    @pytest.mark.asyncio
    async def test_publish_game_event_round_complete(self, redis_client):
        """Test publishing round complete event"""
        with patch('app.games.router.get_redis_client', return_value=redis_client):
            await publish_game_event("round_complete", {
                "game_id": 1,
                "round_id": 1,
                "round_winner": 1,
                "round_number": 0,
                "submission": {
                    "user_id": 1,
                    "verdict": True,
                    "timestamp": "2024-01-01T00:00:00"
                }
            })
            
            # Verify Redis publish was called
            redis_client.publish.assert_called_once()
            call_args = redis_client.publish.call_args
            assert call_args[0][0] == "game_events"
            
            # Verify event structure
            event = json.loads(call_args[0][1])
            assert event["type"] == "round_complete"
            assert event["game_id"] == 1
            assert event["round_winner"] == 1
            assert "timestamp" in event
    
    @pytest.mark.asyncio
    async def test_publish_game_event_game_complete(self, redis_client):
        """Test publishing game complete event"""
        with patch('app.games.router.get_redis_client', return_value=redis_client):
            await publish_game_event("game_complete", {
                "game_id": 1,
                "game_winner": 2,
                "player_a_rating_change": -15,
                "player_b_rating_change": 15,
                "final_score": {
                    "player_a": 1,
                    "player_b": 2
                }
            })
            
            # Verify Redis publish was called
            redis_client.publish.assert_called_once()
            call_args = redis_client.publish.call_args
            
            # Verify event structure
            event = json.loads(call_args[0][1])
            assert event["type"] == "game_complete"
            assert event["game_winner"] == 2
            assert event["player_a_rating_change"] == -15
            assert event["player_b_rating_change"] == 15
    
    @pytest.mark.asyncio
    async def test_publish_game_event_submission_failed(self, redis_client):
        """Test publishing submission failed event"""
        with patch('app.games.router.get_redis_client', return_value=redis_client):
            await publish_game_event("submission_failed", {
                "game_id": 1,
                "user_id": 1,
                "round_id": 1,
                "error": "Invalid proof structure"
            })
            
            # Verify event was published
            event = json.loads(redis_client.publish.call_args[0][1])
            assert event["type"] == "submission_failed"
            assert event["error"] == "Invalid proof structure"
    
    @pytest.mark.asyncio
    async def test_process_game_events_round_complete(self, redis_client, websocket_manager):
        """Test processing round complete events"""
        # Mock Redis pubsub messages
        messages = [
            {"type": "subscribe"},
            {
                "type": "message",
                "data": json.dumps({
                    "type": "round_complete",
                    "game_id": 1,
                    "round_id": 1,
                    "round_winner": 1,
                    "timestamp": 1234567890
                })
            }
        ]
        
        async def mock_listen():
            for msg in messages:
                yield msg
            # Stop iteration after messages
            raise asyncio.CancelledError()
        
        redis_client.pubsub.return_value.listen = mock_listen
        
        # Mock WebSocket manager broadcast
        with patch.object(websocket_manager, 'broadcast', new_callable=AsyncMock) as mock_broadcast:
            with patch('main.redis.from_url', return_value=redis_client):
                with patch('main.connection_manager', websocket_manager):
                    try:
                        await process_game_events()
                    except asyncio.CancelledError:
                        pass
            
            # Verify broadcast was called
            mock_broadcast.assert_called_once()
            broadcast_args = mock_broadcast.call_args
            assert broadcast_args[0][0] == "1"  # game_id as string
            assert broadcast_args[0][1]["type"] == "round_complete"
    
    @pytest.mark.asyncio
    async def test_process_game_events_game_complete(self, redis_client, websocket_manager):
        """Test processing game complete events"""
        messages = [
            {"type": "subscribe"},
            {
                "type": "message",
                "data": json.dumps({
                    "type": "game_complete",
                    "game_id": 2,
                    "game_winner": 1,
                    "player_a_rating_change": 20,
                    "player_b_rating_change": -20
                })
            }
        ]
        
        async def mock_listen():
            for msg in messages:
                yield msg
            raise asyncio.CancelledError()
        
        redis_client.pubsub.return_value.listen = mock_listen
        
        with patch.object(websocket_manager, 'broadcast', new_callable=AsyncMock) as mock_broadcast:
            with patch('main.redis.from_url', return_value=redis_client):
                with patch('main.connection_manager', websocket_manager):
                    try:
                        await process_game_events()
                    except asyncio.CancelledError:
                        pass
            
            # Verify broadcast
            mock_broadcast.assert_called_once()
            broadcast_data = mock_broadcast.call_args[0][1]
            assert broadcast_data["type"] == "game_complete"
            assert broadcast_data["game_winner"] == 1
    
    @pytest.mark.asyncio
    async def test_process_game_events_error_handling(self, redis_client):
        """Test error handling in game event processor"""
        # Mock invalid JSON message
        messages = [
            {"type": "subscribe"},
            {
                "type": "message",
                "data": "invalid json"
            }
        ]
        
        async def mock_listen():
            for msg in messages:
                yield msg
            raise asyncio.CancelledError()
        
        redis_client.pubsub.return_value.listen = mock_listen
        
        with patch('main.redis.from_url', return_value=redis_client):
            with patch('main.logger') as mock_logger:
                try:
                    await process_game_events()
                except asyncio.CancelledError:
                    pass
                
                # Verify error was logged
                mock_logger.error.assert_called()
    
    @pytest.mark.asyncio
    async def test_websocket_broadcast_to_game_players(self, websocket_manager, mock_websocket):
        """Test broadcasting messages to all players in a game"""
        game_id = "1"
        user1_id = 1
        user2_id = 2
        
        # Connect two players to the game
        await websocket_manager.connect(mock_websocket, game_id, user1_id)
        
        mock_websocket2 = AsyncMock(spec=WebSocket)
        mock_websocket2.send_json = AsyncMock()
        await websocket_manager.connect(mock_websocket2, game_id, user2_id)
        
        # Broadcast a message
        message = {
            "type": "round_complete",
            "round_winner": user1_id,
            "timestamp": 1234567890
        }
        
        await websocket_manager.broadcast(game_id, message)
        
        # Verify both players received the message
        mock_websocket.send_json.assert_called_once_with(message)
        mock_websocket2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_websocket_broadcast_exclude_user(self, websocket_manager, mock_websocket):
        """Test broadcasting with user exclusion"""
        game_id = "1"
        user1_id = 1
        user2_id = 2
        
        # Connect two players
        await websocket_manager.connect(mock_websocket, game_id, user1_id)
        
        mock_websocket2 = AsyncMock(spec=WebSocket)
        mock_websocket2.send_json = AsyncMock()
        await websocket_manager.connect(mock_websocket2, game_id, user2_id)
        
        # Broadcast excluding user1
        message = {"type": "test_message"}
        await websocket_manager.broadcast(game_id, message, exclude_user=user1_id)
        
        # Verify only user2 received the message
        mock_websocket.send_json.assert_not_called()
        mock_websocket2.send_json.assert_called_once_with(message)
    
    @pytest.mark.asyncio
    async def test_duel_submission_integration(self):
        """Integration test for duel submission and WebSocket notification"""
        with TestClient(app) as client:
            # Mock authentication
            with patch('app.auth.utils.get_current_active_user') as mock_auth:
                mock_user = MagicMock()
                mock_user.id = 1
                mock_user.handle = "player1"
                mock_user.rating = 1500
                mock_auth.return_value = mock_user
                
                # Mock database queries
                with patch('app.games.router.AsyncSession') as mock_session:
                    # Mock game and round data
                    mock_game = MagicMock()
                    mock_game.id = 1
                    mock_game.player_a = 1
                    mock_game.player_b = 2
                    mock_game.rounds = 3
                    
                    mock_round = MagicMock()
                    mock_round.id = 1
                    mock_round.puzzle_id = 101
                    mock_round.winner = None
                    
                    mock_puzzle = MagicMock()
                    mock_puzzle.id = 101
                    mock_puzzle.gamma = "P, P -> Q"
                    mock_puzzle.phi = "Q"
                    
                    # Setup mock returns
                    mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.side_effect = [
                        mock_game, mock_round, mock_puzzle
                    ]
                    
                    # Mock proof checker response
                    with patch('httpx.AsyncClient.post') as mock_httpx:
                        mock_httpx.return_value.json.return_value = {"ok": True}
                        mock_httpx.return_value.raise_for_status = MagicMock()
                        
                        # Mock Redis publish
                        with patch('app.games.router.publish_game_event') as mock_publish:
                            # Submit proof
                            response = client.post(
                                "/api/games/duel/1/submit",
                                json={"round_id": 1, "payload": "valid proof"}
                            )
                            
                            assert response.status_code == 200
                            data = response.json()
                            assert data["verdict"] is True
                            
                            # Verify game event was published
                            mock_publish.assert_called()
                            call_args = mock_publish.call_args_list
                            
                            # Should have round_complete event
                            round_complete_call = next(
                                (call for call in call_args if call[0][0] == "round_complete"),
                                None
                            )
                            assert round_complete_call is not None
    
    @pytest.mark.asyncio
    async def test_game_event_processor_lifecycle(self):
        """Test starting and stopping the game event processor"""
        # Create a mock task
        mock_task = AsyncMock()
        mock_task.cancel = MagicMock()
        
        with patch('asyncio.create_task', return_value=mock_task) as mock_create_task:
            with patch('main.process_game_events') as mock_process:
                # Import and run startup
                from main import startup, shutdown, game_event_processor_task
                
                # Mock other startup dependencies
                with patch('main.verify_db_connection', return_value=True):
                    with patch('main.engine.begin'):
                        with patch('main.pool_monitor.start_monitoring'):
                            with patch('main.FastAPILimiter.init'):
                                with patch('main.connection_manager.initialize'):
                                    with patch('main.schedule_cleanup'):
                                        await startup()
                
                # Verify task was created
                mock_create_task.assert_called()
                
                # Run shutdown
                with patch('main.pool_monitor.stop_monitoring'):
                    with patch('main.connection_manager.cleanup'):
                        with patch('main.close_db_connections'):
                            await shutdown()
                
                # Verify task was cancelled
                mock_task.cancel.assert_called()


class TestDuelEndToEnd:
    """End-to-end tests for complete duel flow"""
    
    @pytest.mark.asyncio
    async def test_complete_duel_flow(self):
        """Test a complete duel from matchmaking to game completion"""
        # This would be a more comprehensive integration test
        # involving multiple API calls and WebSocket connections
        pass  # Implementation would require full test environment setup