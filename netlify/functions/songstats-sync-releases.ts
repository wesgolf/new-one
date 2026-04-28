import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON ??
  process.env.VITE_SUPABASE_PK ??
  '';
const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY ?? process.env.VITE_SONGSTATS_API_KEY ?? '';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function readDatabaseUrlFromEnv() {
  const raw =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
    process.env.VITE_SUPABASE_POSTGRES_URL ||
    process.env.VITE_SUPABASE_DB_URL ||
    '';
  const cleaned = String(raw || '').trim();
  return cleaned ? cleaned.replace(/^(DATABASE_URL=)+/i, '') : null;
}

function normalizeReleaseTitle(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[-–—]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function songstatsSourceValue(
  stats: Array<{ source: string; data: Record<string, number> }>,
  source: string,
  key: string,
) {
  return Number(stats.find((entry) => entry.source === source)?.data?.[key] ?? 0);
}

async function fetchSongstats<T>(path: string, params: Record<string, string>) {
  const url = new URL(`https://api.songstats.com/enterprise/v1${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      apikey: SONGSTATS_API_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`Songstats ${path} → HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers.authorization ?? event.headers.Authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Missing Authorization header' }) };
  }

  if (!SONGSTATS_API_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Songstats API key not configured' }) };
  }

  const databaseUrl = readDatabaseUrlFromEnv();
  if (!databaseUrl) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'DATABASE_URL is not configured on the server.' }) };
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Supabase server client is not configured.' }) };
  }

  let body: { songstatsArtistId?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!body.songstatsArtistId) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'songstatsArtistId is required' }) };
  }

  const token = authHeader.slice(7);
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData.user) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
  let updated = 0;
  let skipped = 0;
  const failures: Array<{ releaseId: string; title: string; error: string }> = [];

  try {
    const releases = await sql`
      SELECT id, title, isrc, spotify_track_id, distribution, performance
      FROM releases
      WHERE user_id = ${userData.user.id}::uuid
      ORDER BY updated_at DESC
    `;

    const catalogResponse = await fetchSongstats<{
      catalog?: Array<{ songstats_track_id: string; title: string; isrcs?: string[] }>;
    }>('/artists/catalog', {
      songstats_artist_id: body.songstatsArtistId,
      source_ids: 'all',
      limit: '100',
    });
    const catalog = Array.isArray(catalogResponse.catalog) ? catalogResponse.catalog : [];
    const catalogByTitle = new Map(catalog.map((track) => [normalizeReleaseTitle(track.title), track]));
    const catalogByIsrc = new Map(
      catalog.flatMap((track) => (track.isrcs ?? []).map((isrc) => [String(isrc).trim(), track] as const)),
    );

    for (const release of releases) {
      const matched =
        (release.isrc ? catalogByIsrc.get(String(release.isrc).trim()) : null) ??
        catalogByTitle.get(normalizeReleaseTitle(release.title));
      if (!matched) {
        skipped += 1;
        continue;
      }

      try {
        const [trackStats, trackInfo] = await Promise.all([
          fetchSongstats<{ stats?: Array<{ source: string; data: Record<string, number> }> }>(
            '/tracks/stats',
            { songstats_track_id: matched.songstats_track_id, source_ids: 'all' },
          ).catch(() => null),
          fetchSongstats<{ track_info?: { links?: Array<{ source: string; external_id: string; url: string }> } }>(
            '/tracks/info',
            { songstats_track_id: matched.songstats_track_id },
          ).catch(() => null),
        ]);

        if (!trackStats && !trackInfo) {
          skipped += 1;
          continue;
        }

        const releaseDistribution = (release.distribution ?? {}) as Record<string, unknown>;
        const releasePerformance = (release.performance ?? {}) as Record<string, any>;
        const existingStreams = (releasePerformance.streams ?? {}) as Record<string, number>;
        const links = trackInfo?.track_info?.links ?? [];
        const distribution = {
          spotify_url: links.find((link) => link.source === 'spotify')?.url ?? releaseDistribution.spotify_url ?? null,
          apple_music_url: links.find((link) => link.source === 'apple_music')?.url ?? releaseDistribution.apple_music_url ?? null,
          soundcloud_url: releaseDistribution.soundcloud_url ?? null,
          youtube_url: releaseDistribution.youtube_url ?? null,
        };
        const stats = trackStats?.stats ?? [];
        const performance = {
          streams: {
            spotify: songstatsSourceValue(stats, 'spotify', 'streams_total') || Number(existingStreams.spotify ?? 0),
            apple: songstatsSourceValue(stats, 'apple_music', 'streams_total') || Number(existingStreams.apple ?? 0),
            soundcloud: Number(existingStreams.soundcloud ?? 0),
            youtube: Number(existingStreams.youtube ?? 0),
          },
        };
        const spotifyTrackId =
          release.spotify_track_id ??
          links.find((link) => link.source === 'spotify')?.external_id ??
          null;

        await sql`
          UPDATE releases
          SET
            distribution = ${sql.json(distribution)},
            performance = ${sql.json(performance)},
            spotify_track_id = COALESCE(spotify_track_id, ${spotifyTrackId}),
            updated_at = NOW()
          WHERE id = ${release.id}::uuid
        `;
        updated += 1;
      } catch (error) {
        skipped += 1;
        failures.push({
          releaseId: String(release.id),
          title: String(release.title),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ updated, skipped, failures }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Songstats release sync failed', message }),
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
};
