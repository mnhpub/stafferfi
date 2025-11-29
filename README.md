# StafferFi

`docker build -t stafferfi . && docker run -p 3000:3000 stafferfi`

## Notes

- Vitest uses jsdom and RTL.
- Storybook runs with Vite builder and uses Tailwind styles from `app/globals.css`.
- Cypress configured with baseUrl `http://localhost:3000`.
