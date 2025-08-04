FROM oven/bun:1-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
# Use Bun's fast installer with frozen lockfile for consistency
RUN bun install --frozen-lockfile

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy application code
COPY --chown=nextjs:nodejs . .
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next && \
    chown -R nextjs:nodejs /app

# Create startup script before switching to nextjs user
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'bun run build && node .next/standalone/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use the startup script
CMD ["/app/start.sh"]