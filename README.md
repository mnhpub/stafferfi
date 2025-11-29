# StafferFi

## Local Development

### Monorepo layout

- `apps/web` – Next.js UI application
- `apps/api` – Node + Express + DuckDB API
- `apps/lake` – Python/Flask data app (served via Gunicorn)

## Running with Docker (single container, all apps)

From the repository root:

```bash
docker buildx build -t stafferfi-all .
docker run -p 3000:3000 -p 4000:4000 -p 8000:8000 stafferfi-all
```

This will run:

1. Web (Next.js) on http://localhost:3000
2. API (Node/Express) on http://localhost:4000
3. Lake (Python/Flask) on http://localhost:8000

### Manual Docker Compose (if you keep a compose file)

```bash
docker compose up --build
docker compose down
```

## Notes

- Vitest uses jsdom and RTL.
- Storybook runs with Vite builder and uses Tailwind styles from `apps/web/app/globals.css`.
- Cypress is configured with baseUrl `http://localhost:3000`.
