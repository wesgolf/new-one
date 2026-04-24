import { Handler } from '@netlify/functions';

/**
 * Audio proxy for fetching audio files from third-party CDNs that block CORS.
 *
 * NOTE: Netlify Functions cap responses at 6 MB. Large audio files will fail.
 * For production, consider proxying via Supabase Edge Functions or a dedicated
 * CDN rewrite rule instead.
 */

// Private/loopback hostnames that must never be fetched (SSRF guard)
const SSRF_BLOCK_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.0\.0\.0|169\.254\.|::1|fd[0-9a-f]{2}:)/i;

// Max response size to buffer (5 MB — leave headroom under the 6 MB Netlify limit)
const MAX_BYTES = 5 * 1024 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };

  const rawUrl = event.queryStringParameters?.url;
  if (!rawUrl) {
    return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing url param' }) };
  }

  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch {
    return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Only http/https URLs are allowed' }) };
  }

  if (SSRF_BLOCK_RE.test(parsed.hostname) || parsed.hostname === '::1') {
    return { statusCode: 403, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Access to local addresses is not allowed' }) };
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: { 'User-Agent': 'ArtistOS-AudioProxy/1.0' },
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
      };
    }

    const contentType = upstream.headers.get('content-type') ?? 'audio/mpeg';

    // Read with size guard
    const reader = upstream.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BYTES) {
        await reader.cancel();
        return {
          statusCode: 413,
          headers: { ...CORS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Audio file too large for proxy (5 MB limit). Access the URL directly.' }),
        };
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[audio-proxy] failed:', rawUrl, msg);
    return {
      statusCode: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Audio proxy error', message: msg }),
    };
  }
};
