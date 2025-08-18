#!/bin/bash

# PostgreSQL Restore Script for LogicArena
# This script helps restore database from backups

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/data}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-logicarena}"
DB_USER="${DB_USER:-logicuser}"
DB_PASSWORD="${DB_PASSWORD}"
LOG_FILE="${BACKUP_DIR}/restore.log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# List available backups
list_backups() {
    echo -e "${GREEN}Available backups:${NC}"
    echo ""
    
    echo -e "${YELLOW}Daily Backups:${NC}"
    find "${BACKUP_DIR}/daily" -name "*.sql.gz" -type f 2>/dev/null | sort -r | head -10 || echo "  No daily backups found"
    
    echo ""
    echo -e "${YELLOW}Weekly Backups:${NC}"
    find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -type f 2>/dev/null | sort -r | head -10 || echo "  No weekly backups found"
    
    echo ""
    echo -e "${YELLOW}Monthly Backups:${NC}"
    find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -type f 2>/dev/null | sort -r | head -10 || echo "  No monthly backups found"
}

# Verify backup file
verify_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}ERROR: Backup file not found: $backup_file${NC}"
        return 1
    fi
    
    echo "Verifying backup file integrity..."
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backup file integrity verified${NC}"
        
        # Get backup info
        local file_size=$(du -h "$backup_file" | cut -f1)
        local file_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup_file" 2>/dev/null || stat -c "%y" "$backup_file" 2>/dev/null | cut -d' ' -f1-2)
        
        echo "  File: $(basename "$backup_file")"
        echo "  Size: $file_size"
        echo "  Date: $file_date"
        
        return 0
    else
        echo -e "${RED}ERROR: Backup file verification failed${NC}"
        return 1
    fi
}

# Create backup of current database before restore
backup_current() {
    local backup_name="pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    local backup_path="${BACKUP_DIR}/temp/${backup_name}"
    
    echo "Creating backup of current database..."
    mkdir -p "${BACKUP_DIR}/temp"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --format=custom \
        --compress=9 \
        --file="$backup_path" 2>&1; then
        echo -e "${GREEN}✓ Current database backed up to: $backup_path${NC}"
        echo "$backup_path"
        return 0
    else
        echo -e "${RED}ERROR: Failed to backup current database${NC}"
        return 1
    fi
}

# Restore database from backup
restore_database() {
    local backup_file=$1
    local skip_current_backup=${2:-false}
    
    # Verify backup file
    if ! verify_backup "$backup_file"; then
        return 1
    fi
    
    # Create backup of current database unless skipped
    local current_backup=""
    if [ "$skip_current_backup" != "true" ]; then
        current_backup=$(backup_current)
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}WARNING: Could not backup current database${NC}"
            echo -n "Continue with restore anyway? (y/N): "
            read -r response
            if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
                echo "Restore cancelled"
                return 1
            fi
        fi
    fi
    
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This will replace all data in the database!${NC}"
    echo -n "Are you sure you want to restore from $(basename "$backup_file")? (y/N): "
    read -r response
    
    if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
        echo "Restore cancelled"
        return 1
    fi
    
    log_message "Starting restore from: $backup_file"
    
    # Drop and recreate database
    echo "Preparing database for restore..."
    export PGPASSWORD="$DB_PASSWORD"
    
    # Terminate existing connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # Drop and recreate database
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"
    
    # Perform restore
    echo "Restoring database..."
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --verbose \
        "$backup_file" 2>&1 | tee -a "$LOG_FILE"; then
        
        log_message "Restore completed successfully"
        echo -e "${GREEN}✓ Database restored successfully${NC}"
        
        if [ -n "$current_backup" ]; then
            echo ""
            echo -e "${GREEN}Current database was backed up to:${NC}"
            echo "  $current_backup"
            echo "You can restore it using: $0 restore $current_backup --skip-current-backup"
        fi
        
        return 0
    else
        log_message "ERROR: Restore failed!"
        echo -e "${RED}ERROR: Restore failed!${NC}"
        
        if [ -n "$current_backup" ]; then
            echo ""
            echo -e "${YELLOW}Attempting to restore previous database...${NC}"
            restore_database "$current_backup" true
        fi
        
        return 1
    fi
}

# Point-in-time recovery simulation
pitr_info() {
    echo -e "${YELLOW}Point-in-Time Recovery (PITR) Information${NC}"
    echo ""
    echo "Current implementation uses full backups with retention policy:"
    echo "  • Daily backups: Last 7 days"
    echo "  • Weekly backups: Last 4 weeks"
    echo "  • Monthly backups: Last 12 months"
    echo ""
    echo "For true PITR with transaction-level recovery:"
    echo "  1. Enable WAL archiving in PostgreSQL"
    echo "  2. Use continuous archiving with base backups"
    echo "  3. Consider managed solutions (AWS RDS, Google Cloud SQL)"
    echo ""
    echo "See 'FUTURE_PLANS.md' for upgrade path to full PITR"
}

# Main function
main() {
    case "${1:-}" in
        list)
            list_backups
            ;;
        restore)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}ERROR: Please specify backup file to restore${NC}"
                echo "Usage: $0 restore <backup_file> [--skip-current-backup]"
                echo ""
                list_backups
                exit 1
            fi
            restore_database "$2" "${3:-}"
            ;;
        verify)
            if [ -z "${2:-}" ]; then
                echo -e "${RED}ERROR: Please specify backup file to verify${NC}"
                echo "Usage: $0 verify <backup_file>"
                exit 1
            fi
            verify_backup "$2"
            ;;
        pitr)
            pitr_info
            ;;
        *)
            echo "PostgreSQL Restore Utility for LogicArena"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  list                List available backups"
            echo "  restore <file>      Restore database from backup file"
            echo "  verify <file>       Verify backup file integrity"
            echo "  pitr               Show Point-in-Time Recovery information"
            echo ""
            echo "Examples:"
            echo "  $0 list"
            echo "  $0 restore /backups/data/daily/logicarena_daily_20240101_120000.sql.gz"
            echo "  $0 verify /backups/data/weekly/logicarena_weekly_20240107_120000.sql.gz"
            ;;
    esac
}

# Run main function
main "$@"