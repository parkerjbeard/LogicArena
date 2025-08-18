# LogicArena Database Backup System

## Overview

This backup system provides automated PostgreSQL database backups with retention policies, verification, and easy restoration capabilities.

## Features

- **Automated Scheduling**: Daily, weekly, and monthly backups via cron
- **Retention Policies**: 
  - Daily: Last 7 backups
  - Weekly: Last 4 backups  
  - Monthly: Last 12 backups
- **Backup Verification**: Automatic integrity checks after each backup
- **Compression**: Uses PostgreSQL custom format with compression
- **Notifications**: Optional webhook notifications for backup status
- **Easy Restoration**: Simple command-line restore with safety checks
- **Pre-restore Backup**: Automatically backs up current database before restore

## Quick Start

### 1. Start the Backup Service

```bash
# Build and start the backup container
docker-compose -f docker-compose.yml -f docker-compose.backup.yml up -d backup

# Or if running separately
docker-compose -f docker-compose.backup.yml up -d
```

### 2. Check Backup Status

```bash
# View backup logs
docker logs logicarena_backup

# List existing backups
docker exec logicarena_backup /backups/scripts/restore.sh list

# Check backup container health
docker ps | grep logicarena_backup
```

### 3. Manual Backup

```bash
# Trigger manual backup
docker exec logicarena_backup /backups/scripts/backup.sh

# Verify specific backup
docker exec logicarena_backup /backups/scripts/restore.sh verify /backups/data/daily/logicarena_daily_20240101_120000.sql.gz
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Database Configuration
DB_PASSWORD=your_secure_password
POSTGRES_USER=logicuser
POSTGRES_DB=logicarena

# Backup Configuration (optional)
BACKUP_WEBHOOK_URL=https://your-webhook-url.com/backup-status
VERIFY_RESTORE=false  # Set to true for thorough verification (slower)
TZ=America/New_York   # Timezone for backup scheduling
```

### Backup Schedule

Edit `backups/config/crontab` to customize:

- Daily: 2:00 AM (except Sunday and 1st of month)
- Weekly: Sunday 2:00 AM (except 1st of month)
- Monthly: 1st of each month 2:00 AM

## Restore Procedures

### 1. List Available Backups

```bash
docker exec logicarena_backup /backups/scripts/restore.sh list
```

### 2. Restore from Backup

```bash
# Restore from specific backup (creates safety backup first)
docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/daily/logicarena_daily_20240101_120000.sql.gz

# Skip safety backup (use with caution)
docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/daily/logicarena_daily_20240101_120000.sql.gz --skip-current-backup
```

### 3. Verify Backup Integrity

```bash
docker exec logicarena_backup /backups/scripts/restore.sh verify /backups/data/weekly/logicarena_weekly_20240107_120000.sql.gz
```

## Disaster Recovery

### Complete System Failure

1. **Ensure PostgreSQL is running**:
   ```bash
   docker-compose up -d postgres
   docker-compose logs postgres
   ```

2. **Start backup container**:
   ```bash
   docker-compose -f docker-compose.backup.yml up -d
   ```

3. **List and choose backup**:
   ```bash
   docker exec logicarena_backup /backups/scripts/restore.sh list
   ```

4. **Restore database**:
   ```bash
   docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/[chosen-backup]
   ```

5. **Restart application**:
   ```bash
   docker-compose up -d
   ```

### Corrupted Database

1. **Stop application (keep database running)**:
   ```bash
   docker-compose stop gateway front
   ```

2. **Create emergency backup** (if possible):
   ```bash
   docker exec logicarena_backup /backups/scripts/backup.sh
   ```

3. **Restore from known good backup**:
   ```bash
   docker exec -it logicarena_backup /backups/scripts/restore.sh restore /backups/data/[last-known-good]
   ```

4. **Verify restoration**:
   ```bash
   docker exec postgres psql -U logicuser -d logicarena -c "SELECT COUNT(*) FROM users;"
   ```

5. **Restart application**:
   ```bash
   docker-compose up -d gateway front
   ```

## Backup Storage

### Local Storage

Backups are stored in `./backups/data/` with this structure:
```
backups/data/
├── daily/
│   └── logicarena_daily_*.sql.gz
├── weekly/
│   └── logicarena_weekly_*.sql.gz
├── monthly/
│   └── logicarena_monthly_*.sql.gz
└── temp/
    └── pre_restore_*.sql.gz
```

### Remote Storage (Manual)

For off-site backups, periodically copy to remote storage:

```bash
# Using rsync
rsync -avz ./backups/data/ user@remote-server:/path/to/backups/

# Using AWS S3
aws s3 sync ./backups/data/ s3://your-bucket/logicarena-backups/

# Using Google Cloud Storage
gsutil -m rsync -r ./backups/data/ gs://your-bucket/logicarena-backups/
```

## Monitoring

### Health Checks

The backup container includes health checks that verify:
- Recent backups exist
- Cron is running
- Database connectivity

```bash
# Check health status
docker inspect logicarena_backup | jq '.[0].State.Health'
```

### Notifications

Configure webhook notifications by setting `BACKUP_WEBHOOK_URL`:

```json
{
  "status": "success|error|warning",
  "message": "Backup completed: logicarena_daily_20240101_120000.sql.gz (Size: 15M)",
  "timestamp": "2024-01-01T02:00:15Z"
}
```

### Log Monitoring

```bash
# Real-time logs
docker logs -f logicarena_backup

# Backup-specific logs
docker exec logicarena_backup tail -f /backups/data/backup.log

# Cron logs
docker exec logicarena_backup tail -f /var/log/cron.log
```

## Troubleshooting

### Common Issues

#### 1. Backup Fails with Authentication Error

**Solution**: Verify database password in `.env`:
```bash
docker exec logicarena_backup env | grep DB_
```

#### 2. No Space Left on Device

**Solution**: Check disk space and clean old backups:
```bash
df -h ./backups/data
docker exec logicarena_backup find /backups/data -name "*.sql.gz" -mtime +90 -delete
```

#### 3. Restore Fails with Active Connections

**Solution**: Stop application containers first:
```bash
docker-compose stop gateway front
docker exec -it logicarena_backup /backups/scripts/restore.sh restore [backup-file]
docker-compose up -d gateway front
```

#### 4. Backup Container Won't Start

**Solution**: Check logs and rebuild:
```bash
docker logs logicarena_backup
docker-compose -f docker-compose.backup.yml build --no-cache
docker-compose -f docker-compose.backup.yml up -d
```

### Manual Database Access

For emergency access:

```bash
# Connect to database
docker exec -it postgres psql -U logicuser -d logicarena

# Dump database manually
docker exec postgres pg_dump -U logicuser logicarena > emergency_backup.sql

# Restore manually
docker exec -i postgres psql -U logicuser logicarena < emergency_backup.sql
```

## Security Considerations

1. **Encryption**: Consider encrypting backups at rest:
   ```bash
   # Encrypt backup
   gpg --symmetric --cipher-algo AES256 backup.sql.gz
   
   # Decrypt backup
   gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
   ```

2. **Access Control**: Restrict backup directory permissions:
   ```bash
   chmod 700 ./backups/data
   ```

3. **Password Security**: Use strong passwords and rotate regularly

4. **Network Security**: If using webhooks, use HTTPS and authentication

## Performance Optimization

### Large Databases

For databases > 1GB, consider:

1. **Increase compression**: Already using level 9 compression
2. **Parallel jobs**: Use pg_dump's `-j` option for parallel dumps
3. **Incremental backups**: Consider WAL archiving for point-in-time recovery

### Resource Limits

Adjust Docker resource limits if needed:

```yaml
# In docker-compose.backup.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

## Maintenance

### Regular Tasks

1. **Weekly**: Verify backup integrity
   ```bash
   docker exec logicarena_backup /backups/scripts/restore.sh verify [latest-backup]
   ```

2. **Monthly**: Test restore procedure on staging
3. **Quarterly**: Review retention policies and storage usage
4. **Annually**: Test full disaster recovery procedure

### Upgrade Procedure

1. Stop backup container:
   ```bash
   docker-compose -f docker-compose.backup.yml down
   ```

2. Update scripts/configuration

3. Rebuild and restart:
   ```bash
   docker-compose -f docker-compose.backup.yml build
   docker-compose -f docker-compose.backup.yml up -d
   ```

## Support

For issues or questions:
1. Check container logs: `docker logs logicarena_backup`
2. Review backup logs: `/backups/data/backup.log`
3. Test database connectivity manually
4. Verify cron schedule in `/backups/config/crontab`