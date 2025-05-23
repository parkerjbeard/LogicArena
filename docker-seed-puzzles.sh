#!/bin/bash

# Script to seed puzzles in the dockerized environment

echo "Seeding LogicArena database with puzzles..."

# Check if services are running
if ! docker-compose ps | grep -q "gateway.*Up"; then
    echo "Error: Services are not running. Start them with: docker-compose up -d"
    exit 1
fi

# Copy the seed scripts to the gateway container
docker cp seed_puzzles.py logicarena_gateway_1:/tmp/
docker cp puzzle/puzzle_generator.py logicarena_gateway_1:/tmp/

# Run the seed script inside the gateway container
docker-compose exec gateway bash -c "
    cd /tmp
    export DATABASE_URL='postgresql://logicuser:logicpass@postgres:5432/logicarena'
    python seed_puzzles.py \$@
"

echo "Done!"