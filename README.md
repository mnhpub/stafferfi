# StafferFi

## Local Development

Run the local development environment with Docker:

```bash
./local-dev.sh
```

This script will:
1. Build the Docker image
2. Start the container using docker compose
3. Expose the app on http://localhost:3000

### Manual Docker Commands

Alternatively, you can run Docker commands manually:

```bash
docker build -t stafferfi . && docker run -p 3000:3000 stafferfi
```

## Notes

- Vitest uses jsdom and RTL.
- Storybook runs with Vite builder and uses Tailwind styles from `app/globals.css`.
- Cypress configured with baseUrl `http://localhost:3000`..
