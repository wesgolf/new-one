/**
 * useAnalytics — aggregates data from all registered analytics providers.
 *
 * Merges `AnalyticsDomainPayload` arrays across providers so the UI only
 * has to deal with a single unified payload regardless of which providers
 * are configured.
 */
import { useState, useEffect, useCallback } from 'react';
import { ANALYTICS_REGISTRY, emptyAnalyticsPayload } from '../services/analytics';
import type { AnalyticsDomainPayload, AnalyticsProviderState } from '../types/domain';

export interface UseAnalyticsResult {
  payload: AnalyticsDomainPayload;
  providerStates: AnalyticsProviderState[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useAnalytics(): UseAnalyticsResult {
  const [payload,        setPayload]        = useState<AnalyticsDomainPayload>(emptyAnalyticsPayload(''));
  const [providerStates, setProviderStates] = useState<AnalyticsProviderState[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<Error | null>(null);
  const [tick,           setTick]           = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statesResults, payloadResults] = await Promise.all([
          Promise.all(ANALYTICS_REGISTRY.map(p => p.getState())),
          Promise.all(
            ANALYTICS_REGISTRY.map(p =>
              p.load().catch(() => emptyAnalyticsPayload(p.id))
            )
          ),
        ]);

        if (cancelled) return;

        setProviderStates(statesResults);

        // Merge all provider payloads into a single domain payload
        const merged: AnalyticsDomainPayload = {
          audience:  payloadResults.flatMap(p => p.audience),
          streaming: payloadResults.flatMap(p => p.streaming),
          playlist:  payloadResults.flatMap(p => p.playlist),
          social:    payloadResults.flatMap(p => p.social),
          releases:  payloadResults.flatMap(p => p.releases),
        };
        setPayload(merged);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  return { payload, providerStates, loading, error, refresh };
}
