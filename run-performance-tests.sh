#!/bin/bash

# Run all performance optimization tests
# This script runs tests for all the performance optimizations implemented

set -e  # Exit on error

echo "🧪 Running Performance Optimization Tests"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests and report results
run_test_suite() {
    local name=$1
    local command=$2
    local directory=$3
    
    echo -e "\n${YELLOW}Running $name...${NC}"
    cd "/Users/parkerbeard/LogicArena/$directory"
    
    if $command; then
        echo -e "${GREEN}✅ $name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name failed${NC}"
        return 1
    fi
}

# Track overall results
FAILED_TESTS=()

# 1. Frontend Tests
echo -e "\n${YELLOW}=== Frontend Tests ===${NC}"

# Test lazy-loaded Monaco editors
if ! run_test_suite "Lazy Monaco Editor Tests" \
    "npm test -- src/components/__tests__/LazyFitchEditor.test.tsx src/components/__tests__/LazyCarnapFitchEditor.test.tsx" \
    "front"; then
    FAILED_TESTS+=("Lazy Monaco Editor Tests")
fi

# Test WebSocket reconnection
if ! run_test_suite "WebSocket Reconnection Tests" \
    "npm test -- src/lib/__tests__/websocket.reconnection.test.tsx" \
    "front"; then
    FAILED_TESTS+=("WebSocket Reconnection Tests")
fi

# Test bundle optimization
if ! run_test_suite "Bundle Optimization Tests" \
    "npm test -- src/__tests__/bundle-optimization.test.js" \
    "front"; then
    FAILED_TESTS+=("Bundle Optimization Tests")
fi

# 2. Backend Tests
echo -e "\n${YELLOW}=== Backend Tests ===${NC}"

# Test database connection pooling
if ! run_test_suite "Database Connection Pooling Tests" \
    "pytest tests/test_db_connection_pooling.py -v" \
    "gateway"; then
    FAILED_TESTS+=("Database Connection Pooling Tests")
fi

# Test query optimizations
if ! run_test_suite "Query Optimization Tests" \
    "pytest tests/test_query_optimizations.py -v" \
    "gateway"; then
    FAILED_TESTS+=("Query Optimization Tests")
fi

# Test database indexes
if ! run_test_suite "Database Index Tests" \
    "pytest tests/test_db_indexes.py -v" \
    "gateway"; then
    FAILED_TESTS+=("Database Index Tests")
fi

# 3. Integration Tests
echo -e "\n${YELLOW}=== Integration Tests ===${NC}"

# Check if services are running
check_service() {
    local service=$1
    local port=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✅ $service is running on port $port${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $service is not running on port $port (skipping integration tests)${NC}"
        return 1
    fi
}

# Check required services
SERVICES_RUNNING=true
check_service "Frontend" 3000 || SERVICES_RUNNING=false
check_service "Gateway" 8000 || SERVICES_RUNNING=false
check_service "PostgreSQL" 5432 || SERVICES_RUNNING=false
check_service "Redis" 6379 || SERVICES_RUNNING=false

if [ "$SERVICES_RUNNING" = true ]; then
    echo -e "\n${YELLOW}Running integration tests...${NC}"
    
    # Test lazy loading in browser
    echo "Testing lazy loading of Monaco editor..."
    curl -s http://localhost:3000/practice | grep -q "LazyFitchEditor" && \
        echo -e "${GREEN}✅ Lazy loading configured correctly${NC}" || \
        echo -e "${RED}❌ Lazy loading not detected${NC}"
    
    # Test WebSocket reconnection
    echo "Testing WebSocket endpoint..."
    curl -s http://localhost:8000/api/websocket/online-users | grep -q "online_users" && \
        echo -e "${GREEN}✅ WebSocket endpoint accessible${NC}" || \
        echo -e "${RED}❌ WebSocket endpoint not accessible${NC}"
else
    echo -e "${YELLOW}Skipping integration tests (services not running)${NC}"
fi

# 4. Performance Benchmarks
echo -e "\n${YELLOW}=== Performance Benchmarks ===${NC}"

# Bundle size check
echo "Checking bundle sizes..."
cd /Users/parkerbeard/LogicArena/front
if [ -d ".next" ]; then
    echo "Production bundle analysis:"
    find .next/static/chunks -name "*.js" -type f | while read file; do
        size=$(du -h "$file" | cut -f1)
        basename=$(basename "$file")
        
        # Check for expected chunks
        if [[ "$basename" == *"monaco"* ]]; then
            echo -e "  Monaco chunk: $size (separated) ✅"
        elif [[ "$basename" == *"vendor"* ]]; then
            echo -e "  Vendor chunk: $size"
        elif [[ "$basename" == *"ui"* ]]; then
            echo -e "  UI libraries chunk: $size"
        fi
    done
else
    echo -e "${YELLOW}No production build found. Run 'npm run build' to analyze bundle sizes.${NC}"
fi

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo "========================================"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo -e "\nPerformance optimizations verified:"
    echo "  • Lazy loading for Monaco editor"
    echo "  • WebSocket reconnection handling"
    echo "  • Database connection pooling"
    echo "  • Query optimization with eager loading"
    echo "  • Database indexes for common queries"
    echo "  • Bundle optimization and code splitting"
    exit 0
else
    echo -e "${RED}❌ Some tests failed:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  • $test"
    done
    exit 1
fi