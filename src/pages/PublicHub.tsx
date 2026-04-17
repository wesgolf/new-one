import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, Lock, Instagram, Youtube, Radio, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ARTIST_INFO } from '../constants';
import { publicHubLinks, ARTIST_SOCIAL_LINKS } from '../content/publicHubLinks';
import { fetchReleases } from '../lib/supabaseData';
import { LinkCard } from '../components/LinkCard';
import type { ReleaseRecord } from '../types/domain';

// Social icon map — keys must match ARTIST_SOCIAL_LINKS[].icon values
const SOCIAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Youtube,
  Radio,
};

interface PublicHubProps {
  /** Injected auth form/panel — used by the Unauthorized page */
  authPanel?: React.ReactNode;
}

export function PublicHub({ authPanel }: PublicHubProps) {
  const [featuredRelease, setFeaturedRelease] = useState<ReleaseRecord | null>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const sortedLinks = [...publicHubLinks].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  useEffect(() => {
    fetchReleases()
      .then((rows) => {
        setFeaturedRelease(rows.find((r) => r.status === 'released') ?? rows[0] ?? null);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #14111f 0%, #0d0c14 55%, #100e1a 100%)' }}
    >
      {/* Ambient purple glow at top */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-[0.18]"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% -10%, #7c3aed, transparent)' }}
      />

      {/* ── Page column ─────────────────────────────────────── */}
      <div className="relative mx-auto max-w-[400px] px-4 py-12 pb-20">

        {/* ── Profile hero ── */}
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Avatar */}
          <div
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full ring-[1.5px] ring-white/10"
            style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)' }}
          >
            <span className="text-[20px] font-bold tracking-tight text-white">WES</span>
          </div>

          {/* Artist name */}
          <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-white">
            {ARTIST_INFO.name}
          </h1>

          {/* Genre tagline */}
          <p className="mt-2 text-[13px] leading-relaxed text-white/45 max-w-[260px]">
            Multi-genre artist &amp; producer &nbsp;·&nbsp; Electronic · R&amp;B · Hip-Hop
          </p>

          {/* Social icon row */}
          <div className="mt-5 flex items-center gap-2.5">
            {ARTIST_SOCIAL_LINKS.map((social) => {
              const Icon = SOCIAL_ICON_MAP[social.icon];
              if (!Icon) return null;
              return (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 transition-all hover:bg-white/[0.11] hover:text-white hover:border-white/20"
                >
                  <Icon className="h-[15px] w-[15px]" />
                </a>
              );
            })}
          </div>
        </motion.div>

        {/* ── Primary link cards ── */}
        <motion.div
          className="mt-8 space-y-2"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Links
          </p>
          {sortedLinks.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </motion.div>

        {/* ── Featured release ── */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
            Featured
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04]">
            <div className="flex items-center gap-4 p-4">
              {/* Cover art */}
              {featuredRelease?.cover_art_url ? (
                <img
                  src={featuredRelease.cover_art_url}
                  alt={featuredRelease.title}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Disc3 className="h-7 w-7 text-white/30" />
                </div>
              )}

              {/* Release info */}
              <div className="flex flex-1 flex-col justify-center min-w-0">
                {featuredRelease ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                      New release
                    </p>
                    <p className="mt-0.5 truncate text-[15px] font-bold text-white">
                      {featuredRelease.title}
                    </p>
                    <p className="text-[12px] text-white/40">
                      {featuredRelease.release_date ?? 'Coming soon'}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-white/35">Upcoming release</p>
                )}
              </div>

              {/* Link to authenticated release detail */}
              {featuredRelease && (
                <Link
                  to={`/releases/${featuredRelease.id}`}
                  className="flex-shrink-0 self-center rounded-xl border border-white/[0.08] bg-white/[0.05] p-2 text-white/40 transition-all hover:bg-white/[0.11] hover:text-white"
                  title="Open release detail"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Mailing list CTA ── */}
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {subscribed ? (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 px-5 py-4 text-center">
              <p className="text-[14px] font-semibold text-white">You're on the list ✓</p>
              <p className="mt-1 text-[12px] text-white/40">
                New releases and updates on their way.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                Stay in the loop
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-white">New music alerts</p>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubscribed(true);
                }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/25 transition-all"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-violet-500 active:scale-[0.97]"
                >
                  Join
                </button>
              </form>
            </div>
          )}
        </motion.div>

        {/* ── Auth panel (injected by Unauthorized.tsx) ── */}
        {authPanel && (
          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/95">
              <div className="border-b border-zinc-200 px-5 py-3.5 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Artist OS access
                </p>
              </div>
              <div className="p-5">{authPanel}</div>
            </div>
          </motion.div>
        )}

        {/* ── Footer ── */}
        <p className="mt-10 text-center text-[11px] text-white/15">
          © {new Date().getFullYear()} {ARTIST_INFO.name} · Powered by Artist OS
        </p>
      </div>
    </div>
  );
}
