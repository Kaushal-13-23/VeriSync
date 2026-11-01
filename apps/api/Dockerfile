# =============================================================================
# VeriSync API - Production Multi-Stage Dockerfile (SRS 12.1, 12.2)
# Strictly adheres to Rule 5: No secrets or credentials baked into image layers.
# Unprivileged user execution (node) for hardened container security.
# =============================================================================

# --- Stage 1: Base Dependencies & Builder ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm and required build utilities
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
RUN apk add --no-cache python3 make g++

# Copy root manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package configurations
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY prisma/ ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma Client & Build TypeScript Packages
RUN pnpm prisma:generate
RUN pnpm build:packages
RUN pnpm --filter @verisync/api build

# Prune devDependencies for lean production footprint
RUN pnpm --filter @verisync/api --prod deploy pruned-app

# --- Stage 2: Hardened Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=4000

# Security: Create unprivileged system group and user
RUN addgroup -g 1001 -S verisync && \
    adduser -u 1001 -S verisync -G verisync

# Copy production artifacts from builder
COPY --from=builder --chown=verisync:verisync /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=verisync:verisync /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=verisync:verisync /app/node_modules ./node_modules
COPY --from=builder --chown=verisync:verisync /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=verisync:verisync /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=verisync:verisync /app/prisma ./prisma

USER verisync

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health/live || exit 1

CMD ["node", "apps/api/dist/main.js"]
