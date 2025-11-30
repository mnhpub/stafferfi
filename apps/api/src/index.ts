import express, { type Request, type Response } from 'express';
import duckdb from 'duckdb';

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

// Initialize DuckDB in-process database
const { Database } = duckdb;
const db = new Database(':memory:');

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/duckdb/version', (_req: Request, res: Response) => {
  db.all('SELECT version() AS version', (err: Error | null, rows: any[] | null) => {
    if (err) {
      // In a real app you'd log this somewhere
      return res.status(500).json({ error: 'DuckDB query failed' });
    }

    res.json({ version: rows?.[0]?.version ?? null });
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
