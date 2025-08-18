#!/bin/bash

# PostgreSQL Backup Script for LogicArena
# This script performs automated backups with retention policies

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/data}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-logicarena}"
DB_USER="${DB_USER:-logicuser}"
DB_PASSWORD="${DB_PASSWORD}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)
WEBHOOK_URL="${WEBHOOK_URL}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Backup type determination
if [ "$DAY_OF_MONTH" == "01" ]; then
    BACKUP_TYPE="monthly"
elif [ "$DAY_OF_WEEK" == "7" ]; then
    BACKUP_TYPE="weekly"
else
    BACKUP_TYPE="daily"
fi

# Create backup directory structure
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"
mkdir -p "${BACKUP_DIR}/temp"

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Notification function
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\", \"timestamp\": \"$(date -Iseconds)\"}" \
            2>/dev/null || true
    fi
}

# Backup function
perform_backup() {
    local backup_file="${BACKUP_TYPE}/logicarena_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"
    local full_path="${BACKUP_DIR}/${backup_file}"
    
    log_message "Starting ${BACKUP_TYPE} backup..."
    
    # Set PGPASSWORD for authentication
    export PGPASSWORD="$DB_PASSWORD"
    
    # Perform backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password \
        --verbose \
        --format=custom \
        --compress=9 \
        --file="$full_path" 2>&1 | tee -a "$LOG_FILE"; then
        
        # Get backup size
        BACKUP_SIZE=$(du -h "$full_path" | cut -f1)
        log_message "Backup completed successfully: $backup_file (Size: $BACKUP_SIZE)"
        
        # Verify backup
        if verify_backup "$full_path"; then
            log_message "Backup verification successful"
            send_notification "success" "Backup completed: $backup_file (Size: $BACKUP_SIZE)"
            return 0
        else
            log_message "ERROR: Backup verification failed!"
            send_notification "error" "Backup verification failed: $backup_file"
            rm -f "$full_path"
            return 1
        fi
    else
        log_message "ERROR: Backup failed!"
        send_notification "error" "Backup failed for ${BACKUP_TYPE}"
        return 1
    fi
}

# Backup verification function
verify_backup() {
    local backup_file=$1
    local test_db="logicarena_test_$(date +%s)"
    
    log_message "Verifying backup integrity..."
    
    # Try to list contents of the backup
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log_message "Backup file structure verified"
        
        # Optional: Test restore to temporary database (disabled by default for speed)
        if [ "${VERIFY_RESTORE:-false}" == "true" ]; then
            log_message "Testing restore to temporary database..."
            
            # Create test database
            export PGPASSWORD="$DB_PASSWORD"
            createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$test_db" 2>&1 | tee -a "$LOG_FILE"
            
            # Attempt restore
            if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
                --no-password "$backup_file" 2>&1 | tee -a "$LOG_FILE"; then
                log_message "Test restore successful"
                # Drop test database
                dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$test_db" 2>&1 | tee -a "$LOG_FILE"
                return 0
            else
                log_message "Test restore failed"
                # Try to drop test database even if restore failed
                dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$test_db" 2>/dev/null || true
                return 1
            fi
        fi
        
        return 0
    else
        log_message "Backup file structure verification failed"
        return 1
    fi
}

# Retention policy enforcement
apply_retention_policy() {
    log_message "Applying retention policies..."
    
    # Daily backups: keep last 7
    find "${BACKUP_DIR}/daily" -name "*.sql.gz" -type f -mtime +7 -delete 2>/dev/null || true
    DAILY_COUNT=$(find "${BACKUP_DIR}/daily" -name "*.sql.gz" -type f | wc -l)
    log_message "Daily backups retained: $DAILY_COUNT (max: 7)"
    
    # Weekly backups: keep last 4
    find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -type f -mtime +28 -delete 2>/dev/null || true
    WEEKLY_COUNT=$(find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -type f | wc -l)
    log_message "Weekly backups retained: $WEEKLY_COUNT (max: 4)"
    
    # Monthly backups: keep last 12
    find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -type f -mtime +365 -delete 2>/dev/null || true
    MONTHLY_COUNT=$(find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -type f | wc -l)
    log_message "Monthly backups retained: $MONTHLY_COUNT (max: 12)"
}

# Disk space check
check_disk_space() {
    local available_space=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local used_percentage=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log_message "Disk space - Available: $available_space, Used: ${used_percentage}%"
    
    if [ "$used_percentage" -gt 90 ]; then
        log_message "WARNING: Disk space critically low!"
        send_notification "warning" "Disk space critically low: ${used_percentage}% used"
    elif [ "$used_percentage" -gt 80 ]; then
        log_message "WARNING: Disk space running low"
    fi
}

# Main execution
main() {
    log_message "========================================="
    log_message "Starting backup process (Type: ${BACKUP_TYPE})"
    log_message "========================================="
    
    # Check prerequisites
    if [ -z "$DB_PASSWORD" ]; then
        log_message "ERROR: Database password not set!"
        send_notification "error" "Backup failed: Database password not configured"
        exit 1
    fi
    
    # Check disk space
    check_disk_space
    
    # Perform backup
    if perform_backup; then
        # Apply retention policy
        apply_retention_policy
        
        # Final disk space check
        check_disk_space
        
        log_message "Backup process completed successfully"
        exit 0
    else
        log_message "Backup process failed"
        exit 1
    fi
}

# Run main function
main