-- Migration: Add PuzzleVerificationLog table and missing columns
-- Date: 2025-08-05
-- Description: Support for algorithmic puzzle generation and verification tracking

-- Add missing PuzzleVerificationLog table
CREATE TABLE IF NOT EXISTS puzzle_verification_log (
    id SERIAL PRIMARY KEY,
    puzzle_id INTEGER REFERENCES puzzle(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    errors TEXT[],
    optimal_length INTEGER,
    optimal_proof TEXT,
    verification_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_puzzle_verification_log_puzzle_id 
    ON puzzle_verification_log(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_verification_log_status 
    ON puzzle_verification_log(status);
CREATE INDEX IF NOT EXISTS idx_puzzle_verification_log_created_at 
    ON puzzle_verification_log(created_at);

-- Add missing columns to puzzle table if they don't exist
ALTER TABLE puzzle 
    ADD COLUMN IF NOT EXISTS hint_text TEXT;

ALTER TABLE puzzle 
    ADD COLUMN IF NOT EXISTS hint_sequence JSONB DEFAULT '{}';

ALTER TABLE puzzle 
    ADD COLUMN IF NOT EXISTS actual_optimal_length INTEGER;

-- Add indexes for new puzzle columns
CREATE INDEX IF NOT EXISTS idx_puzzle_category 
    ON puzzle(category);
CREATE INDEX IF NOT EXISTS idx_puzzle_chapter 
    ON puzzle(chapter);
CREATE INDEX IF NOT EXISTS idx_puzzle_verification_status 
    ON puzzle(verification_status);
CREATE INDEX IF NOT EXISTS idx_puzzle_nested_depth 
    ON puzzle(nested_depth);

-- Add composite index for filtering
CREATE INDEX IF NOT EXISTS idx_puzzle_chapter_difficulty 
    ON puzzle(chapter, difficulty);

-- Update existing puzzles to have default verification status
UPDATE puzzle 
SET verification_status = 'unverified' 
WHERE verification_status IS NULL;

-- Add constraint to ensure verification_status is valid
ALTER TABLE puzzle 
    ADD CONSTRAINT check_verification_status 
    CHECK (verification_status IN ('unverified', 'verified', 'failed', 'pending'));