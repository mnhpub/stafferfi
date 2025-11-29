# Multi-stage build for monorepo (Next.js web, Node API, Python lake) on Fly.io

# 1) Install Node dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 py3-pip
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# 2) Build Node apps (web + api)
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 py3-pip
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
RUN pnpm build
# Ensure public directory exists in builder stage
RUN mkdir -p apps/web/public

# 3) Install Python dependencies for lake app
FROM python:3.10-slim AS lake-deps
WORKDIR /app
COPY apps/lake/requirements.txt ./requirements.txt
RUN python -m venv /opt/venv \
  && . /opt/venv/bin/activate \
  && pip install --no-cache-dir -Ur requirements.txt

# 4) Final runtime image with supervisord managing all apps
FROM python:3.10-slim AS runner
WORKDIR /app

# Install Node runtime and pnpm for Node apps
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm ca-certificates && rm -rf /var/lib/apt/lists/* \
  && npm install -g corepack && corepack enable

# Copy Node build artifacts
COPY --from=builder /app ./

# Copy Python venv and lake app source
COPY --from=lake-deps /opt/venv /opt/venv
COPY apps/lake ./apps/lake
ENV PATH="/opt/venv/bin:$PATH"

# Install supervisord
RUN pip install --no-cache-dir supervisor
COPY supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000 4000 8000

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
