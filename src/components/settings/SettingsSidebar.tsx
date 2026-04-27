import React from 'react';
import { Globe, Plug2, Radio, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SettingsSection = 'general' | 'integrations' | 'public_hub';

interface NavItem {
  id: SettingsSection;
  label: string;
  description: string;
  Icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  {
    id:          'general',
    label:       'General',
    description: 'Preferences & defaults',
    Icon:        SlidersHorizontal,
  },
  {
    id:          'integrations',
    label:       'Integrations',
    description: 'Connected platforms',
    Icon:        Plug2,
  },
  {
    id:          'public_hub',
    label:       'Public Hub',
    description: 'Public-facing artist page',
    Icon:        Radio,
  },
];

interface SettingsSidebarProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

export function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Settings navigation">
      {/* Section label */}
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
        Sections
      </p>

      {NAV_ITEMS.map(({ id, label, description, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150',
              isActive
                ? 'bg-brand-dim text-brand shadow-[inset_0_0_0_1px_var(--color-brand-ring)]'
                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon bubble */}
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              isActive
                ? 'bg-brand/10 text-brand'
                : 'bg-border/50 text-text-tertiary group-hover:bg-border group-hover:text-text-secondary',
            )}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0">
              <p className={cn(
                'text-sm font-semibold leading-none truncate',
                isActive ? 'text-brand' : 'text-text-primary',
              )}>
                {label}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5 truncate leading-none">
                {description}
              </p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
