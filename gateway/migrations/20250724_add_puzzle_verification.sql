-- Migration: Add puzzle verification tracking
-- Date: 2025-07-24
-- Description: Add columns and tables to track puzzle verification status

-- Add verification tracking columns to puzzle table
ALTER TABLE puzzle 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_metadata JSONB,
ADD COLUMN IF NOT EXISTS alternative_proofs TEXT[],
ADD COLUMN IF NOT EXISTS actual_optimal_length INTEGER;

-- Create verification log table for audit trail
CREATE TABLE IF NOT EXISTS puzzle_verification_log (
    id SERIAL PRIMARY KEY,
    puzzle_id INTEGER REFERENCES puzzle(id) ON DELETE CASCADE,
    verified_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,
    errors TEXT[],
    optimal_length INTEGER,
    optimal_proof TEXT,
    verification_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_puzzle_verification_status 
ON puzzle(verification_status)
WHERE verification_status = 'unverified';

CREATE INDEX IF NOT EXISTS idx_puzzle_verified_at 
ON puzzle(verified_at);

CREATE INDEX IF NOT EXISTS idx_verification_log_puzzle_id 
ON puzzle_verification_log(puzzle_id);

CREATE INDEX IF NOT EXISTS idx_verification_log_created_at 
ON puzzle_verification_log(created_at);

-- Add check constraint for verification status
ALTER TABLE puzzle 
DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE puzzle 
ADD CONSTRAINT check_verification_status 
CHECK (verification_status IN ('unverified', 'verified', 'failed', 'pending'));

-- Function to update verified_at timestamp
CREATE OR REPLACE FUNCTION update_puzzle_verified_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
        NEW.verified_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update verified_at
DROP TRIGGER IF EXISTS trigger_update_puzzle_verified_at ON puzzle;
CREATE TRIGGER trigger_update_puzzle_verified_at
BEFORE UPDATE ON puzzle
FOR EACH ROW
EXECUTE FUNCTION update_puzzle_verified_at();

-- View for unverified puzzles
CREATE OR REPLACE VIEW unverified_puzzles AS
SELECT 
    id,
    gamma,
    phi,
    difficulty,
    best_len,
    created,
    EXTRACT(EPOCH FROM (NOW() - created)) / 3600 AS hours_since_creation
FROM puzzle
WHERE verification_status = 'unverified'
ORDER BY created ASC;

-- View for verification statistics
CREATE OR REPLACE VIEW puzzle_verification_stats AS
SELECT 
    verification_status,
    COUNT(*) as count,
    AVG(actual_optimal_length) as avg_optimal_length,
    AVG(best_len) as avg_claimed_length,
    COUNT(CASE WHEN actual_optimal_length < best_len THEN 1 END) as shorter_than_claimed,
    COUNT(CASE WHEN actual_optimal_length > best_len THEN 1 END) as longer_than_claimed,
    COUNT(CASE WHEN actual_optimal_length = best_len THEN 1 END) as matches_claimed
FROM puzzle
GROUP BY verification_status;

-- Add comment documentation
COMMENT ON COLUMN puzzle.verification_status IS 'Current verification status: unverified, verified, failed, or pending';
COMMENT ON COLUMN puzzle.verified_at IS 'Timestamp when puzzle was successfully verified';
COMMENT ON COLUMN puzzle.verification_metadata IS 'JSON metadata from verification process including timings and methods used';
COMMENT ON COLUMN puzzle.alternative_proofs IS 'Array of alternative valid proofs discovered during verification';
COMMENT ON COLUMN puzzle.actual_optimal_length IS 'Actual optimal proof length found during verification';

COMMENT ON TABLE puzzle_verification_log IS 'Audit log of all puzzle verification attempts';
COMMENT ON VIEW unverified_puzzles IS 'Quick access to puzzles needing verification';
COMMENT ON VIEW puzzle_verification_stats IS 'Statistics on puzzle verification status and optimal length accuracy';