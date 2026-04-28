import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Disc3,
  Edit2,
  Loader2,
  Music,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { fetchReleaseList, deleteRelease } from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { subscribeAssistantActions } from '../lib/commandBus';
import { useAssistantPageContext } from '../hooks/useAssistantPageContext';
import { ReleaseFormModal } from '../components/ReleaseFormModal';
import type { ReleaseRecord } from '../types/domain';

// ── Status meta ───────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; badge: string }> = {
  unreleased: {
    label: 'Unreleased',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
  },
  scheduled: {
    label: 'Scheduled',
    badge: 'border-orange-100 bg-orange-50 text-orange-600',
  },
  released: {
    label: 'Released',
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  },
  // legacy back-compat
  idea:       { label: 'Unreleased', badge: 'border-slate-200 bg-slate-100 text-slate-600' },
  production: { label: 'Unreleased', badge: 'border-slate-200 bg-slate-100 text-slate-600' },
  mastered:   { label: 'Unreleased', badge: 'border-slate-200 bg-slate-100 text-slate-600' },
  ready:      { label: 'Unreleased', badge: 'border-slate-200 bg-slate-100 text-slate-600' },
};

function statusMeta(s: string | null | undefined) {
  return STATUS_META[s ?? ''] ?? STATUS_META['unreleased'];
}

// ── Cover art with fallback ───────────────────────────────────────────────────

function CoverArt({ url, title }: { url?: string | null; title: string }) {
  const [broken, setBroken] = useState(false);

  if (url && !broken) {
    return (
      <img
        src={url}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_60%),linear-gradient(135deg,#0f172a,#1e293b)]">
      <Disc3 className="h-14 w-14 text-white/30" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReleaseTracker() {
  const { canCreateTrack } = useCurrentUserRole();

  const [releases,       setReleases]       = useState<ReleaseRecord[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [sortBy,         setSortBy]         = useState<'date' | 'title'>('date');
  const [search,         setSearch]         = useState('');
  const [formOpen,       setFormOpen]       = useState(false);
  const [editingRelease, setEditingRelease] = useState<ReleaseRecord | null>(null);
  const [deleteId,       setDeleteId]       = useState<string | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReleases(await fetchReleaseList());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Register page context + handle assistant open_release action
  useAssistantPageContext('releases');
  useEffect(() => {
    return subscribeAssistantActions((action) => {
      if (action.type === 'open_release') {
        setEditingRelease(null);
        setFormOpen(true);
      }
    });
  }, []);

  const filtered = useMemo(() => {
    return releases
      .filter((r) => statusFilter === 'all' || (r.status ?? 'unreleased') === statusFilter)
      .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        const ad = a.release_date ?? '0000-00-00';
        const bd = b.release_date ?? '0000-00-00';
        return bd.localeCompare(ad);
      });
  }, [releases, statusFilter, sortBy, search]);

  const counts = useMemo(() => ({
    all:        releases.length,
    unreleased: releases.filter((r) => !r.status || ['unreleased','idea','production','mastered','ready'].includes(r.status)).length,
    scheduled:  releases.filter((r) => r.status === 'scheduled').length,
    released:   releases.filter((r) => r.status === 'released').length,
  }), [releases]);

  const openNew = () => { setEditingRelease(null); setFormOpen(true); };
  const openEdit = (r: ReleaseRecord, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setEditingRelease(r); setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteRelease(deleteId);
      setReleases((prev) => prev.filter((r) => r.id !== deleteId));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-10">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Releases</h2>
          <p className="mt-1 text-text-secondary">Your catalogue, metadata, and playlisting intel.</p>
        </div>
        {canCreateTrack && (
          <button
            onClick={openNew}
            className="btn-primary shadow-lg shadow-blue-200 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New release
          </button>
        )}
      </header>

      {/* ── Stat tabs ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['all', 'unreleased', 'scheduled', 'released'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-[1.5rem] border p-4 text-left transition-all',
              statusFilter === s
                ? 'border-blue-200 bg-blue-50 shadow-sm'
                : 'border-slate-100 bg-white hover:border-slate-200',
            )}
          >
            <p className={cn(
              'text-[10px] font-bold uppercase tracking-widest',
              statusFilter === s ? 'text-blue-600' : 'text-slate-400',
            )}>
              {s}
            </p>
            <p className={cn(
              'mt-1.5 text-2xl font-bold',
              statusFilter === s ? 'text-blue-700' : 'text-slate-900',
            )}>
              {counts[s]}
            </p>
          </button>
        ))}
      </div>

      {/* ── Search + sort ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search releases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="date">Newest first</option>
          <option value="title">Alphabetical</option>
        </select>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-24 text-center">
          <Music className="mb-4 h-12 w-12 text-slate-200" />
          <p className="font-medium text-slate-500">No releases match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((release, i) => {
            const meta = statusMeta(release.status);
            return (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-xl"
              >
                {/* Artwork */}
                <Link to={`/releases/${release.id}`} className="relative block aspect-square overflow-hidden">
                  <CoverArt url={release.cover_art_url} title={release.title} />

                  {/* Hover actions */}
                  <div className="absolute right-3 top-3 z-10 flex translate-y-1 gap-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    {canCreateTrack && (
                      <button
                        onClick={(e) => openEdit(release, e)}
                        className="rounded-xl bg-white/90 p-2 text-slate-700 shadow backdrop-blur-sm transition-colors hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {canCreateTrack && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(release.id); }}
                        className="rounded-xl bg-white/90 p-2 text-slate-700 shadow backdrop-blur-sm transition-colors hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className={cn(
                      'rounded-xl border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md',
                      meta.badge,
                    )}>
                      {meta.label}
                    </span>
                  </div>
                </Link>

                {/* Card body */}
                <div className="flex flex-1 flex-col p-5">
                  <Link
                    to={`/releases/${release.id}`}
                    className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors hover:text-blue-600"
                  >
                    {release.title}
                  </Link>

                  {release.artist_name && (
                    <p className="mt-0.5 text-xs text-slate-500">{release.artist_name}</p>
                  )}

                  {/* Release date */}
                  {release.release_date && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(release.release_date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </div>
                  )}

                  {/* BPM + Key — separate chips */}
                  {(release.bpm != null || release.musical_key) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {release.bpm != null && (
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {release.bpm} BPM
                        </span>
                      )}
                      {release.musical_key && (
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {release.musical_key}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ISRC */}
                  {release.isrc && (
                    <p className="mt-2 text-[10px] font-mono text-slate-400">{release.isrc}</p>
                  )}

                  {/* Playlisting teaser */}
                  {(release.playlist_count ?? 0) > 0 && (
                    <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2">
                      <p className="text-[10px] font-bold text-blue-600">
                        In {release.playlist_count} playlist{(release.playlist_count ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <Link
                      to={`/releases/${release.id}`}
                      className="block w-full rounded-xl bg-slate-900 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-blue-600"
                    >
                      Open release
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <Trash2 className="mb-4 h-10 w-10 text-rose-500" />
            <h3 className="text-xl font-bold text-slate-900">Delete this release?</h3>
            <p className="mt-2 text-sm text-slate-500">This cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-bold text-white shadow shadow-rose-200 transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form modal ──────────────────────────────────────────────── */}
      <ReleaseFormModal
        open={formOpen}
        release={editingRelease}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
