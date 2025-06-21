#!/bin/bash

# LogicArena Test Runner Script
# This script runs all tests for the WebSocket implementation

set -e

echo "🧪 Running LogicArena WebSocket Tests"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the LogicArena project root"
    exit 1
fi

# Parse command line arguments
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=false
COVERAGE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_INTEGRATION=false
            RUN_E2E=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            RUN_E2E=false
            shift
            ;;
        --e2e-only)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=true
            shift
            ;;
        --with-e2e)
            RUN_E2E=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --unit-only       Run only unit tests"
            echo "  --integration-only Run only integration tests"
            echo "  --e2e-only        Run only e2e tests"
            echo "  --with-e2e        Include e2e tests (requires Docker)"
            echo "  --coverage        Generate coverage report"
            echo "  --verbose         Verbose output"
            echo "  -h, --help        Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Start test services if needed
if [ "$RUN_E2E" = true ] || [ "$RUN_INTEGRATION" = true ]; then
    print_status "Starting test services..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_error "Docker is required for integration and e2e tests"
        exit 1
    fi
    
    # Start Redis for testing
    docker run -d --name test-redis -p 6380:6379 redis:7-alpine || true
    
    # Wait for Redis to be ready
    sleep 2
    
    # Export test environment variables
    export REDIS_URL="redis://localhost:6380"
    export DATABASE_URL="sqlite:///test.db"
fi

# Function to run tests with optional coverage
run_tests() {
    local test_dir=$1
    local test_type=$2
    local extra_args=$3
    
    print_status "Running $test_type tests in $test_dir..."
    
    cd "$test_dir"
    
    if [ "$COVERAGE" = true ]; then
        if [ -f "requirements-test.txt" ]; then
            pip install -r requirements-test.txt
        fi
        
        if [ "$VERBOSE" = true ]; then
            pytest -v --cov=app --cov-report=term-missing --cov-report=html $extra_args
        else
            pytest --cov=app --cov-report=term-missing $extra_args
        fi
    else
        if [ -f "requirements-test.txt" ]; then
            pip install -r requirements-test.txt
        fi
        
        if [ "$VERBOSE" = true ]; then
            pytest -v $extra_args
        else
            pytest $extra_args
        fi
    fi
    
    cd - > /dev/null
}

# Run frontend tests
run_frontend_tests() {
    print_status "Running frontend WebSocket tests..."
    
    cd front
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Run tests
    if [ "$COVERAGE" = true ]; then
        npm run test -- --coverage --watchAll=false
    else
        npm run test -- --watchAll=false
    fi
    
    cd - > /dev/null
}

# Test execution
FAILED_TESTS=()

# Gateway tests
if [ "$RUN_UNIT" = true ] || [ "$RUN_INTEGRATION" = true ]; then
    print_status "Testing Gateway WebSocket implementation..."
    
    if [ "$RUN_UNIT" = true ]; then
        run_tests "gateway" "Gateway unit" "-m 'not integration'" || FAILED_TESTS+=("Gateway unit")
    fi
    
    if [ "$RUN_INTEGRATION" = true ]; then
        run_tests "gateway" "Gateway integration" "-m 'integration'" || FAILED_TESTS+=("Gateway integration")
    fi
fi

# Match service tests
if [ "$RUN_UNIT" = true ] || [ "$RUN_INTEGRATION" = true ]; then
    print_status "Testing Match service WebSocket implementation..."
    
    if [ "$RUN_UNIT" = true ]; then
        run_tests "match" "Match service unit" "-m 'not integration'" || FAILED_TESTS+=("Match service unit")
    fi
    
    if [ "$RUN_INTEGRATION" = true ]; then
        run_tests "match" "Match service integration" "-m 'integration'" || FAILED_TESTS+=("Match service integration")
    fi
fi

# Frontend tests
if [ "$RUN_UNIT" = true ]; then
    run_frontend_tests || FAILED_TESTS+=("Frontend")
fi

# E2E tests
if [ "$RUN_E2E" = true ]; then
    print_status "Running end-to-end WebSocket tests..."
    
    # Start all services for e2e tests
    print_status "Starting all services for e2e tests..."
    docker-compose -f docker-compose.dev.yml up -d
    
    # Wait for services to be ready
    sleep 10
    
    # Run e2e tests
    run_tests "tests/e2e" "End-to-end" "-m 'e2e'" || FAILED_TESTS+=("E2E")
    
    # Cleanup
    print_status "Stopping e2e test services..."
    docker-compose -f docker-compose.dev.yml down
fi

# Cleanup test services
if [ "$RUN_E2E" = true ] || [ "$RUN_INTEGRATION" = true ]; then
    print_status "Cleaning up test services..."
    docker stop test-redis 2>/dev/null || true
    docker rm test-redis 2>/dev/null || true
fi

# Report results
echo ""
echo "🏁 Test Results"
echo "==============="

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    print_status "All tests passed! ✅"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        print_status "Coverage reports generated in:"
        find . -name "htmlcov" -type d 2>/dev/null | sed 's/^/  - /'
        find . -name "coverage" -type d 2>/dev/null | sed 's/^/  - /'
    fi
    
    exit 0
else
    print_error "Some tests failed:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  ❌ $test"
    done
    exit 1
fi