/**
 * IntegrationStatusCard — Shows all provider connections with last-sync status.
 *
 * Features:
 *  - Connected / disconnected / error / expired indicators per provider
 *  - Last synced time (relative)
 *  - Per-provider Sync Now button
 *  - Recent sync job log (expandable)
 */

import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, AlertCircle, WifiOff,
  Clock, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DashCard, DashSkeleton } from './DashCard';
import { useSyncStatus, type ProviderStatus } from '../../hooks/useSyncStatus';
import { syncService, type SyncProvider } from '../../services/syncService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return 'Never';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Status dot ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  connected:    'bg-emerald-400',
  disconnected: 'bg-zinc-300',
  expired:      'bg-amber-400',
  error:        'bg-red-400',
  unknown:      'bg-zinc-300',
};

const STATUS_LABEL: Record<string, string> = {
  connected:    'Connected',
  disconnected: 'Not connected',
  expired:      'Token expired',
  error:        'Auth error',
  unknown:      'Unknown',
};

// ─── Provider row ─────────────────────────────────────────────────────────────

interface ProviderRowProps {
  status: ProviderStatus;
  onSync: (provider: string) => void;
  syncing: boolean;
}

function ProviderRow({ status, onSync, syncing }: ProviderRowProps) {
  const dot   = STATUS_DOT[status.connectionStatus]   ?? STATUS_DOT.unknown;
  const label = STATUS_LABEL[status.connectionStatus] ?? 'Unknown';
  const isConnected = status.connectionStatus === 'connected';

  return (
    <li className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {/* Status dot */}
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dot)} />

      {/* Provider info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{status.label}</p>
        <p className="text-xs text-text-muted">
          {label}
          {isConnected && status.lastSyncedAt && (
            <> · Synced {relativeTime(status.lastSyncedAt)}</>
          )}
          {status.lastSyncStatus === 'failed' && status.lastError && (
            <span className="text-red-500 ml-1">— {status.lastError}</span>
          )}
        </p>
      </div>

      {/* Sync button — shown only for connected providers */}
      {isConnected && (
        <button
          onClick={() => onSync(status.provider)}
          disabled={syncing}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5',
            'rounded-lg border border-border hover:bg-surface-raised',
            'text-text-secondary transition-all active:scale-95',
            syncing && 'opacity-50 cursor-wait',
          )}
          title={`Sync ${status.label} now`}
        >
          <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} />
          Sync
        </button>
      )}

      {/* Reconnect nudge for expired/error */}
      {(status.connectionStatus === 'expired' || status.connectionStatus === 'error') && (
        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold">
          <AlertCircle className="w-3 h-3" />
          Reconnect
        </span>
      )}

      {/* Not connected notice */}
      {status.connectionStatus === 'disconnected' && (
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <WifiOff className="w-3 h-3" />
          Offline
        </span>
      )}
    </li>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface IntegrationStatusCardProps {
  /** Show the recent jobs log section */
  showLog?: boolean;
}

export function IntegrationStatusCard({ showLog = false }: IntegrationStatusCardProps) {
  const { statuses, recentJobs, loading, refresh } = useSyncStatus();
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [logExpanded, setLogExpanded] = useState(false);

  async function handleSync(provider: string) {
    setSyncingProvider(provider);
    try {
      await syncService.syncNow(provider as SyncProvider);
      await refresh();
    } finally {
      setSyncingProvider(null);
    }
  }

  async function handleSyncAll() {
    setSyncingProvider('all');
    try {
      await syncService.syncNow('all');
      await refresh();
    } finally {
      setSyncingProvider(null);
    }
  }

  const headerAction = (
    <button
      onClick={handleSyncAll}
      disabled={!!syncingProvider}
      className={cn(
        'flex items-center gap-1.5 text-xs font-semibold text-text-secondary',
        'hover:text-text-primary transition-colors',
        syncingProvider && 'opacity-50 cursor-wait',
      )}
    >
      {syncingProvider === 'all'
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <RefreshCw className="w-3.5 h-3.5" />}
      Sync all
    </button>
  );

  return (
    <DashCard title="Integrations" action={headerAction}>
      {loading ? (
        <DashSkeleton rows={3} />
      ) : (
        <>
          <ul>
            {statuses.map(s => (
              <ProviderRow
                key={s.provider}
                status={s}
                onSync={handleSync}
                syncing={syncingProvider === s.provider || syncingProvider === 'all'}
              />
            ))}
          </ul>

          {/* Recent jobs log */}
          {showLog && recentJobs.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setLogExpanded(x => !x)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
              >
                {logExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Recent sync log
              </button>

              {logExpanded && (
                <ul className="mt-2 space-y-1.5">
                  {recentJobs.slice(0, 8).map(job => (
                    <li key={job.id} className="flex items-center gap-2 text-xs text-text-muted">
                      {job.status === 'success'
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        : job.status === 'failed'
                        ? <AlertCircle  className="w-3 h-3 text-red-400 shrink-0" />
                        : <Loader2      className="w-3 h-3 text-blue-400 animate-spin shrink-0" />}
                      <span className="capitalize font-medium text-text-secondary">{job.provider}</span>
                      <span className="text-text-muted">{job.job_type}</span>
                      <span className="ml-auto flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {relativeTime(job.created_at)}
                      </span>
                      {job.error_message && (
                        <span className="text-red-400 truncate max-w-[140px]" title={job.error_message}>
                          {job.error_message}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </DashCard>
  );
}
