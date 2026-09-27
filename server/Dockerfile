# Server Dockerfile with PM2
#
# NOTE: build this with the *repository root* as context, not server/, e.g.
#   docker build -f server/Dockerfile -t tourbnt-server .
# because @tourbnt/db (packages/db) is a "file:../packages/db" dependency
# shared with the frontend — it must sit next to server/ in the build context.
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Shared Postgres/Drizzle schema (single source of truth for both apps)
COPY packages/db ./packages/db
RUN npm install --prefix packages/db --legacy-peer-deps && npm run build --prefix packages/db

WORKDIR /app/server

# Copy package files
COPY server/package.json ./

# Install dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/packages/db ./packages/db

WORKDIR /app/server

# Copy package files
COPY server/package.json ./

# Install all dependencies (including dev dependencies)
RUN npm install --legacy-peer-deps

# Copy source code
COPY server/ .

# Server code and @tourbnt/db must share one drizzle-orm install, or tsc
# treats their SQL types as incompatible.
RUN rm -rf /app/packages/db/node_modules/drizzle-orm \
 && ln -s /app/server/node_modules/drizzle-orm /app/packages/db/node_modules/drizzle-orm

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

# Install PM2 globally
RUN npm install -g pm2

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Shared Postgres/Drizzle package — server/node_modules/@tourbnt/db resolves
# via "file:../packages/db", so it must exist at this relative path too.
COPY --from=deps --chown=expressjs:nodejs /app/packages/db ../packages/db

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/server/dist ./dist
COPY --from=deps --chown=expressjs:nodejs /app/server/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/server/package*.json ./

# Copy source files for Swagger JSDoc comments (needed for API documentation)
COPY --from=builder --chown=expressjs:nodejs /app/server/src ./src

# Copy PM2 ecosystem file
COPY --chown=expressjs:nodejs server/ecosystem.config.js ./

# Create logs directory for PM2
RUN mkdir -p logs && chown -R expressjs:nodejs logs

USER expressjs

EXPOSE 8000

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
