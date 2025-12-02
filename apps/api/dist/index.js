"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const app = (0, express_1.default)();
const port = Number(process.env.API_PORT ?? 4000);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// PostgreSQL connection pool
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://stafferfi:stafferfi_dev@localhost:5432/ecfr_analytics',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Test database connection on startup
pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('❌ Failed to connect to PostgreSQL:', err.message);
    }
    else {
        console.log('✅ Connected to PostgreSQL');
    }
});
// ============================================================================
// HEALTH & META ENDPOINTS
// ============================================================================
app.get('/', (_req, res) => {
    res.json({
        name: 'eCFR Analytics API',
        version: '1.0.0',
        description: 'API for analyzing Electronic Code of Federal Regulations data',
        endpoints: {
            health: '/health',
            stats: '/api/stats',
            agencies: {
                list: '/api/agencies',
                detail: '/api/agencies/:slug',
                topByCorrections: '/api/agencies/top/corrections',
                topByRVI: '/api/agencies/top/rvi'
            },
            corrections: {
                list: '/api/corrections',
                recent: '/api/corrections/recent'
            },
            trends: {
                yearly: '/api/trends/yearly',
                monthly: '/api/trends/monthly',
                titles: '/api/trends/titles'
            }
        },
        documentation: 'https://github.com/mnhpub/stafferfi'
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/stats', async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM agencies) as total_agencies,
        (SELECT COUNT(*) FROM corrections) as total_corrections,
        (SELECT MIN(year) FROM corrections) as first_year,
        (SELECT MAX(year) FROM corrections) as last_year
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
// ============================================================================
// AGENCY ENDPOINTS
// ============================================================================
app.get('/api/agencies', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await pool.query(`SELECT slug, name, short_name, total_cfr_references, child_count
       FROM agencies
       ORDER BY name
       LIMIT $1 OFFSET $2`, [limit, offset]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching agencies:', error);
        res.status(500).json({ error: 'Failed to fetch agencies' });
    }
});
app.get('/api/agencies/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(`SELECT * FROM get_agency_detail($1)`, [slug]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agency not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching agency:', error);
        res.status(500).json({ error: 'Failed to fetch agency details' });
    }
});
app.get('/api/agencies/top/corrections', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const result = await pool.query(`SELECT * FROM v_top_agencies_by_corrections LIMIT $1`, [limit]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching top agencies:', error);
        res.status(500).json({ error: 'Failed to fetch top agencies' });
    }
});
app.get('/api/agencies/top/rvi', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const result = await pool.query(`SELECT * FROM v_top_agencies_by_rvi LIMIT $1`, [limit]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching top agencies by RVI:', error);
        res.status(500).json({ error: 'Failed to fetch top agencies by RVI' });
    }
});
// ============================================================================
// CORRECTION ENDPOINTS
// ============================================================================
app.get('/api/corrections', async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const year = req.query.year ? Number(req.query.year) : null;
        const title = req.query.title ? Number(req.query.title) : null;
        let query = `
      SELECT ecfr_id, cfr_reference, title, corrective_action, 
             error_occurred, error_corrected, lag_days, year
      FROM corrections
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (year) {
            query += ` AND year = $${paramIndex}`;
            params.push(year);
            paramIndex++;
        }
        if (title) {
            query += ` AND title = $${paramIndex}`;
            params.push(title);
            paramIndex++;
        }
        query += ` ORDER BY year DESC, error_corrected DESC NULLS LAST LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching corrections:', error);
        res.status(500).json({ error: 'Failed to fetch corrections' });
    }
});
app.get('/api/corrections/recent', async (_req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM v_recent_corrections`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching recent corrections:', error);
        res.status(500).json({ error: 'Failed to fetch recent corrections' });
    }
});
// ============================================================================
// TRENDS & ANALYTICS ENDPOINTS
// ============================================================================
app.get('/api/trends/yearly', async (_req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM v_yearly_trends`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching yearly trends:', error);
        res.status(500).json({ error: 'Failed to fetch yearly trends' });
    }
});
app.get('/api/trends/monthly', async (req, res) => {
    try {
        const year = req.query.year ? Number(req.query.year) : null;
        let query = `
      SELECT year, month, correction_count, avg_lag_days
      FROM correction_time_series
    `;
        const params = [];
        if (year) {
            query += ` WHERE year = $1`;
            params.push(year);
        }
        query += ` ORDER BY year, month`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching monthly trends:', error);
        res.status(500).json({ error: 'Failed to fetch monthly trends' });
    }
});
app.get('/api/trends/titles', async (_req, res) => {
    try {
        const result = await pool.query(`
      SELECT * FROM cfr_title_stats
      ORDER BY correction_count DESC
      LIMIT 20
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching title trends:', error);
        res.status(500).json({ error: 'Failed to fetch title trends' });
    }
});
// ============================================================================
// START SERVER
// ============================================================================
app.listen(port, () => {
    console.log(`🚀 API listening on http://localhost:${port}`);
    console.log(`📊 Endpoints:`);
    console.log(`   GET /health`);
    console.log(`   GET /api/stats`);
    console.log(`   GET /api/agencies`);
    console.log(`   GET /api/agencies/:slug`);
    console.log(`   GET /api/agencies/top/corrections`);
    console.log(`   GET /api/agencies/top/rvi`);
    console.log(`   GET /api/corrections`);
    console.log(`   GET /api/corrections/recent`);
    console.log(`   GET /api/trends/yearly`);
    console.log(`   GET /api/trends/monthly`);
    console.log(`   GET /api/trends/titles`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end(() => {
        console.log('PostgreSQL pool closed');
        process.exit(0);
    });
});
