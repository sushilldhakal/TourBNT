# Multi-stage Dockerfile for Google Cloud Run
# Builds both frontend and backend in a single container

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy server source
COPY server/ ./

# Build server
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache tini

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/

# Copy built backend
COPY --from=backend-builder /app/server/dist ./server/dist
COPY --from=backend-builder /app/server/package*.json ./server/
COPY --from=backend-builder /app/server/node_modules ./server/node_modules

# Copy root package.json
COPY package.json ./

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/server && node dist/server.js &' >> /app/start.sh && \
    echo 'cd /app/frontend && npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 8080 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start both services
CMD ["/app/start.sh"]
