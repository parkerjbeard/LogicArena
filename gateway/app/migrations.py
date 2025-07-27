import os
import sys
import importlib.util
from datetime import datetime
from typing import List, Tuple
from sqlalchemy import text, create_engine
from sqlalchemy.orm import Session
from app.config import settings

# Create sync engine for migrations
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql+asyncpg://"):
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    
engine = create_engine(database_url)

class Migration:
    """Base class for database migrations"""
    
    def __init__(self):
        self.id = None
        self.description = None
    
    def up(self, session: Session):
        """Apply the migration"""
        raise NotImplementedError
    
    def down(self, session: Session):
        """Rollback the migration"""
        raise NotImplementedError

class MigrationRunner:
    """Handles running database migrations"""
    
    def __init__(self):
        self.migrations_dir = os.path.join(os.path.dirname(__file__), '..', 'migrations')
        self._ensure_migrations_table()
    
    def _ensure_migrations_table(self):
        """Create migrations tracking table if it doesn't exist"""
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS migrations (
                    id VARCHAR(255) PRIMARY KEY,
                    description TEXT,
                    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()
    
    def _get_applied_migrations(self) -> List[str]:
        """Get list of already applied migrations"""
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id FROM migrations ORDER BY applied_at"))
            return [row[0] for row in result]
    
    def _get_migration_files(self) -> List[Tuple[str, str]]:
        """Get all migration files sorted by timestamp"""
        migrations = []
        
        if not os.path.exists(self.migrations_dir):
            os.makedirs(self.migrations_dir)
            return migrations
        
        for filename in os.listdir(self.migrations_dir):
            if filename.endswith('.py') and filename != '__init__.py':
                filepath = os.path.join(self.migrations_dir, filename)
                migrations.append((filename[:-3], filepath))  # Remove .py extension
        
        return sorted(migrations)
    
    def _load_migration(self, filepath: str) -> Migration:
        """Load a migration from a file"""
        spec = importlib.util.spec_from_file_location("migration", filepath)
        module = importlib.util.module_from_spec(spec)
        
        # Add the current directory to sys.path to resolve imports
        import sys
        sys.path.insert(0, os.path.dirname(os.path.dirname(filepath)))
        
        try:
            spec.loader.exec_module(module)
        finally:
            sys.path.pop(0)
        
        # Find the Migration subclass in the module
        for name in dir(module):
            obj = getattr(module, name)
            if (isinstance(obj, type) and 
                issubclass(obj, Migration) and 
                obj is not Migration):
                return obj()
        
        raise ValueError(f"No Migration class found in {filepath}")
    
    def run_migrations(self):
        """Run all pending migrations"""
        applied = set(self._get_applied_migrations())
        migration_files = self._get_migration_files()
        
        pending = [(id, path) for id, path in migration_files if id not in applied]
        
        if not pending:
            print("No pending migrations")
            return
        
        print(f"Found {len(pending)} pending migrations")
        
        with Session(engine) as session:
            for migration_id, filepath in pending:
                print(f"Running migration: {migration_id}")
                
                try:
                    migration = self._load_migration(filepath)
                    migration.id = migration_id
                    
                    # Run the migration
                    migration.up(session)
                    
                    # Record that it was applied
                    session.execute(text(
                        "INSERT INTO migrations (id, description) VALUES (:id, :desc)"
                    ), {"id": migration_id, "desc": migration.description or ""})
                    
                    session.commit()
                    print(f"✓ Migration {migration_id} applied successfully")
                    
                except Exception as e:
                    session.rollback()
                    print(f"✗ Migration {migration_id} failed: {str(e)}")
                    raise
    
    def rollback_migration(self, migration_id: str = None):
        """Rollback the last migration or a specific one"""
        applied = self._get_applied_migrations()
        
        if not applied:
            print("No migrations to rollback")
            return
        
        if migration_id is None:
            migration_id = applied[-1]
        elif migration_id not in applied:
            print(f"Migration {migration_id} has not been applied")
            return
        
        # Find the migration file
        migration_files = dict(self._get_migration_files())
        if migration_id not in migration_files:
            print(f"Migration file {migration_id}.py not found")
            return
        
        with Session(engine) as session:
            try:
                migration = self._load_migration(migration_files[migration_id])
                migration.id = migration_id
                
                # Run the rollback
                migration.down(session)
                
                # Remove from migrations table
                session.execute(text(
                    "DELETE FROM migrations WHERE id = :id"
                ), {"id": migration_id})
                
                session.commit()
                print(f"✓ Migration {migration_id} rolled back successfully")
                
            except Exception as e:
                session.rollback()
                print(f"✗ Rollback of {migration_id} failed: {str(e)}")
                raise
    
    def create_migration(self, description: str) -> str:
        """Create a new migration file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{description.lower().replace(' ', '_')}.py"
        filepath = os.path.join(self.migrations_dir, filename)
        
        template = f'''"""
{description}

Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.migrations import Migration

class {description.replace(' ', '')}Migration(Migration):
    def __init__(self):
        super().__init__()
        self.id = "{timestamp}_{description.lower().replace(' ', '_')}"
        self.description = "{description}"
    
    def up(self, session: Session):
        """Apply the migration"""
        # Add your migration code here
        # Example: session.execute(text("ALTER TABLE user ADD COLUMN new_field VARCHAR(255)"))
        pass
    
    def down(self, session: Session):
        """Rollback the migration"""
        # Add your rollback code here
        # Example: session.execute(text("ALTER TABLE user DROP COLUMN new_field"))
        pass
'''
        
        os.makedirs(self.migrations_dir, exist_ok=True)
        with open(filepath, 'w') as f:
            f.write(template)
        
        print(f"Created migration: {filepath}")
        return filename

# CLI commands
if __name__ == "__main__":
    runner = MigrationRunner()
    
    if len(sys.argv) < 2:
        print("Usage: python -m app.migrations [migrate|rollback|create]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "migrate":
        runner.run_migrations()
    elif command == "rollback":
        migration_id = sys.argv[2] if len(sys.argv) > 2 else None
        runner.rollback_migration(migration_id)
    elif command == "create":
        if len(sys.argv) < 3:
            print("Usage: python -m app.migrations create 'Description of migration'")
            sys.exit(1)
        description = ' '.join(sys.argv[2:])
        runner.create_migration(description)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)