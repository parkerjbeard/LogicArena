# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogicArena is a microservices-based web platform for natural deduction proof duels. It allows logic students to practice formal proofs and compete against each other in real-time duels using Fitch-style notation.

## Architecture

The application consists of these microservices:

- **gateway**: FastAPI API gateway with JWT/Google OAuth authentication and WebSocket support (Python)
- **front**: Next.js frontend with Monaco-based Fitch editor (React/TypeScript)
- **match**: Redis-backed matchmaking system for duels (Python)
- **puzzle**: Puzzle generation and verification service (Python/FastAPI)
- **proof-checker**: Fitch-style proof validation service with minisat countermodels (Python/FastAPI)
- **rating**: Elo rating calculation service (Python)

All services communicate through HTTP APIs and use PostgreSQL for persistence and Redis for caching/pub-sub.

## Common Commands

### Development

```bash
# Start all services with hot-reload
docker-compose -f docker-compose.dev.yml up -d

# Start services in production mode
docker-compose up -d

# Initialize database (first time setup)
docker-compose exec gateway python init_db.py

# Deploy with interactive script
./deploy.sh

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down
```

### Frontend Development

```bash
cd front
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run linting
```

### Database

The application uses PostgreSQL with SQLAlchemy ORM. Key models:
- User (handle, email, rating, google_id)
- Puzzle (gamma/premises, phi/conclusion, difficulty)
- Game (player_a, player_b, rounds, winner)
- Round (game_id, puzzle_id, winner)
- Submission (user_id, payload, verdict)

## Key Implementation Details

### Authentication
- JWT tokens stored in localStorage
- Google OAuth support with callback flow
- Bearer token authentication in API requests (see front/src/lib/api.ts:11-27)

### WebSocket Communication
- Game room connections for real-time duels (gateway/app/websocket/manager.py:14-30)
- User notification channels (gateway/app/websocket/manager.py:32-42)
- Broadcast to game participants (gateway/app/websocket/manager.py:54-70)

### Proof System
- Carnap-compatible Fitch-style natural deduction syntax
- Custom proof validator with inference rule checking (proof-checker/app.py)
- Countermodels generated using minisat for invalid sequents
- Frontend uses Monaco editor with Carnap syntax highlighting
- Proof format: `formula :justification` with space-based indentation
- Show statements for subproofs with QED lines (:DD, :CD, :ID)
- 4 spaces per indentation level, automatically handled by editor

### API Endpoints
- Auth: `/api/auth/login/email`, `/api/auth/register`, `/api/auth/me`
- Puzzles: `/api/puzzles/random`, `/api/puzzles/{id}`, `/api/puzzles/submit`
- Duels: `/api/games/duel/queue`, `/api/games/duel/check-match`, `/api/games/duel/submit`
- Users: `/api/users/profile/{id}`, `/api/users/stats/{id}`, `/api/users/leaderboard`

## Service URLs
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- Proof Checker: http://localhost:5003 (exposed for testing)
- Services communicate internally via Docker network

## Testing Proof Checker
```bash
# Run test script
python proof-checker/test_proof_checker.py

# Or test manually
curl -X POST http://localhost:5003/verify \
  -H "Content-Type: application/json" \
  -d '{"gamma": "P→Q, P", "phi": "Q", "proof": "Q [1,2 MP]"}'
```