import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Disc3, Link2, Music2, Radio } from 'lucide-react';
import { fetchReleaseById } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

interface ReleaseDetailProps {
  publicMode?: boolean;
}

export function ReleaseDetail({ publicMode = false }: ReleaseDetailProps) {
  const { releaseId } = useParams();
  const [release, setRelease] = useState<ReleaseRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!releaseId) return;
    setLoading(true);
    fetchReleaseById(releaseId)
      .then(setRelease)
      .finally(() => setLoading(false));
  }, [releaseId]);

  if (loading) {
    return <div className="rounded-[2rem] border border-border bg-white p-8 shadow-sm">Loading release...</div>;
  }

  if (!release) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-10 text-center shadow-sm">
        <Music2 className="mx-auto h-10 w-10 text-border" />
        <h2 className="mt-4 text-2xl font-bold text-text-primary">Release not found</h2>
        <p className="mt-2 text-text-secondary">This release link is missing or no longer available.</p>
      </div>
    );
  }

  const shell = (
    <div className="space-y-8 pb-20">
      <header className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-slate-100 shadow-sm">
          {release.cover_art_url ? (
            <img src={release.cover_art_url} alt={release.title} className="aspect-square h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe,transparent_55%),linear-gradient(135deg,#111827,#1e293b)] text-white">
              <Disc3 className="h-16 w-16 opacity-75" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
              {publicMode ? 'Public release page' : 'Release detail'}
            </p>
            <h1 className="mt-2 text-4xl font-bold text-text-primary">{release.title}</h1>
            <p className="mt-2 text-text-secondary">{release.artist_name || 'WES'}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Release date</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{release.release_date || 'TBD'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">BPM</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{release.bpm ?? 'Unset'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Key</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{release.musical_key || 'Unset'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">ISRC</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{release.isrc || 'Pending'}</p>
            </div>
          </div>

          {release.notes && (
            <div className="rounded-[1.75rem] border border-border bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Notes</p>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{release.notes}</p>
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary">Campaign timeline</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm text-text-secondary">
            <p>Pre-save links, campaign milestones, and release-to-content tie-ins can layer in here later.</p>
            <p>Current route is stable and ready for direct linking.</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary">Metrics placeholders</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-text-tertiary">Playlist count</p>
              <p className="mt-2 font-semibold text-text-primary">{release.playlist_count ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-text-tertiary">Recent adds</p>
              <p className="mt-2 font-semibold text-text-primary">{release.recent_playlist_adds ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-text-tertiary">Source provider</p>
              <p className="mt-2 font-semibold text-text-primary">{release.playlist_source_provider || 'TBD'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-text-tertiary">Notable playlists</p>
              <p className="mt-2 font-semibold text-text-primary">{release.notable_playlists?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-text-tertiary" />
            <h3 className="text-lg font-semibold text-text-primary">Links and assets</h3>
          </div>
          <div className="mt-4 space-y-2 text-sm text-text-secondary">
            <p>Streaming links, press assets, and smart-link variants can plug into this page without changing the route shape.</p>
            {!publicMode && <Link to="/releases" className="inline-flex pt-2 text-sm font-semibold text-primary">Back to releases</Link>}
          </div>
        </div>
      </section>
    </div>
  );

  if (publicMode) {
    return (
      <div className="min-h-screen bg-light-bg px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">{shell}</div>
      </div>
    );
  }

  return shell;
}
