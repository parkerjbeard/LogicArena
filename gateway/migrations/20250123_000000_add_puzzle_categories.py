"""Add puzzle categories and tutorial alignment

Revision ID: 20250123_000000
Create Date: 2025-01-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Add new columns to puzzle table
    op.add_column('puzzle', sa.Column('category', sa.String(50), nullable=True))
    op.add_column('puzzle', sa.Column('chapter', sa.Integer(), nullable=True))
    op.add_column('puzzle', sa.Column('proof_pattern', sa.String(100), nullable=True))
    op.add_column('puzzle', sa.Column('nested_depth', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('puzzle', sa.Column('rules_required', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('puzzle', sa.Column('learning_objective', sa.Text(), nullable=True))
    op.add_column('puzzle', sa.Column('hint_sequence', postgresql.JSON(), nullable=True))
    op.add_column('puzzle', sa.Column('puzzle_metadata', postgresql.JSON(), nullable=True))
    
    # Create index on category and chapter for efficient filtering
    op.create_index('ix_puzzle_category', 'puzzle', ['category'])
    op.create_index('ix_puzzle_chapter', 'puzzle', ['chapter'])
    op.create_index('ix_puzzle_category_difficulty', 'puzzle', ['category', 'difficulty'])
    
    # Update existing puzzles to have a default category
    op.execute("UPDATE puzzle SET category = 'any' WHERE category IS NULL")
    
    # Now make category non-nullable
    op.alter_column('puzzle', 'category',
                    nullable=False,
                    server_default='any')

def downgrade():
    op.drop_index('ix_puzzle_category_difficulty', table_name='puzzle')
    op.drop_index('ix_puzzle_chapter', table_name='puzzle')
    op.drop_index('ix_puzzle_category', table_name='puzzle')
    
    op.drop_column('puzzle', 'puzzle_metadata')
    op.drop_column('puzzle', 'hint_sequence')
    op.drop_column('puzzle', 'learning_objective')
    op.drop_column('puzzle', 'rules_required')
    op.drop_column('puzzle', 'nested_depth')
    op.drop_column('puzzle', 'proof_pattern')
    op.drop_column('puzzle', 'chapter')
    op.drop_column('puzzle', 'category')