#!/bin/bash
# Production deployment script - only deploys from main branch

set -e

echo "🚀 Starting production deployment..."

# Ensure we're on main branch
git checkout main
git pull origin main

# Export environment variables
set -a
source .env
set +a

# Stop and remove old containers
docker-compose down

# Remove orphaned containers
docker ps -a | grep logicarena | awk '{print $1}' | xargs -r docker rm -f

# Build and start services
docker-compose up -d --build

# Wait for services to be healthy
sleep 10

# Check if services are running
docker-compose ps

echo "✅ Production deployment complete!"