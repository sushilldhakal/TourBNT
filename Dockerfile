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

# Install nginx for reverse proxy
RUN apk add --no-cache nginx

# Create nginx configuration
RUN mkdir -p /run/nginx && \
    echo 'events { worker_connections 1024; }' > /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '  default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 8080;' >> /etc/nginx/nginx.conf && \
    echo '    location /api/ {' >> /etc/nginx/nginx.conf && \
    echo '      proxy_pass http://localhost:4000;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_http_version 1.1;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Connection "upgrade";' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Host $host;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_cache_bypass $http_upgrade;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location / {' >> /etc/nginx/nginx.conf && \
    echo '      proxy_pass http://localhost:3000;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_http_version 1.1;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Connection "upgrade";' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Host $host;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_cache_bypass $http_upgrade;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/server && node dist/server.js &' >> /app/start.sh && \
    echo 'cd /app/frontend && PORT=3000 npm start &' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose Cloud Run port
EXPOSE 8080

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start all services
CMD ["/app/start.sh"]
