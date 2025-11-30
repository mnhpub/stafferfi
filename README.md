# StafferFi

StafferFi is a polyglot application that combines:

- **Web UI** – Next.js 15 (TypeScript, Tailwind, etc.) under `apps/web`
- **API** – Express + DuckDB under `apps/api`
- **Lake** – Python (FastAPI/Flask-style app) served by Gunicorn under `apps/lake`

The project uses **pnpm** workspaces in development and a single **Docker image** with `supervisord` to run all three services in production-like environments.

---

## Quick start (Docker all-in-one image)

Build the image from the repo root:

```bash
cd /home/mikehacker/src/usds/stafferfi

# Build the multi-stage Docker image
sudo docker build -t stafferfi-all .
```

Run the container:

```bash
sudo docker run --rm \
  -p 3000:3000 \
  -p 4000:4000 \
  -p 8000:8000 \
  stafferfi-all
```

You should see logs similar to:

- `Web UI:     http://localhost:3000`
- `API:        http://localhost:4000`
- `Lake (Py):  http://localhost:8000`

### Services and ports

Inside the container:

- **Web (Next.js)**  
  - Command: `node apps/web/server.js` (Next.js standalone server)  
  - Port: `3000` (controlled by `PORT` env var)  
  - Exposed on host: `http://localhost:3000`

- **API (Express + DuckDB)**  
  - Command: `node apps/api/dist/index.js`  
  - Port: `4000` (controlled by `API_PORT` env var, defaults to 4000)  
  - Exposed on host: `http://localhost:4000`  
  - Example endpoints:
    - `GET /health`
    - `GET /duckdb/version`

- **Lake (Python / Gunicorn)**  
  - Command: `gunicorn app:app --bind 0.0.0.0:8000 --chdir /app/apps/lake`  
  - Port: `8000`  
  - Exposed on host: `http://localhost:8000`

`supervisord` manages all three processes inside the container, using `supervisord.conf` at `/etc/supervisord.conf`.

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm (managed via corepack or installed globally)
- Python 3.10+ (for the lake app, if run locally)

### Install dependencies

```bash
cd /home/mikehacker/src/usds/stafferfi
corepack enable
corepack prepare pnpm@latest --activate

pnpm install
```

### Build

```bash
pnpm build:web
pnpm build:api
```

(These are the same build steps the Docker `builder` stage runs.)

### Run apps locally (example)

Web:

```bash
cd apps/web
pnpm dev   # or pnpm start after build
```

API:

```bash
cd apps/api
pnpm dev   # or pnpm start after build
```

Lake:

```bash
cd apps/lake
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
gunicorn app:app --bind 0.0.0.0:8000
```

---

## Docker image details

The `Dockerfile` uses a **multi-stage build**:

1. **builder** (Node 20, pnpm)
   - Installs JS dependencies via `pnpm install --frozen-lockfile`.
   - Builds:
     - Next.js web app (`pnpm build:web`) into `apps/web/.next/standalone`.
     - API (`pnpm build:api`) into `apps/api/dist`.
   - Creates a self-contained API bundle in `/tmp/api` containing:
     - `package.json`
     - `node_modules` (installed with `npm install --only=production --legacy-peer-deps`)
     - built `dist/`.

2. **lake-deps** (Python 3.10)
   - Creates a virtualenv at `/opt/venv`.
   - Installs `apps/lake` dependencies from `apps/lake/requirements.txt`.

3. **runner** (Python 3.10)
   - Installs Node.js runtime.
   - Copies:
     - Next.js standalone build and static assets.
     - Self-contained API bundle from `/tmp/api` → `/app/apps/api`.
     - Python venv and `apps/lake`.
   - Installs `supervisor` and uses `supervisord` as the container entrypoint.

Environment variables in the runner stage:

- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `PORT=3000` (web)
- `HOSTNAME=0.0.0.0`
- `API_PORT=4000` (API)

Exposed ports:

- `EXPOSE 3000 4000 8000`

---

## Supervisord

`supervisord.conf` defines three main programs:

- `[program:web]` – Next.js standalone
- `[program:api]` – Express API
- `[program:lake]` – Python lake service

There is also an optional `[program:init]` which is currently configured with:

```ini
[program:init]
command=/app/init.sh
autostart=false
autorestart=false
```

It is disabled by default to avoid restart spam, but can be used for one-time startup messages or migrations if needed.

---

## Docs and ADRs

Architecture and design decisions are tracked in:

- [`docs/ADRs.md`](docs/ADRs.md)

See that file for the rationale behind the current Docker, process, and port layout.
