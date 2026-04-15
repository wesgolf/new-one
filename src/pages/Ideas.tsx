import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AudioLines, CloudUpload, Link2, Lock, Plus, Search, Share2 } from 'lucide-react';
import { AudioReviewModal } from '../components/AudioReviewModal';
import { fetchIdeaAssets, fetchIdeaComments, fetchIdeas, saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';
import { canCreateTrack, isManager } from '../types/roles';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';

const LAST_LOGIN_KEY = 'artist_os_last_login';

const STATUS_OPTIONS = ['idea', 'production', 'review', 'release_candidate'];

function IdeaModal({
  open,
  idea,
  onClose,
  onSaved,
}: {
  open: boolean;
  idea: Partial<IdeaRecord> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<IdeaRecord>>({
    status: 'idea',
    is_collab: false,
    is_public: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        idea || {
          status: 'idea',
          is_collab: false,
          is_public: false,
        }
      );
    }
  }, [open, idea]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-border bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Ideas</p>
          <h3 className="mt-2 text-2xl font-bold text-text-primary">{form.id ? 'Edit idea' : 'Create idea'}</h3>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              await saveIdea(form);
              onSaved();
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Title</span>
            <input
              required
              className="input-base"
              value={form.title || ''}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Description</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
              value={form.description || ''}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</span>
              <select
                className="input-base"
                value={form.status || 'idea'}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={Boolean(form.is_collab)}
                onChange={(event) => setForm((current) => ({ ...current, is_collab: event.target.checked }))}
              />
              <span className="text-sm font-medium text-text-primary">Collaboration track</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={Boolean(form.is_public)}
                onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))}
              />
              <span className="text-sm font-medium text-text-primary">Enable share portal</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Ideas() {
  const role = useCurrentUserRole();
  const canAdd = canCreateTrack(role);
  const managerView = isManager(role);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collabFilter, setCollabFilter] = useState<'all' | 'collab' | 'solo'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created'>('updated');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Partial<IdeaRecord> | null>(null);
  const [reviewIdea, setReviewIdea] = useState<IdeaRecord | null>(null);
  const [ideaAssets, setIdeaAssets] = useState<Record<string, IdeaAsset[]>>({});
  const [ideaComments, setIdeaComments] = useState<Record<string, IdeaComment[]>>({});

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchIdeas();
      setIdeas(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadReviewData = async (idea: IdeaRecord) => {
    const [assets, comments] = await Promise.all([fetchIdeaAssets(idea.id), fetchIdeaComments(idea.id)]);
    setIdeaAssets((current) => ({ ...current, [idea.id]: assets }));
    setIdeaComments((current) => ({ ...current, [idea.id]: comments }));
  };

  const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
  const filteredIdeas = useMemo(() => {
    const rows = ideas
      .filter((idea) => statusFilter === 'all' || idea.status === statusFilter)
      .filter((idea) => {
        if (collabFilter === 'all') return true;
        return collabFilter === 'collab' ? Boolean(idea.is_collab) : !idea.is_collab;
      })
      .filter((idea) => idea.title.toLowerCase().includes(search.toLowerCase()) || (idea.description || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const first = sortBy === 'updated' ? a.updated_at || a.created_at || '' : a.created_at || '';
        const second = sortBy === 'updated' ? b.updated_at || b.created_at || '' : b.created_at || '';
        return new Date(second).getTime() - new Date(first).getTime();
      });

    return rows;
  }, [ideas, statusFilter, collabFilter, search, sortBy]);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Creative workflow</p>
          <h1 className="mt-2 text-4xl font-bold text-text-primary">Ideas and audio review</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            MP3-first collaboration, optional Dropbox or project links, timestamped review notes, and a shareable portal route that survives direct navigation.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {!canAdd && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <Lock className="h-4 w-4" />
              Managers can review and comment, but only artists can create tracks.
            </div>
          )}
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              setSelectedIdea(null);
              setModalOpen(true);
            }}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New Idea
          </button>
        </div>
      </header>

      <section className="grid gap-4 rounded-[2rem] border border-border bg-white p-5 shadow-sm lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles or notes" className="input-base pl-11" />
        </label>
        <select className="input-base" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select className="input-base" value={collabFilter} onChange={(event) => setCollabFilter(event.target.value as any)}>
          <option value="all">Collab + solo</option>
          <option value="collab">Collab only</option>
          <option value="solo">Solo only</option>
        </select>
        <select className="input-base" value={sortBy} onChange={(event) => setSortBy(event.target.value as any)}>
          <option value="updated">Updated newest</option>
          <option value="created">Created newest</option>
        </select>
        <div className="flex items-center rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-secondary">
          {managerView ? 'Manager review mode' : 'Artist creation mode'}
        </div>
      </section>

      {loading ? (
        <div className="rounded-[2rem] border border-border bg-white p-8 text-sm text-text-secondary shadow-sm">
          Loading ideas...
        </div>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map((idea) => {
            const isNew = lastLogin && idea.created_at ? new Date(idea.created_at) > new Date(lastLogin) : false;
            const assets = ideaAssets[idea.id] || [];
            const comments = ideaComments[idea.id] || [];
            const audioCount = assets.filter((asset) => asset.asset_type === 'audio').length;

            return (
              <article key={idea.id} className="rounded-[2rem] border border-border bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-primary">{idea.status.replace('_', ' ')}</span>
                      {idea.is_collab ? <span className="badge badge-success">Collab</span> : <span className="badge">Solo</span>}
                      {isNew ? <span className="badge badge-warning">New since last login</span> : null}
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-text-primary">{idea.title}</h3>
                  </div>
                  {idea.is_public ? (
                    <a className="btn-secondary" href={`/collab/${idea.share_slug || idea.id}`} target="_blank" rel="noreferrer">
                      <Share2 className="h-4 w-4" />
                      Portal
                    </a>
                  ) : null}
                </div>

                <p className="mt-4 min-h-16 text-sm leading-6 text-text-secondary">
                  {idea.description || 'No description added yet.'}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Audio assets</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{audioCount}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Comments</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{comments.length}</p>
                  </div>
                </div>

                <div className="mt-5 text-xs text-text-tertiary">
                  Updated {idea.updated_at ? formatDistanceToNowStrict(new Date(idea.updated_at), { addSuffix: true }) : 'recently'}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {!managerView && (
                    <label className="btn-secondary cursor-pointer">
                      <CloudUpload className="h-4 w-4" />
                      Upload MP3
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.type !== 'audio/mpeg' || file.size > 20 * 1024 * 1024) {
                            alert('Only MP3 files up to 20MB are supported.');
                            event.target.value = '';
                            return;
                          }
                          await uploadIdeaAudio(file, idea.id);
                          await loadReviewData(idea);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      const href = window.prompt('Paste a Dropbox or project link');
                      if (!href) return;
                      await saveIdeaAsset({
                        idea_id: idea.id,
                        file_url: href,
                        file_path: href,
                        asset_type: href.includes('dropbox') ? 'project_link' : 'link',
                        metadata: { label: href.includes('dropbox') ? 'Dropbox/project' : 'External link' },
                      });
                      await loadReviewData(idea);
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                    Add Link
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async () => {
                      setReviewIdea(idea);
                      await loadReviewData(idea);
                    }}
                  >
                    <AudioLines className="h-4 w-4" />
                    Review
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <IdeaModal open={modalOpen} idea={selectedIdea} onClose={() => setModalOpen(false)} onSaved={load} />
      <AudioReviewModal
        open={Boolean(reviewIdea)}
        idea={reviewIdea}
        assets={reviewIdea ? ideaAssets[reviewIdea.id] || [] : []}
        comments={reviewIdea ? ideaComments[reviewIdea.id] || [] : []}
        onClose={() => setReviewIdea(null)}
        onSaved={async () => {
          if (reviewIdea) await loadReviewData(reviewIdea);
        }}
      />
    </div>
  );
}
