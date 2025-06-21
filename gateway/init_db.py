import asyncio
import os
import sys
import psycopg2
import psycopg2.extras
import logging
from app.auth.utils import get_password_hash
from app.migrations import MigrationRunner
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://logicuser:logicpass@postgres:5432/logicarena")

# Sample data for initialization
SAMPLE_USERS = [
    {
        "handle": "alice",
        "email": "alice@example.com",
        "password": "password123",
        "rating": 1200
    },
    {
        "handle": "bob",
        "email": "bob@example.com",
        "password": "password123",
        "rating": 1100
    },
    {
        "handle": "charlie",
        "email": "charlie@example.com",
        "password": "password123",
        "rating": 1300
    }
]

# Basic natural deduction examples for testing
SAMPLE_PUZZLES = [
    {
        "gamma": "P → Q, P",
        "phi": "Q",
        "difficulty": 1,
        "best_len": 3,
        "machine_proof": "1. P → Q [Premise]\n2. P [Premise]\n3. Q [→E 1,2]"
    },
    {
        "gamma": "P → Q, Q → R",
        "phi": "P → R",
        "difficulty": 2,
        "best_len": 5,
        "machine_proof": "1. P → Q [Premise]\n2. Q → R [Premise]\n3. P [Assumption]\n4. Q [→E 1,3]\n5. R [→E 2,4]\n6. P → R [→I 3-5]"
    },
    {
        "gamma": "(P ∧ Q) → R, P, Q",
        "phi": "R",
        "difficulty": 2,
        "best_len": 5,
        "machine_proof": "1. (P ∧ Q) → R [Premise]\n2. P [Premise]\n3. Q [Premise]\n4. P ∧ Q [∧I 2,3]\n5. R [→E 1,4]"
    }
]

def execute_sql_file(conn, filepath):
    """Execute SQL statements from a file."""
    with open(filepath, 'r') as f:
        sql = f.read()
        with conn.cursor() as cur:
            cur.execute(sql)

def create_tables(conn):
    """Create database tables using migrations."""
    logger.info("Running database migrations...")
    runner = MigrationRunner()
    runner.run_migrations()
    logger.info("Database migrations completed successfully")

def create_sample_users(conn):
    """Create sample users."""
    logger.info("Creating sample users...")
    with conn.cursor() as cur:
        # Check if users already exist
        cur.execute('SELECT COUNT(*) FROM "user"')
        user_count = cur.fetchone()[0]
        
        if user_count > 0:
            logger.info(f"Skipping sample users, {user_count} users already exist")
            return
        
        # Create sample users
        for user_data in SAMPLE_USERS:
            pwd_hash = get_password_hash(user_data["password"])
            cur.execute(
                """
                INSERT INTO "user" (handle, email, pwd_hash, rating, created)
                VALUES (%s, %s, %s, %s, NOW())
                """,
                (
                    user_data["handle"],
                    user_data["email"],
                    pwd_hash,
                    user_data["rating"]
                )
            )
        
        logger.info(f"Created {len(SAMPLE_USERS)} sample users")

def create_sample_puzzles(conn):
    """Create sample puzzles."""
    logger.info("Creating sample puzzles...")
    with conn.cursor() as cur:
        # Check if puzzles already exist
        cur.execute('SELECT COUNT(*) FROM puzzle')
        puzzle_count = cur.fetchone()[0]
        
        if puzzle_count > 0:
            logger.info(f"Skipping sample puzzles, {puzzle_count} puzzles already exist")
            return
        
        # Create sample puzzles
        for puzzle_data in SAMPLE_PUZZLES:
            cur.execute(
                """
                INSERT INTO puzzle (gamma, phi, difficulty, best_len, machine_proof, created)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (
                    puzzle_data["gamma"],
                    puzzle_data["phi"],
                    puzzle_data["difficulty"],
                    puzzle_data["best_len"],
                    puzzle_data["machine_proof"]
                )
            )
        
        logger.info(f"Created {len(SAMPLE_PUZZLES)} sample puzzles")

def main():
    """Initialize the database."""
    logger.info("Initializing database...")
    
    try:
        # Connect to the database
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        
        # Create tables
        create_tables(conn)
        
        # Create sample data
        create_sample_users(conn)
        create_sample_puzzles(conn)
        
        logger.info("Database initialization completed successfully")
    
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 