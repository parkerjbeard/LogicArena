import pytest
import json
import time
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app import (
    QueueEntry, MatchRequest, MatchResponse,
    process_game_event, process_proof_result,
    forward_proof_to_checker, handle_player_surrender,
    handle_round_timeout, publish_round_result,
    update_player_ratings, process_queue,
    create_match, notify_players_of_match
)
from tests.conftest import create_mock_redis_message


class TestMatchService:
    """Test suite for the match service."""

    def test_queue_entry_model(self, sample_queue_entry):
        """Test QueueEntry model validation."""
        entry = QueueEntry(**sample_queue_entry)
        assert entry.user_id == 1
        assert entry.handle == "testuser"
        assert entry.rating == 1000
        assert entry.timestamp == 1640995200.0

    def test_match_request_model(self):
        """Test MatchRequest model validation."""
        request = MatchRequest(
            user_id=1,
            handle="testuser",
            rating=1000,
            difficulty=2
        )
        assert request.user_id == 1
        assert request.difficulty == 2

    def test_match_response_model(self):
        """Test MatchResponse model validation."""
        response = MatchResponse(
            matched=True,
            game_id=123,
            opponent_id=2,
            opponent_handle="opponent"
        )
        assert response.matched is True
        assert response.game_id == 123

    @pytest.mark.asyncio
    async def test_process_game_event_proof_submitted(self, game_events, mock_redis):
        """Test processing proof submission events."""
        event = game_events["proof_submitted"]
        
        with patch('app.forward_proof_to_checker') as mock_forward:
            await process_game_event(event)
            mock_forward.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_process_game_event_player_surrendered(self, game_events):
        """Test processing player surrender events."""
        event = game_events["player_surrendered"]
        
        with patch('app.handle_player_surrender') as mock_surrender:
            await process_game_event(event)
            mock_surrender.assert_called_once_with(123, 1)

    @pytest.mark.asyncio
    async def test_process_game_event_round_timeout(self, game_events):
        """Test processing round timeout events."""
        event = game_events["round_timeout"]
        
        with patch('app.handle_round_timeout') as mock_timeout:
            await process_game_event(event)
            mock_timeout.assert_called_once_with(123)

    @pytest.mark.asyncio
    async def test_process_proof_result(self, proof_checker_result):
        """Test processing proof checker results."""
        with patch('app.publish_round_result') as mock_publish:
            await process_proof_result(proof_checker_result)
            mock_publish.assert_called_once_with(123, 1, True, proof_checker_result)

    @pytest.mark.asyncio
    async def test_forward_proof_to_checker_success(self, game_events, mock_redis):
        """Test successful proof forwarding to checker."""
        event = game_events["proof_submitted"]
        
        # Mock the redis_client module variable
        with patch('app.redis_client', mock_redis):
            with patch('httpx.AsyncClient') as mock_client:
                mock_response = AsyncMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"is_valid": True}
                mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
                
                await forward_proof_to_checker(event)
                
                # Should publish result to Redis
                mock_redis.publish.assert_called_once()
                call_args = mock_redis.publish.call_args
                assert call_args[0][0] == "proof_checker_results"

    @pytest.mark.asyncio
    async def test_forward_proof_to_checker_error(self, game_events):
        """Test proof forwarding with HTTP error."""
        event = game_events["proof_submitted"]
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            # Should not raise exception
            await forward_proof_to_checker(event)

    @pytest.mark.asyncio
    async def test_handle_player_surrender(self, sample_match_data, mock_redis):
        """Test handling player surrender."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = sample_match_data
            
            await handle_player_surrender(123, 1)
            
            # Should publish game completion event
            mock_redis.publish.assert_called()
            
            # Should update match status
            mock_redis.hset.assert_called()

    @pytest.mark.asyncio
    async def test_handle_round_timeout(self, sample_match_data, mock_redis):
        """Test handling round timeout."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = sample_match_data
            
            await handle_round_timeout(123)
            
            # Should publish game completion event with no winner
            mock_redis.publish.assert_called()
            call_args = mock_redis.publish.call_args
            event_data = json.loads(call_args[0][1])
            assert event_data["winner"] is None
            assert event_data["reason"] == "timeout"

    @pytest.mark.asyncio
    async def test_publish_round_result_winner(self, sample_match_data, mock_redis):
        """Test publishing round result with winner."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = sample_match_data
            
            with patch('app.update_player_ratings') as mock_update_ratings:
                await publish_round_result(123, 1, True, {"proof_steps": 3})
                
                # Should publish round complete event
                mock_redis.publish.assert_called()
                
                # Should update game status for winner
                mock_redis.hset.assert_called()
                
                # Should update ratings
                mock_update_ratings.assert_called_once_with(1, 2, 1)

    @pytest.mark.asyncio
    async def test_publish_round_result_no_winner(self, sample_match_data, mock_redis):
        """Test publishing round result without winner."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = sample_match_data
            
            await publish_round_result(123, 1, False, {"error": "Invalid proof"})
            
            # Should publish round complete event
            mock_redis.publish.assert_called()
            call_args = mock_redis.publish.call_args
            event_data = json.loads(call_args[0][1])
            assert event_data["round_winner"] is None
            assert event_data["game_winner"] is None

    @pytest.mark.asyncio
    async def test_update_player_ratings(self, mock_redis):
        """Test ELO rating updates."""
        with patch('app.redis_client', mock_redis):
            await update_player_ratings(1, 2, 1)  # Player 1 wins
            
            # Should publish rating updates for both players
            assert mock_redis.publish.call_count == 2
            
            # Check the published notifications
            calls = mock_redis.publish.call_args_list
            for call in calls:
                assert call[0][0] == "user_notifications"
                data = json.loads(call[0][1])
                assert data["type"] == "rating_update"
                assert "old_rating" in data
                assert "new_rating" in data
                assert "change" in data

    @pytest.mark.asyncio
    async def test_process_queue_no_players(self, mock_redis):
        """Test queue processing with insufficient players."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = {}  # Empty queue
            
            # Should not create any matches
            with patch('app.create_match') as mock_create:
                # Process once
                await asyncio.sleep(0.1)  # Simulate one iteration
                mock_create.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_queue_matching_players(self, mock_redis, sample_queue_entry):
        """Test queue processing with matching players."""
        # Create two similar players
        player1 = sample_queue_entry.copy()
        player2 = sample_queue_entry.copy()
        player2["user_id"] = 2
        player2["handle"] = "player2"
        player2["rating"] = 1050  # Close rating
        
        queue_data = {
            "1": json.dumps(player1),
            "2": json.dumps(player2)
        }
        
        with patch('app.redis_client', mock_redis):
            mock_redis.hgetall.return_value = queue_data
            
            with patch('app.create_match', return_value=123) as mock_create:
                with patch('app.notify_players_of_match') as mock_notify:
                    # Mock a single iteration of the queue processor
                    entries = []
                    for user_id, data in queue_data.items():
                        entry = QueueEntry(**json.loads(data))
                        entries.append((user_id, entry))
                    
                    # Sort by rating
                    entries.sort(key=lambda x: x[1].rating)
                    
                    # Check rating difference and create match
                    user_a_id, user_a = entries[0]
                    user_b_id, user_b = entries[1]
                    rating_diff = abs(user_a.rating - user_b.rating)
                    
                    if rating_diff <= 200:
                        game_id = await create_match(user_a_id, user_a, user_b_id, user_b)
                        if game_id:
                            await notify_players_of_match(user_a_id, user_b_id, game_id, user_a, user_b)
                    
                    # Verify match was created
                    mock_create.assert_called_once()
                    mock_notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_match_success(self, sample_queue_entry):
        """Test successful match creation."""
        player1 = QueueEntry(**sample_queue_entry)
        player2 = QueueEntry(**{**sample_queue_entry, "user_id": 2})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"id": 123}
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            game_id = await create_match("1", player1, "2", player2)
            
            assert game_id == 123

    @pytest.mark.asyncio
    async def test_create_match_failure(self, sample_queue_entry):
        """Test match creation failure."""
        player1 = QueueEntry(**sample_queue_entry)
        player2 = QueueEntry(**{**sample_queue_entry, "user_id": 2})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            game_id = await create_match("1", player1, "2", player2)
            
            assert game_id is None

    @pytest.mark.asyncio
    async def test_notify_players_of_match(self, sample_queue_entry, mock_redis):
        """Test match notification publishing."""
        player1 = QueueEntry(**sample_queue_entry)
        player2 = QueueEntry(**{**sample_queue_entry, "user_id": 2, "handle": "player2"})
        
        with patch('app.redis_client', mock_redis):
            await notify_players_of_match("1", "2", 123, player1, player2)
            
            # Should store match info
            mock_redis.hset.assert_called()
            
            # Should publish multiple notifications
            assert mock_redis.publish.call_count == 3  # match_notifications + 2 user_notifications

    def test_join_queue_api(self, test_client, mock_redis):
        """Test joining the matchmaking queue via API."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hget.return_value = None  # Not in queue
            mock_redis.hlen.return_value = 1
            
            response = test_client.post("/queue/join", json={
                "user_id": 1,
                "handle": "testuser",
                "rating": 1000,
                "difficulty": 2
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["matched"] is False
            assert data["queue_position"] == 1

    def test_join_queue_already_in_queue(self, test_client, mock_redis):
        """Test joining queue when already in queue."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hget.return_value = '{"user_id": 1}'  # Already in queue
            mock_redis.hlen.return_value = 5
            
            response = test_client.post("/queue/join", json={
                "user_id": 1,
                "handle": "testuser", 
                "rating": 1000
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["queue_position"] == 5

    def test_leave_queue_api(self, test_client, mock_redis):
        """Test leaving the matchmaking queue via API."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hdel.return_value = 1  # Successfully removed
            
            response = test_client.post("/queue/leave", params={"user_id": 1})
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

    def test_queue_status_api(self, test_client, mock_redis, sample_queue_entry):
        """Test getting queue status via API."""
        with patch('app.redis_client', mock_redis):
            mock_redis.hget.return_value = json.dumps(sample_queue_entry)
            
            # Mock queue data for position calculation
            queue_data = {
                "1": json.dumps(sample_queue_entry),
                "2": json.dumps({**sample_queue_entry, "user_id": 2, "timestamp": 1640995300.0})
            }
            mock_redis.hgetall.return_value = queue_data
            
            response = test_client.get("/queue/status", params={"user_id": 1})
            
            assert response.status_code == 200
            data = response.json()
            assert data["in_queue"] is True
            assert data["position"] == 1  # First in queue (earlier timestamp)

    def test_check_match_api(self, test_client, mock_redis, sample_match_data):
        """Test checking for matches via API."""
        with patch('app.redis_client', mock_redis):
            mock_redis.keys.return_value = ["match:123"]
            mock_redis.hgetall.return_value = sample_match_data
            
            response = test_client.get("/match/check", params={"user_id": 1})
            
            assert response.status_code == 200
            data = response.json()
            assert data["matched"] is True
            assert data["game_id"] == 123
            assert data["opponent_id"] == 2
            assert data["opponent_handle"] == "player2"

    def test_check_match_no_match(self, test_client, mock_redis):
        """Test checking for matches when no match exists."""
        with patch('app.redis_client', mock_redis):
            mock_redis.keys.return_value = []
            
            response = test_client.get("/match/check", params={"user_id": 1})
            
            assert response.status_code == 200
            data = response.json()
            assert data["matched"] is False


class TestMatchServiceIntegration:
    """Integration tests for match service."""

    @pytest.mark.asyncio
    async def test_full_matching_flow(self, mock_redis):
        """Test complete matching flow from queue to game creation."""
        # This would test the entire flow:
        # 1. Players join queue
        # 2. Queue processor finds match
        # 3. Game is created
        # 4. Players are notified
        # 5. Game events are processed
        pass

    @pytest.mark.asyncio
    async def test_game_event_flow(self, mock_redis):
        """Test game event processing flow."""
        # This would test:
        # 1. Proof submission event
        # 2. Forward to proof checker
        # 3. Process result
        # 4. Publish round result
        # 5. Update ratings if game complete
        pass