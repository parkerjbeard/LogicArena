-- LogicArena Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    handle VARCHAR(30) UNIQUE NOT NULL,
    pwd_hash VARCHAR(128),
    email VARCHAR(120) UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Puzzles Table
CREATE TABLE IF NOT EXISTS puzzle (
    id SERIAL PRIMARY KEY,
    gamma TEXT NOT NULL,
    phi TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    best_len INTEGER NOT NULL,
    machine_proof TEXT,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Games Table
CREATE TABLE IF NOT EXISTS game (
    id SERIAL PRIMARY KEY,
    player_a INTEGER NOT NULL REFERENCES "user"(id),
    player_b INTEGER NOT NULL REFERENCES "user"(id),
    rounds INTEGER NOT NULL DEFAULT 3,
    winner INTEGER REFERENCES "user"(id),
    started TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended TIMESTAMP,
    player_a_rating_change INTEGER,
    player_b_rating_change INTEGER
);

-- Rounds Table
CREATE TABLE IF NOT EXISTS round (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES game(id),
    puzzle_id INTEGER NOT NULL REFERENCES puzzle(id),
    round_number INTEGER NOT NULL,
    winner INTEGER REFERENCES "user"(id),
    started TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended TIMESTAMP
);

-- Submissions Table
CREATE TABLE IF NOT EXISTS submission (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    puzzle_id INTEGER REFERENCES puzzle(id),
    game_id INTEGER REFERENCES game(id),
    round_id INTEGER REFERENCES round(id),
    payload TEXT NOT NULL,
    verdict BOOLEAN NOT NULL,
    error_message TEXT,
    processing_time INTEGER,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_handle ON "user"(handle);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_rating ON "user"(rating);
CREATE INDEX IF NOT EXISTS idx_user_google_id ON "user"(google_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_difficulty ON puzzle(difficulty);
CREATE INDEX IF NOT EXISTS idx_game_player_a ON game(player_a);
CREATE INDEX IF NOT EXISTS idx_game_player_b ON game(player_b);
CREATE INDEX IF NOT EXISTS idx_submission_user_id ON submission(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_verdict ON submission(verdict);
CREATE INDEX IF NOT EXISTS idx_round_game_id ON round(game_id); 