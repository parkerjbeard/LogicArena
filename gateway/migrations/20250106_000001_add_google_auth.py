"""
Add Google OAuth support

Generated on: 2025-01-06 00:00:01
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.migrations import Migration

class AddGoogleAuthMigration(Migration):
    def __init__(self):
        super().__init__()
        self.id = "20250106_000001_add_google_auth"
        self.description = "Add Google OAuth support"
    
    def up(self, session: Session):
        """Apply the migration - add google_id column and make pwd_hash nullable"""
        # Check if google_id column already exists
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user' AND column_name = 'google_id'
        """))
        
        if not result.fetchone():
            # Add google_id column
            session.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN google_id VARCHAR(255) UNIQUE
            """))
            
            # Create index for google_id
            session.execute(text("""
                CREATE INDEX idx_user_google_id ON "user"(google_id)
            """))
        
        # Make pwd_hash nullable for OAuth users
        session.execute(text("""
            ALTER TABLE "user" 
            ALTER COLUMN pwd_hash DROP NOT NULL
        """))
    
    def down(self, session: Session):
        """Rollback the migration - remove google_id column and make pwd_hash required"""
        # Drop the index first
        session.execute(text("DROP INDEX IF EXISTS idx_user_google_id"))
        
        # Remove google_id column
        session.execute(text("""
            ALTER TABLE "user" 
            DROP COLUMN IF EXISTS google_id
        """))
        
        # Make pwd_hash required again (but first set empty strings to a default)
        session.execute(text("""
            UPDATE "user" 
            SET pwd_hash = 'oauth_user_no_password' 
            WHERE pwd_hash IS NULL
        """))
        
        session.execute(text("""
            ALTER TABLE "user" 
            ALTER COLUMN pwd_hash SET NOT NULL
        """))