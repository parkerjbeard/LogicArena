"""
Tests for database connection pooling functionality
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
import time

from app.db.session import (
    engine,
    get_db,
    get_db_context,
    close_db_connections,
    verify_db_connection,
    pool_monitor,
    ConnectionPoolMonitor,
    POOL_SIZE,
    MAX_OVERFLOW
)


class TestConnectionPooling:
    """Test database connection pooling functionality"""

    @pytest.mark.asyncio
    async def test_connection_pool_configuration(self):
        """Test that connection pool is configured correctly"""
        # Check pool class
        assert isinstance(engine.pool, QueuePool)
        
        # Check pool configuration
        pool = engine.pool
        assert pool.size() <= POOL_SIZE
        assert hasattr(pool, '_max_overflow')
        
        # Verify pool settings from config
        assert POOL_SIZE == 20  # From settings
        assert MAX_OVERFLOW == 10  # From settings

    @pytest.mark.asyncio
    async def test_get_db_returns_session(self):
        """Test that get_db returns a valid session"""
        async for session in get_db():
            assert isinstance(session, AsyncSession)
            assert session.is_active
            break

    @pytest.mark.asyncio
    async def test_get_db_context_commits_on_success(self):
        """Test that get_db_context commits on successful operation"""
        commit_called = False
        rollback_called = False
        
        class MockSession:
            async def commit(self):
                nonlocal commit_called
                commit_called = True
            
            async def rollback(self):
                nonlocal rollback_called
                rollback_called = True
            
            async def close(self):
                pass
        
        with patch('app.db.session.AsyncSessionLocal') as mock_session_local:
            mock_session = MockSession()
            mock_session_local.return_value.__aenter__.return_value = mock_session
            
            async with get_db_context() as session:
                assert session == mock_session
            
            assert commit_called
            assert not rollback_called

    @pytest.mark.asyncio
    async def test_get_db_context_rollback_on_error(self):
        """Test that get_db_context rolls back on error"""
        commit_called = False
        rollback_called = False
        
        class MockSession:
            async def commit(self):
                nonlocal commit_called
                commit_called = True
            
            async def rollback(self):
                nonlocal rollback_called
                rollback_called = True
            
            async def close(self):
                pass
        
        with patch('app.db.session.AsyncSessionLocal') as mock_session_local:
            mock_session = MockSession()
            mock_session_local.return_value.__aenter__.return_value = mock_session
            
            with pytest.raises(ValueError):
                async with get_db_context() as session:
                    raise ValueError("Test error")
            
            assert not commit_called
            assert rollback_called

    @pytest.mark.asyncio
    async def test_connection_pool_under_load(self):
        """Test connection pool behavior under concurrent load"""
        concurrent_requests = POOL_SIZE + 5  # More than pool size
        results = []
        
        async def make_request(index):
            """Simulate a database request"""
            try:
                async for session in get_db():
                    # Simulate some work
                    await asyncio.sleep(0.1)
                    results.append(f"Request {index} completed")
                    break
            except Exception as e:
                results.append(f"Request {index} failed: {str(e)}")
        
        # Run concurrent requests
        start_time = time.time()
        await asyncio.gather(*[make_request(i) for i in range(concurrent_requests)])
        end_time = time.time()
        
        # All requests should complete
        assert len(results) == concurrent_requests
        assert all("completed" in r for r in results)
        
        # Should complete reasonably quickly despite exceeding pool size
        assert end_time - start_time < 2.0  # Should use overflow connections

    @pytest.mark.asyncio
    async def test_verify_db_connection(self):
        """Test database connection verification"""
        with patch.object(engine, 'connect') as mock_connect:
            # Mock successful connection
            mock_conn = MagicMock()
            mock_conn.execute = asyncio.coroutine(lambda x: None)
            mock_connect.return_value.__aenter__.return_value = mock_conn
            
            result = await verify_db_connection()
            assert result is True
            mock_conn.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_db_connection_failure(self):
        """Test database connection verification on failure"""
        with patch.object(engine, 'connect') as mock_connect:
            # Mock connection failure
            mock_connect.side_effect = Exception("Connection failed")
            
            result = await verify_db_connection()
            assert result is False

    @pytest.mark.asyncio
    async def test_close_db_connections(self):
        """Test closing database connections"""
        with patch.object(engine, 'dispose') as mock_dispose:
            mock_dispose.return_value = asyncio.coroutine(lambda: None)()
            
            await close_db_connections()
            mock_dispose.assert_called_once()


class TestConnectionPoolMonitor:
    """Test connection pool monitoring functionality"""

    @pytest.mark.asyncio
    async def test_monitor_initialization(self):
        """Test connection pool monitor initialization"""
        mock_engine = Mock(spec=AsyncEngine)
        monitor = ConnectionPoolMonitor(mock_engine)
        
        assert monitor.engine == mock_engine
        assert monitor._monitoring_task is None
        assert monitor._stop_monitoring is False

    @pytest.mark.asyncio
    async def test_start_monitoring(self):
        """Test starting connection pool monitoring"""
        mock_engine = Mock(spec=AsyncEngine)
        monitor = ConnectionPoolMonitor(mock_engine)
        
        # Start monitoring
        await monitor.start_monitoring(interval=1)
        
        assert monitor._monitoring_task is not None
        assert not monitor._stop_monitoring
        
        # Stop monitoring
        await monitor.stop_monitoring()
        assert monitor._stop_monitoring is True

    @pytest.mark.asyncio
    async def test_get_pool_stats(self):
        """Test getting pool statistics"""
        mock_engine = Mock(spec=AsyncEngine)
        mock_pool = Mock()
        mock_pool.size.return_value = 10
        mock_pool.checked_out_connections = 3
        mock_pool.overflow = 2
        mock_engine.pool = mock_pool
        
        monitor = ConnectionPoolMonitor(mock_engine)
        stats = monitor.get_pool_stats()
        
        assert stats['size'] == 10
        assert stats['checked_out'] == 3
        assert stats['overflow'] == 2
        assert stats['total'] == 12
        assert stats['max_overflow'] == MAX_OVERFLOW

    @pytest.mark.asyncio
    async def test_monitor_loop_logs_warnings(self, caplog):
        """Test that monitor warns when pool is near capacity"""
        mock_engine = Mock(spec=AsyncEngine)
        mock_pool = Mock()
        mock_pool.size.return_value = POOL_SIZE
        mock_pool.checked_out_connections = POOL_SIZE
        mock_pool.overflow = int(MAX_OVERFLOW * 0.9)  # 90% of max overflow
        mock_engine.pool = mock_pool
        
        monitor = ConnectionPoolMonitor(mock_engine)
        monitor._stop_monitoring = False
        
        # Run one iteration of monitoring
        await monitor._monitor_loop(0.1)
        
        # Check for warning log
        assert any("Connection pool overflow is high" in record.message 
                  for record in caplog.records)

    @pytest.mark.asyncio
    async def test_monitor_handles_errors_gracefully(self, caplog):
        """Test that monitor handles errors without crashing"""
        mock_engine = Mock(spec=AsyncEngine)
        mock_engine.pool = None  # Will cause an error
        
        monitor = ConnectionPoolMonitor(mock_engine)
        monitor._stop_monitoring = False
        
        # Should not raise exception
        await monitor._monitor_loop(0.1)
        
        # Should log error
        assert any("Error monitoring connection pool" in record.message 
                  for record in caplog.records)


class TestConnectionPoolIntegration:
    """Integration tests for connection pooling"""

    @pytest.mark.asyncio
    async def test_connection_reuse(self):
        """Test that connections are properly reused from the pool"""
        connection_ids = []
        
        # Get multiple sessions sequentially
        for _ in range(5):
            async for session in get_db():
                # Get the underlying connection ID (if available)
                if hasattr(session, 'connection'):
                    conn_id = id(session.connection)
                    connection_ids.append(conn_id)
                break
        
        # Some connections should be reused (not all unique)
        assert len(set(connection_ids)) < len(connection_ids)

    @pytest.mark.asyncio
    async def test_pool_exhaustion_handling(self):
        """Test behavior when pool is exhausted"""
        # This test would need to actually exhaust the pool
        # which might interfere with other tests, so we'll mock it
        
        with patch('app.db.session.POOL_SIZE', 2), \
             patch('app.db.session.MAX_OVERFLOW', 1), \
             patch('app.db.session.POOL_TIMEOUT', 0.5):
            
            sessions = []
            
            # Acquire more connections than pool + overflow
            try:
                for i in range(4):
                    session_gen = get_db()
                    session = await anext(session_gen)
                    sessions.append((session, session_gen))
                    
                # Should not reach here - should timeout
                assert False, "Expected timeout but got all sessions"
                
            except Exception as e:
                # Should get a timeout or queue full error
                assert "timeout" in str(e).lower() or "queue" in str(e).lower()
            
            finally:
                # Clean up sessions
                for session, gen in sessions:
                    try:
                        await gen.aclose()
                    except:
                        pass

    @pytest.mark.asyncio
    async def test_connection_pool_statistics_accuracy(self):
        """Test that pool statistics are accurate"""
        initial_stats = pool_monitor.get_pool_stats()
        
        sessions = []
        session_gens = []
        
        # Acquire some connections
        for _ in range(3):
            gen = get_db()
            session = await anext(gen)
            sessions.append(session)
            session_gens.append(gen)
        
        # Check stats show connections are checked out
        during_stats = pool_monitor.get_pool_stats()
        assert during_stats['checked_out'] >= initial_stats['checked_out'] + 3
        
        # Release connections
        for gen in session_gens:
            await gen.aclose()
        
        # Give pool time to update
        await asyncio.sleep(0.1)
        
        # Stats should show connections returned
        final_stats = pool_monitor.get_pool_stats()
        assert final_stats['checked_out'] <= initial_stats['checked_out'] + 1