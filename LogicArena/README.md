# LogicArena-α

A self-hostable web platform for natural deduction proof duels and puzzle solving.

## Overview

LogicArena allows students to:
- Practice natural deduction puzzles in a self-paced environment
- Compete in real-time duels to solve proofs against other players
- Track progress through an Elo rating system

Proofs are written in Fitch-style notation and verified by the Carnap proof-checker with SAT validation.

## Architecture

The system is composed of several microservices:

- `gateway`: FastAPI-based API gateway with JWT authentication and WebSocket support
- `front`: Vue 3 + Vite frontend with a Monaco-based Fitch editor
- `match`: Redis-backed matchmaking system for duels
- `puzzle`: Puzzle generation and verification service
- `proof-checker`: Carnap + minisat proof validation service
- `rating`: Elo rating system

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/LogicArena.git
   cd LogicArena
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file to set your JWT secret and other configuration.

3. Start the services:
   ```
   docker-compose up -d
   ```

4. Initialize the database:
   ```
   docker-compose exec gateway python init_db.py
   ```

5. Access the application at http://localhost:3000

## Features

### Puzzle Drill Mode
- Infinite queue of auto-generated natural deduction puzzles
- Progressive difficulty levels
- Immediate feedback on proof validity

### Blitz Duel Mode
- Real-time duels with other players
- Best-of-3 rounds with a 3-minute global clock
- Time penalties for incorrect submissions

### Leaderboard
- Elo-based ranking system
- View player profiles and best proofs

## Development

### Local Development Setup

1. Start the development environment:
   ```
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. Run tests:
   ```
   docker-compose exec gateway pytest
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Carnap](https://carnap.io) for the proof-checking system
- [Lichess](https://github.com/lichess-org/lila) for inspiration on competitive real-time gameplay 