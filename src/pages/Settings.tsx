/**
 * Settings — centralised app configuration page.
 *
 * Layout:
 *   Left sidebar (section nav) + main panel area
 *
 * Sections:
 *   General            — theme, language, notifications
 *   Integrations       — platforms, sync config
 *   Unauthorized Page  — access-denied page copy
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Settings as SettingsIcon } from 'lucide-react';
import { SettingsSidebar, type SettingsSection } from '../components/settings/SettingsSidebar';
import { GeneralSettingsPanel } from '../components/settings/GeneralSettingsPanel';
import { IntegrationsSettingsPanel } from '../components/settings/IntegrationsSettingsPanel';
import { UnauthorizedPageSettingsPanel } from '../components/settings/UnauthorizedPageSettingsPanel';
import { settingsService } from '../services/settingsService';

const PANEL_MAP: Record<SettingsSection, React.ComponentType> = {
  general:           GeneralSettingsPanel,
  integrations:      IntegrationsSettingsPanel,
  unauthorized_page: UnauthorizedPageSettingsPanel,
};

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // Seed defaults on first visit — non-blocking
  useEffect(() => {
    settingsService.ensureDefaultSettings().catch(() => {});
  }, []);

  const ActivePanel = PANEL_MAP[activeSection] ?? GeneralSettingsPanel;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page header ───────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <SettingsIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-none">Settings</h1>
            <p className="text-sm text-text-tertiary mt-1">Manage your Artist OS preferences</p>
          </div>
        </div>

        {/* ── Layout: sidebar + content ─────────────────── */}
        <div className="flex flex-col sm:flex-row gap-5 items-start">

          {/* Sidebar */}
          <aside className="w-full sm:w-52 shrink-0">
            <div className="bg-white border border-border/60 rounded-2xl shadow-[var(--shadow-card)] p-3">
              <SettingsSidebar
                active={activeSection}
                onChange={setActiveSection}
              />
            </div>
          </aside>

          {/* Main panel */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <ActivePanel />
              </motion.div>
            </AnimatePresence>
          </main>

        </div>
      </div>
    </div>
  );
}
