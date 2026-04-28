import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON ??
  process.env.VITE_SUPABASE_PK ??
  '';

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

function soundCloudSlug(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.pathname.split('/').filter(Boolean).slice(1).join('/').toLowerCase();
  } catch {
    return String(value).trim().replace(/^\/+/, '').toLowerCase();
  }
}

function toDateString(value: unknown) {
  if (!value) return null;
  const raw = String(value);
  const idx = raw.indexOf('T');
  const day = idx >= 0 ? raw.slice(0, idx) : raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
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

  const databaseUrl = readDatabaseUrlFromEnv();
  if (!databaseUrl) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'DATABASE_URL is not configured on the server.' }) };
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Supabase server client is not configured.' }) };
  }

  let body: { tracks?: any[] };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const tracks = Array.isArray(body.tracks) ? body.tracks : [];
  if (!tracks.length) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Body must include tracks: []' }) };
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
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ title: string | null; permalink_url: string | null; error: string }> = [];

  try {
    const releases = await sql`
      SELECT id, title, release_date, soundcloud_track_id, distribution, performance
      FROM releases
      WHERE user_id = ${userData.user.id}::uuid
      ORDER BY updated_at DESC
    `;

    const byTitle = new Map(releases.map((release) => [normalizeReleaseTitle(release.title), release]));
    const bySlug = new Map(
      releases
        .map((release) => {
          const distribution = (release.distribution ?? {}) as Record<string, unknown>;
          const slug = soundCloudSlug((distribution.soundcloud_url as string | undefined) || release.soundcloud_track_id);
          return slug ? [slug, release] as const : null;
        })
        .filter(Boolean) as ReadonlyArray<readonly [string, (typeof releases)[number]]>,
    );

    for (const track of tracks.slice(0, 250)) {
      const title = String(track?.title ?? '').trim();
      const permalinkUrl = String(track?.permalink_url ?? '').trim();
      if (!title || !permalinkUrl) {
        skipped += 1;
        continue;
      }

      const existing = (soundCloudSlug(permalinkUrl) ? bySlug.get(soundCloudSlug(permalinkUrl)!) : null)
        ?? byTitle.get(normalizeReleaseTitle(title))
        ?? null;
      const existingDistribution = (existing?.distribution ?? {}) as Record<string, unknown>;
      const existingStreams = (existing?.performance?.streams ?? {}) as Record<string, number>;
      const distribution = {
        spotify_url: typeof existingDistribution.spotify_url === 'string' ? existingDistribution.spotify_url : null,
        apple_music_url: typeof existingDistribution.apple_music_url === 'string' ? existingDistribution.apple_music_url : null,
        soundcloud_url: permalinkUrl,
        youtube_url: typeof existingDistribution.youtube_url === 'string' ? existingDistribution.youtube_url : null,
      };
      const performance = {
        streams: {
          spotify: Number(existingStreams.spotify ?? 0),
          apple: Number(existingStreams.apple ?? 0),
          soundcloud: Number(track?.playback_count ?? 0),
          youtube: Number(existingStreams.youtube ?? 0),
        },
      };
      const soundcloudStats = {
        plays: Number(track?.playback_count ?? 0),
        likes: Number(track?.likes_count ?? track?.favoritings_count ?? 0),
        reposts: Number(track?.reposts_count ?? 0),
        comments: Number(track?.comment_count ?? 0),
      };
      const releaseDate = toDateString(track?.created_at) ?? new Date().toISOString().slice(0, 10);

      try {
        if (existing) {
          await sql`
            UPDATE releases
            SET
              soundcloud_track_id = ${permalinkUrl},
              distribution = ${sql.json(distribution)},
              performance = ${sql.json(performance)},
              soundcloud_stats = ${sql.json(soundcloudStats)},
              release_date = COALESCE(release_date, ${releaseDate}::date),
              status = COALESCE(status, 'released'),
              updated_at = NOW()
            WHERE id = ${existing.id}::uuid
          `;
          updated += 1;
        } else {
          await sql`
            INSERT INTO releases (
              user_id, title, status, release_date, soundcloud_track_id, distribution, performance, soundcloud_stats, created_at, updated_at
            )
            VALUES (
              ${userData.user.id}::uuid, ${title}, 'released', ${releaseDate}::date, ${permalinkUrl},
              ${sql.json(distribution)}, ${sql.json(performance)}, ${sql.json(soundcloudStats)}, NOW(), NOW()
            )
          `;
          created += 1;
        }
      } catch (error) {
        skipped += 1;
        errors.push({
          title,
          permalink_url: permalinkUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ created, updated, skipped, errors }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'SoundCloud release sync failed', message }),
    };
  } finally {
    await sql.end({ timeout: 2 });
  }
};
