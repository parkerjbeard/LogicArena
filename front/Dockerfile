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

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Create a startup script that builds and then runs the app
RUN echo '#!/bin/sh\nbun run build && bun run start' > /app/start.sh && \
    chmod +x /app/start.sh

# Use the startup script
CMD ["/app/start.sh"]