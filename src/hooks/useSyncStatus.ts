/**
 * useSyncStatus — per-provider connection + last-sync status.
 *
 * Merges data from:
 *   1. integration_accounts (DB truth)
 *   2. localStorage tokens (client-side presence fallback)
 *   3. VITE_ env vars (API key presence)
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, type IntegrationAccount, type SyncJob, type ConnectionStatus } from '../services/syncService';

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
  refresh: () => Promise<void>;
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
  const [statuses, setStatuses]     = useState<ProviderStatus[]>([]);
  const [recentJobs, setRecentJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    const [accountsResult, jobsResult] = await Promise.allSettled([
      syncService.getIntegrationAccounts(),
      syncService.getRecentJobs(20),
    ]);

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

  useEffect(() => { load(); }, [load]);

  return { statuses, recentJobs, loading, refresh: load };
}
