/**
 * useSyncStatus — per-provider connection + last-sync status.
 *
 * Merges data from:
 *   1. integration_accounts (DB truth)
 *   2. localStorage tokens (client-side presence fallback)
 *   3. VITE_ env vars (API key presence)
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, type IntegrationAccount, type SyncJob, type ConnectionStatus, type SyncResult } from '../services/syncService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderStatus {
  provider: string;
  label: string;
  connectionStatus: ConnectionStatus;
  lastSyncedAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'running' | null;
  lastError: string | null;
}

export interface UseSyncStatusReturn {
  statuses: ProviderStatus[];
  recentJobs: SyncJob[];
  loading: boolean;
  /** Non-null when the last DB load encountered an error */
  loadError: string | null;
  /** Per-provider errors from the most recent syncNow() call */
  syncErrors: Record<string, string>;
  refresh: () => Promise<void>;
  /** Trigger a sync and update syncErrors from the results */
  triggerSync: (provider?: string) => Promise<SyncResult[]>;
}

// ─── Provider display config ──────────────────────────────────────────────────

const PROVIDERS: { key: string; label: string }[] = [
  { key: 'zernio',     label: 'Zernio'      },
  { key: 'spotify',    label: 'Spotify'     },
  { key: 'soundcloud', label: 'SoundCloud'  },
];

function localTokenPresent(provider: string): boolean {
  if (provider === 'spotify')    return !!localStorage.getItem('spotify_access_token');
  if (provider === 'soundcloud') return !!localStorage.getItem('soundcloud_token');
  if (provider === 'zernio')     return !!(import.meta as any).env?.VITE_ZERNIO_API_KEY;
  return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSyncStatus(): UseSyncStatusReturn {
  const [statuses,    setStatuses]    = useState<ProviderStatus[]>([]);
  const [recentJobs,  setRecentJobs]  = useState<SyncJob[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [syncErrors,  setSyncErrors]  = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    const [accountsResult, jobsResult] = await Promise.allSettled([
      syncService.getIntegrationAccounts(),
      syncService.getRecentJobs(20),
    ]);

    if (accountsResult.status === 'rejected') {
      setLoadError(accountsResult.reason?.message ?? 'Failed to load integration accounts');
    }
    if (jobsResult.status === 'rejected') {
      setLoadError(prev => [prev, jobsResult.reason?.message ?? 'Failed to load sync jobs'].filter(Boolean).join('; '));
    }

    const accounts = accountsResult.status === 'fulfilled' ? accountsResult.value : [];
    const jobs     = jobsResult.status     === 'fulfilled' ? jobsResult.value     : [];

    const mapped: ProviderStatus[] = PROVIDERS.map(({ key, label }) => {
      const acct = accounts.find((a: IntegrationAccount) => a.provider === key);
      const hasToken = localTokenPresent(key);

      const connectionStatus: ConnectionStatus =
        acct?.connection_status ?? (hasToken ? 'connected' : 'disconnected');

      return {
        provider: key,
        label,
        connectionStatus,
        lastSyncedAt:    acct?.last_synced_at    ?? null,
        lastSyncStatus:  acct?.last_sync_status  ?? null,
        lastError:       acct?.last_error        ?? null,
      };
    });

    setStatuses(mapped);
    setRecentJobs(jobs);
    setLoading(false);
  }, []);

  const triggerSync = useCallback(async (provider = 'all'): Promise<SyncResult[]> => {
    const results = await syncService.syncNow(provider as any);
    const errors: Record<string, string> = {};
    for (const r of results) {
      if (!r.ok && r.error) errors[r.provider] = r.error;
    }
    setSyncErrors(errors);
    // Refresh DB state after sync
    await load();
    return results;
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { statuses, recentJobs, loading, loadError, syncErrors, refresh: load, triggerSync };
}
