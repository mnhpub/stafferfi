"""
Database URL normalization for Fly.io deployment.

Automatically appends `.internal` DNS suffix to single-label Postgres hostnames
when running inside Fly.io machines.
"""

import os
from urllib.parse import urlparse, urlunparse


def is_running_on_fly() -> bool:
    """Detect if the current runtime is inside a Fly.io machine."""
    return bool(os.environ.get('FLY_ALLOC_ID') or os.environ.get('FLY_APP_NAME'))


def needs_normalization(hostname: str) -> bool:
    """
    Check if a hostname is a single-label hostname that needs normalization.
    
    Returns False for:
    - Hostnames already ending in .internal or .flycast
    - Hostnames containing a dot (multi-label / FQDNs)
    - localhost or loopback addresses (127.0.0.1, ::1)
    - IP addresses
    """
    lower_host = hostname.lower()

    # Already has .internal or .flycast suffix
    if lower_host.endswith('.internal') or lower_host.endswith('.flycast'):
        return False

    # Contains a dot (multi-label domain or IP address)
    if '.' in hostname:
        return False

    # Localhost
    if lower_host == 'localhost':
        return False

    # IPv6 addresses have colons (e.g., ::1)
    if ':' in hostname:
        return False

    # Single-label hostname that needs normalization
    return True


def normalize_db_url(url: str) -> str:
    """
    Normalize a database URL for Fly.io internal DNS.
    
    If the hostname is a single-label name (like "stafferfi-postgres"),
    appends ".internal" to enable Fly's internal DNS resolution.
    
    Args:
        url: The original database URL
        
    Returns:
        The normalized URL (possibly unchanged)
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        
        if hostname and needs_normalization(hostname):
            # Reconstruct with .internal suffix
            new_netloc = parsed.netloc.replace(hostname, f'{hostname}.internal', 1)
            normalized = urlunparse((
                parsed.scheme,
                new_netloc,
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment
            ))
            return normalized
        
        return url
    except Exception:
        # If URL parsing fails, return as-is
        return url


def normalized_pg_url() -> str:
    """
    Retrieve the database URL from environment variables and normalize for Fly.io.
    
    Checks environment variables in order of preference: DATABASE_URL, POSTGRES_URL, PG_URL.
    Falls back to a localhost default if none are set.
    
    When running on Fly.io (detected via FLY_ALLOC_ID or FLY_APP_NAME), single-label
    hostnames like "stafferfi-postgres" are normalized to "stafferfi-postgres.internal".
    
    Returns:
        The normalized database URL
    """
    raw_url = (
        os.environ.get('DATABASE_URL') or
        os.environ.get('POSTGRES_URL') or
        os.environ.get('PG_URL') or
        'postgresql://stafferfi:stafferfi_dev@localhost:5432/ecfr_analytics'
    )

    if not is_running_on_fly():
        return raw_url

    normalized_url = normalize_db_url(raw_url)

    if normalized_url != raw_url:
        # Log normalization without exposing credentials
        try:
            parsed = urlparse(normalized_url)
            print(f'[Fly] Normalized database hostname to: {parsed.hostname}')
        except Exception:
            print('[Fly] Normalized database URL for internal DNS')

    return normalized_url
