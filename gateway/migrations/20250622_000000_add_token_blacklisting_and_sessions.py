"""
Add token blacklisting and session management

Generated on: 2025-06-22 00:00:00
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.migrations import Migration

class AddTokenBlacklistingAndSessionsMigration(Migration):
    def __init__(self):
        super().__init__()
        self.id = "20250622_000000_add_token_blacklisting_and_sessions"
        self.description = "Add token blacklisting and session management"
    
    def up(self, session: Session):
        """Apply the migration - create revoked_token and user_session tables"""
        
        # Create revoked_token table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS revoked_token (
                id SERIAL PRIMARY KEY,
                jti VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                token_type VARCHAR(20) NOT NULL,
                revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                reason VARCHAR(255)
            )
        """))
        
        # Create indexes for revoked_token
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_revoked_token_jti ON revoked_token(jti);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_revoked_token_user_id ON revoked_token(user_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_revoked_token_expires_at ON revoked_token(expires_at);
        """))
        
        # Create user_session table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS user_session (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES "user"(id),
                session_id VARCHAR(255) UNIQUE NOT NULL,
                refresh_token_jti VARCHAR(255) UNIQUE NOT NULL,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            )
        """))
        
        # Create indexes for user_session
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_session_session_id ON user_session(session_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_session_refresh_token_jti ON user_session(refresh_token_jti);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_session_user_id ON user_session(user_id);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_session_is_active ON user_session(is_active);
        """))
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_session_expires_at ON user_session(expires_at);
        """))
    
    def down(self, session: Session):
        """Rollback the migration - drop revoked_token and user_session tables"""
        
        # Drop indexes for user_session
        session.execute(text("DROP INDEX IF EXISTS idx_user_session_expires_at"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_session_is_active"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_session_user_id"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_session_refresh_token_jti"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_session_session_id"))
        
        # Drop user_session table
        session.execute(text("DROP TABLE IF EXISTS user_session"))
        
        # Drop indexes for revoked_token
        session.execute(text("DROP INDEX IF EXISTS idx_revoked_token_expires_at"))
        session.execute(text("DROP INDEX IF EXISTS idx_revoked_token_user_id"))
        session.execute(text("DROP INDEX IF EXISTS idx_revoked_token_jti"))
        
        # Drop revoked_token table
        session.execute(text("DROP TABLE IF EXISTS revoked_token"))