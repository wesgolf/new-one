import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Headphones,
  Link2,
  Loader2,
  Plus,
  Search,
  Share2,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import {
  deleteIdea,
  fetchIdeas,
  fetchIdeaAssets,
  fetchIdeaComments,
} from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { AudioReviewModal } from '../components/AudioReviewModal';
import { IdeaFormModal } from '../components/IdeaFormModal';
import type { IdeaRecord, IdeaAsset, IdeaComment } from '../types/domain';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  demo:        { label: 'Demo',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  review:      { label: 'Review',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:        { label: 'Done',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  idea:        { label: 'Demo',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  production:  { label: 'In Progress', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  mastered:    { label: 'Review',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready:       { label: 'Done',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const CANONICAL_STATUSES = ['demo', 'in_progress', 'review', 'done'] as const;
type SortMode = 'newest' | 'oldest' | 'recently_updated';
const LAST_LOGIN_KEY = 'artist_os_last_login';

export function Ideas() {
  const { canCreateTrack, isManager } = useCurrentUserRole();

  const [ideas,   setIdeas]   = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [collabFilter,  setCollabFilter]  = useState<'all' | 'collab' | 'solo'>('all');
  const [sortMode,      setSortMode]      = useState<SortMode>('recently_updated');
  const [search,        setSearch]        = useState('');

  const [formOpen,    setFormOpen]    = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaRecord | null>(null);

  const [reviewOpen,     setReviewOpen]     = useState(false);
  const [reviewIdea,     setReviewIdea]     = useState<IdeaRecord | null>(null);
  const [reviewAssets,   setReviewAssets]   = useState<IdeaAsset[]>([]);
  const [reviewComments, setReviewComments] = useState<IdeaComment[]>([]);

  const lastLoginAt = useMemo(() => {
    const stored = localStorage.getItem(LAST_LOGIN_KEY);
    return stored ? new Date(stored) : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try { setIdeas(await fetchIdeas()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReview = useCallback(async (idea: IdeaRecord) => {
    const [assets, comments] = await Promise.all([
      fetchIdeaAssets(idea.id),
      fetchIdeaComments(idea.id),
    ]);
    setReviewIdea(idea);
    setReviewAssets(assets);
    setReviewComments(comments);
    setReviewOpen(true);
  }, []);

  const refreshReview = useCallback(async () => {
    if (!reviewIdea) return;
    const [assets, comments] = await Promise.all([
      fetchIdeaAssets(reviewIdea.id),
      fetchIdeaComments(reviewIdea.id),
    ]);
    setReviewAssets(assets);
    setReviewComments(comments);
  }, [reviewIdea]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this idea? This cannot be undone.')) return;
    await deleteIdea(id);
    load();
  }, [load]);

  const handleShareLink = useCallback((idea: IdeaRecord) => {
    const slug = idea.share_slug || idea.id;
    const url  = `${window.location.origin}/collab/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    alert('Share link copied!');
  }, []);

  const filtered = useMemo(() => {
    let rows = [...ideas];
    if (statusFilter !== 'all') rows = rows.filter((i) => i.status === statusFilter);
    if (collabFilter === 'collab') rows = rows.filter((i) => i.is_collab);
    if (collabFilter === 'solo')   rows = rows.filter((i) => !i.is_collab);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((i) =>
        i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
      );
    }
    if (sortMode === 'newest')           rows.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());
    if (sortMode === 'oldest')           rows.sort((a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime());
    if (sortMode === 'recently_updated') rows.sort((a, b) => new Date(b.updated_at ?? '').getTime() - new Date(a.updated_at ?? '').getTime());
    return rows;
  }, [ideas, statusFilter, collabFilter, sortMode, search]);

  const statusCounts = useMemo(
    () => CANONICAL_STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = ideas.filter((i) => i.status === s || (s === 'demo' && i.status === 'idea')).length;
      return acc;
    }, {}),
    [ideas]
  );

  const isNew = (idea: IdeaRecord) =>
    !!lastLoginAt && !!idea.created_at && new Date(idea.created_at) > lastLoginAt;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Studio</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Track Ideas</h1>
          <p className="mt-2 max-w-xl text-text-secondary">
            Audio-first creative pipeline — demos, WIPs, and collaboration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/collab" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Portal
          </a>
          {canCreateTrack && (
            <button type="button" className="btn-primary" onClick={() => { setEditingIdea(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Idea
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CANONICAL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all',
              statusFilter === s
                ? 'border-brand bg-violet-50 ring-1 ring-violet-200 shadow-sm'
                : 'border-border bg-white shadow-sm hover:border-violet-200'
            )}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              {STATUS_META[s].label}
            </p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{statusCounts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas…"
            className="input-base pl-10"
          />
        </div>
        <select className="input-base w-auto" value={collabFilter} onChange={(e) => setCollabFilter(e.target.value as any)}>
          <option value="all">All types</option>
          <option value="collab">Collab only</option>
          <option value="solo">Solo only</option>
        </select>
        <select className="input-base w-auto" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
          <option value="recently_updated">Recently updated</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {(statusFilter !== 'all' || collabFilter !== 'all' || search) && (
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setCollabFilter('all'); setSearch(''); }}
            className="btn-secondary flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-border py-24 text-center">
          <Sparkles className="h-12 w-12 text-border" />
          <p className="text-sm text-text-secondary">
            {search || statusFilter !== 'all' || collabFilter !== 'all'
              ? 'No ideas match these filters.'
              : canCreateTrack
              ? 'No ideas yet — create your first one!'
              : 'No ideas to display yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((idea) => {
            const meta   = STATUS_META[idea.status] ?? STATUS_META.demo;
            const _isNew = isNew(idea);
            return (
              <article
                key={idea.id}
                className="group flex flex-col rounded-[1.75rem] border border-border bg-white shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
              >
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', meta.cls)}>
                        {meta.label}
                      </span>
                      {idea.is_collab && (
                        <span className="flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                          <Users className="h-2.5 w-2.5" />Collab
                        </span>
                      )}
                      {idea.is_public && (
                        <span className="flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600">
                          <ExternalLink className="h-2.5 w-2.5" />Public
                        </span>
                      )}
                      {_isNew && (
                        <span className="animate-pulse rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {(canCreateTrack || isManager) && (
                        <button
                          type="button"
                          onClick={() => { setEditingIdea(idea); setFormOpen(true); }}
                          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-brand"
                          aria-label="Edit"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2.121 2.121 0 113 3L12 16H9v-3z" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleShareLink(idea)}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-brand"
                        aria-label="Copy share link"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      {canCreateTrack && (
                        <button
                          type="button"
                          onClick={() => handleDelete(idea.id)}
                          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Delete"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-text-primary">{idea.title}</h3>
                  {idea.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{idea.description}</p>
                  )}
                  {idea.created_at && (
                    <p className="mt-3 text-xs text-text-muted">
                      {format(parseISO(idea.created_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="border-t border-border px-5 py-3">
                  <button
                    type="button"
                    onClick={() => openReview(idea)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white transition-all hover:bg-violet-700"
                  >
                    <Headphones className="h-4 w-4" />
                    Open Review
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <IdeaFormModal
        open={formOpen}
        idea={editingIdea}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />
      <AudioReviewModal
        open={reviewOpen}
        idea={reviewIdea}
        assets={reviewAssets}
        comments={reviewComments}
        onClose={() => setReviewOpen(false)}
        onSaved={refreshReview}
      />
    </div>
  );
}
