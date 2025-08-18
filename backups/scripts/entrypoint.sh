#!/bin/bash

# Entrypoint script for backup container

set -e

# Function to handle signals
shutdown() {
    echo "Received shutdown signal, stopping cron..."
    killall crond 2>/dev/null || true
    exit 0
}

# Trap signals
trap 'shutdown' SIGTERM SIGINT

# Validate environment variables
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: DB_PASSWORD environment variable is required!"
    exit 1
fi

# Create necessary directories
mkdir -p /backups/data/daily /backups/data/weekly /backups/data/monthly /backups/data/temp

# Test database connection
echo "Testing database connection..."
export PGPASSWORD="$DB_PASSWORD"

for i in {1..30}; do
    if pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-logicuser}"; then
        echo "Database is ready!"
        break
    fi
    echo "Waiting for database... (attempt $i/30)"
    sleep 2
done

# Verify database access
if psql -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-logicuser}" -d "${DB_NAME:-logicarena}" -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database connection verified!"
else
    echo "WARNING: Could not verify database access. Backups may fail."
fi

# Run initial backup if no backups exist
if [ -z "$(find /backups/data -name '*.sql.gz' -type f 2>/dev/null | head -1)" ]; then
    echo "No existing backups found. Running initial backup..."
    /backups/scripts/backup.sh || echo "Initial backup failed, will retry on schedule"
fi

# Start cron in foreground
echo "Starting cron daemon..."
echo "Backup schedule:"
echo "  Daily: 2:00 AM (except Sunday and 1st of month)"
echo "  Weekly: Sunday 2:00 AM (except 1st of month)"
echo "  Monthly: 1st of each month 2:00 AM"
echo ""
echo "Container is running. Tailing backup logs..."

# Start cron and tail logs
crond -f -l 2 &
CRON_PID=$!

# Tail logs
touch /var/log/cron.log /backups/data/backup.log
tail -F /var/log/cron.log /backups/data/backup.log &

# Wait for cron process
wait $CRON_PID