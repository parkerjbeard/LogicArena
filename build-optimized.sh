#!/bin/bash

# Enable BuildKit for better caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting optimized build process...${NC}"

# Function to build service with caching
build_service() {
    local service=$1
    local context=$2
    local dockerfile=${3:-Dockerfile}
    
    echo -e "${YELLOW}Building $service...${NC}"
    
    # Check if we should use the optimized Dockerfile
    if [ "$USE_OPTIMIZED" == "true" ] && [ -f "docker/dockerfiles/$service/Dockerfile.optimized" ]; then
        dockerfile="docker/dockerfiles/$service/Dockerfile.optimized"
    elif [ -f "$context/$dockerfile" ]; then
        dockerfile="$context/$dockerfile"
    fi
    
    docker build \
        --cache-from logicarena/$service:latest \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t logicarena/$service:latest \
        -t logicarena/$service:$(date +%Y%m%d-%H%M%S) \
        -f $dockerfile \
        $context
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $service built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build $service${NC}"
        exit 1
    fi
}

# Build all services in parallel
echo -e "${YELLOW}Building all services...${NC}"

# Build Python services
build_service gateway ./gateway &
build_service match ./match &
build_service puzzle ./puzzle &
build_service rating ./rating &
build_service proof-checker ./proof-checker &

# Build frontend (might take longer)
build_service front ./front &

# Wait for all background jobs to complete
wait

echo -e "${GREEN}All services built successfully!${NC}"

# Optional: Push to registry
if [ "$1" == "--push" ]; then
    echo -e "${YELLOW}Pushing images to registry...${NC}"
    
    for service in gateway match puzzle rating proof-checker front; do
        docker push logicarena/$service:latest &
    done
    
    wait
    echo -e "${GREEN}All images pushed successfully!${NC}"
fi

# Optional: Run with optimized compose
if [ "$1" == "--run" ] || [ "$2" == "--run" ]; then
    echo -e "${YELLOW}Starting services with optimized configuration...${NC}"
    docker-compose -f docker/compose/docker-compose.optimized.yml up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 10
    
    # Check health status
    docker-compose -f docker/compose/docker-compose.optimized.yml ps
fi

echo -e "${GREEN}Build process completed!${NC}"