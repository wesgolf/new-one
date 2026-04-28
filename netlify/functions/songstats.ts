import { Handler } from '@netlify/functions';

const SONGSTATS_API_KEY =
  process.env.SONGSTATS_API_KEY ??
  process.env.VITE_SONGSTATS_API_KEY;
const SONGSTATS_API_BASE = 'https://api.songstats.com/enterprise/v1';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!SONGSTATS_API_KEY) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Songstats API key not configured' }) };
  }

  const upstreamPath = (event.path ?? '').replace(/^\/(?:\.netlify\/functions\/)?songstats/, '') || '/';
  const url = `${SONGSTATS_API_BASE}${upstreamPath}${event.rawQuery ? `?${event.rawQuery}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        apikey: SONGSTATS_API_KEY,
      },
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: CORS,
      body: text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[songstats] proxy error:', message);
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: 'Songstats proxy error', message }),
    };
  }
};
