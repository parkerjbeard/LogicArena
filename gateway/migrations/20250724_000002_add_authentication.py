"""Add authentication fields to user table"""

from sqlalchemy import text
from app.db.session import engine
import asyncio
import bcrypt

async def run_migration():
    """Run the authentication migration"""
    
    # Default password for demo users
    default_password = "demo123"
    password_hash = bcrypt.hashpw(
        default_password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')
    
    async with engine.begin() as conn:
        # Add password_hash column
        await conn.execute(text("""
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
        """))
        
        # Create index on email for faster lookups
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email)
        """))
        
        # Update existing users with default password
        await conn.execute(text("""
            UPDATE "user" 
            SET password_hash = :password_hash
            WHERE password_hash IS NULL
        """), {"password_hash": password_hash})
        
        print("Authentication migration completed successfully")
        print(f"Default password for existing users: {default_password}")

if __name__ == "__main__":
    asyncio.run(run_migration())