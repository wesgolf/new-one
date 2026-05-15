import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, ExternalLink, MessageCircle, Music2, Play, Repeat2, Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { fetchReleases, fetchCatalogWeeklyTotals } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

type Source = 'all' | 'spotify' | 'soundcloud' | 'both';
type SortMode = 'newest' | 'oldest' | 'most_played';
type TrackType = 'all' | 'original' | 'mashup' | 'radio_mix';

function inferTrackType(release: ReleaseRecord): 'original' | 'mashup' | 'radio_mix' {
  const t = (release.type ?? '').toLowerCase();
  if (t === 'mashup') return 'mashup';
  if (t === 'radio_mix' || t === 'radio mix' || t === 'mix') return 'radio_mix';
  const title = release.title.toLowerCase();
  if (title.includes('on track') || title.includes('guest mix') || title.includes('episode') || title.includes('radio show')) return 'radio_mix';
  if (title.includes('mashup') || title.includes(' vs ') || title.includes(' vs. ')) return 'mashup';
  return 'original';
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function PreviewButton({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all',
        playing
          ? 'bg-white text-slate-900'
          : 'bg-black/60 text-white hover:bg-black/80',
      )}
      title={playing ? 'Stop preview' : 'Play preview'}
    >
      {playing ? (
        <span className="flex gap-0.5">
          <span className="h-3 w-0.5 animate-pulse rounded-full bg-current" />
          <span className="h-3 w-0.5 animate-pulse rounded-full bg-current delay-75" />
          <span className="h-3 w-0.5 animate-pulse rounded-full bg-current delay-150" />
        </span>
      ) : (
        <Play className="h-4 w-4 translate-x-px" />
      )}
    </button>
  );
}

function PopularityBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-6 text-right text-[10px] font-bold text-slate-500">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color, delta }: { label: string; value: number; color: string; delta?: number | null }) {
  return (
    <div className="glass-card rounded-2xl px-5 py-3 text-center min-w-[90px]">
      <p className={cn('text-[10px] font-bold uppercase tracking-widest', color)}>{label}</p>
      <p className="text-2xl font-heading font-bold text-text-primary">{formatPlays(value)}</p>
      {delta != null && (
        <p className={cn('mt-0.5 text-[10px] font-semibold', delta >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
          {delta >= 0 ? '+' : ''}{formatPlays(delta)} wk
        </p>
      )}
    </div>
  );
}

function TrackCard({ track, onDashboard }: { track: ReleaseRecord; onDashboard: () => void }) {
  const spotifyUrl = track.distribution?.spotify_url ?? null;
  const soundcloudUrl = track.distribution?.soundcloud_url ?? track.soundcloud_track_id ?? null;
  const primaryUrl = spotifyUrl ?? soundcloudUrl ?? '#';
  const hasSpotify = !!spotifyUrl;
  const hasSoundCloud = !!soundcloudUrl;

  const scPlays    = track.soundcloud_stats?.plays    ?? null;
  const scLikes    = track.soundcloud_stats?.likes    ?? null;
  const scReposts  = track.soundcloud_stats?.reposts  ?? null;
  const scComments = track.soundcloud_stats?.comments ?? null;
  const scDownloads = track.soundcloud_stats?.downloads ?? null;
  const scDuration = track.soundcloud_stats?.duration_ms ?? null;
  const scGenre    = track.soundcloud_stats?.genre    ?? null;

  const spPopularity = track.spotify_stats?.popularity ?? null;
  const spExplicit   = track.spotify_stats?.explicit   ?? false;
  const spPreview    = track.spotify_stats?.preview_url ?? null;
  const spDuration   = track.spotify_stats?.duration_ms ?? null;
  const spAlbum      = track.spotify_stats?.album_name  ?? null;
  const spStreams     = track.performance?.streams?.spotify ?? null;

  const durationMs = scDuration ?? spDuration ?? null;
  const genre = scGenre ?? null;

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted cursor-pointer"
      onClick={onDashboard}
    >
      {/* Artwork */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
          {track.cover_art_url ? (
            <img src={track.cover_art_url} alt={track.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className="h-12 w-12 text-slate-300" />
            </div>
          )}

          {/* Top-left: platform badges */}
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {hasSpotify && (
              <span className="rounded-full border border-green-200 bg-green-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700 backdrop-blur-sm">
                Spotify
              </span>
            )}
            {hasSoundCloud && (
              <span className="rounded-full border border-orange-200 bg-orange-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 backdrop-blur-sm">
                SoundCloud
              </span>
            )}
          </div>

          {/* Top-right: explicit badge */}
          {spExplicit && (
            <div className="absolute right-2.5 top-2.5">
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">E</span>
            </div>
          )}

          {/* Bottom-right: preview button */}
          {spPreview && <PreviewButton url={spPreview} />}

          {/* Bottom-left: duration */}
          {durationMs != null && durationMs > 0 && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(durationMs)}
              </span>
            </div>
          )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4 gap-3">
        {/* Title + external link */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-heading font-semibold text-text-primary leading-tight">{track.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {track.release_date && (
                <p className="text-xs text-slate-400">{format(parseISO(track.release_date), 'MMM d, yyyy')}</p>
              )}
              {spAlbum && track.title !== spAlbum && (
                <p className="text-xs text-slate-400 truncate max-w-[120px]" title={spAlbum}>{spAlbum}</p>
              )}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-300" />
        </div>

        {/* Genre */}
        {genre && (
          <span className="self-start rounded-full bg-brand-dim px-2.5 py-0.5 text-[11px] font-semibold text-brand">{genre}</span>
        )}

        {/* SoundCloud stats */}
        {(scPlays != null || scLikes != null || scReposts != null || scComments != null || scDownloads != null) && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">SoundCloud</p>
            <div className="grid grid-cols-2 gap-1.5">
              {scPlays != null && (
                <div className="rounded-xl bg-orange-500/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Plays</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(scPlays)}</p>
                </div>
              )}
              {scLikes != null && (
                <div className="rounded-xl bg-border/40 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Likes</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(scLikes)}</p>
                </div>
              )}
              {scReposts != null && scReposts > 0 && (
                <div className="rounded-xl bg-border/40 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Reposts</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(scReposts)}</p>
                </div>
              )}
              {scComments != null && scComments > 0 && (
                <div className="rounded-xl bg-border/40 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Comments</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(scComments)}</p>
                </div>
              )}
              {scDownloads != null && scDownloads > 0 && (
                <div className="rounded-xl bg-border/40 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Downloads</p>
                  <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(scDownloads)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spotify stats */}
        {(spStreams != null || spPopularity != null) && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">Spotify</p>
            {spStreams != null && (
              <div className="rounded-xl bg-cta/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-cta">Streams</p>
                <p className="mt-0.5 text-sm font-bold text-text-primary">{formatPlays(spStreams)}</p>
              </div>
            )}
            {spPopularity != null && (
              <div className="px-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Popularity</p>
                <PopularityBar value={spPopularity} />
              </div>
            )}
          </div>
        )}

      </div>
    </article>
  );
}

export function ReleasedTracks() {
  const [tracks, setTracks] = useState<ReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<Source>('all');
  const [trackType, setTrackType] = useState<TrackType>('all');
  const [year, setYear] = useState<string>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [weekAgo, setWeekAgo] = useState<{ spotify: number; soundcloud: number; youtube: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReleases()
      .then(setTracks)
      .finally(() => setLoading(false));
    fetchCatalogWeeklyTotals().then(setWeekAgo).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let rows = [...tracks];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((t) => t.title.toLowerCase().includes(q));
    }

    if (source === 'spotify') rows = rows.filter((t) => !!t.distribution?.spotify_url);
    if (source === 'soundcloud') rows = rows.filter((t) => !!(t.distribution?.soundcloud_url ?? t.soundcloud_track_id));
    if (source === 'both') rows = rows.filter((t) => !!t.distribution?.spotify_url && !!(t.distribution?.soundcloud_url ?? t.soundcloud_track_id));
    if (trackType !== 'all') rows = rows.filter((t) => inferTrackType(t) === trackType);
    if (year !== 'all') rows = rows.filter((t) => t.release_date?.startsWith(year));

    if (sort === 'newest') rows.sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));
    if (sort === 'oldest') rows.sort((a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? ''));
    if (sort === 'most_played') {
      rows.sort((a, b) => {
        const pa = (a.soundcloud_stats?.plays ?? a.performance?.streams?.soundcloud ?? 0);
        const pb = (b.soundcloud_stats?.plays ?? b.performance?.streams?.soundcloud ?? 0);
        return pb - pa;
      });
    }

    return rows;
  }, [tracks, search, source, sort, trackType, year]);

  const availableYears = useMemo(() => {
    const yrs = [...new Set(tracks.map(t => t.release_date?.slice(0, 4)).filter(Boolean) as string[])];
    return yrs.sort((a, b) => b.localeCompare(a));
  }, [tracks]);

  const totals = useMemo(() => tracks.reduce((acc, t) => ({
    spotify:    acc.spotify    + (t.performance?.streams?.spotify    ?? 0),
    soundcloud: acc.soundcloud + (t.soundcloud_stats?.plays          ?? t.performance?.streams?.soundcloud ?? 0),
    youtube:    acc.youtube    + (t.performance?.streams?.youtube     ?? t.youtube_stats?.views ?? 0),
  }), { spotify: 0, soundcloud: 0, youtube: 0 }), [tracks]);

  const totalPlays = totals.spotify + totals.soundcloud + totals.youtube;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Music</p>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary">Released Tracks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your catalog from Spotify and SoundCloud.{' '}
            <a href="/settings" className="font-medium text-blue-600 hover:underline">Sync in Settings →</a>
          </p>
        </div>
        {tracks.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatCard label="Tracks" value={tracks.length} color="text-text-muted" />
            <StatCard label="All Plays" value={totalPlays} color="text-text-muted"
              delta={weekAgo ? totalPlays - (weekAgo.spotify + weekAgo.soundcloud + weekAgo.youtube) : null} />
            {totals.spotify > 0 && (
              <StatCard label="Spotify" value={totals.spotify} color="text-[#1DB954]"
                delta={weekAgo ? totals.spotify - weekAgo.spotify : null} />
            )}
            {totals.soundcloud > 0 && (
              <StatCard label="SoundCloud" value={totals.soundcloud} color="text-orange-500"
                delta={weekAgo ? totals.soundcloud - weekAgo.soundcloud : null} />
            )}
            {totals.youtube > 0 && (
              <StatCard label="YouTube" value={totals.youtube} color="text-[#FF0000]"
                delta={weekAgo ? totals.youtube - weekAgo.youtube : null} />
            )}
          </div>
        )}
      </header>

      {/* Filter bar */}
      {!loading && tracks.length > 0 && (
        <section className="glass-card flex flex-col gap-3 rounded-[1.75rem] p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks…"
                className="input-base pl-10"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-text-muted">
              <span className="font-semibold text-text-primary">{filtered.length}</span>
              <span>tracks</span>
            </div>
            <select
              className="input-base w-auto cursor-pointer text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="most_played">Most played</option>
            </select>
            {(search || source !== 'all' || trackType !== 'all' || year !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSource('all'); setTrackType('all'); setYear('all'); }}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
          {/* Source pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'soundcloud', 'spotify', 'both'] as Source[]).map((s) => {
              const labels: Record<Source, string> = { all: 'All', spotify: 'Spotify', soundcloud: 'SoundCloud', both: 'On both' };
              return (
                <button key={s} type="button" onClick={() => setSource(s)}
                  className={cn('rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                    source === s ? 'border-brand bg-brand text-white shadow-sm' : 'border-border bg-background text-text-muted hover:border-brand/40 hover:text-text-primary'
                  )}
                >{labels[s]}</button>
              );
            })}
          </div>
          {/* Track type pills */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-2">
            <span className="self-center text-[10px] font-bold uppercase tracking-widest text-text-muted mr-1">Type</span>
            {([['all', 'All'], ['original', 'Originals'], ['mashup', 'Mashups'], ['radio_mix', 'Radio Mixes']] as [TrackType, string][]).map(([t, label]) => (
              <button key={t} type="button" onClick={() => setTrackType(t)}
                className={cn('rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                  trackType === t ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-border bg-background text-text-muted hover:border-indigo-300 hover:text-text-primary'
                )}
              >{label}</button>
            ))}
          </div>
          {/* Year pills */}
          {availableYears.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-2">
              <span className="self-center text-[10px] font-bold uppercase tracking-widest text-text-muted mr-1">Year</span>
              <button type="button" onClick={() => setYear('all')}
                className={cn('rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                  year === 'all' ? 'border-slate-700 bg-slate-700 text-white shadow-sm' : 'border-border bg-background text-text-muted hover:border-slate-400 hover:text-text-primary'
                )}
              >All</button>
              {availableYears.map(y => (
                <button key={y} type="button" onClick={() => setYear(y)}
                  className={cn('rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                    year === y ? 'border-slate-700 bg-slate-700 text-white shadow-sm' : 'border-border bg-background text-text-muted hover:border-slate-400 hover:text-text-primary'
                  )}
                >{y}</button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border">
              <div className="skeleton aspect-square w-full" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-10 w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-border py-24 text-center">
          <Music2 className="h-12 w-12 text-border" />
          <p className="text-sm text-text-secondary">No released tracks yet.</p>
          <a href="/settings" className="text-sm font-medium text-blue-600 hover:underline">
            Go to Settings to sync your catalog →
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-border py-16 text-center">
          <p className="text-sm text-text-secondary">No tracks match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((track) => (
            <TrackCard key={track.id} track={track} onDashboard={() => navigate(`/music/released/${track.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
