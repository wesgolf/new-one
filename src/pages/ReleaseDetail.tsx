import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Disc3,
  Edit2,
  ExternalLink,
  FileAudio,
  Layers,
  ListMusic,
  Loader2,
  Music2,
  Rocket,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fetchReleaseById } from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { ReleaseFormModal } from '../components/ReleaseFormModal';
import type { ReleaseRecord } from '../types/domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

function spotifyUrl(id: string | null | undefined) {
  return id ? `https://open.spotify.com/track/${id}` : null;
}

function soundcloudUrl(id: string | null | undefined) {
  return id ? `https://soundcloud.com/wes-music/${id}` : null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function IsrcChip({ isrc }: { isrc: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(isrc).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
    >
      <div>
        <p className="text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">ISRC</p>
        <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{isrc}</p>
      </div>
      {copied
        ? <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
        : <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-400" />
      }
    </button>
  );
}

interface StreamingLinkProps {
  label: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}

function StreamingLink({ label, href, color, icon }: StreamingLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md',
        color,
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
      <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

// ═══ Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  released:   'border-emerald-100 bg-emerald-50 text-emerald-700',
  scheduled:  'border-orange-100 bg-orange-50  text-orange-600',
  unreleased: 'border-slate-200  bg-slate-100  text-slate-600',
};

function statusBadge(s: string | null | undefined) {
  const key = s === 'scheduled' ? 'scheduled' : s === 'released' ? 'released' : 'unreleased';
  return STATUS_BADGE[key];
}

function statusLabel(s: string | null | undefined) {
  if (s === 'released') return 'Released';
  if (s === 'scheduled') return 'Scheduled';
  return 'Unreleased';
}

// ── Future-ready placeholder card ─────────────────────────────────────────────

function FuturePlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
        <span className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Coming soon
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

// ═══ Main page ════════════════════════════════════════════════════════════════

interface ReleaseDetailProps {
  /** When true, renders as a public microsite without auth controls */
  publicMode?: boolean;
}

export function ReleaseDetail({ publicMode = false }: ReleaseDetailProps) {
  const { releaseId } = useParams<{ releaseId: string }>();
  const navigate = useNavigate();
  const { canCreateTrack } = useCurrentUserRole();

  const [release,    setRelease]    = useState<ReleaseRecord | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [formOpen,   setFormOpen]   = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    if (!releaseId) return;
    setLoading(true);
    try {
      setRelease(await fetchReleaseById(releaseId));
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => { load(); }, [load]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!release) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-100 bg-white p-16 text-center shadow-sm">
        <Music2 className="h-12 w-12 text-slate-200" />
        <h2 className="mt-6 text-2xl font-bold text-slate-900">Release not found</h2>
        <p className="mt-2 text-slate-500">This release link is missing or no longer available.</p>
        {!publicMode && (
          <Link to="/releases" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to releases
          </Link>
        )}
      </div>
    );
  }

  // ── Build streaming links from stored IDs ──────────────────────────────────

  const spotifyLink    = spotifyUrl(release.spotify_track_id);
  const soundcloudLink = soundcloudUrl(release.soundcloud_track_id);
  const hasStreaming   = !!(spotifyLink || soundcloudLink);

  // ── Page content ──────────────────────────────────────────────────────────

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-20"
    >
      {/* ── Nav bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {!publicMode ? (
          <button
            onClick={() => navigate('/releases')}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Releases
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            {linkCopied ? 'Copied' : 'Share'}
          </button>
          {!publicMode && canCreateTrack && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-blue-600"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">

        {/* Cover art */}
        <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-200">
          {release.cover_art_url ? (
            <img
              src={release.cover_art_url}
              alt={release.title}
              className="aspect-square h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_60%),linear-gradient(135deg,#0f172a,#1e293b)]">
              <Disc3 className="h-24 w-24 text-white/20" />
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute bottom-4 left-4">
            <span className={cn(
              'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md',
              statusBadge(release.status),
            )}>
              {statusLabel(release.status)}
            </span>
          </div>
        </div>

        {/* Meta column */}
        <div className="flex flex-col justify-center gap-6">

          {/* Title + artist */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              {publicMode ? 'Release' : 'Release detail'}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
              {release.title}
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-500">
              {release.artist_name || 'WES'}
            </p>
          </div>

          {/* Meta chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaChip
              label="Release date"
              value={
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {fmtDate(release.release_date)}
                </span>
              }
            />
            <MetaChip label="BPM" value={release.bpm != null ? `${release.bpm} BPM` : '—'} />
            <MetaChip label="Key" value={release.musical_key || '—'} />
            {release.isrc
              ? <IsrcChip isrc={release.isrc} />
              : <MetaChip label="ISRC" value="Pending" />
            }
          </div>

          {/* Notes */}
          {release.notes && (
            <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Notes</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{release.notes}</p>
            </div>
          )}
        </div>
      </header>

      {/* ── Streaming links ───────────────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Music2 className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">Streaming links</h2>
        </div>

        {hasStreaming ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {spotifyLink && (
              <StreamingLink
                href={spotifyLink}
                label="Spotify"
                color="border-[#1DB954]/20 bg-[#1DB954]/5 text-[#158a3e] hover:border-[#1DB954]/40"
                icon="🎵"
              />
            )}
            {soundcloudLink && (
              <StreamingLink
                href={soundcloudLink}
                label="SoundCloud"
                color="border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300"
                icon="🔊"
              />
            )}
            {/* Apple Music / YouTube — no stored ID fields yet */}
            {(['Apple Music', 'YouTube'] as const).map((platform) => (
              <div
                key={platform}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5"
              >
                <span className="text-xl">{platform === 'Apple Music' ? '🎶' : '▶️'}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-slate-400">{platform}</span>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Not linked</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Spotify',     icon: '🎵' },
              { label: 'SoundCloud',  icon: '🔊' },
              { label: 'Apple Music', icon: '🎶' },
              { label: 'YouTube',     icon: '▶️' },
            ].map(({ label, icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5"
              >
                <span className="text-xl">{icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-slate-400">{label}</span>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">Not linked</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Metrics + Playlisting ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Playlisting intel */}
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ListMusic className="h-4.5 w-4.5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">Playlisting intel</h2>
            {release.playlist_source_provider && (
              <span className="ml-auto rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                via {release.playlist_source_provider}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{release.playlist_count ?? 0}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Playlists</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{release.recent_playlist_adds ?? 0}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Recent adds</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{release.notable_playlists?.length ?? 0}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">Notable</p>
            </div>
          </div>

          {(release.notable_playlists?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-2">
              {release.notable_playlists!.map((pl) => (
                <li
                  key={pl}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700"
                >
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {pl}
                </li>
              ))}
            </ul>
          )}

          {(release.playlist_count ?? 0) === 0 && (
            <p className="mt-4 text-xs text-slate-400">
              Playlist data will appear once a provider (Soundcharts / Songstats) is connected.
            </p>
          )}
        </section>

        {/* Streaming metrics */}
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4.5 w-4.5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-900">Streaming metrics</h2>
            <span className="ml-auto rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Coming soon
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Total streams',    icon: '🎧' },
              { label: 'Saves',            icon: '❤️' },
              { label: 'Spotify listeners', icon: '📊' },
              { label: 'Apple streams',    icon: '🎶' },
            ].map(({ label, icon }) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm">{icon}</p>
                <p className="mt-2 text-xl font-bold text-slate-300">—</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Real-time metrics connect when Songstats integration is configured.
          </p>
        </section>
      </div>

      {/* ── Assets & media ────────────────────────────────────────────────── */}
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <FileAudio className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">Assets & media</h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Cover art',          desc: 'High-res artwork file' },
            { label: 'Master audio',       desc: 'WAV / AIFF master file' },
            { label: 'Stems',              desc: 'Stem bundle for remixers' },
            { label: 'Short-form clips',   desc: '15s and 30s exports' },
            { label: 'Press photos',       desc: 'Artist press kit imagery' },
            { label: 'Waveform video',     desc: 'Visual for YouTube / social' },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3.5 rounded-2xl border border-dashed border-slate-100 bg-slate-50 px-4 py-3.5"
            >
              <Layers className="h-5 w-5 shrink-0 text-slate-300" />
              <div>
                <p className="text-xs font-semibold text-slate-600">{label}</p>
                <p className="text-[11px] text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Asset management and upload will be available when the Release Assets module ships.
        </p>
      </section>

      {/* ── Future-ready placeholders ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FuturePlaceholder
          icon={<Rocket className="h-4.5 w-4.5" />}
          title="Pre-save & smart links"
          description="Collect pre-saves before release day. Smart links auto-route fans to their preferred DSP from a single shareable URL."
        />
        <FuturePlaceholder
          icon={<CalendarDays className="h-4.5 w-4.5" />}
          title="Campaign timeline"
          description="Plan and track every release-day milestone — content goes live, pitching deadlines, press embargo lift, and post-release push windows."
        />
        <FuturePlaceholder
          icon={<Share2 className="h-4.5 w-4.5" />}
          title="Press kit & public mode"
          description="Generate a public-facing release page with embeds, bio, and press assets — no login required for label contacts or journalists."
        />
      </div>
    </motion.div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (publicMode) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">{content}</div>
      </div>
    );
  }

  return (
    <>
      {content}

      {/* Edit modal — internal only */}
      <ReleaseFormModal
        open={formOpen}
        release={release}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </>
  );
}
