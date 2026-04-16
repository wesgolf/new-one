/**
 * React hook for fetching JSON with automatic loading/error/retry state and abort-on-unmount.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchJson, type FetchJsonOptions } from './fetchJson';
import { type ApiError } from './errors';

export interface UseApiFetchOptions extends FetchJsonOptions {
  /** When true the initial fetch is skipped. Useful for conditional or deferred requests. */
  skip?: boolean;
}

export interface UseApiFetchResult<T> {
  data: T | null;
  loading: boolean;
  /** Structured ApiError or generic Error. null when no error. */
  error: ApiError | Error | null;
  /** Increment the internal retry counter to re-run the fetch. */
  retry: () => void;
}

/**
 * Fetch a JSON endpoint with automatic loading, error, and retry state.
 *
 * - Cancels in-flight requests when the component unmounts or the URL changes.
 * - Returns structured ApiError instances for HTTP, content-type, and network failures.
 * - Calling `retry()` re-issues the request without reloading the page.
 *
 * @example
 * const { data, loading, error, retry } = useApiFetch<Metric[]>('/api/analytics/latest');
 */
export function useApiFetch<T = unknown>(
  url: string,
  options: UseApiFetchOptions = {}
): UseApiFetchResult<T> {
  const { skip = false, ...fetchOptions } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Stable reference for fetchOptions so the effect doesn't re-run on every render
  const fetchOptionsRef = useRef(fetchOptions);
  fetchOptionsRef.current = fetchOptions;

  const run = useCallback(async () => {
    if (skip) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchJson<T>(url, {
        ...fetchOptionsRef.current,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(result);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url, skip, retryTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    return () => {
      abortRef.current?.abort();
    };
  }, [run]);

  const retry = useCallback(() => setRetryTick((t) => t + 1), []);

  return { data, loading, error, retry };
}
