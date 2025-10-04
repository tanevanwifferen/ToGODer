# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

# Install build tools for native modules (sqlite3, bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests and Prisma schema
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma

# Install dependencies (includes devDeps so tsc/prisma are available)
RUN npm ci

# Copy source and build TypeScript
COPY src ./src
RUN npx tsc

# Create data directory for SQLite and set permissions
RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
# Default PORT can be overridden by docker-compose or env
ENV PORT=6968
# Persist DB in mounted volume
ENV DATABASE_URL=file:/app/data/dev.db

USER node

EXPOSE 6968

# Run migrations on startup then launch the server
CMD sh -c "npx prisma migrate deploy && node bin/index.js"