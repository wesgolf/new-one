import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Loader2,
  Plus,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { subscribeIdeaAudioAnalysis } from '../lib/ideaAudioAnalysis';
import {
  deleteIdea,
  fetchIdeas,
  fetchIdeaAssets,
  fetchIdeaComments,
} from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { AudioReviewModal } from '../components/AudioReviewModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { IdeaFormModal } from '../components/IdeaFormModal';
import type { IdeaRecord, IdeaAsset, IdeaComment } from '../types/domain';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  demo:             { label: 'Demo',             cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress:      { label: 'In Progress',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  review:           { label: 'Review',           cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  release_planning: { label: 'Release Planning', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  done:             { label: 'Done',             cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  // legacy mappings
  idea:        { label: 'Demo',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  production:  { label: 'In Progress', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  mastered:    { label: 'Review',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready:       { label: 'Done',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const SUBSTAGE_META: Record<string, { label: string; cls: string }> = {
  needs_vocals:       { label: 'Needs vocals',        cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  needs_arrangement:  { label: 'Needs arrangement',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  needs_development:  { label: 'Needs development',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  just_vibe_checking: { label: 'Just vibe checking',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  needs_mix_feedback: { label: 'Needs mix feedback',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  needs_rewrite:      { label: 'Needs rewrite',       cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  waiting_on_collab:  { label: 'Waiting on collab',   cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  in_mixing:          { label: 'In mixing',           cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  needs_master:       { label: 'Needs master',        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  revisions_needed:   { label: 'Revisions needed',    cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  approved:           { label: 'Approved',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  needs_artwork:      { label: 'Needs artwork',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  needs_release_date: { label: 'Needs release date',  cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  ready_to_release:   { label: 'Ready to release',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  released:           { label: 'Released',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  archived:           { label: 'Archived',            cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  // legacy
  just_started:       { label: 'Just started',        cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  recording:          { label: 'Recording',           cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  awaiting_feedback:  { label: 'Needs mix feedback',  cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  needs_feedback:     { label: 'Needs feedback',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready_to_promote:   { label: 'Ready to promote',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  release_planning:   { label: 'Release planning',    cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  archive:            { label: 'Archived',            cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  scheduling:         { label: 'Scheduling',          cls: 'bg-purple-50 text-purple-600 border-purple-200' },
};

const CANONICAL_STATUSES = ['demo', 'in_progress', 'review', 'release_planning', 'done'] as const;
type SortMode = 'newest' | 'oldest' | 'recently_updated';
type VersionView = 'latest' | `${number}`;
const seenKey = (userId: string, ideaId: string) => `idea_seen_${userId}_${ideaId}`;

function markIdeaSeen(userId: string, ideaId: string) {
  localStorage.setItem(seenKey(userId, ideaId), new Date().toISOString());
}

function ideaIsNew(userId: string, idea: IdeaRecord): boolean {
  if (!idea.updated_at) return false;
  const seen = localStorage.getItem(seenKey(userId, idea.id));
  if (!seen) return true;
  return new Date(idea.updated_at) > new Date(seen);
}

function latestAudioAsset(idea: IdeaRecord) {
  const files = Array.isArray(idea.file_urls) ? idea.file_urls : [];
  return files
    .filter((entry: any) => (entry?.asset_type ?? 'audio') === 'audio')
    .sort((a: any, b: any) => new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime())[0] ?? null;
}

function labeledAudioAssetsForIdea(idea: IdeaRecord) {
  const files = Array.isArray(idea.file_urls) ? idea.file_urls : [];
  return files
    .filter((entry: any) => (entry?.asset_type ?? 'audio') === 'audio')
    .sort((a: any, b: any) => new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime())
    .map((entry: any, index: number) => ({
      ...entry,
      version: Number(entry?.version ?? entry?.metadata?.version ?? index + 1) || index + 1,
    }));
}

function audioAssetForVersion(idea: IdeaRecord, versionView: VersionView) {
  if (versionView === 'latest') return latestAudioAsset(idea);
  const versionNumber = Number(versionView);
  return labeledAudioAssetsForIdea(idea).find((entry) => entry.version === versionNumber) ?? null;
}

function commentsForIdeaVersion(idea: IdeaRecord, versionView: VersionView) {
  if (versionView === 'latest') return Array.isArray(idea.idea_comments) ? idea.idea_comments : [];

  const versionNumber = Number(versionView);
  const comments = Array.isArray(idea.idea_comments) ? idea.idea_comments : [];
  const versions = labeledAudioAssetsForIdea(idea);
  const asset = versions.find((entry) => entry.version === versionNumber);
  if (!asset) return [];

  const explicit = comments.filter((comment: any) => {
    if (comment.asset_id) return comment.asset_id === asset.id;
    if (comment.version != null) return Number(comment.version) === versionNumber;
    return false;
  });
  const explicitIds = new Set(explicit.map((comment: any) => comment.id));

  const idx = versions.findIndex((entry) => entry.id === asset.id);
  const next = versions[idx + 1];
  const from = asset.created_at ? new Date(asset.created_at).getTime() : 0;
  const to = next?.created_at ? new Date(next.created_at).getTime() : Infinity;
  const legacy = comments.filter((comment: any) => {
    if (explicitIds.has(comment.id)) return false;
    if (comment.asset_id || comment.version != null) return false;
    if (!comment.created_at) return true;
    const at = new Date(comment.created_at).getTime();
    return at >= from && at < to;
  });

  return [...explicit, ...legacy];
}

function latestIdeaComment(idea: IdeaRecord) {
  const rows = Array.isArray(idea.idea_comments) ? idea.idea_comments : [];
  return rows
    .slice()
    .sort((a: any, b: any) => new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime())[0] ?? null;
}

export function Ideas() {
  const { canCreateTrack, isManager } = useCurrentUserRole();
  const { authUser } = useCurrentUser();

  const [ideas,   setIdeas]   = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [collabFilter,  setCollabFilter]  = useState<'all' | 'collab' | 'solo'>('all');
  const [sortMode,      setSortMode]      = useState<SortMode>('recently_updated');
  const [versionView,   setVersionView]   = useState<VersionView>('latest');
  const [search,        setSearch]        = useState('');

  const [formOpen,    setFormOpen]    = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaRecord | null>(null);
  const [editAudioCount, setEditAudioCount] = useState(0);

  const [reviewOpen,     setReviewOpen]     = useState(false);
  const [reviewIdea,     setReviewIdea]     = useState<IdeaRecord | null>(null);
  const [reviewAssets,   setReviewAssets]   = useState<IdeaAsset[]>([]);
  const [reviewComments, setReviewComments] = useState<IdeaComment[]>([]);
  const [reviewInitialVersionId, setReviewInitialVersionId] = useState<string | null>(null);

  const [deleteTarget,  setDeleteTarget]  = useState<IdeaRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextIdeas = await fetchIdeas();
      setIdeas(nextIdeas);
      return nextIdeas;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshReview = useCallback(async () => {
    if (!reviewIdea) return;
    const [assets, comments, nextIdeas] = await Promise.all([
      fetchIdeaAssets(reviewIdea.id),
      fetchIdeaComments(reviewIdea.id),
      fetchIdeas(),
    ]);
    setIdeas(nextIdeas);
    setReviewIdea(nextIdeas.find((idea) => idea.id === reviewIdea.id) ?? reviewIdea);
    setReviewAssets(assets);
    setReviewComments(comments);
  }, [reviewIdea]);

  useEffect(() => {
    return subscribeIdeaAudioAnalysis((detail) => {
      if (detail.status !== 'completed') return;

      setIdeas((current) =>
        current.map((idea) =>
          idea.id === detail.ideaId
            ? {
                ...idea,
                bpm: detail.bpm ?? idea.bpm ?? null,
                musical_key: detail.musicalKey ?? idea.musical_key ?? null,
                key_sig: detail.musicalKey ?? idea.key_sig ?? null,
                updated_at: new Date().toISOString(),
              }
            : idea,
        ),
      );

      setReviewIdea((current) =>
        current?.id === detail.ideaId
          ? {
              ...current,
              bpm: detail.bpm ?? current.bpm ?? null,
              musical_key: detail.musicalKey ?? current.musical_key ?? null,
              key_sig: detail.musicalKey ?? current.key_sig ?? null,
              updated_at: new Date().toISOString(),
            }
          : current,
      );

      void refreshReview();
    });
  }, [refreshReview]);

  const openReview = useCallback(async (idea: IdeaRecord) => {
    const [assets, comments] = await Promise.all([
      fetchIdeaAssets(idea.id),
      fetchIdeaComments(idea.id),
    ]);
    if (authUser) markIdeaSeen(authUser.id, idea.id);
    setReviewIdea(idea);
    setReviewAssets(assets);
    setReviewComments(comments);
    setReviewInitialVersionId(audioAssetForVersion(idea, versionView)?.id ?? null);
    setReviewOpen(true);
  }, [versionView, authUser]);

  const handleDelete = useCallback(async (id: string) => {
    const idea = ideas.find(i => i.id === id) ?? null;
    setDeleteTarget(idea);
  }, [ideas]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteIdea(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, load]);

  const filtered = useMemo(() => {
    let rows = [...ideas];
    if (statusFilter !== 'all') rows = rows.filter((i) => i.status === statusFilter);
    if (collabFilter === 'collab') rows = rows.filter((i) => i.is_collab);
    if (collabFilter === 'solo')   rows = rows.filter((i) => !i.is_collab);
    if (versionView !== 'latest') rows = rows.filter((i) => !!audioAssetForVersion(i, versionView));
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
  }, [ideas, statusFilter, collabFilter, sortMode, versionView, search]);

  const availableVersions = useMemo(() => {
    const maxVersion = ideas.reduce((max, idea) => {
      const highest = labeledAudioAssetsForIdea(idea).reduce(
        (ideaMax, entry) => Math.max(ideaMax, Number(entry.version) || 0),
        0,
      );
      return Math.max(max, highest);
    }, 0);
    return Array.from({ length: maxVersion }, (_, index) => index + 1);
  }, [ideas]);

  const statusCounts = useMemo(
    () => CANONICAL_STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = ideas.filter((i) => i.status === s || (s === 'demo' && i.status === 'idea')).length;
      return acc;
    }, {}),
    [ideas]
  );

  const isNew = (idea: IdeaRecord) => !!authUser && ideaIsNew(authUser.id, idea);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Ideas</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Track Ideas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
            Capture demos, keep version history clean, and move the strongest ideas toward release.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            Share Portal
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Soon
            </span>
          </span>
          {canCreateTrack && (
            <button type="button" className="btn-primary" onClick={() => { setEditingIdea(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Idea
            </button>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-[1.75rem] border border-border bg-white p-4 shadow-sm">
        {/* Row 1: search + sort + count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas…"
              className="input-base pl-10"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{filtered.length}</span>
            <span>tracks</span>
          </div>
          <select
            className="input-base w-auto cursor-pointer text-sm"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="recently_updated">Recently updated</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {(statusFilter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setCollabFilter('all'); setVersionView('latest'); setSearch(''); }}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
        {/* Row 2: stage filter pills */}
        <div className="flex flex-wrap gap-2">
          {(['all', ...CANONICAL_STATUSES] as const).map((s) => {
            const isAll = s === 'all';
            const label = isAll ? 'All' : STATUS_META[s].label;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                  active
                    ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                    : 'border-border bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

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
              ? 'No ideas yet. Create the first idea, upload Version 1, and start collecting feedback.'
              : 'No ideas to display yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((idea) => {
            const meta   = STATUS_META[idea.status] ?? STATUS_META.demo;
            const nextAction = SUBSTAGE_META[idea.next_action ?? ''] ?? null;
            const displayAsset = audioAssetForVersion(idea, versionView);
            const versionComments = commentsForIdeaVersion(idea, versionView);
            const lastComment = versionView === 'latest'
              ? latestIdeaComment(idea)
              : versionComments
                  .slice()
                  .sort((a: any, b: any) => new Date(b?.created_at ?? 0).getTime() - new Date(a?.created_at ?? 0).getTime())[0] ?? null;
            const latestUploader = String(displayAsset?.metadata?.uploaded_by_name ?? '').trim();
            const latestCommenter = String(lastComment?.author_name ?? '').trim();
            const awaitingFeedback =
              idea.is_collab &&
              ((lastComment?.author_id && lastComment.author_id === authUser?.id) ||
                (displayAsset?.metadata?.uploaded_by && displayAsset.metadata.uploaded_by === authUser?.id));
            const _isNew = isNew(idea);
            const displayBpm = displayAsset?.metadata?.analysis_bpm ?? idea.bpm ?? null;
            const displayKey = displayAsset?.metadata?.analysis_key ?? idea.musical_key ?? null;
            const displayVersionLabel = versionView === 'latest'
              ? `${idea.version_numbers ?? 1} version${(idea.version_numbers ?? 1) === 1 ? '' : 's'}`
              : `Version ${versionView}`;
            const displayNoteCount = versionView === 'latest' ? (idea.idea_comments?.length ?? 0) : versionComments.length;
            return (
              <article
                key={idea.id}
                onClick={() => openReview(idea)}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-md active:translate-y-0"
              >
                <div className="flex flex-1 flex-col p-5">
                  {/* Top row: stage badge + actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', meta.cls)}>
                        {meta.label}
                      </span>
                      {_isNew && (
                        <span className="animate-pulse rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {(canCreateTrack || isManager) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchIdeaAssets(idea.id)
                              .then((assets) => { setEditAudioCount(assets.filter((a) => a.asset_type === 'audio').length); })
                              .catch(() => setEditAudioCount(0));
                            setEditingIdea(idea);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Edit"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2.121 2.121 0 113 3L12 16H9v-3z" />
                          </svg>
                        </button>
                      )}
                      {canCreateTrack && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(idea.id); }}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Delete"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">{idea.title}</h3>
                  {nextAction && idea.status !== 'done' && (
                    <div className={cn('mt-2 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium', nextAction.cls)}>
                      <span className="opacity-60">Blocking:</span>
                      <span className="font-semibold">{nextAction.label}</span>
                    </div>
                  )}
                  {idea.description && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Artist</p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{idea.description}</p>
                    </div>
                  )}
                  {idea.manager_notes && (isManager || canCreateTrack) && (
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Manager</p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{idea.manager_notes}</p>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                    {(displayBpm != null || displayKey) && (
                      <>
                        <span className="font-semibold text-slate-600">
                          {[displayBpm != null ? `${displayBpm} BPM` : null, displayKey].filter(Boolean).join(' · ')}
                        </span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span>{displayVersionLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{displayNoteCount} note{displayNoteCount === 1 ? '' : 's'}</span>
                    {(displayAsset?.created_at || idea.updated_at) && (
                      <>
                        <span aria-hidden>·</span>
                        <span>Updated {format(parseISO((displayAsset?.created_at ?? idea.updated_at) as string), 'MMM d')}</span>
                      </>
                    )}
                  </div>

                  {/* People + spacer */}
                  <div className="mt-auto pt-4">
                    {(latestCommenter || latestUploader) && (
                      <p className="mb-3 text-[11px] text-slate-400">
                        {latestCommenter && latestUploader && latestCommenter !== latestUploader
                          ? <><span className="font-medium text-slate-600">{latestCommenter}</span> left feedback · <span className="font-medium text-slate-600">{latestUploader}</span> uploaded</>
                          : latestCommenter
                          ? <>Feedback from <span className="font-medium text-slate-600">{latestCommenter}</span></>
                          : latestUploader
                          ? <>Uploaded by <span className="font-medium text-slate-600">{latestUploader}</span></>
                          : null}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {idea.created_at && (
                        <span className="text-[11px] text-slate-400">
                          {format(parseISO(idea.created_at), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-slate-700">
                        Open review
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <IdeaFormModal
        open={formOpen}
        idea={editingIdea}
        existingAudioCount={editAudioCount}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />
      <AudioReviewModal
        open={reviewOpen}
        idea={reviewIdea}
        assets={reviewAssets}
        comments={reviewComments}
        initialSelectedVersionId={reviewInitialVersionId}
        onClose={() => setReviewOpen(false)}
        onSaved={refreshReview}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete this idea?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. This cannot be undone.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
