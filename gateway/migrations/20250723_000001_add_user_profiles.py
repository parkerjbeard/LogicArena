"""
Add user profile fields and progress tracking tables

Created: 2025-07-23
"""

from sqlalchemy import text
from app.migrations import Migration


class AddUserProfiles(Migration):
    def __init__(self):
        super().__init__()
        self.id = "20250723_000001_add_user_profiles"
        self.description = "Add user profile fields and progress tracking tables"
    
    def up(self, db):
        # Add profile fields to user table
        db.execute(text("""
            ALTER TABLE "user" 
            ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS total_practice_time INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS preferences JSON DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_streak_date DATE;
        """))
        
        # Create table for tracking puzzle progress per user
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_puzzle_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                puzzle_id INTEGER NOT NULL,
                first_completed_at TIMESTAMP,
                best_solution_length INTEGER,
                best_solution_proof TEXT,
                total_attempts INTEGER DEFAULT 0,
                successful_attempts INTEGER DEFAULT 0,
                average_time_seconds INTEGER,
                hints_used INTEGER DEFAULT 0,
                last_attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
                FOREIGN KEY (puzzle_id) REFERENCES puzzle(id) ON DELETE CASCADE,
                UNIQUE(user_id, puzzle_id)
            );
        """))
        
        # Create table for tracking tutorial progress
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_tutorial_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tutorial_id VARCHAR(100) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                progress_data JSON DEFAULT '{}',
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
                UNIQUE(user_id, tutorial_id)
            );
        """))
        
        # Create table for user achievements
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_achievement (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_id VARCHAR(100) NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress INTEGER DEFAULT 0,
                target INTEGER DEFAULT 100,
                metadata JSON DEFAULT '{}',
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_id)
            );
        """))
        
        # Create table for daily user statistics
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                puzzles_attempted INTEGER DEFAULT 0,
                puzzles_solved INTEGER DEFAULT 0,
                practice_time_seconds INTEGER DEFAULT 0,
                experience_gained INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
                UNIQUE(user_id, date)
            );
        """))
        
        # Create indexes for performance
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_puzzle_progress_user ON user_puzzle_progress(user_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_puzzle_progress_puzzle ON user_puzzle_progress(puzzle_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_user ON user_tutorial_progress(user_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_achievement_user ON user_achievement(user_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats(user_id, date);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_experience ON \"user\"(experience_points);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_level ON \"user\"(level);"))
        
        # Update existing submissions to properly link to users (instead of defaulting to user_id=1)
        # This is a placeholder - in production you'd want a more sophisticated migration strategy
        db.execute(text("""
            UPDATE submission 
            SET user_id = 1 
            WHERE user_id IS NULL;
        """))

    def down(self, db):
        # Drop indexes
        db.execute(text("DROP INDEX IF EXISTS idx_user_experience;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_level;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_puzzle_progress_user;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_puzzle_progress_puzzle;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_tutorial_progress_user;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_achievement_user;"))
        db.execute(text("DROP INDEX IF EXISTS idx_user_daily_stats_user_date;"))
        
        # Drop tables
        db.execute(text("DROP TABLE IF EXISTS user_daily_stats;"))
        db.execute(text("DROP TABLE IF EXISTS user_achievement;"))
        db.execute(text("DROP TABLE IF EXISTS user_tutorial_progress;"))
        db.execute(text("DROP TABLE IF EXISTS user_puzzle_progress;"))
        
        # Remove columns from user table (SQLite doesn't support DROP COLUMN directly)
        # In production, you'd need to recreate the table without these columns
        # For now, we'll leave this as a comment since SQLite has limitations
        """
        # SQLite doesn't support DROP COLUMN, so in production you would:
        # 1. Create a new table without the columns
        # 2. Copy data from old table
        # 3. Drop old table
        # 4. Rename new table
        """