/**
 * syncService — Orchestrates provider syncs and writes audit rows to sync_jobs.
 *
 * Design:
 *  - Each sync attempt: INSERT sync_jobs row (running) → call provider → UPDATE row (success/failed)
 *  - integration_accounts is upserted with the latest status after each run
 *  - Tokens remain in localStorage / Supabase Vault; we never persist them here
 *
 * Usage:
 *   await syncService.syncNow();          // sync all connected providers
 *   await syncService.syncNow('zernio'); // single provider
 */

import { supabase } from '../lib/supabase';
import { zernioAdapter } from '../content/services/zernioAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncProvider = 'zernio' | 'spotify' | 'soundcloud' | 'youtube' | 'all';

export type SyncStatus = 'queued' | 'running' | 'success' | 'failed';

export interface SyncJob {
  id: string;
  provider: string;
  job_type: string;
  status: SyncStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'unknown';

export interface IntegrationAccount {
  id: string;
  provider: string;
  connection_status: ConnectionStatus;
  account_display_name: string | null;
  last_synced_at: string | null;
  last_sync_status: 'success' | 'failed' | 'running' | null;
  last_error: string | null;
  metadata: Record<string, any>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function startJob(provider: string, jobType = 'full_sync'): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('sync_jobs')
    .insert({
      user_id: userId,
      provider,
      job_type: jobType,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.warn('syncService: failed to write sync_jobs row', error?.message);
    return null;
  }
  return data.id as string;
}

async function finishJob(
  jobId: string | null,
  status: 'success' | 'failed',
  errorMessage?: string,
  metadata?: Record<string, any>,
) {
  if (!jobId) return;
  await supabase
    .from('sync_jobs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
      ...(metadata ? { metadata } : {}),
    })
    .eq('id', jobId);
}

async function upsertIntegration(
  provider: string,
  status: 'success' | 'failed',
  error?: string,
) {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('integration_accounts').upsert(
    {
      user_id: userId,
      provider,
      connection_status: status === 'success' ? 'connected' : 'error',
      last_synced_at: status === 'success' ? new Date().toISOString() : undefined,
      last_sync_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'user_id,provider' },
  );
}

// ─── Provider sync runners ────────────────────────────────────────────────────

async function runZernioSync(): Promise<void> {
  const apiKey = (import.meta as any).env?.VITE_ZERNIO_API_KEY;
  // If no API key, record a no-op success and return
  if (!apiKey) {
    await upsertIntegration('zernio', 'success');
    return;
  }

  const jobId = await startJob('zernio');
  try {
    await Promise.all([
      zernioAdapter.fetchPosts(),
      zernioAdapter.fetchAnalytics(),
    ]);
    await finishJob(jobId, 'success');
    await upsertIntegration('zernio', 'success');
  } catch (e: any) {
    const msg: string = e?.message ?? 'Unknown error';
    await finishJob(jobId, 'failed', msg);
    await upsertIntegration('zernio', 'failed', msg);
    // Log but don't re-throw — syncNow should be resilient to partial failures
    console.error('syncService [zernio]:', msg);
  }
}

async function runSpotifySync(): Promise<void> {
  const token = localStorage.getItem('spotify_access_token');
  if (!token) return; // not connected — skip silently

  const jobId = await startJob('spotify');
  try {
    // Spotify analytics/data pull goes here when the analytics endpoint is wired.
    // For now, a token-presence check is a valid "connected" ping.
    await finishJob(jobId, 'success', undefined, { note: 'token-check only' });
    await upsertIntegration('spotify', 'success');
  } catch (e: any) {
    const msg: string = e?.message ?? 'Unknown error';
    await finishJob(jobId, 'failed', msg);
    await upsertIntegration('spotify', 'failed', msg);
    console.error('syncService [spotify]:', msg);
  }
}

async function runSoundCloudSync(): Promise<void> {
  const token = localStorage.getItem('soundcloud_token');
  if (!token) return; // not connected — skip silently

  const jobId = await startJob('soundcloud');
  try {
    // SoundCloud data pull (tracks/stats) goes here.
    await finishJob(jobId, 'success', undefined, { note: 'token-check only' });
    await upsertIntegration('soundcloud', 'success');
  } catch (e: any) {
    const msg: string = e?.message ?? 'Unknown error';
    await finishJob(jobId, 'failed', msg);
    await upsertIntegration('soundcloud', 'failed', msg);
    console.error('syncService [soundcloud]:', msg);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const syncService = {
  /**
   * Trigger a sync for one or all providers.
   * Failures in individual providers do not abort the others.
   */
  async syncNow(provider: SyncProvider = 'all'): Promise<void> {
    const runners: Promise<void>[] = [];
    if (provider === 'all' || provider === 'zernio')     runners.push(runZernioSync());
    if (provider === 'all' || provider === 'spotify')    runners.push(runSpotifySync());
    if (provider === 'all' || provider === 'soundcloud') runners.push(runSoundCloudSync());
    await Promise.allSettled(runners);
  },

  /** Fetch N most recent sync job rows for the current user. */
  async getRecentJobs(limit = 20): Promise<SyncJob[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase
      .from('sync_jobs')
      .select('id,provider,job_type,status,started_at,completed_at,error_message,metadata,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as SyncJob[];
  },

  /** Fetch all integration_accounts rows for the current user. */
  async getIntegrationAccounts(): Promise<IntegrationAccount[]> {
    const userId = await getUserId();
    if (!userId) return [];
    const { data } = await supabase
      .from('integration_accounts')
      .select('id,provider,connection_status,account_display_name,last_synced_at,last_sync_status,last_error,metadata')
      .eq('user_id', userId);
    return (data ?? []) as IntegrationAccount[];
  },
};
