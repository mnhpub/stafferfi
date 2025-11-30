import express from 'express';
import { Database } from 'duckdb';
const app = express();
const port = process.env.PORT ?? 4000;
// Initialize DuckDB in-process database
const db = new Database(':memory:');
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.get('/duckdb/version', (_req, res) => {
    db.all('SELECT version() AS version', (err, rows) => {
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
