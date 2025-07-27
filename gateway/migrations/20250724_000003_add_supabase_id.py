"""Add Supabase ID field to user table"""

from sqlalchemy import text
from app.db.session import engine
import asyncio

async def run_migration():
    """Run the Supabase ID migration"""
    
    async with engine.begin() as conn:
        # Add supabase_id column
        await conn.execute(text("""
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS supabase_id VARCHAR(255)
        """))
        
        # Create unique index on supabase_id
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_supabase_id ON "user"(supabase_id)
        """))
        
        print("Supabase ID migration completed successfully")

if __name__ == "__main__":
    asyncio.run(run_migration())