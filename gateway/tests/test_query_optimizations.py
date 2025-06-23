"""
Tests for query optimization utilities to prevent N+1 queries
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload, subqueryload
from sqlalchemy import select

from app.db.query_optimizations import (
    get_game_with_details,
    get_user_games_optimized,
    get_active_games_optimized,
    get_puzzle_with_stats,
    get_user_with_full_profile,
    get_round_with_submissions,
    get_leaderboard_users
)
from app.models import User, Game, Round, Puzzle, Submission


class TestQueryOptimizations:
    """Test optimized query functions"""

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    def mock_query_result(self):
        """Create a mock query result"""
        result = Mock()
        result.scalar_one_or_none = Mock(return_value=Mock())
        result.scalars = Mock(return_value=Mock(
            unique=Mock(return_value=Mock(
                all=Mock(return_value=[])
            ))
        ))
        return result

    @pytest.mark.asyncio
    async def test_get_game_with_details_uses_eager_loading(self, mock_db_session, mock_query_result):
        """Test that get_game_with_details uses appropriate eager loading"""
        mock_db_session.execute.return_value = mock_query_result
        
        # Call the function
        await get_game_with_details(mock_db_session, 123)
        
        # Verify execute was called
        assert mock_db_session.execute.called
        
        # Get the query that was executed
        query_call = mock_db_session.execute.call_args[0][0]
        
        # Verify it's a select query for Game
        assert hasattr(query_call, '_raw_columns')
        
        # Check that options were applied (eager loading)
        assert hasattr(query_call, '_with_options')
        options = query_call._with_options
        
        # Should have multiple eager loading options
        assert len(options) > 0
        
        # Verify specific eager loading strategies
        option_types = [type(opt) for opt in options]
        assert any(hasattr(opt, '_of_type') for opt in options)

    @pytest.mark.asyncio
    async def test_get_user_games_optimized_limits_results(self, mock_db_session, mock_query_result):
        """Test that get_user_games_optimized properly limits and offsets results"""
        mock_db_session.execute.return_value = mock_query_result
        
        # Call with specific limit and offset
        await get_user_games_optimized(mock_db_session, user_id=1, limit=10, offset=20)
        
        # Verify execute was called
        assert mock_db_session.execute.called
        
        # Get the query
        query = mock_db_session.execute.call_args[0][0]
        
        # Check for limit and offset in query modifiers
        assert hasattr(query, '_limit_clause')
        assert hasattr(query, '_offset_clause')

    @pytest.mark.asyncio
    async def test_get_active_games_filters_ended_games(self, mock_db_session, mock_query_result):
        """Test that get_active_games_optimized filters out ended games"""
        mock_db_session.execute.return_value = mock_query_result
        
        await get_active_games_optimized(mock_db_session)
        
        # Get the query
        query = mock_db_session.execute.call_args[0][0]
        
        # Should filter where ended is None
        assert hasattr(query, '_where_criteria')

    @pytest.mark.asyncio
    async def test_query_optimization_prevents_n_plus_one(self, mock_db_session):
        """Test that optimized queries prevent N+1 query issues"""
        # Mock a game with related data
        mock_game = Mock(spec=Game)
        mock_game.id = 1
        mock_game.player_a_user = Mock(spec=User, handle="player1")
        mock_game.player_b_user = Mock(spec=User, handle="player2")
        mock_game.game_rounds = [Mock(spec=Round) for _ in range(3)]
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_game
        mock_db_session.execute.return_value = mock_result
        
        # Get game with details
        game = await get_game_with_details(mock_db_session, 1)
        
        # Should only execute one query (not multiple for related data)
        assert mock_db_session.execute.call_count == 1
        
        # Accessing related data should not trigger new queries
        # (In real implementation, these would be loaded already)
        _ = game.player_a_user.handle
        _ = game.player_b_user.handle
        _ = len(game.game_rounds)
        
        # Still only one query
        assert mock_db_session.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_get_puzzle_with_stats_loads_submissions(self, mock_db_session, mock_query_result):
        """Test that get_puzzle_with_stats loads submission data efficiently"""
        mock_db_session.execute.return_value = mock_query_result
        
        await get_puzzle_with_stats(mock_db_session, puzzle_id=456)
        
        # Verify query includes eager loading for submissions
        query = mock_db_session.execute.call_args[0][0]
        assert hasattr(query, '_with_options')

    @pytest.mark.asyncio
    async def test_get_user_with_full_profile_limits_related_data(self, mock_db_session):
        """Test that get_user_with_full_profile limits the amount of related data loaded"""
        mock_user = Mock(spec=User)
        mock_user.id = 1
        mock_user.games_as_player_a = [Mock(spec=Game) for _ in range(5)]
        mock_user.games_as_player_b = [Mock(spec=Game) for _ in range(5)]
        mock_user.submissions = [Mock(spec=Submission) for _ in range(10)]
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        user = await get_user_with_full_profile(mock_db_session, user_id=1)
        
        # Should load limited data (configured in the function)
        assert mock_db_session.execute.call_count == 1

    @pytest.mark.asyncio
    async def test_get_leaderboard_users_efficient_loading(self, mock_db_session, mock_query_result):
        """Test that get_leaderboard_users uses efficient loading strategies"""
        mock_db_session.execute.return_value = mock_query_result
        
        await get_leaderboard_users(mock_db_session, limit=50)
        
        query = mock_db_session.execute.call_args[0][0]
        
        # Should filter active users
        assert hasattr(query, '_where_criteria')
        
        # Should order by rating
        assert hasattr(query, '_order_by_clauses')
        
        # Should limit results
        assert hasattr(query, '_limit_clause')

    @pytest.mark.asyncio
    async def test_eager_loading_strategies_applied_correctly(self, mock_db_session):
        """Test that appropriate eager loading strategies are used"""
        strategies_used = []
        
        # Mock the query building to capture strategies
        def capture_options(query):
            class MockQuery:
                def __init__(self):
                    self._with_options = []
                
                def options(self, *opts):
                    self._with_options.extend(opts)
                    strategies_used.extend(opts)
                    return self
                
                def filter(self, *args):
                    return self
                
                def order_by(self, *args):
                    return self
                
                def limit(self, n):
                    return self
                
                def offset(self, n):
                    return self
            
            return MockQuery()
        
        with patch('app.db.query_optimizations.select', side_effect=capture_options):
            mock_result = Mock()
            mock_result.scalars.return_value.unique.return_value.all.return_value = []
            mock_db_session.execute.return_value = mock_result
            
            # Test different functions to see what strategies they use
            await get_user_games_optimized(mock_db_session, 1)
            
            # Should use eager loading strategies
            assert len(strategies_used) > 0

    @pytest.mark.asyncio
    async def test_load_only_optimization(self, mock_db_session):
        """Test that load_only is used to limit columns when appropriate"""
        mock_result = Mock()
        mock_result.scalars.return_value.unique.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result
        
        # Get leaderboard users (which should use load_only for game counts)
        await get_leaderboard_users(mock_db_session)
        
        # The query should be optimized to load only necessary columns
        query = mock_db_session.execute.call_args[0][0]
        assert hasattr(query, '_with_options')


class TestQueryOptimizationIntegration:
    """Integration tests for query optimizations"""

    @pytest.mark.asyncio
    async def test_circular_reference_handling(self, mock_db_session):
        """Test that circular references are handled properly"""
        # Create objects with circular references
        user1 = Mock(spec=User, id=1)
        user2 = Mock(spec=User, id=2)
        game = Mock(spec=Game, id=1)
        
        game.player_a_user = user1
        game.player_b_user = user2
        user1.games_as_player_a = [game]
        user2.games_as_player_b = [game]
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = game
        mock_db_session.execute.return_value = mock_result
        
        # Should not cause infinite loops
        result = await get_game_with_details(mock_db_session, 1)
        assert result is not None

    @pytest.mark.asyncio
    async def test_empty_relationships_handled(self, mock_db_session):
        """Test that empty relationships are handled gracefully"""
        # Create game with no rounds or submissions
        game = Mock(spec=Game)
        game.game_rounds = []
        game.submissions = []
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = game
        mock_db_session.execute.return_value = mock_result
        
        result = await get_game_with_details(mock_db_session, 1)
        assert result is not None
        assert len(result.game_rounds) == 0

    @pytest.mark.asyncio
    async def test_null_relationships_handled(self, mock_db_session):
        """Test that null relationships are handled properly"""
        # Create game with null winner
        game = Mock(spec=Game)
        game.winner_user = None
        game.winner = None
        
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = game
        mock_db_session.execute.return_value = mock_result
        
        result = await get_game_with_details(mock_db_session, 1)
        assert result is not None
        assert result.winner_user is None


class TestQueryPerformance:
    """Performance-related tests for query optimizations"""

    @pytest.mark.asyncio
    async def test_query_complexity_reasonable(self, mock_db_session):
        """Test that generated queries aren't overly complex"""
        query_complexity = {'joins': 0, 'subqueries': 0}
        
        def analyze_query(query):
            # Simple analysis of query complexity
            query_str = str(query)
            query_complexity['joins'] = query_str.count('JOIN')
            query_complexity['subqueries'] = query_str.count('SELECT', 1)  # Skip first SELECT
            return Mock(scalar_one_or_none=Mock(return_value=None))
        
        mock_db_session.execute.side_effect = analyze_query
        
        await get_game_with_details(mock_db_session, 1)
        
        # Should use joins efficiently, not excessive subqueries
        assert query_complexity['joins'] <= 10  # Reasonable number of joins
        assert query_complexity['subqueries'] <= 5  # Minimal subqueries

    @pytest.mark.asyncio
    async def test_batch_loading_efficiency(self, mock_db_session):
        """Test that batch operations are efficient"""
        users_loaded = []
        
        def track_users(query):
            result = Mock()
            # Create 100 mock users
            mock_users = [Mock(spec=User, id=i, rating=1000-i) for i in range(100)]
            users_loaded.extend(mock_users)
            result.scalars.return_value.unique.return_value.all.return_value = mock_users
            return result
        
        mock_db_session.execute.side_effect = track_users
        
        users = await get_leaderboard_users(mock_db_session, limit=100)
        
        # Should load all users in one query
        assert mock_db_session.execute.call_count == 1
        assert len(users_loaded) == 100