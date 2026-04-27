import React, { useCallback, useEffect, useState } from 'react';
import {
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  SunMoon,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type { GeneralSettings } from '../../types/domain';
import { cn } from '../../lib/utils';
import { applyGeneralSettings, loadCachedGeneralSettings, normalizeGeneralSettings } from '../../lib/generalSettingsRuntime';
import { SettingsCard, SettingsFieldRow, SettingsLoadingSkeleton, SettingsSectionHeader } from './SettingsPrimitives';

// ─── Theme badge ──────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: GeneralSettings['theme']; label: string; Icon: React.ElementType }[] = [
  { value: 'light',  label: 'Light',  Icon: Sun     },
  { value: 'dark',   label: 'Dark',   Icon: Moon    },
  { value: 'system', label: 'System', Icon: SunMoon },
];

const LAYOUT_OPTIONS: { value: GeneralSettings['dashboard_layout']; label: string }[] = [
  { value: 'default',  label: 'Default'  },
  { value: 'compact',  label: 'Compact'  },
  { value: 'expanded', label: 'Expanded' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneralSettingsPanel() {
  const [settings, setSettings] = useState<GeneralSettings>(loadCachedGeneralSettings());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null); // key currently saving

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await settingsService.general.get();
      const normalized = normalizeGeneralSettings(data);
      setSettings(normalized);
      applyGeneralSettings(normalized);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load general settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K],
  ) => {
    const nextSettings = { ...settings, [key]: value };
    setSaving(key);
    setSettings(nextSettings);
    applyGeneralSettings(nextSettings);
    try {
      await settingsService.general.update(key, value);
    } catch {
      // revert on failure
      setSettings(settings);
      applyGeneralSettings(settings);
    } finally {
      setSaving(null);
    }
  }, [settings]);

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
        Icon={SlidersHorizontal}
        title="General"
        description="Appearance, language, and notification defaults."
      />

      {/* ── Appearance ───────────────────────────────────── */}
      <SettingsCard title="Appearance">
        <SettingsFieldRow
          label="Theme"
          description="Choose between light, dark, or follow your OS."
          saving={saving === 'theme'}
        >
          <div className="flex items-center gap-2">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => save('theme', value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  settings.theme === value
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'border-border text-text-secondary hover:border-brand/40 hover:text-brand',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </SettingsFieldRow>

        <SettingsFieldRow
          label="Dashboard layout"
          description="Controls the default density of the command center."
          saving={saving === 'dashboard_layout'}
        >
          <div className="flex items-center gap-2">
            {LAYOUT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => save('dashboard_layout', value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  settings.dashboard_layout === value
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

      {/* ── Notifications ────────────────────────────────── */}
      <SettingsCard title="Notifications">
        {(
          [
            { key: 'sms',    label: 'Text notifications',     description: 'Send weekly summary digests to the user phone on file'  },
            { key: 'push',   label: 'Push notifications',     description: 'Browser push for reminders & alerts'    },
            { key: 'inApp',  label: 'In-app notifications',   description: 'Banners inside the dashboard'           },
          ] as const
        ).map(({ key, label, description }) => (
          <SettingsFieldRow key={key} label={label} description={description} saving={saving === 'notifications'}>
            <ToggleSwitch
              checked={settings.notifications[key]}
              onChange={checked =>
                save('notifications', { ...settings.notifications, [key]: checked })
              }
            />
          </SettingsFieldRow>
        ))}
      </SettingsCard>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
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
