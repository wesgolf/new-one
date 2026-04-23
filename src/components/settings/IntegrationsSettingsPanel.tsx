import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Music2,
  Plug2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type { IntegrationsSettings, IntegrationPlatformKey } from '../../types/domain';
import { DEFAULT_INTEGRATIONS_SETTINGS } from '../../types/domain';
import { cn } from '../../lib/utils';
import { SettingsCard, SettingsFieldRow, SettingsLoadingSkeleton, SettingsSectionHeader } from './SettingsPrimitives';

// ─── Platform metadata ────────────────────────────────────────────────────────

const PLATFORM_META: Record<IntegrationPlatformKey, { label: string; color: string }> = {
  spotify:   { label: 'Spotify',   color: '#1db954' },
  soundcloud:{ label: 'SoundCloud', color: '#ff5500' },
  youtube:   { label: 'YouTube',   color: '#ff0000' },
  tiktok:    { label: 'TikTok',    color: '#010101' },
  instagram: { label: 'Instagram', color: '#e1306c' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as IntegrationPlatformKey[];

const SYNC_INTERVALS: { value: number; label: string }[] = [
  { value: 900,   label: '15 min'  },
  { value: 1800,  label: '30 min'  },
  { value: 3600,  label: '1 hour'  },
  { value: 21600, label: '6 hours' },
  { value: 86400, label: 'Daily'   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationsSettingsPanel() {
  const [settings, setSettings] = useState<IntegrationsSettings>(DEFAULT_INTEGRATIONS_SETTINGS);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.integrations.get();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async <K extends keyof IntegrationsSettings>(
    key: K,
    value: IntegrationsSettings[K],
  ) => {
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await settingsService.integrations.update(key, value);
    } catch {
      setSettings(prev => ({ ...prev, [key]: settings[key] }));
    } finally {
      setSaving(null);
    }
  }, [settings]);

  const togglePlatform = useCallback((platform: IntegrationPlatformKey) => {
    const current = settings.enabled_platforms;
    const next = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    save('enabled_platforms', next);
  }, [settings.enabled_platforms, save]);

  if (loading) return <SettingsLoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        Icon={Plug2}
        title="Integrations"
        description="Manage connected platforms and sync behaviour."
      />

      {/* ── Sync config ──────────────────────────────────── */}
      <SettingsCard title="Sync">
        <SettingsFieldRow
          label="Auto-sync"
          description="Automatically pull latest data from connected platforms."
          saving={saving === 'auto_sync'}
        >
          <AutoSyncToggle
            checked={settings.auto_sync}
            onChange={v => save('auto_sync', v)}
          />
        </SettingsFieldRow>

        <SettingsFieldRow
          label="Sync interval"
          description="How often to pull data when auto-sync is enabled."
          saving={saving === 'sync_interval'}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {SYNC_INTERVALS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={!settings.auto_sync}
                onClick={() => save('sync_interval', value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  !settings.auto_sync && 'opacity-40 cursor-not-allowed',
                  settings.sync_interval === value
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'border-border text-text-secondary hover:border-brand/40 hover:text-brand',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsFieldRow>
      </SettingsCard>

      {/* ── Enabled platforms ────────────────────────────── */}
      <SettingsCard title="Enabled platforms">
        <p className="text-xs text-text-tertiary -mt-1 mb-4">
          Toggle which platforms appear in analytics and sync. Connection credentials are managed per integration.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ALL_PLATFORMS.map(platform => {
            const enabled = settings.enabled_platforms.includes(platform);
            const meta    = PLATFORM_META[platform];
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  enabled
                    ? 'border-brand/30 bg-brand-dim shadow-[inset_0_0_0_1px_var(--color-brand-ring)]'
                    : 'border-border bg-white hover:border-border hover:bg-surface-raised',
                )}
              >
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <span className={cn(
                  'flex-1 text-sm font-semibold',
                  enabled ? 'text-text-primary' : 'text-text-secondary',
                )}>
                  {meta.label}
                </span>
                {enabled
                  ? <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                  : <XCircle      className="w-4 h-4 text-border shrink-0" />}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Connection status placeholder ────────────────── */}
      <SettingsCard title="Connection status">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
            <Music2 className="w-4 h-4 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-secondary">OAuth connections</p>
          <p className="text-xs text-text-tertiary max-w-xs">
            Per-platform OAuth connection management will appear here. Connect accounts to enable full analytics sync.
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <Clock className="w-3 h-3" /> Coming soon
          </span>
        </div>
      </SettingsCard>
    </div>
  );
}

// ─── Auto-sync toggle ─────────────────────────────────────────────────────────

function AutoSyncToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
        checked ? 'bg-brand' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
