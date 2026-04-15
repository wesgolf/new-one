import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc3, ImagePlus, Music2, Search } from 'lucide-react';
import { fetchIntegrations, fetchReleases, uploadReleaseArtwork } from '../lib/supabaseData';
import type { IntegrationAccount, ReleaseRecord } from '../types/domain';

function artworkState(url?: string | null) {
  if (!url) return { label: 'Fallback artwork', tone: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (url.includes('supabase')) return { label: 'Stored locally', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  return { label: 'Remote artwork', tone: 'text-slate-700 bg-slate-100 border-slate-200' };
}

export function ReleaseTracker() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [releaseRows, integrationRows] = await Promise.all([fetchReleases(), fetchIntegrations()]);
      setReleases(releaseRows.filter((release) => ['scheduled', 'released', 'ready'].includes(release.status || '')));
      setIntegrations(integrationRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return releases.filter((release) =>
      release.title.toLowerCase().includes(search.toLowerCase()) ||
      (release.artist_name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [releases, search]);

  const syncSummary = useMemo(() => {
    const connected = integrations.filter((item) => item.connection_status === 'connected');
    return connected.map((item) => item.provider).join(', ') || 'No active provider connections';
  }, [integrations]);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Catalog</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Releases</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Metadata-first release tracking with local artwork, dedicated detail pages, and space for future playlisting analytics.
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-border bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Sync lives elsewhere</p>
          <p className="mt-2 text-sm text-text-secondary">Per-page connect and run buttons have been removed. Current provider state: {syncSummary}.</p>
        </div>
      </header>

      <section className="rounded-[2rem] border border-border bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-base pl-11"
            placeholder="Search releases"
          />
        </label>
      </section>

      {loading ? (
        <div className="rounded-[2rem] border border-border bg-white p-8 text-sm text-text-secondary shadow-sm">
          Loading releases...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-border bg-white p-10 text-center shadow-sm">
          <Music2 className="mx-auto h-10 w-10 text-border" />
          <p className="mt-3 text-sm text-text-secondary">No releases match your current filters.</p>
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((release) => {
            const art = artworkState(release.cover_art_url);
            return (
              <article key={release.id} className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-sm">
                <div className="aspect-square bg-slate-100">
                  {release.cover_art_url ? (
                    <img
                      src={release.cover_art_url}
                      alt={release.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe,transparent_60%),linear-gradient(135deg,#111827,#1e293b)] text-white">
                      <Disc3 className="h-16 w-16 opacity-70" />
                    </div>
                  )}
                </div>
                <div className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                        {release.artist_name || 'WES'}
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-text-primary">{release.title}</h3>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${art.tone}`}>
                      {art.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Release date</p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{release.release_date || 'TBD'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</p>
                      <p className="mt-2 text-sm font-semibold capitalize text-text-primary">{release.status || 'Unknown'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">BPM</p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{release.bpm ?? 'Unset'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Key</p>
                      <p className="mt-2 text-sm font-semibold text-text-primary">{release.musical_key || 'Unset'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-border p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Future playlisting slot</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-text-tertiary">Count</p>
                        <p className="font-semibold text-text-primary">{release.playlist_count ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary">Recent adds</p>
                        <p className="font-semibold text-text-primary">{release.recent_playlist_adds ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary">Source</p>
                        <p className="font-semibold text-text-primary">{release.playlist_source_provider || 'TBD'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link to={`/releases/${release.id}`} className="btn-primary">
                      Open Release Page
                    </Link>
                    <label className="btn-secondary cursor-pointer">
                      <ImagePlus className="h-4 w-4" />
                      {uploadingId === release.id ? 'Uploading...' : 'Store Artwork'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setUploadingId(release.id);
                          try {
                            await uploadReleaseArtwork(release.id, file);
                            await load();
                          } finally {
                            setUploadingId(null);
                            event.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
