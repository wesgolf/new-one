/**
 * requestCache — lightweight client-side TTL cache with in-flight deduplication.
 *
 * Usage:
 *   const data = await requestCache.get('my-key', () => expensiveFetch(), 60_000);
 *
 * Features:
 *  - Results are held in memory for `ttlMs` milliseconds.
 *  - Concurrent calls with the same key share one in-flight promise (no stampede).
 *  - `invalidate(key)` / `invalidatePrefix(prefix)` for explicit busting.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class RequestCache {
  private readonly cache   = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  async get<T>(
    key:     string,
    fetcher: () => PromiseLike<T>,
    ttlMs:   number,
  ): Promise<T> {
    // 1. Serve from cache if still fresh
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value as T;
    }

    // 2. Reuse in-flight promise (prevents duplicate concurrent requests)
    const inflight = this.pending.get(key);
    if (inflight) return inflight as Promise<T>;

    // 3. Fetch, store, return
    const promise = (async () => {
      try {
        const value = await fetcher();
        this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, promise);
    return promise as Promise<T>;
  }

  /** Remove a single key, forcing the next call to re-fetch. */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Remove all keys that start with `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }

  /** Dump cache stats — useful for debugging in the console. */
  stats(): { key: string; expiresInMs: number }[] {
    const now = Date.now();
    return [...this.cache.entries()].map(([key, e]) => ({
      key,
      expiresInMs: e.expiresAt - now,
    }));
  }
}

// Singleton shared across the app
export const requestCache = new RequestCache();
