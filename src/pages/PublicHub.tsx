/**
 * PublicHub — public-facing artist landing page driven by release data.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Check, Send, X } from 'lucide-react';
import { ARTIST_INFO } from '../constants';
import { fetchPublicHubReleases } from '../lib/supabaseData';
import { supabase } from '../lib/supabase';
import { usePublicHubSettings } from '../hooks/usePublicHubSettings';
import type { ReleaseRecord } from '../types/domain';
import Hero from './public/Hero';
import FeaturedSection from './public/FeaturedSection';
import PopularTracks, { type PublicTrack } from './public/PopularTracks';
import RadioShow from './public/RadioShow';
import Footer from './public/Footer';

const HERO_IMAGE = 'https://image2url.com/r2/default/images/1774985821245-8821b2c4-f571-4c19-a33c-6fb9e05835f7.jpg';

const TABS = [
  { label: 'Featured', href: 'featured' },
  { label: 'Tracks', href: 'tracks' },
  { label: 'Radio Mix', href: 'radio' },
];

const HERO_COLUMN_CLASS = 'mx-auto w-full max-w-[24rem] sm:max-w-[28rem]';

function spotifyTrackUrl(release: ReleaseRecord | null | undefined) {
  if (!release) return null;
  return release.distribution?.spotify_url || (release.spotify_track_id ? `https://open.spotify.com/track/${release.spotify_track_id}` : null);
}

function appleTrackUrl(release: ReleaseRecord | null | undefined) {
  return release?.distribution?.apple_music_url || null;
}

function youtubeTrackUrl(release: ReleaseRecord | null | undefined) {
  return release?.distribution?.youtube_url || null;
}

function soundcloudTrackUrl(release: ReleaseRecord | null | undefined) {
  if (!release?.soundcloud_track_id && !release?.distribution?.soundcloud_url) return null;
  if (release.distribution?.soundcloud_url) return release.distribution.soundcloud_url;
  if (release.soundcloud_track_id?.startsWith('http')) return release.soundcloud_track_id;
  const base = (ARTIST_INFO.soundcloud_url || '').replace(/\/$/, '');
  return release.soundcloud_track_id ? `${base}/${release.soundcloud_track_id.replace(/^\//, '')}` : null;
}

function streamTotal(release: ReleaseRecord) {
  return (
    Number(release.performance?.streams?.spotify ?? 0) +
    Number(release.performance?.streams?.apple ?? 0) +
    Number(release.performance?.streams?.soundcloud ?? 0) +
    Number(release.performance?.streams?.youtube ?? 0)
  );
}

function isRadioMix(release: ReleaseRecord) {
  const type = String(release.type ?? '').toLowerCase();
  const title = String(release.title ?? '').toLowerCase();
  return (
    type.includes('mix') ||
    type.includes('episode') ||
    title.includes('radio') ||
    title.includes('mix')
  );
}

function ContactModal({ onClose, contactEmail }: { onClose: () => void; contactEmail: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }, [name, email, subject, message]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/12 bg-[#0a0a0a] p-7 sm:p-8"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <button onClick={onClose} className="absolute right-5 top-5 text-white/30 transition-colors hover:text-white">
          <X className="h-4 w-4" />
        </button>
        {!sent ? (
          <>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/30">Get in Touch</p>
            <h2 className="mb-6 text-2xl font-black text-white">Contact</h2>
            {error && <p className="mb-4 rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400/80">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
              </div>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" required rows={4} className="w-full resize-none border-b border-white/12 bg-transparent py-2.5 text-sm text-white placeholder:text-white/25 focus:border-white/40 focus:outline-none transition-colors" />
              <div className="flex items-center justify-between pt-2">
                {contactEmail && (
                  <a href={`mailto:${contactEmail}`} className="text-[11px] text-white/25 transition-colors hover:text-white/50">{contactEmail}</a>
                )}
                <button type="submit" disabled={sending} className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white/70 transition-all hover:border-white/50 hover:text-white disabled:opacity-40">
                  <Send className="h-3 w-3" />
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/8">
              <Check className="h-5 w-5 text-white/70" />
            </div>
            <h2 className="mb-2 text-xl font-black text-white">Message received</h2>
            <p className="text-sm text-white/35">We'll be in touch.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function PublicHub() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Featured');
  const { settings } = usePublicHubSettings();
  const { scrollY } = useScroll();

  useEffect(() => {
    setReleasesLoading(true);
    fetchPublicHubReleases()
      .then(setReleases)
      .catch(() => {})
      .finally(() => setReleasesLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => {
      const pos = window.scrollY + 180;
      for (let i = TABS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TABS[i].href);
        if (el && el.offsetTop <= pos) {
          setActiveTab(TABS[i].label);
          return;
        }
      }
      setActiveTab('Featured');
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' });
  };

  const releasedReleases = useMemo(
    () => releases.filter((release) => String(release.status ?? '').toLowerCase() === 'released'),
    [releases],
  );

  const latestRelease = useMemo(
    () => releasedReleases[0] ?? releases[0] ?? null,
    [releasedReleases, releases],
  );

  const featuredRelease = useMemo(() => {
    if (!settings.featuredReleaseId) return latestRelease;
    return releases.find((release) => release.id === settings.featuredReleaseId) ?? latestRelease;
  }, [settings.featuredReleaseId, releases, latestRelease]);

  const popularTracks = useMemo<PublicTrack[]>(() => {
    const pool = releasedReleases.length > 0 ? releasedReleases : releases;
    return [...pool]
      .map((release) => ({
        id: release.id,
        title: release.title,
        totalStreams: streamTotal(release),
        spotifyUrl: spotifyTrackUrl(release),
        appleMusicUrl: appleTrackUrl(release),
        soundcloudUrl: soundcloudTrackUrl(release),
        youtubeUrl: youtubeTrackUrl(release),
      }))
      .sort((a, b) => b.totalStreams - a.totalStreams || a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [releasedReleases, releases]);

  const latestRadioMix = useMemo(() => {
    if (settings.radioMixReleaseId) {
      return releases.find((release) => release.id === settings.radioMixReleaseId) ?? null;
    }
    return releases.find((release) => isRadioMix(release)) ?? null;
  }, [releases, settings.radioMixReleaseId]);

  const logoScale = useTransform(scrollY, [0, 320], [4.75, 1]);
  const logoY = useTransform(scrollY, [0, 220], [314, -10]);
  const logoOpacity = useTransform(scrollY, [0, 40], [1, 1]);
  const logoTop = useTransform(scrollY, [0, 180], [8, 30]);
  const tabsTop = useTransform(scrollY, [0, 180], [112, 80]);

  const heroImage = settings.heroImage || HERO_IMAGE;
  const spotifyProfileUrl = settings.spotifyUrl || ARTIST_INFO.spotify_url || (ARTIST_INFO.spotify_ids?.[0] ? `https://open.spotify.com/artist/${ARTIST_INFO.spotify_ids[0]}` : '');
  const appleArtistUrl = settings.appleMusicUrl || ARTIST_INFO.apple_music_url || '';
  const soundcloudProfileUrl = settings.soundcloudUrl || ARTIST_INFO.soundcloud_url || '';
  const instagramUrl = settings.instagramUrl || ARTIST_INFO.instagram_url || (ARTIST_INFO.instagram_handle ? `https://instagram.com/${ARTIST_INFO.instagram_handle.replace('@', '')}` : '');
  const tiktokUrl = settings.tiktokUrl || ARTIST_INFO.tiktok_url || '';
  const youtubeUrl = settings.youtubeUrl || ARTIST_INFO.youtube_url || '';
  const pressKitUrl = settings.pressKitUrl || ARTIST_INFO.press_kit_url || ARTIST_INFO.dropbox_url || '';
  return (
    <div
      className="pub-dark relative min-h-screen selection:bg-white/20 selection:text-white"
      style={{ background: '#050505', color: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <motion.div
        style={{ scale: logoScale, y: logoY, opacity: logoOpacity, top: logoTop }}
        className="pointer-events-none fixed left-0 z-[9999] flex w-full justify-center"
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="pointer-events-auto text-[2.25rem] font-black uppercase leading-none tracking-[0.18em] text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-opacity hover:opacity-80"
        >
          WES.
        </button>
      </motion.div>

      <main className="relative isolate mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6">
        <Hero
          imageUrl={heroImage}
          spotifyUrl={spotifyProfileUrl}
          appleMusicUrl={appleArtistUrl}
          soundcloudUrl={soundcloudProfileUrl}
          instagramUrl={instagramUrl}
          tiktokUrl={tiktokUrl}
          youtubeUrl={youtubeUrl}
        />

        <div className={HERO_COLUMN_CLASS}>
          <motion.div style={{ top: tabsTop }} className="sticky z-[60] mb-10 py-2">
            <div className="mx-auto flex w-full max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-[rgba(22,22,22,0.97)] p-1 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.label);
                    scrollTo(tab.href);
                  }}
                  className={`relative min-w-0 flex-1 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors duration-300 sm:flex-none sm:px-5 ${
                    activeTab === tab.label ? 'text-white' : 'text-white/45 hover:text-white'
                  }`}
                >
                  {activeTab === tab.label && (
                    <motion.div
                      layoutId="publicHubActiveTab"
                      className="absolute inset-0 -z-10 rounded-full bg-white/10"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="space-y-28">
            <section id="featured">
              <FeaturedSection
                release={featuredRelease}
                spotifyUrl={spotifyTrackUrl(featuredRelease)}
                appleMusicUrl={appleTrackUrl(featuredRelease)}
                youtubeUrl={youtubeTrackUrl(featuredRelease)}
                soundcloudUrl={soundcloudTrackUrl(featuredRelease)}
              />
            </section>

            <section id="tracks">
              <PopularTracks tracks={popularTracks} loading={releasesLoading} />
            </section>

            <section id="radio">
              <RadioShow
                release={latestRadioMix}
                soundcloudUrl={soundcloudTrackUrl(latestRadioMix)}
                youtubeUrl={youtubeTrackUrl(latestRadioMix)}
              />
            </section>
          </div>
        </div>
      </main>

      <Footer
        pressKitUrl={pressKitUrl}
      />
    </div>
  );
}
