import { Handler } from '@netlify/functions';

/**
 * Wildcard Zernio API proxy.
 * Handles all /api/zernio/* paths except /api/zernio/config-check (own function).
 * The API key is read from process.env.ZERNIO_API_KEY — never the browser build.
 */

const ZERNIO_API_KEY =
  process.env.ZERNIO_API_KEY ??
  process.env.VITE_ZERNIO_API_KEY ??
  process.env.VITE_ZERNIO_KEY;
const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

const ALLOWED_GET_PATHS = new Set([
  '/accounts',
  '/accounts/follower-stats',
  '/analytics',
  '/analytics/best-time',
  '/analytics/content-decay',
  '/analytics/daily-metrics',
  '/analytics/overview',
  '/analytics/posting-frequency',
  '/calendar',
  '/settings',
  '/user',
  '/posts',
]);

const ALLOWED_POST_PATHS = new Set(['/posts', '/posts/schedule']);

function isDynamicGetPath(p: string): boolean {
  return (
    /^\/posts\/[^/]+$/.test(p) ||
    /^\/posts\/[^/]+\/analytics$/.test(p) ||
    /^\/calendar\/[^/]+$/.test(p)
  );
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  if (!ZERNIO_API_KEY) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Zernio API key not configured' }) };
  }

  // Strip /api/zernio prefix to get the upstream path
  const subPath = (event.path ?? '').replace(/^\/(?:api\/zernio|\.netlify\/functions\/zernio)/, '') || '/';
  const isGet  = event.httpMethod === 'GET';
  const isPost = event.httpMethod === 'POST';

  const allowed =
    (isGet  && (ALLOWED_GET_PATHS.has(subPath) || isDynamicGetPath(subPath))) ||
    (isPost && ALLOWED_POST_PATHS.has(subPath));

  if (!allowed) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Not found' }) };
  }

  const qs = event.rawQuery ? `?${event.rawQuery}` : '';
  const targetUrl = `${ZERNIO_API_BASE}${subPath}${qs}`;
  console.log(`[zernio] ${event.httpMethod} ${event.path} -> ${targetUrl}`);

  try {
    const fetchOpts: RequestInit = {
      method: event.httpMethod,
      headers: {
        Authorization: `Bearer ${ZERNIO_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    };

    if (isPost && event.body) {
      (fetchOpts as RequestInit & { body: string }).body = event.body;
    }

    const upstream = await fetch(targetUrl, fetchOpts);
    const data = await upstream.json();

    return { statusCode: upstream.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[zernio] proxy error:', msg);
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Zernio proxy error', message: msg }) };
  }
};
