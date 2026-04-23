/**
 * Shared low-level primitives for the Settings page panels.
 */

import React, { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Section header ────────────────────────────────────────────────────────

interface SettingsSectionHeaderProps {
  Icon: React.ElementType;
  title: string;
  description: string;
}

export function SettingsSectionHeader({ Icon, title, description }: SettingsSectionHeaderProps) {
  return (
    <div className="flex items-start gap-3.5 pb-1">
      <div className="w-9 h-9 rounded-xl bg-brand-dim border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-brand" />
      </div>
      <div>
        <h2 className="text-base font-bold text-text-primary leading-none">{title}</h2>
        <p className="mt-1 text-sm text-text-tertiary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Settings card ────────────────────────────────────────────────────────

interface SettingsCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ title, children, className }: SettingsCardProps) {
  return (
    <div className={cn(
      'bg-white border border-border/60 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden',
      className,
    )}>
      {/* Card heading */}
      <div className="px-5 pt-4 pb-3 border-b border-border/50">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          {title}
        </h3>
      </div>

      {/* Fields */}
      <div className="divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────

interface SettingsFieldRowProps {
  label: string;
  description?: string;
  saving?: boolean;
  children: ReactNode;
}

export function SettingsFieldRow({ label, description, saving, children }: SettingsFieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3.5">
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-primary leading-none">{label}</p>
          {saving && <Loader2 className="w-3 h-3 text-text-muted animate-spin" />}
        </div>
        {description && (
          <p className="mt-1 text-xs text-text-tertiary leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

export function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Section header */}
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-border/40 shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 bg-border/50 rounded-lg w-32" />
          <div className="h-3 bg-border/40 rounded-lg w-64" />
        </div>
      </div>

      {/* Cards */}
      {[1, 2].map(i => (
        <div key={i} className="bg-white border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border/50">
            <div className="h-2.5 bg-border/50 rounded w-20" />
          </div>
          <div className="divide-y divide-border/40">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex items-center justify-between gap-6 px-5 py-3.5">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-border/50 rounded w-32" />
                  <div className="h-2.5 bg-border/30 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-border/40 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
