#!/bin/bash

# Test script for LogicArena backup system
# This script tests backup creation, verification, and restore

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_RESULTS=()
BACKUP_CONTAINER="logicarena_backup"

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    TEST_RESULTS+=("PASS: $1")
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    TEST_RESULTS+=("FAIL: $1")
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test functions
test_container_running() {
    print_header "Testing Container Status"
    
    if docker ps | grep -q "$BACKUP_CONTAINER"; then
        print_success "Backup container is running"
        return 0
    else
        print_error "Backup container is not running"
        echo "  Run: docker-compose -f docker-compose.backup.yml up -d"
        return 1
    fi
}

test_database_connection() {
    print_header "Testing Database Connection"
    
    if docker exec "$BACKUP_CONTAINER" pg_isready -h postgres -p 5432 -U logicuser > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

test_manual_backup() {
    print_header "Testing Manual Backup"
    
    echo "Creating manual backup..."
    if docker exec "$BACKUP_CONTAINER" /backups/scripts/backup.sh > /tmp/backup_test.log 2>&1; then
        print_success "Manual backup completed"
        
        # Check if backup file was created
        LATEST_BACKUP=$(docker exec "$BACKUP_CONTAINER" find /backups/data -name "*.sql.gz" -type f | tail -1)
        if [ -n "$LATEST_BACKUP" ]; then
            print_success "Backup file created: $(basename $LATEST_BACKUP)"
            echo "$LATEST_BACKUP" > /tmp/latest_backup.txt
            return 0
        else
            print_error "No backup file found"
            return 1
        fi
    else
        print_error "Manual backup failed"
        cat /tmp/backup_test.log
        return 1
    fi
}

test_backup_verification() {
    print_header "Testing Backup Verification"
    
    if [ -f /tmp/latest_backup.txt ]; then
        BACKUP_FILE=$(cat /tmp/latest_backup.txt)
        echo "Verifying backup: $(basename $BACKUP_FILE)"
        
        if docker exec "$BACKUP_CONTAINER" /backups/scripts/restore.sh verify "$BACKUP_FILE" > /dev/null 2>&1; then
            print_success "Backup verification passed"
            return 0
        else
            print_error "Backup verification failed"
            return 1
        fi
    else
        print_warning "No backup file to verify"
        return 1
    fi
}

test_list_backups() {
    print_header "Testing Backup Listing"
    
    echo "Listing available backups..."
    if docker exec "$BACKUP_CONTAINER" /backups/scripts/restore.sh list > /tmp/backup_list.txt 2>&1; then
        print_success "Backup listing successful"
        
        # Count backups
        DAILY_COUNT=$(grep -c "daily" /tmp/backup_list.txt 2>/dev/null || echo 0)
        WEEKLY_COUNT=$(grep -c "weekly" /tmp/backup_list.txt 2>/dev/null || echo 0)
        MONTHLY_COUNT=$(grep -c "monthly" /tmp/backup_list.txt 2>/dev/null || echo 0)
        
        echo "  Daily backups: $DAILY_COUNT"
        echo "  Weekly backups: $WEEKLY_COUNT"
        echo "  Monthly backups: $MONTHLY_COUNT"
        
        return 0
    else
        print_error "Failed to list backups"
        return 1
    fi
}

test_cron_configuration() {
    print_header "Testing Cron Configuration"
    
    if docker exec "$BACKUP_CONTAINER" crontab -l > /tmp/cron_test.txt 2>&1; then
        print_success "Cron is configured"
        
        # Check for backup schedules
        if grep -q "backup.sh" /tmp/cron_test.txt; then
            print_success "Backup schedules found in crontab"
            
            DAILY_CRON=$(grep -c "2-31 \* 1-6" /tmp/cron_test.txt 2>/dev/null || echo 0)
            WEEKLY_CRON=$(grep -c "2-31 \* 0" /tmp/cron_test.txt 2>/dev/null || echo 0)
            MONTHLY_CRON=$(grep -c "1 \*" /tmp/cron_test.txt 2>/dev/null || echo 0)
            
            [ $DAILY_CRON -gt 0 ] && print_success "Daily backup schedule configured" || print_error "Daily backup schedule missing"
            [ $WEEKLY_CRON -gt 0 ] && print_success "Weekly backup schedule configured" || print_error "Weekly backup schedule missing"
            [ $MONTHLY_CRON -gt 0 ] && print_success "Monthly backup schedule configured" || print_error "Monthly backup schedule missing"
        else
            print_error "No backup schedules in crontab"
        fi
        
        return 0
    else
        print_error "Cron is not configured"
        return 1
    fi
}

test_disk_space() {
    print_header "Testing Disk Space"
    
    BACKUP_DIR="./backups/data"
    if [ -d "$BACKUP_DIR" ]; then
        DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
        AVAILABLE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
        
        echo "  Disk usage: ${DISK_USAGE}%"
        echo "  Available space: $AVAILABLE"
        
        if [ "$DISK_USAGE" -lt 80 ]; then
            print_success "Sufficient disk space available"
            return 0
        elif [ "$DISK_USAGE" -lt 90 ]; then
            print_warning "Disk space running low (${DISK_USAGE}%)"
            return 0
        else
            print_error "Critical: Disk space very low (${DISK_USAGE}%)"
            return 1
        fi
    else
        print_warning "Backup directory not found locally"
        return 0
    fi
}

test_retention_policy() {
    print_header "Testing Retention Policy"
    
    echo "Checking retention policy configuration..."
    
    # Check if retention functions exist in backup script
    if docker exec "$BACKUP_CONTAINER" grep -q "apply_retention_policy" /backups/scripts/backup.sh; then
        print_success "Retention policy function exists"
        
        # Check retention settings
        if docker exec "$BACKUP_CONTAINER" grep -q "mtime +7" /backups/scripts/backup.sh; then
            print_success "Daily retention (7 days) configured"
        else
            print_error "Daily retention not configured"
        fi
        
        if docker exec "$BACKUP_CONTAINER" grep -q "mtime +28" /backups/scripts/backup.sh; then
            print_success "Weekly retention (4 weeks) configured"
        else
            print_error "Weekly retention not configured"
        fi
        
        if docker exec "$BACKUP_CONTAINER" grep -q "mtime +365" /backups/scripts/backup.sh; then
            print_success "Monthly retention (12 months) configured"
        else
            print_error "Monthly retention not configured"
        fi
        
        return 0
    else
        print_error "Retention policy not configured"
        return 1
    fi
}

test_restore_safety() {
    print_header "Testing Restore Safety Features"
    
    # Check if restore script has safety backup feature
    if docker exec "$BACKUP_CONTAINER" grep -q "backup_current" /backups/scripts/restore.sh; then
        print_success "Pre-restore backup feature exists"
    else
        print_error "Pre-restore backup feature missing"
    fi
    
    # Check for confirmation prompt
    if docker exec "$BACKUP_CONTAINER" grep -q "Are you sure" /backups/scripts/restore.sh; then
        print_success "Restore confirmation prompt exists"
    else
        print_error "Restore confirmation prompt missing"
    fi
    
    return 0
}

# Summary function
print_summary() {
    print_header "Test Summary"
    
    PASS_COUNT=0
    FAIL_COUNT=0
    
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == PASS:* ]]; then
            ((PASS_COUNT++))
        else
            ((FAIL_COUNT++))
        fi
        echo "  $result"
    done
    
    echo ""
    echo -e "${BLUE}Total Tests: $((PASS_COUNT + FAIL_COUNT))${NC}"
    echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ All tests passed! Backup system is working correctly.${NC}"
        return 0
    else
        echo ""
        echo -e "${YELLOW}⚠ Some tests failed. Review the issues above.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  LogicArena Backup System Test Suite ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    
    # Run tests
    test_container_running || print_warning "Skipping remaining tests"
    
    if docker ps | grep -q "$BACKUP_CONTAINER"; then
        test_database_connection
        test_manual_backup
        test_backup_verification
        test_list_backups
        test_cron_configuration
        test_disk_space
        test_retention_policy
        test_restore_safety
    fi
    
    # Print summary
    print_summary
}

# Run main function
main