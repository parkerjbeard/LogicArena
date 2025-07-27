#!/bin/bash

# Script to seed puzzles in the dockerized environment

echo "Seeding LogicArena database with puzzles..."

# Check if services are running
if ! docker-compose ps | grep -q "gateway.*Up"; then
    echo "Error: Services are not running. Start them with: docker-compose up -d"
    exit 1
fi

# Copy the seed scripts to the gateway container
docker cp seed_puzzles.py logicarena-gateway-1:/tmp/
docker cp puzzle/puzzle_generator.py logicarena-gateway-1:/tmp/
docker cp puzzle/puzzle_verifier.py logicarena-gateway-1:/tmp/

# Check if we should verify puzzles (default: true)
VERIFY_PUZZLES=${VERIFY_PUZZLES:-true}

# Run the seed script inside the gateway container
docker-compose exec gateway bash -c "
    cd /tmp
    export DATABASE_URL='postgresql://logicuser:DevP%40ssw0rd2024%21@postgres:5432/logicarena'
    export PROOF_CHECKER_URL='http://proof-checker:3000'
    export VERIFY_PUZZLES_ON_SEED='$VERIFY_PUZZLES'
    export VERIFICATION_MAX_WORKERS='10'
    python seed_puzzles.py \$@
"

echo "Done!"