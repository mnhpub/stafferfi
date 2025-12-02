"use strict";
/**
 * Database URL normalization for Fly.io deployment.
 *
 * Automatically appends `.internal` DNS suffix to single-label Postgres hostnames
 * when running inside Fly.io machines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedDatabaseUrl = getNormalizedDatabaseUrl;
/**
 * Detects if the current runtime is inside a Fly.io machine.
 */
function isRunningOnFly() {
    return !!(process.env.FLY_ALLOC_ID || process.env.FLY_APP_NAME);
}
/**
 * Checks if a hostname is a single-label hostname that needs normalization.
 * Returns false for:
 * - Hostnames already ending in .internal or .flycast
 * - Hostnames containing a dot (multi-label / FQDNs)
 * - localhost or loopback addresses (127.0.0.1, ::1)
 * - IP addresses
 */
function needsNormalization(hostname) {
    const lowerHost = hostname.toLowerCase();
    // Already has .internal or .flycast suffix
    if (lowerHost.endsWith('.internal') || lowerHost.endsWith('.flycast')) {
        return false;
    }
    // Contains a dot (multi-label domain or IP address)
    if (hostname.includes('.')) {
        return false;
    }
    // Localhost or loopback
    if (lowerHost === 'localhost') {
        return false;
    }
    // IPv6 loopback (::1) would have colons
    if (hostname.includes(':')) {
        return false;
    }
    // Single-label hostname that needs normalization
    return true;
}
/**
 * Normalizes a database URL for Fly.io internal DNS.
 *
 * If running on Fly.io and the hostname is a single-label name (like "stafferfi-postgres"),
 * appends ".internal" to enable Fly's internal DNS resolution.
 *
 * @param url - The original database URL
 * @returns The normalized URL (possibly unchanged)
 */
function normalizeDbUrl(url) {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        if (needsNormalization(hostname)) {
            parsed.hostname = `${hostname}.internal`;
            return parsed.toString();
        }
        return url;
    }
    catch {
        // If URL parsing fails, return as-is
        return url;
    }
}
/**
 * Retrieves the database URL from environment variables and normalizes it for Fly.io.
 *
 * Checks environment variables in order of preference: DATABASE_URL, POSTGRES_URL, PG_URL.
 * Falls back to a localhost default if none are set.
 *
 * When running on Fly.io (detected via FLY_ALLOC_ID or FLY_APP_NAME), single-label
 * hostnames like "stafferfi-postgres" are normalized to "stafferfi-postgres.internal".
 *
 * @returns The normalized database URL
 */
function getNormalizedDatabaseUrl() {
    const rawUrl = process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.PG_URL ||
        'postgresql://stafferfi:stafferfi_dev@localhost:5432/ecfr_analytics';
    if (!isRunningOnFly()) {
        return rawUrl;
    }
    const normalizedUrl = normalizeDbUrl(rawUrl);
    if (normalizedUrl !== rawUrl) {
        // Log normalization without exposing credentials
        try {
            const parsed = new URL(normalizedUrl);
            console.log(`[Fly] Normalized database hostname to: ${parsed.hostname}`);
        }
        catch {
            console.log('[Fly] Normalized database URL for internal DNS');
        }
    }
    return normalizedUrl;
}
