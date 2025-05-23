#!/bin/bash

# LogicArena deployment script
# This script helps initialize and deploy the LogicArena application

set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Welcome message
echo "========================================="
echo "Welcome to LogicArena deployment script"
echo "========================================="
echo

# Determine environment
echo "Select deployment environment:"
echo "1) Development (with hot-reload)"
echo "2) Production"
read -p "Enter your choice (1/2): " env_choice

# Set Docker Compose file based on environment
if [ "$env_choice" = "1" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    echo "Using development environment with hot-reload"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "Using production environment"
fi

# Generate JWT secret if needed
JWT_SECRET=$(openssl rand -hex 32)
echo "Generated JWT secret for security"

# Ask for confirmation before starting
echo
echo "This will start the following services:"
echo "- API Gateway (gateway)"
echo "- Frontend (front)"
echo "- Matchmaking Service (match)"
echo "- Puzzle Service (puzzle)"
echo "- Proof Checker Service (proof-checker)"
echo "- Rating Service (rating)"
echo "- PostgreSQL Database (postgres)"
echo "- Redis Cache and Pub/Sub (redis)"
echo
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

# Start services
echo
echo "Starting LogicArena services..."
JWT_SECRET=$JWT_SECRET docker-compose -f $COMPOSE_FILE up -d

# Check if services are running
echo "Waiting for services to start..."
sleep 10

# Initialize the database
echo "Initializing the database..."
docker-compose -f $COMPOSE_FILE exec gateway python init_db.py

echo
echo "========================================="
echo "LogicArena deployment completed!"
echo "========================================="
echo
echo "The application is now running at: http://localhost:3000"
echo
echo "API Gateway: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo
echo "You can stop the services with:"
echo "docker-compose -f $COMPOSE_FILE down"
echo
echo "Enjoy using LogicArena!" 