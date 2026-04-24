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
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { X, Send, Check } from 'lucide-react';
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

// ─── Hero image default ───────────────────────────────────────────────────────

const HERO_IMAGE = 'https://image2url.com/r2/default/images/1774985821245-8821b2c4-f571-4c19-a33c-6fb9e05835f7.jpg';

// ─── Nav tabs ─────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Featured', href: 'featured' },
  { label: 'Music',    href: 'tracks'   },
  { label: 'Radio',    href: 'radio'    },
  { label: 'Shows',    href: 'shows'    },
];

// ─── Contact modal ─────────────────────────────────────────────────────────────

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

// ─── Main component ─────────────────────────────────────────────────────────────

export function PublicHub() {
  const [releases,    setReleases]    = useState<ReleaseRecord[]>([]);
  const [shows,       setShows]       = useState<Show[]>([]);
  const [activeTab,   setActiveTab]   = useState('Featured');
  const [contactOpen, setContactOpen] = useState(false);

  const { settings } = usePublicHubSettings();

  // Fetch data
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

  // Track active section on scroll
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

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 140, behavior: 'smooth' });
  };

  // Scroll-driven logo (per attached App.tsx)
  const { scrollY } = useScroll();
  const logoScale   = useTransform(scrollY, [0, 400], [6, 1]);
  const logoY       = useTransform(scrollY, [0, 400], [320, 0]);

  // Derived data
  const artistName     = settings.heroTitle    || ARTIST_INFO.name;
  const heroImage      = settings.heroImage    || HERO_IMAGE;
  const featuredRelease = releases.find(r => r.status === 'released') ?? releases[0] ?? null;

  const sp = settings.spotifyUrl    || '';
  const am = settings.appleMusicUrl || '';
  const sc = settings.soundcloudUrl || ARTIST_INFO.soundcloud_url;
  const ig = settings.instagramUrl  || `https://instagram.com/${(ARTIST_INFO.instagram_handle ?? '').replace('@', '')}`;
  const tt = settings.tiktokUrl     || '';
  const yt = settings.youtubeUrl    || '';

  return (
    <div
      className="pub-dark relative min-h-screen selection:bg-white/20 selection:text-white"
      style={{ background: '#050505', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Animated sticky logo ── */}
      <motion.div
        style={{ scale: logoScale, y: logoY }}
        className="fixed top-0 left-0 w-full z-50 flex flex-col items-center py-8 pointer-events-none"
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-headline font-black text-4xl tracking-tighter text-on-surface drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
        >
          WES.
        </button>
      </motion.div>

      {/* ── Page content ── */}
      <main className="relative z-10 pb-32 max-w-2xl mx-auto px-4 pt-10">

        {/* Hero */}
        <Hero
          imageUrl={heroImage}
          spotifyUrl={sp}
          appleMusicUrl={am}
          soundcloudUrl={sc}
          instagramUrl={ig}
          tiktokUrl={tt}
          youtubeUrl={yt}
        />

        {/* Artist name (rendered by animated logo, but keep static fallback below the fold) */}
        <div className="text-center -mt-4 mb-6">
          <h1 className="font-headline text-5xl font-black tracking-tighter text-on-surface">
            {artistName.split(' ')[0].toUpperCase()}.
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-on-surface/30 mt-2">
            {settings.heroSubtitle || 'Artist & Producer'}
          </p>
        </div>

        {/* ── Sticky Nav Tabs ── */}
        <div className="sticky top-24 z-40 py-4 mb-12">
          <div
            className="backdrop-blur-xl border border-outline/10 p-1 rounded-full flex gap-1 shadow-2xl max-w-fit mx-auto"
            style={{ background: 'rgba(17,17,17,0.8)' }}
          >
            {TABS.map(tab => (
              <button
                key={tab.label}
                type="button"
                onClick={() => { setActiveTab(tab.label); scrollTo(tab.href); }}
                className={`relative px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  activeTab === tab.label ? 'text-on-primary' : 'text-on-surface/40 hover:text-on-surface'
                }`}
              >
                {activeTab === tab.label && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
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
              spotifyUrl={sp}
              appleMusicUrl={am}
              soundcloudUrl={sc}
              instagramUrl={ig}
            />
          </section>

          <section id="tracks">
            <PopularTracks
              featuredTracks={settings.featuredTracks}
              spotifyUrl={sp}
            />
          </section>

          <section id="radio">
            <RadioShow soundcloudUrl={sc} />
          </section>

          <section id="shows">
            <UpcomingShows shows={shows} />
          </section>

          <EmailCapture />
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer
        contactEmail={settings.contactEmail}
        pressKitUrl={settings.pressKitUrl}
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
