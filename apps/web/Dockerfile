# Dockerfile for supabill Next.js app (monorepo compatible)

FROM node:20-alpine AS base

# -------------------------
# Build stage
# -------------------------
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile and fetch dependencies (cache layer)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# Copy workspace config
COPY package.json pnpm-workspace.yaml turbo.json* ./

# Copy monorepo source
COPY apps ./apps
COPY packages ./packages

# Install all deps offline
RUN pnpm install --frozen-lockfile --offline

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build only the web app
RUN pnpm --filter web build && mkdir -p /app/apps/web/public


# -------------------------
# Production stage
# -------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app (requires output: "standalone" in next.config)
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]