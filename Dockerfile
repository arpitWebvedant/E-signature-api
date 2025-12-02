# syntax=docker/dockerfile:1.7
# Optimized Next.js Proof backend with smart caching and auto-healing

FROM node:20-alpine AS base
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache dumb-init curl postgresql-client netcat-openbsd && \
    rm -rf /var/cache/apk/*
WORKDIR /app
RUN npm config set cache /root/.npm --global

# Build dependencies layer (CACHED - separate from runtime)
FROM base AS build-deps
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache python3 make g++ && \
    rm -rf /var/cache/apk/*

# Production dependencies stage (CACHED - only changes when package.json changes)
FROM build-deps AS deps
COPY package*.json ./
# Copy .npmrc if it exists
COPY .npmr[c] ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-global \
    if [ -f package-lock.json ]; then \
        npm ci --omit=dev --legacy-peer-deps --prefer-offline; \
    else \
        echo "No package-lock.json found, using npm install..." && \
        npm install --omit=dev --legacy-peer-deps --prefer-offline; \
    fi

# Build dependencies stage (CACHED - only changes when package.json changes)
FROM build-deps AS build-deps-full
COPY package*.json ./
# Copy .npmrc if it exists
COPY .npmr[c] ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked,id=npm-global \
    if [ -f package-lock.json ]; then \
        npm ci --legacy-peer-deps --prefer-offline; \
    else \
        echo "No package-lock.json found, using npm install..." && \
        npm install --legacy-peer-deps --prefer-offline; \
    fi

# Build stage (rebuilds when source code changes)
FROM build-deps-full AS builder
COPY . .

# Build with optimized settings and validation
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked,id=nextjs-build \
    --mount=type=cache,target=/app/node_modules/.cache,sharing=locked,id=node-cache \
    NODE_OPTIONS="--max-old-space-size=2048" npm run build && \
    echo "=== Build validation ===" && \
    test -d .next || (echo "Build failed: .next directory not found" && exit 1) && \
    echo "✅ Build completed successfully"

# Final runtime image (clean, minimal)
FROM base AS app
ENV NODE_ENV=production

# Create runtime user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy production dependencies and built app
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Create required directories
RUN mkdir -p logs uploads && \
    chown -R nextjs:nodejs logs uploads .next

USER nextjs
EXPOSE 3011

CMD ["dumb-init", "node", "node_modules/next/dist/bin/next", "start", "-p", "3011"]
