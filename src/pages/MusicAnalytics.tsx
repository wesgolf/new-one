import React from 'react';
import { Music2, Headphones, TrendingUp, Radio, PlayCircle, Globe } from 'lucide-react';

const STAT_CARDS = [
  { label: 'Total Streams', value: '—', icon: PlayCircle, desc: 'All platforms combined' },
  { label: 'Monthly Listeners', value: '—', icon: Headphones, desc: 'Spotify & Apple Music' },
  { label: 'Radio Spins', value: '—', icon: Radio, desc: 'Last 30 days' },
  { label: 'Countries Reached', value: '—', icon: Globe, desc: 'Unique markets' },
];

export function MusicAnalytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Music Analytics</h1>
        <p className="mt-1 text-sm text-text-muted">Track streams, listeners, and royalty data from Spotify, Apple Music, and more.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border/60 p-5 flex flex-col gap-3"
            style={{ background: 'var(--shell-panel)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">{card.label}</span>
              <card.icon className="w-4 h-4 text-text-muted opacity-50" />
            </div>
            <p className="text-3xl font-bold text-text-primary">{card.value}</p>
            <p className="text-xs text-text-muted">{card.desc}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border border-border/60 p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[240px]"
        style={{ background: 'var(--shell-panel)' }}
      >
        <Music2 className="w-10 h-10 text-text-muted opacity-40" />
        <div>
          <p className="text-sm font-semibold text-text-primary">No DSPs connected yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-xs">
            Link Spotify for Artists, Apple Music for Artists, or SoundCloud to pull in your streaming data.
          </p>
        </div>
        <button className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity">
          Connect a Platform
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['Top Tracks by Streams', 'Listener Demographics'].map((title) => (
          <div
            key={title}
            className="rounded-2xl border border-border/60 p-6 min-h-[180px] flex flex-col gap-2"
            style={{ background: 'var(--shell-panel)' }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-text-muted opacity-60" />
              <span className="text-sm font-semibold text-text-primary">{title}</span>
            </div>
            <p className="text-xs text-text-muted mt-auto">Connect a DSP to see data</p>
          </div>
        ))}
      </div>
    </div>
  );
}
