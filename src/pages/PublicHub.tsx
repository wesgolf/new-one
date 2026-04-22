/**
 * PublicHub — Premium EDM Artist Landing Page
 *
 * Sections: Hero → Featured → Music → Shows → Contact
 * Features: Scroll-driven sticky logo, floating glassmorphism nav,
 *           stacked Komi-style release cards, track list, email capture.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  LayoutGroup,
} from 'motion/react';
import { Disc3, Lock, LogIn, Ticket, Share2, Play, Check, Radio } from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { fetchReleases } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

// ─── Brand Icon SVGs ──────────────────────────────────────────────────────────

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.151 9.5c-.13 0-.263.012-.39.034L14 10.27V6.5a.5.5 0 00-.605-.488l-6 1.5A.5.5 0 007 8v8.5a2.5 2.5 0 102.5 2.5V12.77l5-1.25V16a2.5 2.5 0 102.5 2.5V12c1.26-.23 2.151-1.32 2.151-2.5z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.5 13.5a1 1 0 001 1h.25l.03-1.99-.03-2.01a1 1 0 00-1.25 0v2zm2.25-3.5l-.04 2.01.04 1.99H4V9.25a1.99 1.99 0 00-.54-.09c-.33 0-.56.13-.71.34zm2 .38l-.04 1.63.04 1.49h1.5V9.25a3.97 3.97 0 00-.75-.12c-.38 0-.62.12-.75.25zm2.25-.88l-.04 1.01.04 1.99H8.5V9.13a5.94 5.94 0 00-1.5-.13zm2 .12l-.06.89.06 1.99H9.5V9.62a7.93 7.93 0 00-.5-.12zm2 .5a9.9 9.9 0 00-.5-.25l-.06.75.06 1.88h1V9.62a9.9 9.9 0 00-.5-.5zm1.5.5a12 12 0 00-.5-.5l-.04.63.04 1.75h1V10a12 12 0 00-.5-.5zm1.5.25l-.04.38.04 1.62H15V9.88a14 14 0 00-1-.5zm1.5.12l-.04.26.04 1.49H17V9.5a16 16 0 00-.25-.13zm1.5.88l-.06 1.5h1.56A2 2 0 0022 11a2 2 0 00-2-2c-.38 0-.72.12-1.02.31z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

type NavSection = 'hero' | 'music' | 'shows' | 'contact';

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'hero',    label: 'Home'    },
  { id: 'music',   label: 'Music'   },
  { id: 'shows',   label: 'Shows'   },
  { id: 'contact', label: 'Contact' },
];

const MOCK_TRACKS = [
  { id: '1', title: 'Keep It Moving',         streams: '142K', duration: '3:22' },
  { id: '2', title: 'Neon Frequencies',        streams: '89K',  duration: '4:01' },
  { id: '3', title: 'Late Nights (Extended)',  streams: '67K',  duration: '6:14' },
  { id: '4', title: 'The Drop',               streams: '51K',  duration: '3:47' },
  { id: '5', title: 'Club Ready (VIP Mix)',    streams: '34K',  duration: '5:28' },
];

const SOCIALS = [
  { id: 'instagram',  label: 'Instagram',   href: `https://instagram.com/${(import.meta.env.VITE_INSTAGRAM_HANDLE ?? 'wesleyrob').replace('@', '')}`, Icon: InstagramIcon  },
  { id: 'spotify',    label: 'Spotify',      href: 'https://open.spotify.com',                                                                         Icon: SpotifyIcon    },
  { id: 'apple',      label: 'Apple Music',  href: 'https://music.apple.com',                                                                           Icon: AppleMusicIcon },
  { id: 'soundcloud', label: 'SoundCloud',   href: import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1',                           Icon: SoundCloudIcon },
  { id: 'tiktok',     label: 'TikTok',       href: 'https://tiktok.com',                                                                                Icon: TikTokIcon     },
  { id: 'youtube',    label: 'YouTube',      href: 'https://youtube.com',                                                                               Icon: YouTubeIcon    },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface PublicHubProps {
  authPanel?: React.ReactNode;
}

export function PublicHub({ authPanel }: PublicHubProps) {
  const [releases,       setReleases]       = useState<ReleaseRecord[]>([]);
  const [activeSection,  setActiveSection]  = useState<NavSection>('hero');
  const [email,          setEmail]          = useState('');
  const [subscribed,     setSubscribed]     = useState(false);
  const [playingTrack,   setPlayingTrack]   = useState<string | null>(null);

  const heroRef    = useRef<HTMLElement>(null);
  const musicRef   = useRef<HTMLElement>(null);
  const showsRef   = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  // ── Scroll-driven logo animation ──
  const { scrollY } = useScroll();
  const rawScale    = useTransform(scrollY, [0, 400], [6, 1]);
  const rawY        = useTransform(scrollY, [0, 400], [320, 0]);
  const logoScale   = useSpring(rawScale, { stiffness: 140, damping: 32 });
  const logoY       = useSpring(rawY,     { stiffness: 140, damping: 32 });

  const rawNavOpacity = useTransform(scrollY, [200, 380], [0, 1]);
  const rawNavY       = useTransform(scrollY, [200, 380], [12, 0]);
  const navOpacity    = useSpring(rawNavOpacity, { stiffness: 200, damping: 40 });
  const navPillY      = useSpring(rawNavY,       { stiffness: 200, damping: 40 });

  useEffect(() => {
    fetchReleases().then(setReleases).catch(() => {});
  }, []);

  // ── Active-section tracker ──
  useEffect(() => {
    const sections = [
      { id: 'hero'    as NavSection, ref: heroRef    },
      { id: 'music'   as NavSection, ref: musicRef   },
      { id: 'shows'   as NavSection, ref: showsRef   },
      { id: 'contact' as NavSection, ref: contactRef },
    ];
    const handler = () => {
      const pos = window.scrollY + 200;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].ref.current;
        if (el && el.offsetTop <= pos) { setActiveSection(sections[i].id); return; }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToSection = useCallback((id: NavSection) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: 'smooth' });
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const featuredRelease = releases.find(r => r.status === 'released') ?? releases[0] ?? null;

  return (
    <div
      className="min-h-screen overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-200"
      style={{
        background:  'radial-gradient(ellipse 100% 55% at 50% -5%, #1e1b4b 0%, transparent 65%), #07070f',
        fontFamily:  "'Syne', 'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Ambient glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[360px] w-[700px] opacity-25"
          style={{ background: 'radial-gradient(ellipse, #4f46e5, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-[-10%] h-[350px] w-[350px] opacity-10"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)' }}
        />
      </div>

      {/* ── Sign-in button ── */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white/40 backdrop-blur-sm transition-all hover:bg-white/[0.10] hover:text-white/80"
        >
          <LogIn className="h-3 w-3" />
          Sign In
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STICKY LOGO + NAV
      ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-center pointer-events-none">

        {/* Logo — scroll-driven scale + y */}
        <motion.button
          style={{ scale: logoScale, y: logoY }}
          onClick={scrollToTop}
          className="pointer-events-auto font-black text-white tracking-[-0.05em] select-none text-[26px]"
          whileHover={{ opacity: 0.75 }}
          whileTap={{ scale: 0.96 }}
          aria-label="Back to top"
        >
          WES.
        </motion.button>

        {/* Floating pill nav — fades in as logo shrinks */}
        <motion.div
          style={{ opacity: navOpacity, y: navPillY }}
          className="pointer-events-auto absolute"
        >
          <LayoutGroup id="hub-nav">
            <div className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/60 px-1.5 py-1.5 backdrop-blur-xl shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
              {NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="relative rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150"
                  style={{ color: activeSection === id ? '#fff' : 'rgba(255,255,255,0.38)' }}
                >
                  {activeSection === id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-full bg-white/[0.11]"
                      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <div className="relative mx-auto max-w-2xl px-5 sm:px-8">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section id="hero" ref={heroRef} className="min-h-[92vh] flex flex-col">

          {/* Portrait with blurred edges — the logo floats over this visually */}
          <motion.div
            className="relative w-full overflow-hidden rounded-3xl"
            style={{ height: '62vh', minHeight: 320, maxHeight: 560 }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Edge blur mask */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 88% 80% at 50% 50%, transparent 35%, #07070f 100%)',
              }}
            />

            {/* Portrait — shows cover art if available, else premium gradient */}
            {featuredRelease?.cover_art_url ? (
              <img
                src={featuredRelease.cover_art_url}
                alt="Artist"
                className="h-full w-full object-cover opacity-40"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background:
                    'linear-gradient(160deg, #1e1b4b 0%, #0f172a 45%, #0c0a1e 100%)',
                }}
              >
                {/* Decorative EDM rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[160, 220, 280].map((size, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full border border-white/[0.04]"
                      style={{ width: size, height: size, opacity: 1 - i * 0.25 }}
                    />
                  ))}
                  <div
                    className="h-24 w-24 rounded-full flex items-center justify-center text-[36px] font-black text-white/80 tracking-[-0.05em]"
                    style={{
                      background:
                        'radial-gradient(circle at 35% 35%, #4f46e5, #1e1b4b)',
                      boxShadow: '0 0 60px rgba(79,70,229,0.35)',
                    }}
                  >
                    W
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Genre / tagline */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/28">
              Multi-genre Artist &amp; Producer
            </p>
            <p className="mt-1.5 text-[14px] text-white/35 tracking-wide">
              Electronic · R&amp;B · Hip-Hop
            </p>
          </motion.div>

          {/* Social icon row — 6 icons, evenly spaced */}
          <div className="mt-8 flex items-center justify-center gap-2.5 pb-8">
            {SOCIALS.map(({ id, label, href, Icon }, i) => (
              <motion.a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/35 transition-colors hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.4 }}
                whileHover={{ scale: 1.14 }}
                whileTap={{ scale: 0.93 }}
              >
                <Icon className="h-[15px] w-[15px]" />
              </motion.a>
            ))}
          </div>
        </section>

        {/* ── FEATURED (Komi-style stacked cards) ─────────────────── */}
        <section className="pb-24 space-y-3">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/22">
            Featured
          </p>

          {/* Featured Release — horizontal on desktop */}
          <motion.div
            className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.025] group cursor-pointer"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ borderColor: 'rgba(255,255,255,0.11)' }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Cover art — compact square sm:w-48 */}
              <div className="sm:w-48 shrink-0 overflow-hidden">
                {featuredRelease?.cover_art_url ? (
                  <img
                    src={featuredRelease.cover_art_url}
                    alt={featuredRelease.title}
                    className="w-full aspect-square sm:h-full sm:aspect-auto object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="aspect-square sm:aspect-auto min-h-[180px] sm:h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(145deg, #1e1b4b 0%, #2e1065 100%)' }}
                  >
                    <Disc3 className="h-10 w-10 text-white/20" />
                  </div>
                )}
              </div>

              {/* Info + CTAs */}
              <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-400/60 mb-2">
                    Latest Release
                  </p>
                  <h2 className="text-[22px] sm:text-[26px] font-black tracking-[-0.03em] text-white leading-tight">
                    {featuredRelease?.title ?? 'Upcoming Release'}
                  </h2>
                  <p className="mt-1.5 text-[12px] text-white/30">
                    {featuredRelease?.release_date ?? 'Coming Soon'}
                  </p>
                </div>

                {/* CTA row */}
                <div className="mt-6 flex items-center flex-wrap gap-2.5">
                  <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-violet-500 active:scale-[0.97]"
                  >
                    <SpotifyIcon className="h-3.5 w-3.5" />
                    Stream Now
                  </a>
                  {[
                    { Icon: AppleMusicIcon, href: 'https://music.apple.com',    label: 'Apple Music' },
                    { Icon: SoundCloudIcon, href: import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1', label: 'SoundCloud' },
                  ].map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/35 transition-all hover:text-white hover:border-white/20"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Secondary cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Radio Mix */}
            <motion.div
              className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 flex items-center gap-4 group cursor-pointer"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ borderColor: 'rgba(255,255,255,0.10)' }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                <Radio className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28">Mix</p>
                <p className="truncate text-[14px] font-bold text-white">Radio Edit Mix</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Listen →
              </span>
            </motion.div>

            {/* Latest Reel */}
            <motion.div
              className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 flex items-center gap-4 group cursor-pointer"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ borderColor: 'rgba(255,255,255,0.10)' }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #e11d48, #be185d)' }}
              >
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28">Video</p>
                <p className="truncate text-[14px] font-bold text-white">Latest Reel</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Watch →
              </span>
            </motion.div>
          </div>
        </section>

        {/* ── MUSIC ────────────────────────────────────────────────── */}
        <section id="music" ref={musicRef} className="pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/22">
              Catalog
            </p>
            <h2 className="mb-8 text-[28px] sm:text-[32px] font-black tracking-[-0.03em] text-white">
              Popular Tracks
            </h2>
          </motion.div>

          <div className="space-y-0.5">
            {MOCK_TRACKS.map((track, i) => (
              <motion.div
                key={track.id}
                className="group flex items-center gap-3 sm:gap-4 rounded-2xl px-4 py-3.5 transition-colors hover:bg-white/[0.04] cursor-pointer"
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                onClick={() => setPlayingTrack(playingTrack === track.id ? null : track.id)}
              >
                {/* Index / play */}
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                  <span className="text-[12px] text-white/22 group-hover:opacity-0 transition-opacity tabular-nums font-medium">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Play className="absolute h-3.5 w-3.5 text-white fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Title */}
                <p className="flex-1 text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors truncate">
                  {track.title}
                </p>

                {/* Streams (hidden on mobile) */}
                <span className="hidden sm:block text-[12px] text-white/22 tabular-nums mr-4 font-medium">
                  {track.streams}
                </span>

                {/* Duration */}
                <span className="text-[12px] text-white/28 tabular-nums font-medium">
                  {track.duration}
                </span>

                {/* Share */}
                <button
                  className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 text-white/30 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label={`Share ${track.title}`}
                  onClick={e => e.stopPropagation()}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── SHOWS ────────────────────────────────────────────────── */}
        <section id="shows" ref={showsRef} className="pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/22">
              Live
            </p>
            <h2 className="mb-8 text-[28px] sm:text-[32px] font-black tracking-[-0.03em] text-white">
              Shows
            </h2>
          </motion.div>

          <motion.div
            className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-white/[0.07]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] mb-5">
              <Ticket className="h-7 w-7 text-white/18" />
            </div>
            <p className="text-[15px] font-semibold text-white/45 mb-1">No upcoming shows</p>
            <p className="text-[13px] text-white/22">Check back soon.</p>
          </motion.div>
        </section>

        {/* ── CONTACT ──────────────────────────────────────────────── */}
        <section id="contact" ref={contactRef} className="pb-32">
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 sm:p-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Corner glows */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full opacity-18"
              style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full opacity-12"
              style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
            />

            <div className="relative z-10">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/22">
                Newsletter
              </p>
              <h2 className="text-[28px] sm:text-[32px] font-black tracking-[-0.03em] text-white mb-2">
                New music. First.
              </h2>
              <p className="text-[14px] text-white/38 mb-8 max-w-[340px] leading-relaxed">
                Exclusive drops, tour dates, and unreleased content — straight to your inbox.
              </p>

              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 py-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
                      <Check className="h-4 w-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">You're on the list</p>
                      <p className="text-[12px] text-white/38">New drops coming your way.</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    className="space-y-3"
                    onSubmit={e => { e.preventDefault(); if (email.trim()) setSubscribed(true); }}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="YOUR EMAIL ADDRESS"
                      required
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white placeholder:text-white/18 focus:border-violet-500/40 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-violet-600 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-violet-500 active:scale-[0.98]"
                    >
                      Subscribe
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        {/* ── Auth panel (injected by Unauthorized) ── */}
        {authPanel && (
          <motion.div
            className="pb-12"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/95">
              <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3.5">
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Artist OS Access
                </p>
              </div>
              <div className="p-5">{authPanel}</div>
            </div>
          </motion.div>
        )}

        {/* ── Footer ── */}
        <footer className="pb-12 text-center">
          <p className="text-[11px] text-white/14 tracking-[0.12em] uppercase">
            © {new Date().getFullYear()} {ARTIST_INFO.name}
          </p>
        </footer>

      </div>
    </div>
  );
}


