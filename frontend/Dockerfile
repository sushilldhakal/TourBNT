# Frontend Dockerfile (Next.js) with PM2
#
# NOTE: build this with the *repository root* as context, not frontend/, e.g.
#   docker build -f frontend/Dockerfile -t tourbnt-frontend .
# because @tourbnt/db (packages/db) is a "file:../packages/db" dependency
# shared with the server — it must sit next to frontend/ in the build context.
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Shared Postgres/Drizzle schema (single source of truth for both apps)
COPY packages/db ./packages/db
RUN npm install --prefix packages/db && npm run build --prefix packages/db

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/packages/db ./packages/db

WORKDIR /app/frontend

# Copy dependencies from deps stage
COPY --from=deps /app/frontend/node_modules ./node_modules

# Copy source code
COPY frontend/ .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1

# IMPORTANT: Set the backend URL at build time
# This can be overridden with --build-arg during docker build
ARG NEXT_PUBLIC_BACKEND_URL=https://tourbnt.com
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build Next.js application
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install PM2 globally
RUN npm install -g pm2

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/frontend/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size.
# NOTE: because this is an npm workspace monorepo, Next.js's standalone
# output may nest the server entrypoint as .next/standalone/frontend/server.js
# instead of .next/standalone/server.js — verify the actual output path with
# `docker build` and adjust the CMD/paths below if needed.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

# Copy PM2 ecosystem file
COPY --chown=nextjs:nodejs frontend/ecosystem.config.js ./

# Create logs directory for PM2
RUN mkdir -p logs && chown -R nextjs:nodejs logs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
