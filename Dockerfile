# Multi-stage build for Next.js 15 app on Fly.io

# 1) Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Install OS deps needed for sharp / next image optimizations
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
# Use corepack to enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# 2) Build the app
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Ensure Next.js outputs the standalone server
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
RUN pnpm build
# Ensure public directory exists in builder stage
RUN mkdir -p apps/web/public

# 3) Run the app with minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Fly will route to this port
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy the standalone build produced by Next.js
# The standalone directory contains node_modules and server.js inside .next/standalone
COPY --from=builder /app/apps/web/.next/standalone ./
# Static assets
COPY --from=builder /app/apps/web/.next/static ./.next/static
# Public folder (only copy if exists). If not present, create empty dir to avoid COPY failure.
# Use a conditional copy pattern via wildcard; if no match, create directory.
# (Alpine shell step to guarantee existence)
RUN mkdir -p public
COPY --from=builder /app/apps/web/public ./public

# Make sure the app runs as non-root
USER 1001

EXPOSE 3000
# Next.js standalone build has a server.js inside the workspace structure
CMD ["node", "apps/web/server.js"]
