# -------------------------
# Build stage
# -------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy lockfile and fetch dependencies (cache layer)
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# Copy workspace config and source
COPY package.json pnpm-workspace.yaml turbo.json* ./
COPY packages ./packages
COPY apps ./apps

# Install all deps offline
RUN pnpm install --frozen-lockfile --offline

# build server
RUN pnpm --filter server build


# -------------------------
# Production stage
# -------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@latest --activate

# ✅ Now this works
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

EXPOSE 3000

WORKDIR /app/apps/server
CMD ["node", "dist/index.mjs"]