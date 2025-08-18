#!/bin/bash

# Validation script to ensure backup system is properly configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Validating backup system setup..."
echo ""

ERRORS=0

# Check if all required files exist
echo "Checking required files..."

FILES=(
    "backups/Dockerfile"
    "docker-compose.backup.yml"
    "backups/scripts/backup.sh"
    "backups/scripts/restore.sh"
    "backups/scripts/entrypoint.sh"
    "backups/config/crontab"
    "backups/README.md"
    "backups/QUICK_START.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file missing"
        ((ERRORS++))
    fi
done

# Check if scripts are executable
echo ""
echo "Checking script permissions..."

SCRIPTS=(
    "backups/scripts/backup.sh"
    "backups/scripts/restore.sh"
    "backups/scripts/entrypoint.sh"
    "backups/test-backup-system.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} $script is executable"
    else
        echo -e "${YELLOW}⚠${NC} $script is not executable"
        chmod +x "$script"
        echo "  Fixed: made executable"
    fi
done

# Check Docker configuration
echo ""
echo "Checking Docker configuration..."

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    ((ERRORS++))
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose is available"
else
    echo -e "${RED}✗${NC} Docker Compose is not available"
    ((ERRORS++))
fi

# Check environment variables
echo ""
echo "Checking environment configuration..."

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    if grep -q "DB_PASSWORD" .env; then
        echo -e "${GREEN}✓${NC} DB_PASSWORD is configured"
    else
        echo -e "${YELLOW}⚠${NC} DB_PASSWORD not found in .env"
        echo "  Add: DB_PASSWORD=your_password to .env"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env file not found"
    echo "  Create .env with database credentials"
fi

# Validate Docker Compose syntax
echo ""
echo "Validating Docker Compose configuration..."

if docker-compose -f docker-compose.backup.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.backup.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.backup.yml has syntax errors"
    docker-compose -f docker-compose.backup.yml config
    ((ERRORS++))
fi

# Check if main docker-compose has the network
echo ""
echo "Checking network configuration..."

if [ -f "docker-compose.yml" ]; then
    if grep -q "logic_network" docker-compose.yml; then
        echo -e "${GREEN}✓${NC} logic_network found in main docker-compose.yml"
    else
        echo -e "${YELLOW}⚠${NC} logic_network not found in docker-compose.yml"
        echo "  Network might have a different name"
    fi
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Validation successful!${NC}"
    echo ""
    echo "Ready to start backup system:"
    echo "  docker-compose -f docker-compose.yml -f docker-compose.backup.yml up -d backup"
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before starting the backup system."
    exit 1
fi