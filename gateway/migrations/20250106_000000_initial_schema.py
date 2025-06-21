"""
Initial schema creation

Generated on: 2025-01-06 00:00:00
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.migrations import Migration

class InitialSchemaCreation(Migration):
    def __init__(self):
        super().__init__()
        self.id = "20250106_000000_initial_schema"
        self.description = "Initial schema creation"
    
    def up(self, session: Session):
        """Apply the migration - create all tables"""
        # Read and execute the schema.sql file
        import os
        schema_path = os.path.join(os.path.dirname(__file__), '..', '..', 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in schema_sql.split(';') if s.strip()]
        for statement in statements:
            if statement:
                session.execute(text(statement))
    
    def down(self, session: Session):
        """Rollback the migration - drop all tables"""
        # Drop indexes first
        session.execute(text("DROP INDEX IF EXISTS idx_round_game_id"))
        session.execute(text("DROP INDEX IF EXISTS idx_submission_verdict"))
        session.execute(text("DROP INDEX IF EXISTS idx_submission_user_id"))
        session.execute(text("DROP INDEX IF EXISTS idx_game_player_b"))
        session.execute(text("DROP INDEX IF EXISTS idx_game_player_a"))
        session.execute(text("DROP INDEX IF EXISTS idx_puzzle_difficulty"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_google_id"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_rating"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_email"))
        session.execute(text("DROP INDEX IF EXISTS idx_user_handle"))
        
        # Drop tables in reverse order of dependencies
        session.execute(text("DROP TABLE IF EXISTS submission CASCADE"))
        session.execute(text("DROP TABLE IF EXISTS round CASCADE"))
        session.execute(text("DROP TABLE IF EXISTS game CASCADE"))
        session.execute(text("DROP TABLE IF EXISTS puzzle CASCADE"))
        session.execute(text('DROP TABLE IF EXISTS "user" CASCADE'))