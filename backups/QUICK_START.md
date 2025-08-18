# Quick Start Guide - Database Backups

## 1. Start Backup System (2 minutes)

```bash
# Add database password to .env file if not already present
echo "DB_PASSWORD=DevP@ssw0rd2024!" >> .env

# Start the backup container
docker-compose -f docker-compose.yml -f docker-compose.backup.yml up -d backup

# Verify it's running
docker ps | grep backup
docker logs logicarena_backup
```

## 2. Run Your First Backup (1 minute)

```bash
# Create manual backup
docker exec logicarena_backup /backups/scripts/backup.sh

# List backups
docker exec logicarena_backup /backups/scripts/restore.sh list
```

## 3. Test the System (5 minutes)

```bash
# Run comprehensive tests
./backups/test-backup-system.sh
```

## 4. Restore from Backup (if needed)

```bash
# List available backups
docker exec logicarena_backup /backups/scripts/restore.sh list

# Restore (interactive - will ask for confirmation)
docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/daily/[backup-file]
```

## That's It! 🎉

Your database is now being backed up automatically:
- **Daily** at 2:00 AM
- **Weekly** on Sundays
- **Monthly** on the 1st

Backups are stored in `./backups/data/` with automatic retention management.

## Need Help?

- Check logs: `docker logs logicarena_backup`
- Read full docs: `cat backups/README.md`
- Test system: `./backups/test-backup-system.sh`

## Common Commands

```bash
# Stop backup system
docker-compose -f docker-compose.backup.yml down

# Rebuild after changes
docker-compose -f docker-compose.backup.yml build
docker-compose -f docker-compose.backup.yml up -d

# Check backup schedule
docker exec logicarena_backup crontab -l

# Monitor in real-time
docker logs -f logicarena_backup
```