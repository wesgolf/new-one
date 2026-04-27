import React, { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Save, Shield } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import type { UnauthorizedPageSettings } from '../../types/domain';
import { DEFAULT_UNAUTHORIZED_PAGE_SETTINGS } from '../../types/domain';
import { cn } from '../../lib/utils';
import { SettingsCard, SettingsFieldRow, SettingsLoadingSkeleton, SettingsSectionHeader } from './SettingsPrimitives';

export function UnauthorizedPageSettingsPanel() {
  const [settings, setSettings] = useState<UnauthorizedPageSettings>(
    () => settingsService.getCachedSettingsByCategory('unauthorized_page') ?? DEFAULT_UNAUTHORIZED_PAGE_SETTINGS,
  );
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await settingsService.unauthorizedPage.get();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load unauthorized page settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await settingsService.unauthorizedPage.save(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
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
        Icon={Shield}
        title="Unauthorized Page"
        description="Customise the page shown when a visitor lacks access."
      />

      {/* ── Live preview ─────────────────────────────────── */}
      <SettingsCard title="Preview">
        <div className="rounded-xl border border-dashed border-border bg-surface-raised px-6 py-8 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-1">
            <Shield className="w-5 h-5 text-text-muted" />
          </div>
          <p className="text-base font-bold text-text-primary leading-snug">
            {settings.heading || DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.heading}
          </p>
          <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
            {settings.subtext || DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.subtext}
          </p>
          {settings.show_contact_link && (
            <span className="mt-1 text-xs font-semibold text-brand underline underline-offset-2 cursor-default">
              Contact us →
            </span>
          )}
        </div>
      </SettingsCard>

      {/* ── Content ──────────────────────────────────────── */}
      <SettingsCard title="Content">
        <SettingsFieldRow label="Heading" description="Main title displayed on the access-denied page.">
          <input
            type="text"
            value={settings.heading}
            onChange={e => setSettings(prev => ({ ...prev, heading: e.target.value }))}
            placeholder={DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.heading}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="Subtext" description="Supporting message shown below the heading.">
          <textarea
            value={settings.subtext}
            onChange={e => setSettings(prev => ({ ...prev, subtext: e.target.value }))}
            placeholder={DEFAULT_UNAUTHORIZED_PAGE_SETTINGS.subtext}
            rows={2}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none"
          />
        </SettingsFieldRow>

        <SettingsFieldRow label="Show contact link" description="Render a 'Contact us' link below the message.">
          <button
            type="button"
            role="switch"
            aria-checked={settings.show_contact_link}
            onClick={() => setSettings(prev => ({ ...prev, show_contact_link: !prev.show_contact_link }))}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
              'transition-colors duration-200 ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
              settings.show_contact_link ? 'bg-brand' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
                settings.show_contact_link ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        </SettingsFieldRow>
      </SettingsCard>

      {/* ── Save footer ──────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {saved && (
          <span className="text-xs font-semibold text-success">Saved</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {saving
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            : <><Save className="w-3.5 h-3.5" /> Save changes</>
          }
        </button>
      </div>
    </div>
  );
}
