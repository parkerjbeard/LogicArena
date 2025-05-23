# LogicArena

LogicArena is a web platform for natural deduction proof duels and practice. This project allows logic students to practice formal proofs and compete against each other in real-time duels.

## Features

- **Puzzle Drill**: Solve auto-generated natural deduction puzzles at your own pace
- **Blitz Duel**: Compete against other players in real-time proof battles
- **Fitch-style Proof Editor**: Write and verify proofs in a familiar notation
- **Elo Leaderboard**: Track your progress and compare with other players

## Architecture

LogicArena is built as a microservices application with the following components:

- **gateway**: FastAPI-based API gateway with JWT authentication and WebSocket support
- **front**: Vue 3 + Vite frontend with Monaco-based Fitch editor
- **match**: Redis-backed matchmaking system for duels
- **puzzle**: Puzzle generation and verification service
- **proof-checker**: Carnap + minisat proof validation service
- **rating**: Elo rating system

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

2. Start the services:
   ```
   docker-compose up -d
   ```

3. Initialize the database:
   ```
   docker-compose exec gateway python init_db.py
   ```

4. Access the application at http://localhost:3000

### Development

For development, use the development Docker Compose file:

```
docker-compose -f docker-compose.dev.yml up -d
```

## Proof Verification

Proofs are verified using the Carnap proof checking system, which supports Fitch-style natural deduction. The proof checking service validates the syntax and deduction rules. For invalid sequents, a minisat-based SAT solver is used to generate countermodels.

## License

This project is open source and available under the MIT License.

## Acknowledgements

- [Carnap](https://carnap.io) for the proof-checking system
- [Lichess](https://github.com/lichess-org/lila) for inspiration on competitive gameplay 