/**
 * LinkCard
 * Reusable dark-themed link card for the public hub.
 * Supports internal SPA routes and external links.
 * Icon is resolved by name from LINK_ICON_MAP — add entries as needed.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  Music2,
  Radio,
  Headphones,
  Users,
  Camera,
  Globe,
  Mail,
  Star,
  ArrowRight,
} from 'lucide-react';
import type { PublicHubLink } from '../types/domain';

const LINK_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Music2,
  Radio,
  Headphones,
  Users,
  Camera,
  Globe,
  Mail,
  Star,
  ArrowRight,
  ExternalLink,
};

interface LinkCardProps {
  link: PublicHubLink;
}

export function LinkCard({ link }: LinkCardProps) {
  const Icon = link.icon ? LINK_ICON_MAP[link.icon] : null;

  const inner = (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-5 py-4 transition-all duration-200 hover:bg-white/[0.09] hover:border-white/[0.16] active:scale-[0.98] cursor-pointer">
      {/* Icon bubble */}
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
          <Icon className="h-[18px] w-[18px] text-white/65" />
        </div>
      )}

      {/* Label + description */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-semibold leading-snug text-white">{link.label}</p>
        {link.description && (
          <p className="mt-0.5 text-[12px] text-white/40 truncate">{link.description}</p>
        )}
      </div>

      {/* Trailing arrow */}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/20 opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Highlight ring for featured links */}
      {link.highlight && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-blue-500/30" />
      )}
    </div>
  );

  if (link.external !== false) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return (
    <Link to={link.href} className="block">
      {inner}
    </Link>
  );
}
