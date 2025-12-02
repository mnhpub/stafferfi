# Fly.io Database URL Normalization

## Overview

When deploying to Fly.io, internal Postgres connections require using Fly's internal DNS suffix (`.internal`) to resolve hostnames within the private network. This module automatically normalizes database URLs at runtime, eliminating the need to manually update secrets or connection strings.

## Problem

Inside Fly.io machines, a bare hostname like `stafferfi-postgres` fails to resolve:

```
psycopg2.OperationalError: could not translate host name "stafferfi-postgres" to address: Name or service not known
```

The hostname must include the `.internal` suffix (`stafferfi-postgres.internal`) for Fly's internal DNS to work.

## Solution

Runtime helpers detect execution on Fly.io and append `.internal` to single-label hostnames automatically. This allows secrets like `DATABASE_URL` to remain unchanged across local and deployed environments.

### Detection

The helpers detect Fly.io by checking for environment variables:
- `FLY_ALLOC_ID`
- `FLY_APP_NAME`

If either is set, normalization logic is applied.

### Normalization Rules

Hostnames are normalized **only** when all of the following are true:
1. Running on Fly.io (detected via env vars)
2. The hostname is a single-label name (no dots)
3. The hostname does not already end in `.internal` or `.flycast`
4. The hostname is not `localhost`, `127.0.0.1`, `::1`, or any IP address

| Input Hostname | Output Hostname | Reason |
|----------------|-----------------|--------|
| `stafferfi-postgres` | `stafferfi-postgres.internal` | Single-label, needs suffix |
| `stafferfi-postgres.internal` | `stafferfi-postgres.internal` | Already has suffix |
| `db.example.com` | `db.example.com` | Multi-label FQDN |
| `localhost` | `localhost` | Loopback, unchanged |
| `127.0.0.1` | `127.0.0.1` | IP address, unchanged |

## Usage

### Node.js / API (`apps/api`)

```typescript
import { getNormalizedDatabaseUrl } from './lib/dbUrl';

const pool = new Pool({
  connectionString: getNormalizedDatabaseUrl(),
});
```

The function reads from environment variables in order: `DATABASE_URL`, `POSTGRES_URL`, `PG_URL`.

### Python / ETL (`apps/lake`)

```python
from db_url import normalized_pg_url

postgres_url = normalized_pg_url()
conn = psycopg2.connect(postgres_url)
```

The function reads from environment variables in order: `DATABASE_URL`, `POSTGRES_URL`, `PG_URL`.

## Logging

When normalization occurs, a single informational log line is emitted:

```
[Fly] Normalized database hostname to: stafferfi-postgres.internal
```

Credentials are never logged.

## Idempotency

Repeated calls return the same normalized URL. The suffix is never double-appended because hostnames already ending in `.internal` are skipped.

## Local Development

In local development (without `FLY_ALLOC_ID` or `FLY_APP_NAME` set), URLs are returned unchanged. This means the same `DATABASE_URL` value can be used in both environments.

## Files

- `apps/api/src/lib/dbUrl.ts` - Node.js helper
- `apps/lake/db_url.py` - Python helper
- `docs/fly-db-normalization.md` - This documentation
