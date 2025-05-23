-- Main database schema for LogicArena

-- User table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    handle VARCHAR(30) UNIQUE NOT NULL,
    pwd_hash VARCHAR(128) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT NOW(),
    rating INTEGER NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Puzzle table
CREATE TABLE IF NOT EXISTS puzzle (
    id SERIAL PRIMARY KEY,
    gamma TEXT NOT NULL,  -- Premises
    phi TEXT NOT NULL,    -- Conclusion
    difficulty INTEGER NOT NULL, -- 1-10 scale
    best_len INTEGER NOT NULL,   -- Best known proof length
    machine_proof TEXT,   -- Auto-generated proof
    created TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Game table
CREATE TABLE IF NOT EXISTS game (
    id SERIAL PRIMARY KEY,
    player_a INTEGER NOT NULL REFERENCES "user"(id),
    player_b INTEGER NOT NULL REFERENCES "user"(id),
    rounds INTEGER NOT NULL DEFAULT 3,
    winner INTEGER REFERENCES "user"(id),
    started TIMESTAMP NOT NULL DEFAULT NOW(),
    ended TIMESTAMP,
    player_a_rating_change INTEGER,
    player_b_rating_change INTEGER
);

-- Round table (for tracking individual rounds in a game)
CREATE TABLE IF NOT EXISTS round (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES game(id),
    puzzle_id INTEGER NOT NULL REFERENCES puzzle(id),
    round_number INTEGER NOT NULL,
    winner INTEGER REFERENCES "user"(id),
    started TIMESTAMP NOT NULL DEFAULT NOW(),
    ended TIMESTAMP
);

-- Submission table (for tracking proof submissions)
CREATE TABLE IF NOT EXISTS submission (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    puzzle_id INTEGER REFERENCES puzzle(id),
    game_id INTEGER REFERENCES game(id),
    round_id INTEGER REFERENCES round(id),
    payload TEXT NOT NULL,         -- The actual proof
    verdict BOOLEAN NOT NULL,      -- True if proof is valid
    error_message TEXT,            -- Error message if verdict is false
    processing_time INTEGER,       -- Time in milliseconds to process the proof
    created TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_player_a ON game(player_a);
CREATE INDEX IF NOT EXISTS idx_game_player_b ON game(player_b);
CREATE INDEX IF NOT EXISTS idx_submission_user ON submission(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_puzzle ON submission(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_submission_game ON submission(game_id);
CREATE INDEX IF NOT EXISTS idx_round_game ON round(game_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_difficulty ON puzzle(difficulty); 