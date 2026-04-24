/**
 * PublicHub — public-facing artist landing page.
 *
 * Structure (from attached design):
 *   Animated sticky logo → Hero → Nav tabs →
 *   Featured | Music | Radio | Shows | Email Capture → Footer
 *
 * Data: Supabase (releases, shows) + usePublicHubSettings
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { LogIn, X, Send, Check } from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { fetchReleases } from '../lib/supabaseData';
import { supabase } from '../lib/supabase';
import { usePublicHubSettings } from '../hooks/usePublicHubSettings';
import type { ReleaseRecord } from '../types/domain';
import Hero from './public/Hero';
import FeaturedSection from './public/FeaturedSection';
import PopularTracks from './public/PopularTracks';
import RadioShow from './public/RadioShow';
import UpcomingShows, { type Show } from './public/UpcomingShows';
import EmailCapture from './public/EmailCapture';
import Footer from './public/Footer';

// ── Brand SVG icons ───────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const HERO_IMAGE = 'https://image2url.com/r2/default/images/1774985821245-8821b2c4-f571-4c19-a33c-6fb9e05835f7.jpg';

const TABS = [
  { label: 'Featured', href: 'featured' },
  { label: 'Music',    href: 'tracks'   },
  { label: 'Radio',    href: 'radio'    },
  { label: 'Shows',    href: 'shows'    },
];

// ── Contact modal (preserved from existing) ───────────────────────────────────

function ContactModal({ onClose, contactEmail }: { onClose: () => void; contactEmail: string }) {
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
    setSending(true); setError(null);
    try {
      const { error: dbErr } = await supabase
        .from('contact_submissions')
        .insert({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      if (dbErr) throw dbErr;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }, [name, email, subject, message]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0a0a0a] p-7 sm:p-8"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
        {!sent ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/30 mb-2">Get in Touch</p>
            <h2 className="text-2xl font-black text-white mb-6">Contact</h2>
            {error && <p className="mb-4 text-xs text-red-400/80 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required
                  className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required
                  className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
              </div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
                className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" required rows={4}
                className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors resize-none" />
              <div className="flex items-center justify-between pt-2">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="text-[11px] text-white/25 hover:text-white/50 transition-colors">{contactEmail}</a>
                )}
                <button type="submit" disabled={sending}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white/70 hover:border-white/50 hover:text-white transition-all disabled:opacity-40">
                  <Send className="h-3 w-3" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/8 mb-5">
              <Check className="h-5 w-5 text-white/70" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Message received</h2>
            <p className="text-sm text-white/35">We'll be in touch.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PublicHub() {
  const [releases,     setReleases]     = useState<ReleaseRecord[]>([]);
  const [shows,        setShows]        = useState<Show[]>([]);
  const [activeTab,    setActiveTab]    = useState('Featured');
  const [contactOpen,  setContactOpen]  = useState(false);

  const { settings } = usePublicHubSettings();

  // Data fetching
  useEffect(() => {
    fetchReleases().then(setReleases).catch(() => {});
    void (async () => {
      try {
        const { data } = await supabase
          .from('shows')
          .select('id, venue, date, time, status, city, ticket_url')
          .eq('status', 'upcoming')
          .order('date', { ascending: true });
        if (data) setShows(data as Show[]);
      } catch {}
    })();
  }, []);

  // Active tab tracking on scroll
  useEffect(() => {
    const handler = () => {
      const pos = window.scrollY + 200;
      for (let i = TABS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TABS[i].href);
        if (el && el.offsetTop <= pos) { setActiveTab(TABS[i].label); return; }
      }
      setActiveTab('Featured');
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: 'smooth' });
  }

  // Scroll-driven logo animation (per attached App.tsx)
  const { scrollY } = useScroll();
  const logoScale   = useTransform(scrollY, [0, 400], [6, 1]);
  const logoY       = useTransform(scrollY, [0, 400], [320, 0]);

  // Data
  const artistName     = settings.heroTitle     || ARTIST_INFO.name;
  const artistSubtitle = settings.heroSubtitle  || 'Artist & Producer';
  const heroImage      = settings.heroImage     || HERO_IMAGE;

  const STREAMING_LINKS = [
    { label: 'Spotify',     Icon: SpotifyIcon,    href: settings.spotifyUrl    || 'https://open.spotify.com'  },
    { label: 'Apple Music', Icon: AppleMusicIcon, href: settings.appleMusicUrl || 'https://music.apple.com'  },
    { label: 'SoundCloud',  Icon: SoundCloudIcon, href: settings.soundcloudUrl || ARTIST_INFO.soundcloud_url  },
    { label: 'YouTube',     Icon: YouTubeIcon,    href: settings.youtubeUrl    || 'https://youtube.com'        },
  ];

  const SOCIALS = [
    { id: 'instagram', label: 'Instagram', Icon: InstagramIcon, href: settings.instagramUrl || `https://instagram.com/${(ARTIST_INFO.instagram_handle ?? '').replace('@', '')}` },
    { id: 'tiktok',    label: 'TikTok',    Icon: TikTokIcon,    href: settings.tiktokUrl    || 'https://tiktok.com'  },
    { id: 'youtube',   label: 'YouTube',   Icon: YouTubeIcon,   href: settings.youtubeUrl   || 'https://youtube.com' },
  ];

  const featuredRelease = releases.find(r => r.status === 'released') ?? releases[0] ?? null;

  return (
    <div
      className="relative min-h-screen selection:bg-white/20 selection:text-white"
      style={{ background: '#050505', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Animated sticky logo (per attached App.tsx) ── */}
      <motion.div
        style={{ scale: logoScale, y: logoY }}
        className="fixed top-0 left-0 w-full z-50 flex flex-col items-center py-8 pointer-events-none"
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-black text-4xl tracking-tight text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
        >
          WES.
        </button>
      </motion.div>

      {/* ── Top-right sign-in (above fold only) ── */}
      <div className="fixed top-4 right-4 z-40">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 hover:text-white/60 transition-colors"
        >
          <LogIn className="h-3 w-3" />
          Sign In
        </Link>
      </div>

      {/* ── Page content ── */}
      <main className="relative z-10 pb-32 max-w-2xl mx-auto px-4 pt-10">

        {/* Hero section */}
        <Hero
          imageUrl={heroImage}
          artistName={artistName}
          subtitle={artistSubtitle}
          socials={SOCIALS}
          streamingLinks={STREAMING_LINKS}
        />

        {/* ── Sticky Nav Tabs (per attached App.tsx) ── */}
        <div className="sticky top-24 z-40 py-4 mb-12">
          <div
            className="backdrop-blur-xl border border-white/10 p-1 rounded-full flex gap-1 shadow-2xl max-w-fit mx-auto"
            style={{ background: 'rgba(17,17,17,0.8)' }}
          >
            {TABS.map(tab => (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setActiveTab(tab.label);
                  scrollTo(tab.href);
                }}
                className={`relative px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  activeTab === tab.label ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {activeTab === tab.label && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="space-y-32">
          <section id="featured">
            <FeaturedSection
              release={featuredRelease}
              streamingLinks={STREAMING_LINKS}
            />
          </section>

          <section id="tracks">
            <PopularTracks
              releases={releases}
              featuredTracks={settings.featuredTracks}
              artistName={artistName}
              streamingLinks={STREAMING_LINKS}
            />
          </section>

          <section id="radio">
            <RadioShow
              soundcloudUrl={settings.soundcloudUrl || ARTIST_INFO.soundcloud_url}
              artistName={artistName}
            />
          </section>

          <section id="shows">
            <UpcomingShows shows={shows} />
          </section>

          <EmailCapture />
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer
        artistName={artistName}
        socials={SOCIALS}
        contactEmail={settings.contactEmail}
        onContact={() => setContactOpen(true)}
      />

      {/* ── Contact modal ── */}
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
