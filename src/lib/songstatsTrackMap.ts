/**
 * Songstats Track ID Resolver
 *
 * Maps Supabase release records (by ISRC or title) to their Songstats track IDs.
 *
 * Lookup priority:
 *   1. Static map by ISRC  (most reliable — add ISRCs as you have them)
 *   2. Static map by normalized title
 *   3. Auto-resolved from the Songstats artist catalog (fetched once, then cached)
 *
 * To find a Songstats track ID:
 *   - Go to songstats.com → find your track → copy the ID from the URL
 *     e.g. https://songstats.com/track/abc1234xyz → ID is "abc1234xyz"
 *   - OR add it from the API: GET /artists/catalog returns every track with its songstats_track_id
 */

import { fetchArtistCatalog, type ArtistCatalogTrack } from './songstatsService';

const SONGSTATS_ARTIST_ID = import.meta.env.VITE_SONGSTATS_ARTIST_ID as string | undefined ?? '';

// ── Static mapping: ISRC → songstats_track_id ─────────────────────────────────
// Most reliable. Add an entry as soon as you have the ISRC for a release.
//
// Format: 'ISRC': 'songstats_track_id'
const ISRC_MAP: Record<string, string> = {
  // Example:
  // 'QZES82300001': 'abc1234xyz',  // Dream
};

// ── Static mapping: normalized title → songstats_track_id ─────────────────────
// Fallback when ISRC isn't stored. Title is lowercased + trimmed for matching.
//
// Format: 'track title lowercase': 'songstats_track_id'
const TITLE_MAP: Record<string, string> = {
  // Example:
  // 'dream': 'abc1234xyz',
};

// ── Catalog cache ──────────────────────────────────────────────────────────────
let catalogCache: ArtistCatalogTrack[] | null = null;
let catalogFetching: Promise<ArtistCatalogTrack[]> | null = null;

async function getCatalog(): Promise<ArtistCatalogTrack[]> {
  if (catalogCache) return catalogCache;
  if (catalogFetching) return catalogFetching;
  if (!SONGSTATS_ARTIST_ID) return [];

  catalogFetching = (async () => {
    try {
      const res = await fetchArtistCatalog(SONGSTATS_ARTIST_ID, { limit: 200 });
      catalogCache = res.catalog ?? [];
      return catalogCache;
    } catch {
      return [];
    } finally {
      catalogFetching = null;
    }
  })();

  return catalogFetching;
}

/**
 * Resolve a Songstats track ID for a release.
 * Returns null if no match is found (unconfigured artist ID, or track not in catalog yet).
 */
export async function resolveSongstatsTrackId(
  isrc: string | null | undefined,
  title: string,
): Promise<string | null> {
  // 1. ISRC static map
  if (isrc && ISRC_MAP[isrc]) return ISRC_MAP[isrc];

  // 2. Title static map
  const normalizedTitle = title.toLowerCase().trim();
  if (TITLE_MAP[normalizedTitle]) return TITLE_MAP[normalizedTitle];

  // 3. Auto-resolve from artist catalog
  const catalog = await getCatalog();

  if (isrc) {
    const byIsrc = catalog.find(t => t.isrcs?.includes(isrc));
    if (byIsrc) return byIsrc.songstats_track_id;
  }

  const byTitle = catalog.find(
    t => t.title.toLowerCase().trim() === normalizedTitle,
  );
  if (byTitle) return byTitle.songstats_track_id;

  return null;
}

/** Flush the catalog cache (e.g. after adding a new release). */
export function invalidateCatalogCache() {
  catalogCache = null;
}
