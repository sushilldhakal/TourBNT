# Server Dockerfile with PM2
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

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

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=deps --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package*.json ./

# Copy PM2 ecosystem file
COPY --chown=expressjs:nodejs ecosystem.config.js ./

# Create logs directory for PM2
RUN mkdir -p logs && chown -R expressjs:nodejs logs

USER expressjs

EXPOSE 8000

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
