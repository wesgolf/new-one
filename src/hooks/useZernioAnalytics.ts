import { useCallback, useEffect, useState } from 'react';
import { fetchZernioOverview, type ZernioAnalyticsSnapshot } from '../services/zernioAnalyticsService';

export interface UseZernioAnalyticsResult {
  snapshot: ZernioAnalyticsSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useZernioAnalytics(): UseZernioAnalyticsResult {
  const [snapshot, setSnapshot] = useState<ZernioAnalyticsSnapshot | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<Error | null>(null);
  const [tick, setTick]         = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchZernioOverview()
      .then(snap => { if (!cancelled) setSnapshot(snap); })
      .catch(err  => { if (!cancelled) setError(err instanceof Error ? err : new Error(String(err))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  return { snapshot, loading, error, refresh };
}
