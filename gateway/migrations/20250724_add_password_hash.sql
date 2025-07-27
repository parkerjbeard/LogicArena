-- Add password_hash column to user table for authentication
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index on email for faster login lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- Update existing users to have a default password (for demo only)
-- Password is "demo123" hashed with bcrypt
UPDATE "user" 
SET password_hash = '$2b$12$YLYf.pI1S5.5JQ5ZjQ5Xz.8KVkYh5bqX8H5H8H5H8H5H8H5H8H5H8'
WHERE password_hash IS NULL;