#!/usr/bin/env python3
"""
Database migration CLI script

Usage:
    python migrate.py migrate              # Run all pending migrations
    python migrate.py rollback             # Rollback the last migration
    python migrate.py rollback <id>        # Rollback a specific migration
    python migrate.py create "Description" # Create a new migration file
    python migrate.py status               # Show migration status
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.migrations import MigrationRunner
from app.db.session import engine
from sqlalchemy import text

def show_status():
    """Show the current migration status"""
    runner = MigrationRunner()
    
    with engine.connect() as conn:
        # Get applied migrations
        result = conn.execute(text("""
            SELECT id, description, applied_at 
            FROM migrations 
            ORDER BY applied_at DESC 
            LIMIT 10
        """))
        applied = list(result)
    
    # Get all migration files
    all_migrations = runner._get_migration_files()
    applied_ids = set(row[0] for row in applied)
    
    print("\n=== Migration Status ===\n")
    
    if applied:
        print("Applied migrations (latest first):")
        for id, desc, applied_at in applied:
            print(f"  ✓ {id} - {desc or 'No description'} (applied: {applied_at})")
    else:
        print("No migrations have been applied yet.")
    
    # Show pending migrations
    pending = [m for m in all_migrations if m[0] not in applied_ids]
    if pending:
        print("\nPending migrations:")
        for id, _ in pending:
            print(f"  ○ {id}")
    else:
        print("\nAll migrations are up to date.")
    
    print()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    runner = MigrationRunner()
    
    if command == "migrate":
        runner.run_migrations()
    elif command == "rollback":
        migration_id = sys.argv[2] if len(sys.argv) > 2 else None
        runner.rollback_migration(migration_id)
    elif command == "create":
        if len(sys.argv) < 3:
            print("Usage: python migrate.py create 'Description of migration'")
            sys.exit(1)
        description = ' '.join(sys.argv[2:])
        runner.create_migration(description)
    elif command == "status":
        show_status()
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)

if __name__ == "__main__":
    main()