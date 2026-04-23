/**
 * PublicHub — Premium B&W Editorial Artist Landing Page
 *
 * Design: Black and white only. Editorial serif headlines (Cormorant).
 * Sections: Hero → Features → Music → Radio → Shows → Footer
 * Editable via Settings (app_settings.public_hub).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { LogIn, X, Send, Check } from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { fetchReleases } from '../lib/supabaseData';
import { supabase } from '../lib/supabase';
import { usePublicHubSettings } from '../hooks/usePublicHubSettings';
import type { ReleaseRecord } from '../types/domain';

// ─── Google Fonts: Cormorant (editorial serif) + Epilogue (clean sans) ─────────

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Epilogue:wght@300;400;500;600&display=swap';

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

// ─── Types & Constants ────────────────────────────────────────────────────────

type NavSection = 'features' | 'music' | 'radio' | 'shows';

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'music',    label: 'Music'    },
  { id: 'radio',    label: 'Radio'    },
  { id: 'shows',    label: 'Shows'    },
];

interface Show {
  id: string;
  venue: string;
  date: string;
  time?: string;
  status: 'upcoming' | 'completed';
}

const SOCIALS_BASE = [
  { id: 'instagram',  label: 'Instagram',   Icon: InstagramIcon,  defaultHref: `https://instagram.com/${(import.meta.env.VITE_INSTAGRAM_HANDLE ?? 'wesleyrob').replace('@', '')}`, settingsKey: 'instagramUrl'  as const },
  { id: 'spotify',    label: 'Spotify',      Icon: SpotifyIcon,    defaultHref: 'https://open.spotify.com',                                                                          settingsKey: 'spotifyUrl'    as const },
  { id: 'apple',      label: 'Apple Music',  Icon: AppleMusicIcon, defaultHref: 'https://music.apple.com',                                                                           settingsKey: 'appleMusicUrl' as const },
  { id: 'soundcloud', label: 'SoundCloud',   Icon: SoundCloudIcon, defaultHref: import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1',                           settingsKey: 'soundcloudUrl' as const },
  { id: 'tiktok',     label: 'TikTok',       Icon: TikTokIcon,     defaultHref: 'https://tiktok.com',                                                                                settingsKey: 'tiktokUrl'     as const },
  { id: 'youtube',    label: 'YouTube',      Icon: YouTubeIcon,    defaultHref: 'https://youtube.com',                                                                               settingsKey: 'youtubeUrl'    as const },
];

// ─── Contact Modal ─────────────────────────────────────────────────────────────

interface ContactModalProps {
  onClose: () => void;
  contactEmail: string;
}

function ContactModal({ onClose, contactEmail }: ContactModalProps) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const { error: dbErr } = await supabase
        .from('contact_submissions')
        .insert({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      if (dbErr) throw dbErr;
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [name, email, subject, message]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-md rounded-none sm:rounded-sm border border-white/15 bg-[#0a0a0a] p-7 sm:p-8"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {!sent ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/30 mb-2" style={{ fontFamily: "'Epilogue', sans-serif" }}>
              Get in Touch
            </p>
            <h2 className="text-[26px] font-light leading-tight text-white mb-6" style={{ fontFamily: "'Cormorant', serif" }}>
              Contact
            </h2>

            {error && (
              <p className="mb-4 text-[12px] text-red-400/80 border border-red-500/20 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Name"
                  required
                  className="col-span-1 w-full border-b border-white/12 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="col-span-1 w-full border-b border-white/12 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                />
              </div>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full border-b border-white/12 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message"
                required
                rows={4}
                className="w-full border-b border-white/12 bg-transparent py-2.5 text-[13px] text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors resize-none"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              />
              <div className="flex items-center justify-between pt-2">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="text-[11px] text-white/25 hover:text-white/50 transition-colors" style={{ fontFamily: "'Epilogue', sans-serif" }}>
                    {contactEmail}
                  </a>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="ml-auto inline-flex items-center gap-2 border border-white/20 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70 hover:border-white/50 hover:text-white transition-all disabled:opacity-40"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                >
                  <Send className="h-3 w-3" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center border border-white/15 mb-5">
              <Check className="h-5 w-5 text-white/70" />
            </div>
            <h2 className="text-[24px] font-light text-white mb-2" style={{ fontFamily: "'Cormorant', serif" }}>
              Message received
            </h2>
            <p className="text-[13px] text-white/35" style={{ fontFamily: "'Epilogue', sans-serif" }}>
              We'll be in touch.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PublicHubProps {
  authPanel?: React.ReactNode;
}

export function PublicHub({ authPanel }: PublicHubProps) {
  const [releases,      setReleases]      = useState<ReleaseRecord[]>([]);
  const [shows,         setShows]         = useState<Show[]>([]);
  const [activeSection, setActiveSection] = useState<NavSection>('features');
  const [navVisible,    setNavVisible]    = useState(false);
  const [contactOpen,   setContactOpen]   = useState(false);

  const { settings } = usePublicHubSettings();

  // Merge settings URLs over env defaults
  const SOCIALS = SOCIALS_BASE.map(({ settingsKey, defaultHref, ...rest }) => ({
    ...rest,
    href: settings[settingsKey] || defaultHref,
  }));

  const featuresRef = useRef<HTMLElement>(null);
  const musicRef    = useRef<HTMLElement>(null);
  const radioRef    = useRef<HTMLElement>(null);
  const showsRef    = useRef<HTMLElement>(null);

  const { scrollY } = useScroll();
  const rawNavOpacity = useTransform(scrollY, [120, 220], [0, 1]);
  const navOpacity    = useSpring(rawNavOpacity, { stiffness: 220, damping: 40 });

  useEffect(() => {
    fetchReleases().then(data => setReleases(data)).catch(() => {});
    void (async () => {
      try {
        const { data } = await supabase
          .from('shows')
          .select('id, venue, date, time, status')
          .eq('status', 'upcoming')
          .order('date', { ascending: true });
        if (data) setShows(data as Show[]);
      } catch {}
    })();
  }, []);

  // Font injection
  useEffect(() => {
    if (!document.getElementById('ph-fonts')) {
      const link = document.createElement('link');
      link.id = 'ph-fonts';
      link.rel = 'stylesheet';
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
    return () => {};
  }, []);

  // Nav visibility + active section tracker
  useEffect(() => {
    const sections = [
      { id: 'features' as NavSection, ref: featuresRef },
      { id: 'music'    as NavSection, ref: musicRef    },
      { id: 'radio'    as NavSection, ref: radioRef    },
      { id: 'shows'    as NavSection, ref: showsRef    },
    ];
    const handler = () => {
      setNavVisible(window.scrollY > 120);
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
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const featuredRelease = releases.find(r => r.status === 'released') ?? releases[0] ?? null;
  const artistName = settings.heroTitle || ARTIST_INFO.name;
  const artistSubtitle = settings.heroSubtitle || 'Artist & Producer';

  const STREAMING_LINKS = [
    { Icon: SpotifyIcon,    href: settings.spotifyUrl    || 'https://open.spotify.com',   label: 'Spotify'     },
    { Icon: AppleMusicIcon, href: settings.appleMusicUrl || 'https://music.apple.com',    label: 'Apple Music' },
    { Icon: SoundCloudIcon, href: settings.soundcloudUrl || (import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1'), label: 'SoundCloud' },
    { Icon: YouTubeIcon,    href: settings.youtubeUrl    || 'https://youtube.com',         label: 'YouTube'    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden selection:bg-white/20 selection:text-white"
      style={{ background: '#000', fontFamily: "'Epilogue', 'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Sticky top nav ── */}
      <motion.header
        style={{ opacity: navOpacity }}
        className="fixed top-0 inset-x-0 z-40 border-b border-white/8 bg-black/90 backdrop-blur-md pointer-events-none"
      >
        <div className="mx-auto flex h-[52px] max-w-[620px] items-center justify-between px-5 sm:px-8 pointer-events-auto">
          {/* Artist mark */}
          <button
            onClick={scrollToTop}
            className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60 hover:text-white transition-colors"
            style={{ fontFamily: "'Epilogue', sans-serif" }}
          >
            {artistName.split(' ')[0].toUpperCase()}
          </button>

          {/* Nav items */}
          <nav className="flex items-center gap-5 sm:gap-7" aria-label="Page sections">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="text-[10px] font-medium uppercase tracking-[0.22em] transition-colors"
                style={{
                  fontFamily: "'Epilogue', sans-serif",
                  color: activeSection === id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.30)',
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Sign in */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/25 hover:text-white/60 transition-colors"
            style={{ fontFamily: "'Epilogue', sans-serif" }}
          >
            <LogIn className="h-3 w-3" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        </div>
      </motion.header>

      {/* ── Top sign-in (above fold, hidden once nav appears) ── */}
      <div className="fixed top-4 right-4 z-30" style={{ opacity: navVisible ? 0 : 1, transition: 'opacity 0.2s' }} aria-hidden={navVisible}>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/25 hover:text-white/55 transition-colors pointer-events-auto"
          style={{ fontFamily: "'Epilogue', sans-serif" }}
          tabIndex={navVisible ? -1 : 0}
        >
          <LogIn className="h-3 w-3" />
          Sign In
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE CONTENT
      ═══════════════════════════════════════════════════════════════ */}
      <div className="relative mx-auto max-w-[620px] px-5 sm:px-8">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section id="hero" className="pt-20 pb-16">
          {/* Portrait */}
          <motion.div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: '4/5', maxHeight: '72vh' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            {settings.heroImage ? (
              <img
                src={settings.heroImage}
                alt={artistName}
                className="h-full w-full object-cover"
              />
            ) : featuredRelease?.cover_art_url ? (
              <img
                src={featuredRelease.cover_art_url}
                alt={artistName}
                className="h-full w-full object-cover"
                style={{ filter: 'grayscale(100%)' }}
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center"
                style={{ background: 'linear-gradient(160deg, #111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}
              >
                <span
                  className="text-[100px] sm:text-[140px] font-light tracking-[-0.04em] text-white/10 select-none"
                  style={{ fontFamily: "'Cormorant', serif" }}
                >
                  {artistName.charAt(0)}
                </span>
              </div>
            )}
            {/* Bottom fade to black */}
            <div
              className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
              style={{ background: 'linear-gradient(to top, #000 0%, transparent 100%)' }}
            />
          </motion.div>

          {/* Name + subtitle (width visually matches portrait) */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              className="text-[clamp(42px,10vw,82px)] font-light leading-[0.92] tracking-[-0.03em] text-white"
              style={{ fontFamily: "'Cormorant', serif" }}
            >
              {artistName}
            </h1>
            <p
              className="mt-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/35"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              {artistSubtitle}
            </p>
          </motion.div>

          {/* Social icon row — bare icons, no circle backgrounds */}
          <motion.div
            className="mt-7 flex items-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
          >
            {SOCIALS.map(({ id, label, href, Icon }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-white/25 hover:text-white/70 transition-colors"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </motion.div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────── */}
        <section id="features" ref={featuresRef} className="pb-20">
          <p
            className="mb-5 text-[9px] font-semibold uppercase tracking-[0.36em] text-white/20"
            style={{ fontFamily: "'Epilogue', sans-serif" }}
          >
            Featured
          </p>

          {/* Main feature card — full width, 5:2 ratio, 30% art / 70% info */}
          <motion.div
            className="w-full overflow-hidden border border-white/8 group"
            style={{ aspectRatio: '5/2' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-full">
              {/* Left: cover art — 30% */}
              <div className="w-[30%] shrink-0 overflow-hidden">
                {featuredRelease?.cover_art_url ? (
                  <img
                    src={featuredRelease.cover_art_url}
                    alt={featuredRelease.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ filter: 'grayscale(100%)' }}
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{ background: 'linear-gradient(135deg, #111 0%, #1c1c1c 100%)' }}
                  />
                )}
              </div>

              {/* Right: metadata + streaming links — 70% */}
              <div className="flex flex-1 flex-col justify-between p-5 sm:p-7 border-l border-white/8">
                <div>
                  <p
                    className="text-[9px] font-medium uppercase tracking-[0.30em] text-white/22 mb-2"
                    style={{ fontFamily: "'Epilogue', sans-serif" }}
                  >
                    Latest Release
                  </p>
                  <h2
                    className="text-[clamp(18px,3.5vw,32px)] font-light leading-tight text-white"
                    style={{ fontFamily: "'Cormorant', serif" }}
                  >
                    {featuredRelease?.title ?? 'Upcoming Release'}
                  </h2>
                  {featuredRelease?.release_date && (
                    <p
                      className="mt-1 text-[11px] text-white/28"
                      style={{ fontFamily: "'Epilogue', sans-serif" }}
                    >
                      {featuredRelease.release_date}
                    </p>
                  )}
                </div>

                {/* Streaming links row */}
                <div className="flex items-center gap-4">
                  {STREAMING_LINKS.map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="text-white/22 hover:text-white/70 transition-colors"
                    >
                      <Icon className="h-[15px] w-[15px]" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── MUSIC ────────────────────────────────────────────────── */}
        <section id="music" ref={musicRef} className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.36em] text-white/20"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Catalog
            </p>
            <h2
              className="mb-8 text-[clamp(28px,6vw,44px)] font-light tracking-[-0.02em] text-white leading-none"
              style={{ fontFamily: "'Cormorant', serif" }}
            >
              Music
            </h2>
          </motion.div>

          {/* Horizontal scroll track cards */}
          <div
            className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {(settings.featuredTracks.length > 0
              ? settings.featuredTracks.map(t => ({ id: t.title, title: t.title, artistName, url: t.url }))
              : [
                  { id: '1', title: 'Keep It Moving',        artistName, url: '' },
                  { id: '2', title: 'Neon Frequencies',       artistName, url: '' },
                  { id: '3', title: 'Late Nights (Extended)', artistName, url: '' },
                  { id: '4', title: 'The Drop',              artistName, url: '' },
                  { id: '5', title: 'Club Ready (VIP Mix)',   artistName, url: '' },
                ]
            ).map((track, i) => (
              <motion.div
                key={track.id}
                className="shrink-0 snap-start w-[140px] sm:w-[160px]"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                {/* Small cover art */}
                <div
                  className="w-full aspect-square mb-3 overflow-hidden border border-white/8"
                  style={{ background: '#111' }}
                >
                  {featuredRelease?.cover_art_url && (
                    <img
                      src={featuredRelease.cover_art_url}
                      alt={track.title}
                      className="h-full w-full object-cover"
                      style={{ filter: 'grayscale(100%)' }}
                    />
                  )}
                </div>
                <p
                  className="text-[13px] font-medium text-white/80 leading-snug truncate"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                >
                  {track.title}
                </p>
                <p
                  className="text-[11px] text-white/28 mt-0.5 truncate"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                >
                  {track.artistName}
                </p>
                {/* Streaming icon links */}
                <div className="flex items-center gap-3 mt-3">
                  {track.url ? (
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/22 hover:text-white/60 transition-colors"
                    >
                      <SpotifyIcon className="h-[13px] w-[13px]" />
                    </a>
                  ) : (
                    STREAMING_LINKS.slice(0, 3).map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="text-white/22 hover:text-white/60 transition-colors"
                      >
                        <Icon className="h-[13px] w-[13px]" />
                      </a>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── RADIO ────────────────────────────────────────────────── */}
        <section id="radio" ref={radioRef} className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.36em] text-white/20"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Mixes
            </p>
            <h2
              className="mb-8 text-[clamp(28px,6vw,44px)] font-light tracking-[-0.02em] text-white leading-none"
              style={{ fontFamily: "'Cormorant', serif" }}
            >
              Radio
            </h2>
          </motion.div>

          <motion.div
            className="border border-white/8 p-5 sm:p-6 flex items-center justify-between group cursor-pointer"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            whileHover={{ borderColor: 'rgba(255,255,255,0.18)' }}
          >
            <div>
              <p
                className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/22 mb-1.5"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              >
                Mix
              </p>
              <p
                className="text-[20px] font-light text-white"
                style={{ fontFamily: "'Cormorant', serif" }}
              >
                Radio Edit Mix
              </p>
            </div>
            <div className="flex items-center gap-4">
              {STREAMING_LINKS.slice(0, 3).map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-white/20 hover:text-white/60 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Icon className="h-[15px] w-[15px]" />
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── SHOWS ────────────────────────────────────────────────── */}
        <section id="shows" ref={showsRef} className="pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-2 text-[9px] font-semibold uppercase tracking-[0.36em] text-white/20"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Live
            </p>
            <h2
              className="mb-8 text-[clamp(28px,6vw,44px)] font-light tracking-[-0.02em] text-white leading-none"
              style={{ fontFamily: "'Cormorant', serif" }}
            >
              Shows
            </h2>
          </motion.div>

          {shows.length > 0 ? (
            <div className="divide-y divide-white/6">
              {shows.map((show, i) => {
                const d = new Date(show.date + 'T00:00:00');
                const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = d.getDate();
                return (
                  <motion.div
                    key={show.id}
                    className="flex items-center gap-6 py-5"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    {/* Date block */}
                    <div className="w-[44px] shrink-0 text-center">
                      <p
                        className="text-[9px] font-medium uppercase tracking-[0.22em] text-white/30"
                        style={{ fontFamily: "'Epilogue', sans-serif" }}
                      >
                        {month}
                      </p>
                      <p
                        className="text-[26px] font-light leading-none text-white"
                        style={{ fontFamily: "'Cormorant', serif" }}
                      >
                        {day}
                      </p>
                    </div>

                    <div className="h-8 w-px bg-white/8 shrink-0" />

                    {/* Venue */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[15px] font-medium text-white/80 leading-snug truncate"
                        style={{ fontFamily: "'Epilogue', sans-serif" }}
                      >
                        {show.venue}
                      </p>
                      {show.time && (
                        <p
                          className="text-[11px] text-white/28 mt-0.5"
                          style={{ fontFamily: "'Epilogue', sans-serif" }}
                        >
                          {show.time}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/28 border border-white/10 px-2.5 py-1 shrink-0"
                      style={{ fontFamily: "'Epilogue', sans-serif" }}
                    >
                      Upcoming
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              className="border border-white/6 py-16 text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="text-[15px] font-light text-white/30"
                style={{ fontFamily: "'Cormorant', serif" }}
              >
                No upcoming shows
              </p>
              <p
                className="mt-1.5 text-[11px] text-white/18"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              >
                Check back soon.
              </p>
            </motion.div>
          )}
        </section>

        {/* ── Auth panel (injected by Unauthorized) ── */}
        {authPanel && (
          <motion.div
            className="pb-12"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="overflow-hidden border border-white/10 bg-white/95">
              <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-3.5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}
                >
                  Artist OS Access
                </p>
              </div>
              <div className="p-5">{authPanel}</div>
            </div>
          </motion.div>
        )}

        {/* ── Footer ── */}
        <footer className="border-t border-white/8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p
            className="text-[10px] text-white/18 tracking-[0.14em] uppercase"
            style={{ fontFamily: "'Epilogue', sans-serif" }}
          >
            © {new Date().getFullYear()} {artistName}
          </p>

          <div className="flex items-center gap-8">
            {settings.pressKitUrl && (
              <a
                href={settings.pressKitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/28 hover:text-white/60 transition-colors"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              >
                Press Kit
              </a>
            )}
            <button
              onClick={() => setContactOpen(true)}
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/28 hover:text-white/60 transition-colors"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Contact
            </button>
          </div>
        </footer>

      </div>

      {/* ── Contact Modal ── */}
      <AnimatePresence>
        {contactOpen && (
          <ContactModal
            onClose={() => setContactOpen(false)}
            contactEmail={settings.contactEmail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

