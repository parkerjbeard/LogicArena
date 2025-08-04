#\!/bin/bash
# Local development script

echo "🔧 Starting development environment..."

# Use both compose files - base + dev overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo "✅ Development environment started\!"
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend: http://localhost:8000"
echo "📍 Database: postgresql://localhost:5432/logicarena"
