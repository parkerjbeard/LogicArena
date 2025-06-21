#!/usr/bin/env python3
"""
Database migration script to add is_admin field to users table
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the gateway directory to Python path
gateway_dir = Path(__file__).parent
sys.path.insert(0, str(gateway_dir))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def add_admin_field():
    """Add is_admin field to the user table"""
    engine = create_async_engine(settings.DATABASE_URL)
    
    try:
        async with engine.begin() as conn:
            # Check if column already exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user' AND column_name = 'is_admin'
            """))
            
            if result.fetchone():
                print("✓ is_admin column already exists")
                return
            
            # Add the column
            await conn.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE
            """))
            
            print("✓ Added is_admin column to user table")
            
            # Optionally, make the first user an admin (for testing)
            result = await conn.execute(text("""
                SELECT id FROM "user" ORDER BY id LIMIT 1
            """))
            first_user = result.fetchone()
            
            if first_user:
                await conn.execute(text("""
                    UPDATE "user" SET is_admin = TRUE WHERE id = :user_id
                """), {"user_id": first_user[0]})
                print(f"✓ Made user {first_user[0]} an admin for testing")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()

async def main():
    print("Adding is_admin field to user table...")
    await add_admin_field()
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())