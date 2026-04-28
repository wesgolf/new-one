import { Handler } from '@netlify/functions';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchPublicSoundCloudTracks(profileUrl: string, limit = 200) {
  const response = await fetch(profileUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Artist-OS/1.0',
    },
  });
  const html = await response.text();
  const hydrationMatch = html.match(/window\.__sc_hydration = (.*?);<\/script>/s);
  const hydration = hydrationMatch ? JSON.parse(hydrationMatch[1]) : [];
  const clientId = hydration.find((entry: any) => entry?.hydratable === 'apiClient')?.data?.id;

  if (clientId) {
    const resolveResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(profileUrl)}&client_id=${encodeURIComponent(clientId)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Artist-OS/1.0',
      },
    });
    if (resolveResponse.ok) {
      const resolved = await resolveResponse.json();
      const userId = resolved?.id;
      if (userId) {
        const tracksResponse = await fetch(`https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${encodeURIComponent(clientId)}&limit=${limit}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Artist-OS/1.0',
          },
        });
        if (tracksResponse.ok) {
          const tracksJson = await tracksResponse.json();
          const collection = Array.isArray(tracksJson?.collection) ? tracksJson.collection : [];
          return collection.map((track: any) => ({
            title: String(track?.title ?? '').trim(),
            permalink_url: String(track?.permalink_url ?? '').trim(),
            created_at: track?.created_at ?? null,
            playback_count: Number(track?.playback_count ?? 0),
            likes_count: Number(track?.likes_count ?? track?.favoritings_count ?? 0),
            reposts_count: Number(track?.reposts_count ?? 0),
            comment_count: Number(track?.comment_count ?? 0),
          })).filter((track: any) => track.title && track.permalink_url);
        }
      }
    }
  }

  return Array.from(
    html.matchAll(
      /<article[^>]*itemtype="http:\/\/schema\.org\/MusicRecording"[^>]*>[\s\S]*?<a itemprop="url" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<time pubdate>([^<]+)<\/time>/gi,
    ),
  )
    .map((match) => {
      const href = match[1]?.trim();
      const title = decodeHtmlEntities(stripHtml(match[2] ?? '').trim());
      const publishedAt = match[3]?.trim() || null;
      if (!href || !title) return null;
      return {
        title,
        permalink_url: new URL(href, profileUrl).toString(),
        created_at: publishedAt,
        playback_count: 0,
        likes_count: 0,
        reposts_count: 0,
        comment_count: 0,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const url = event.queryStringParameters?.url?.trim();
  const limit = Math.min(250, Math.max(1, Number(event.queryStringParameters?.limit ?? 200) || 200));
  if (!url) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing url query parameter' }) };
  }

  try {
    const tracks = await fetchPublicSoundCloudTracks(url, limit);
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ tracks }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[soundcloud-public-tracks] error:', message);
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: 'Failed to fetch public SoundCloud tracks', message }),
    };
  }
};
