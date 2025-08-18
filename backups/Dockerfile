FROM postgres:15-alpine

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    dcron \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set timezone (adjust as needed)
ENV TZ=America/New_York
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create backup user and directories
RUN adduser -D -s /bin/bash backup && \
    mkdir -p /backups/data /backups/scripts /backups/logs && \
    chown -R backup:backup /backups

# Copy backup scripts
COPY scripts/backup.sh /backups/scripts/backup.sh
COPY scripts/restore.sh /backups/scripts/restore.sh
COPY config/crontab /etc/crontabs/backup

# Make scripts executable
RUN chmod +x /backups/scripts/*.sh && \
    chmod 0644 /etc/crontabs/backup

# Copy entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create log file for cron
RUN touch /var/log/cron.log && \
    chown backup:backup /var/log/cron.log

# Set working directory
WORKDIR /backups

# Health check
HEALTHCHECK --interval=30m --timeout=10s --start-period=5s --retries=3 \
    CMD ls -la /backups/data/daily/*.sql.gz 2>/dev/null | head -1 || exit 1

# Run as backup user
USER backup

# Start cron and tail logs
ENTRYPOINT ["/entrypoint.sh"]