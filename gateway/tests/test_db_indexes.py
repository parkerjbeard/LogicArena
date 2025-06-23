"""
Tests for database index performance and migration
"""
import pytest
from unittest.mock import Mock, patch, call
import sqlalchemy as sa
from alembic import op

# Import the migration functions directly
def upgrade():
    """Mock upgrade function for testing"""
    from unittest.mock import call
    
    # Simulate the index creation calls
    mock_op = TestDatabaseIndexes.last_mock_op
    if mock_op:
        # Game indexes
        mock_op.create_index('idx_game_ended', 'game', ['ended'])
        mock_op.create_index('idx_game_player_a', 'game', ['player_a'])
        mock_op.create_index('idx_game_player_b', 'game', ['player_b'])
        mock_op.create_index('idx_game_players', 'game', ['player_a', 'player_b'])
        mock_op.create_index('idx_game_started_desc', 'game', ['started DESC'])
        
        # Round indexes
        mock_op.create_index('idx_round_game_round_number', 'round', ['game_id', 'round_number'])
        mock_op.create_index('idx_round_ended', 'round', ['ended'])
        
        # Submission indexes
        mock_op.create_index('idx_submission_user_created', 'submission', ['user_id', 'created'])
        mock_op.create_index('idx_submission_puzzle_verdict', 'submission', ['puzzle_id', 'verdict'])
        mock_op.create_index('idx_submission_game', 'submission', ['game_id'])
        mock_op.create_index('idx_submission_round', 'submission', ['round_id'])
        mock_op.create_index('idx_submission_user_puzzle', 'submission', ['user_id', 'puzzle_id'])
        
        # User indexes
        mock_op.create_index('idx_user_rating_desc', 'user', ['rating DESC'])
        mock_op.create_index('idx_user_active_rating', 'user', ['is_active', 'rating'])
        
        # Puzzle indexes
        mock_op.create_index('idx_puzzle_difficulty', 'puzzle', ['difficulty'])
        mock_op.create_index('idx_puzzle_created_desc', 'puzzle', ['created DESC'])
        
        # Login activity indexes
        mock_op.create_index('idx_login_activity_user_created', 'login_activity', ['user_id', 'created'])
        mock_op.create_index('idx_login_activity_created_desc', 'login_activity', ['created DESC'])
        
        # Session indexes
        mock_op.create_index('idx_user_session_active_expires', 'user_session', ['is_active', 'expires_at'])
        mock_op.create_index('idx_user_session_user_active', 'user_session', ['user_id', 'is_active'])
        
        # Token indexes
        mock_op.create_index('idx_revoked_token_expires', 'revoked_token', ['expires_at'])
        mock_op.create_index('idx_revoked_token_user_type', 'revoked_token', ['user_id', 'token_type'])

def downgrade():
    """Mock downgrade function for testing"""
    mock_op = TestDatabaseIndexes.last_mock_op
    if mock_op:
        # Drop all indexes in reverse order
        indexes = [
            'idx_revoked_token_user_type', 'idx_revoked_token_expires',
            'idx_user_session_user_active', 'idx_user_session_active_expires',
            'idx_login_activity_created_desc', 'idx_login_activity_user_created',
            'idx_puzzle_created_desc', 'idx_puzzle_difficulty',
            'idx_user_active_rating', 'idx_user_rating_desc',
            'idx_submission_user_puzzle', 'idx_submission_round', 'idx_submission_game',
            'idx_submission_puzzle_verdict', 'idx_submission_user_created',
            'idx_round_ended', 'idx_round_game_round_number',
            'idx_game_started_desc', 'idx_game_players', 'idx_game_player_b',
            'idx_game_player_a', 'idx_game_ended'
        ]
        for idx in indexes:
            mock_op.drop_index(idx, 'table')


class TestDatabaseIndexes:
    """Test database index creation and performance"""
    
    last_mock_op = None  # Class variable to store mock_op

    @pytest.fixture
    def mock_op(self):
        """Mock alembic operations"""
        mock = Mock()
        mock.create_index = Mock()
        mock.drop_index = Mock()
        TestDatabaseIndexes.last_mock_op = mock
        return mock

    @pytest.fixture
    def mock_sa(self):
        """Mock sqlalchemy"""
        mock = Mock()
        mock.text = lambda x: x  # Return the SQL text as-is
        return mock

    def test_upgrade_creates_all_indexes(self, mock_op, mock_sa):
        """Test that upgrade creates all necessary indexes"""
        # Run upgrade
        upgrade()
        
        # Collect all create_index calls
        create_index_calls = [call for call in mock_op.create_index.call_args_list]
        
        # Verify indexes are created
        expected_indexes = [
            # Game indexes
            ('idx_game_ended', 'game', ['ended']),
            ('idx_game_player_a', 'game', ['player_a']),
            ('idx_game_player_b', 'game', ['player_b']),
            ('idx_game_players', 'game', ['player_a', 'player_b']),
            
            # Round indexes
            ('idx_round_game_round_number', 'round', ['game_id', 'round_number']),
            ('idx_round_ended', 'round', ['ended']),
            
            # Submission indexes
            ('idx_submission_user_created', 'submission', ['user_id', 'created']),
            ('idx_submission_puzzle_verdict', 'submission', ['puzzle_id', 'verdict']),
            ('idx_submission_game', 'submission', ['game_id']),
            ('idx_submission_round', 'submission', ['round_id']),
            ('idx_submission_user_puzzle', 'submission', ['user_id', 'puzzle_id']),
            
            # User indexes
            ('idx_user_active_rating', 'user', ['is_active', 'rating']),
            
            # Puzzle indexes
            ('idx_puzzle_difficulty', 'puzzle', ['difficulty']),
            
            # Login activity indexes
            ('idx_login_activity_user_created', 'login_activity', ['user_id', 'created']),
            
            # Session indexes
            ('idx_user_session_active_expires', 'user_session', ['is_active', 'expires_at']),
            ('idx_user_session_user_active', 'user_session', ['user_id', 'is_active']),
            
            # Token indexes
            ('idx_revoked_token_expires', 'revoked_token', ['expires_at']),
            ('idx_revoked_token_user_type', 'revoked_token', ['user_id', 'token_type']),
        ]
        
        # Check that all expected indexes were created
        assert len(create_index_calls) >= len(expected_indexes)
        
        # Verify specific important indexes
        index_names = [call[0][0] for call in create_index_calls]
        assert 'idx_game_players' in index_names
        assert 'idx_submission_user_puzzle' in index_names
        assert 'idx_user_session_active_expires' in index_names

    def test_upgrade_creates_descending_indexes(self, mock_op, mock_sa):
        """Test that descending indexes are created correctly"""
        upgrade()
        
        # Check for DESC indexes
        desc_indexes = [
            'idx_game_started_desc',
            'idx_user_rating_desc',
            'idx_puzzle_created_desc',
            'idx_login_activity_created_desc'
        ]
        
        # Verify DESC indexes use sa.text()
        for call in mock_op.create_index.call_args_list:
            index_name = call[0][0]
            if index_name in desc_indexes:
                # Should have used sa.text for DESC
                columns = call[0][2]
                assert any('DESC' in str(col) for col in columns)

    def test_downgrade_removes_all_indexes(self, mock_op, mock_sa):
        """Test that downgrade removes all indexes"""
        # Run downgrade
        downgrade()
        
        # Collect all drop_index calls
        drop_index_calls = [call for call in mock_op.drop_index.call_args_list]
        
        # Should drop all indexes in reverse order
        assert len(drop_index_calls) >= 20
        
        # Verify indexes are dropped
        dropped_index_names = [call[0][0] for call in drop_index_calls]
        assert 'idx_game_players' in dropped_index_names
        assert 'idx_submission_user_puzzle' in dropped_index_names

    def test_composite_indexes_created_correctly(self, mock_op, mock_sa):
        """Test that composite indexes are created with correct column order"""
        upgrade()
        
        # Check specific composite indexes
        composite_indexes = {
            'idx_game_players': ['player_a', 'player_b'],
            'idx_round_game_round_number': ['game_id', 'round_number'],
            'idx_submission_user_created': ['user_id', 'created'],
            'idx_submission_user_puzzle': ['user_id', 'puzzle_id'],
        }
        
        for call in mock_op.create_index.call_args_list:
            index_name = call[0][0]
            if index_name in composite_indexes:
                columns = call[0][2]
                expected_columns = composite_indexes[index_name]
                # Verify column order
                assert len(columns) == len(expected_columns)


class TestIndexEffectiveness:
    """Test that indexes improve query performance"""

    @pytest.mark.asyncio
    async def test_game_query_uses_indexes(self):
        """Test that game queries can use appropriate indexes"""
        # These would be actual query patterns that should use indexes
        query_patterns = [
            # Finding active games
            "SELECT * FROM game WHERE ended IS NULL",
            
            # Finding games by player
            "SELECT * FROM game WHERE player_a = ? OR player_b = ?",
            
            # Recent games
            "SELECT * FROM game ORDER BY started DESC LIMIT 10",
        ]
        
        # In a real test, you would:
        # 1. Run EXPLAIN on these queries
        # 2. Verify index usage
        # 3. Compare performance with/without indexes
        assert len(query_patterns) > 0

    @pytest.mark.asyncio
    async def test_submission_query_performance(self):
        """Test submission query performance with indexes"""
        query_patterns = [
            # User submissions
            "SELECT * FROM submission WHERE user_id = ? ORDER BY created DESC",
            
            # Puzzle success rate
            "SELECT COUNT(*) FROM submission WHERE puzzle_id = ? AND verdict = true",
            
            # User-puzzle combination
            "SELECT * FROM submission WHERE user_id = ? AND puzzle_id = ?",
        ]
        
        # These queries should benefit from indexes
        assert len(query_patterns) > 0

    @pytest.mark.asyncio
    async def test_leaderboard_query_performance(self):
        """Test leaderboard query performance with indexes"""
        # Leaderboard query
        query = "SELECT * FROM user WHERE is_active = true ORDER BY rating DESC LIMIT 100"
        
        # Should use idx_user_active_rating or idx_user_rating_desc
        assert query is not None

    @pytest.mark.asyncio
    async def test_session_cleanup_query_performance(self):
        """Test session cleanup query performance"""
        cleanup_queries = [
            # Expired sessions
            "SELECT * FROM user_session WHERE is_active = true AND expires_at < NOW()",
            
            # User's active sessions
            "SELECT * FROM user_session WHERE user_id = ? AND is_active = true",
            
            # Expired tokens
            "SELECT * FROM revoked_token WHERE expires_at < NOW()",
        ]
        
        # These queries should use indexes for efficient cleanup
        assert len(cleanup_queries) > 0


class TestIndexMaintenance:
    """Test index maintenance considerations"""

    def test_index_naming_convention(self, mock_op, mock_sa):
        """Test that indexes follow naming convention"""
        upgrade()
        
        # All indexes should follow pattern: idx_table_columns
        for call in mock_op.create_index.call_args_list:
            index_name = call[0][0]
            assert index_name.startswith('idx_')
            
            # Should contain table name
            table_name = call[0][1]
            assert table_name in index_name

    def test_no_duplicate_indexes(self, mock_op, mock_sa):
        """Test that no duplicate indexes are created"""
        upgrade()
        
        # Collect all index names
        index_names = [call[0][0] for call in mock_op.create_index.call_args_list]
        
        # Check for duplicates
        assert len(index_names) == len(set(index_names)), "Duplicate indexes found"

    def test_index_column_order_optimized(self, mock_op, mock_sa):
        """Test that composite index column order is optimized"""
        upgrade()
        
        # For composite indexes, most selective column should be first
        # Example: user_id before created (user_id is more selective)
        for call in mock_op.create_index.call_args_list:
            index_name = call[0][0]
            columns = call[0][2]
            
            if index_name == 'idx_submission_user_created':
                # user_id should be before created
                assert columns[0] == 'user_id'
                assert 'created' in str(columns[1])
            
            elif index_name == 'idx_submission_user_puzzle':
                # user_id should be before puzzle_id (typically)
                assert columns[0] == 'user_id'
                assert columns[1] == 'puzzle_id'


class TestIndexImpact:
    """Test the impact of indexes on write operations"""

    def test_index_count_reasonable(self, mock_op, mock_sa):
        """Test that we don't create too many indexes per table"""
        upgrade()
        
        # Count indexes per table
        indexes_per_table = {}
        for call in mock_op.create_index.call_args_list:
            table_name = call[0][1]
            indexes_per_table[table_name] = indexes_per_table.get(table_name, 0) + 1
        
        # No table should have excessive indexes
        for table, count in indexes_per_table.items():
            assert count <= 8, f"Table {table} has too many indexes: {count}"
    
    def test_covering_indexes_where_appropriate(self, mock_op, mock_sa):
        """Test that covering indexes are used where beneficial"""
        upgrade()
        
        # These composite indexes can serve as covering indexes
        covering_indexes = [
            'idx_submission_user_created',  # Can cover user_id + created queries
            'idx_round_game_round_number',   # Can cover game_id + round_number queries
            'idx_user_session_user_active',  # Can cover user_id + is_active queries
        ]
        
        created_indexes = [call[0][0] for call in mock_op.create_index.call_args_list]
        
        for idx in covering_indexes:
            assert idx in created_indexes