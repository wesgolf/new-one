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

/** Normalize a track title for fuzzy matching: lowercase, strip brackets, collapse spaces */
function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '') // strip "(Remix)" / "[Edit]" etc.
    .replace(/[-–—]+/g, ' ')         // dashes → spaces so "A - B" == "A B"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

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
 *
 * Matches by title only — normalizing both the release title and catalog title
 * the same way (lowercase, strip parentheses/brackets, collapse non-alphanumeric to spaces).
 */
export async function resolveSongstatsTrackId(
  _isrc: string | null | undefined,
  title: string,
): Promise<string | null> {
  // 1. Title static map (manually configured overrides)
  const normalizedTitle = normalizeTitle(title);
  if (TITLE_MAP[normalizedTitle]) return TITLE_MAP[normalizedTitle];

  // 2. Auto-resolve from artist catalog — title-only, both sides normalized
  const catalog = await getCatalog();

  const byTitle = catalog.find(
    t => normalizeTitle(t.title) === normalizedTitle,
  );
  if (byTitle) return byTitle.songstats_track_id;

  return null;
}

/** Flush the catalog cache (e.g. after adding a new release). */
export function invalidateCatalogCache() {
  catalogCache = null;
}
