import { schedule } from '@netlify/functions';
import postgres from 'postgres';

type Provider = 'zernio' | 'songstats' | 'soundcloud';
type IntegrationSettingsRecord = {
  userId: string;
  autoSync: boolean;
  syncInterval: number;
  enabledPlatforms: Provider[];
};

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY ?? process.env.VITE_ZERNIO_API_KEY ?? '';
const ZERNIO_API_BASE = 'https://zernio.com/api/v1';
const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY ?? process.env.VITE_SONGSTATS_API_KEY ?? '';
const SONGSTATS_ARTIST_ID = process.env.SONGSTATS_ARTIST_ID ?? process.env.VITE_SONGSTATS_ARTIST_ID ?? '';
const SOUNDCLOUD_ARTIST_URL = process.env.SOUNDCLOUD_ARTIST_URL ?? process.env.VITE_SOUNDCLOUD_ARTIST_URL ?? '';

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

function songstatsSourceValue(
  stats: Array<{ source: string; data: Record<string, number> }>,
  source: string,
  key: string,
) {
  return Number(stats.find((entry) => entry.source === source)?.data?.[key] ?? 0);
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
      const title = String(match[2] ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
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

async function fetchIntegrationSettings(sql: postgres.Sql<any>): Promise<IntegrationSettingsRecord[]> {
  const rows = await sql`
    SELECT user_id, key, value_json
    FROM user_settings
    WHERE category = 'integrations'
      AND key IN ('auto_sync', 'sync_interval', 'enabled_platforms')
  `;

  const grouped = new Map<string, Partial<IntegrationSettingsRecord>>();
  for (const row of rows) {
    const userId = String(row.user_id);
    const current = grouped.get(userId) ?? { userId };
    if (row.key === 'auto_sync') current.autoSync = Boolean(row.value_json);
    if (row.key === 'sync_interval') current.syncInterval = Number(row.value_json) || 3600;
    if (row.key === 'enabled_platforms' && Array.isArray(row.value_json)) {
      current.enabledPlatforms = row.value_json.filter((value: unknown): value is Provider =>
        value === 'zernio' || value === 'songstats' || value === 'soundcloud',
      );
    }
    grouped.set(userId, current);
  }

  return [...grouped.values()].map((entry): IntegrationSettingsRecord => ({
    userId: entry.userId!,
    autoSync: entry.autoSync ?? true,
    syncInterval: entry.syncInterval ?? 3600,
    enabledPlatforms: entry.enabledPlatforms?.length ? entry.enabledPlatforms : (['zernio', 'songstats', 'soundcloud'] satisfies Provider[]),
  })).filter((entry) => entry.autoSync);
}

type SyncShape = {
  providerColumn: 'provider' | 'platform';
  errorColumn: 'error' | 'error_message';
};

async function detectSyncShape(sql: postgres.Sql<any>): Promise<SyncShape> {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sync_jobs'
  `;
  const columns = new Set(rows.map((row) => String(row.column_name)));
  return {
    providerColumn: columns.has('provider') ? 'provider' : 'platform',
    errorColumn: columns.has('error_message') ? 'error_message' : 'error',
  };
}

async function getLastSuccessfulRunAt(
  sql: postgres.Sql<any>,
  shape: SyncShape,
  userId: string,
  provider: Provider,
) {
  const rows = await sql.unsafe(
    `
      SELECT completed_at, created_at
      FROM sync_jobs
      WHERE user_id = $1::uuid
        AND ${shape.providerColumn} = $2
        AND status = 'success'
      ORDER BY COALESCE(completed_at, created_at) DESC
      LIMIT 1
    `,
    [userId, provider],
  );
  if (!rows.length) return null;
  const raw = rows[0].completed_at ?? rows[0].created_at ?? null;
  return raw ? new Date(String(raw)) : null;
}

async function createSyncJob(sql: postgres.Sql<any>, shape: SyncShape, userId: string, provider: Provider) {
  const rows = await sql.unsafe(
    `
      INSERT INTO sync_jobs (user_id, ${shape.providerColumn}, status, started_at)
      VALUES ($1::uuid, $2, 'running', NOW())
      RETURNING id
    `,
    [userId, provider],
  );
  return String(rows[0].id);
}

async function finishSyncJob(
  sql: postgres.Sql<any>,
  shape: SyncShape,
  jobId: string,
  success: boolean,
  message: string,
) {
  await sql.unsafe(
    `
      UPDATE sync_jobs
      SET status = $2, completed_at = NOW(), ${shape.errorColumn} = $3
      WHERE id = $1::uuid
    `,
    [jobId, success ? 'success' : 'failed', success ? null : message],
  );
}

async function runZernio() {
  if (!ZERNIO_API_KEY) return { success: false, message: 'Zernio API key missing.' };
  const response = await fetch(`${ZERNIO_API_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, Accept: 'application/json' },
  });
  const data = await response.json().catch(() => null);
  const count = Array.isArray(data) ? data.length : Array.isArray(data?.accounts) ? data.accounts.length : 0;
  return { success: true, message: `Fetched ${count} Zernio account${count === 1 ? '' : 's'}.` };
}

async function runSongstats(sql: postgres.Sql<any>, userId: string) {
  if (!SONGSTATS_API_KEY || !SONGSTATS_ARTIST_ID) {
    return { success: false, message: 'Songstats API key or artist id missing.' };
  }

  const releases = await sql`
    SELECT id, title, isrc, spotify_track_id, distribution, performance
    FROM releases
    WHERE user_id = ${userId}::uuid
    ORDER BY updated_at DESC
  `;

  const catalogUrl = new URL('https://api.songstats.com/enterprise/v1/artists/catalog');
  catalogUrl.searchParams.set('songstats_artist_id', SONGSTATS_ARTIST_ID);
  catalogUrl.searchParams.set('source_ids', 'all');
  catalogUrl.searchParams.set('limit', '100');
  const catalogRes = await fetch(catalogUrl.toString(), {
    headers: { Accept: 'application/json', apikey: SONGSTATS_API_KEY },
  });
  const catalogJson = await catalogRes.json();
  const catalog = (Array.isArray(catalogJson.catalog) ? catalogJson.catalog : []) as Array<{
    songstats_track_id: string;
    title: string;
    isrcs?: string[];
  }>;
  const catalogByTitle = new Map(catalog.map((track: any) => [normalizeReleaseTitle(track.title), track]));
  const catalogByIsrc = new Map(
    catalog.flatMap((track: any) => (track.isrcs ?? []).map((isrc: string) => [String(isrc).trim(), track] as const)),
  );

  let updated = 0;
  let skipped = 0;
  for (const release of releases) {
    const matched =
      (release.isrc ? catalogByIsrc.get(String(release.isrc).trim()) : null) ??
      catalogByTitle.get(normalizeReleaseTitle(release.title));
    if (!matched) {
      skipped += 1;
      continue;
    }

    const statsUrl = new URL('https://api.songstats.com/enterprise/v1/tracks/stats');
    statsUrl.searchParams.set('songstats_track_id', matched.songstats_track_id);
    statsUrl.searchParams.set('source_ids', 'all');
    const infoUrl = new URL('https://api.songstats.com/enterprise/v1/tracks/info');
    infoUrl.searchParams.set('songstats_track_id', matched.songstats_track_id);
    const [statsJson, infoJson] = await Promise.all([
      fetch(statsUrl.toString(), { headers: { Accept: 'application/json', apikey: SONGSTATS_API_KEY } }).then((res) => res.json()).catch(() => null),
      fetch(infoUrl.toString(), { headers: { Accept: 'application/json', apikey: SONGSTATS_API_KEY } }).then((res) => res.json()).catch(() => null),
    ]);
    if (!statsJson && !infoJson) {
      skipped += 1;
      continue;
    }

    const releaseDistribution = (release.distribution ?? {}) as Record<string, unknown>;
    const releasePerformance = (release.performance ?? {}) as Record<string, any>;
    const existingStreams = (releasePerformance.streams ?? {}) as Record<string, number>;
    const links = infoJson?.track_info?.links ?? [];
    const distribution = {
      spotify_url: links.find((link: any) => link.source === 'spotify')?.url ?? releaseDistribution.spotify_url ?? null,
      apple_music_url: links.find((link: any) => link.source === 'apple_music')?.url ?? releaseDistribution.apple_music_url ?? null,
      soundcloud_url: releaseDistribution.soundcloud_url ?? null,
      youtube_url: releaseDistribution.youtube_url ?? null,
    };
    const stats = statsJson?.stats ?? [];
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
      links.find((link: any) => link.source === 'spotify')?.external_id ??
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
  }

  return { success: true, message: `Updated ${updated} release${updated === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.` };
}

async function runSoundCloud(sql: postgres.Sql<any>, userId: string) {
  if (!SOUNDCLOUD_ARTIST_URL) {
    return { success: false, message: 'SoundCloud artist URL missing.' };
  }

  const tracks = await fetchPublicSoundCloudTracks(SOUNDCLOUD_ARTIST_URL, 200);
  const releases = await sql`
    SELECT id, title, release_date, soundcloud_track_id, distribution, performance
    FROM releases
    WHERE user_id = ${userId}::uuid
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

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const track of tracks) {
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
    const releaseDate = String(track?.created_at ?? '').split('T')[0] || new Date().toISOString().slice(0, 10);

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
          ${userId}::uuid, ${title}, 'released', ${releaseDate}::date, ${permalinkUrl},
          ${sql.json(distribution)}, ${sql.json(performance)}, ${sql.json(soundcloudStats)}, NOW(), NOW()
        )
      `;
      created += 1;
    }
  }

  return { success: true, message: `${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}.` };
}

export const handler = schedule('*/15 * * * *', async () => {
  const databaseUrl = readDatabaseUrlFromEnv();
  if (!databaseUrl) {
    console.warn('[netlify integration-sync] DATABASE_URL missing; skipping run.');
    return {
      statusCode: 200,
      body: 'DATABASE_URL missing; integration sync skipped.',
    };
  }

  const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
  try {
    const shape = await detectSyncShape(sql);
    const users = await fetchIntegrationSettings(sql);

    for (const user of users) {
      for (const provider of user.enabledPlatforms) {
        const lastSuccess = await getLastSuccessfulRunAt(sql, shape, user.userId, provider);
        const due = !lastSuccess || (Date.now() - lastSuccess.getTime()) >= user.syncInterval * 1000;
        if (!due) continue;

        const jobId = await createSyncJob(sql, shape, user.userId, provider);
        try {
          const result =
            provider === 'zernio'
              ? await runZernio()
              : provider === 'songstats'
              ? await runSongstats(sql, user.userId)
              : await runSoundCloud(sql, user.userId);
          await finishSyncJob(sql, shape, jobId, result.success, result.message);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await finishSyncJob(sql, shape, jobId, false, message);
        }
      }
    }
  } finally {
    await sql.end({ timeout: 2 });
  }

  return {
    statusCode: 200,
    body: 'Integration sync completed.',
  };
});
