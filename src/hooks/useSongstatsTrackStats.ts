import { useEffect, useState } from 'react';
import { resolveSongstatsTrackId } from '../lib/songstatsTrackMap';
import { fetchTrackStats, type TrackStatsResponse } from '../lib/songstatsService';

export interface UseSongstatsTrackStatsResult {
  stats: TrackStatsResponse | null;
  songstatsTrackId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves the Songstats track ID for a release (via stored ID → ISRC → catalog fallback)
 * and fetches per-platform track stats.
 */
export function useSongstatsTrackStats(
  title: string,
  isrc?: string | null,
  storedSongstatsTrackId?: string | null,
): UseSongstatsTrackStatsResult {
  const [stats, setStats] = useState<TrackStatsResponse | null>(null);
  const [songstatsTrackId, setTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setStats(null);
    setTrackId(null);

    (async () => {
      try {
        // Use stored ID directly if available — skips catalog fetch
        const trackId = storedSongstatsTrackId ?? await resolveSongstatsTrackId(isrc, title);
        if (cancelled) return;

        if (!trackId) {
          setLoading(false);
          return;
        }

        setTrackId(trackId);
        const result = await fetchTrackStats(trackId);
        if (!cancelled) setStats(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load track stats');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [title, isrc, storedSongstatsTrackId]);

  return { stats, songstatsTrackId, loading, error };
}
