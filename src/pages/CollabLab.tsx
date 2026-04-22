import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Mail,
  Music2,
  Pause,
  Play,
  Send,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchIdeaAssets, fetchIdeaComments } from '../lib/supabaseData';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';
import { cn } from '../lib/utils';
import { AudioWaveform } from '../components/AudioWaveform';
import type { WaveformMarker } from '../components/AudioWaveform';

const CONTACT_EMAIL = 'wesleyrob27@gmail.com';

function fmt(n: number) {
  if (!Number.isFinite(n) || n < 0) return '0:00';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  demo:        { label: 'Demo',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  review:      { label: 'Review',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:        { label: 'Done',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

/** Save a public (non-internal) comment — no auth session required. */
async function savePublicComment(payload: {
  idea_id: string;
  body: string;
  timestamp_seconds: number | null;
  author_name: string | null;
}) {
  const { data, error } = await supabase
    .from('idea_comments')
    .insert([{ ...payload, is_internal: false }])
    .select()
    .single();
  if (error) throw error;
  return data as IdeaComment;
}

// ── Collab interest modal ─────────────────────────────────────────────────────

function CollabModal({ idea, onClose }: { idea: IdeaRecord; onClose: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  const subject = encodeURIComponent(`Collab interest: ${idea.title}`);
  const emailBody = encodeURIComponent(
    `Hi Wes,\n\nI want to collaborate on "${idea.title}".\n\nName: ${name}\nWhat I bring: ${role}\n\n${message}`,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl overflow-hidden border border-border">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <span className="badge bg-brand-dim text-brand mb-2 inline-block">Collab Lab</span>
            <h3 className="text-lg font-bold text-text-primary">Collaborate on this track</h3>
            <p className="mt-1 text-sm text-text-secondary">
              This fills your email client — just hit send.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
              Your name
            </label>
            <input
              className="input-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Turner"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
              What do you do?
            </label>
            <input
              className="input-base"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Producer, vocalist, mixing engineer…"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
              Message
            </label>
            <textarea
              rows={4}
              className="input-base resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me your vision or what you'd bring to the track…"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${emailBody}`}
            onClick={onClose}
            className="btn-primary flex-1"
          >
            <Mail className="h-4 w-4" />
            Send email
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Idea card ─────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onSelect, onCollab }: {
  idea: IdeaRecord;
  onSelect: () => void;
  onCollab: () => void;
}) {
  const meta = STATUS_META[idea.status] ?? STATUS_META.demo;
  return (
    <div className="glass-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
      <button type="button" onClick={onSelect} className="w-full text-left p-5 group">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={cn('badge border', meta.cls)}>{meta.label}</span>
          <span className="badge bg-brand-dim text-brand flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />
            Open collab
          </span>
        </div>
        <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
          {idea.title}
        </h3>
        {idea.description && (
          <p className="mt-1.5 text-sm text-text-secondary line-clamp-2">{idea.description}</p>
        )}
        <p className="mt-3 text-xs text-text-muted">Click to listen &amp; leave feedback →</p>
      </button>
      <div className="border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCollab(); }}
          className="btn-primary w-full"
        >
          <Users className="h-4 w-4" />
          I want to collaborate on this
        </button>
      </div>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function DetailView({ idea, assets, comments, onBack, onRefreshComments, onCollab }: {
  idea: IdeaRecord;
  assets: IdeaAsset[];
  comments: IdeaComment[];
  onBack: () => void;
  onRefreshComments: () => void;
  onCollab: () => void;
}) {
  const audioRef    = useRef<HTMLAudioElement>(null);

  const audioAsset = assets.find((a) => a.asset_type === 'audio');

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [body,        setBody]        = useState('');
  const [guestName,   setGuestName]   = useState('');
  const [generalNote, setGeneralNote] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  const meta = STATUS_META[idea.status] ?? STATUS_META.demo;
  const pinnedComments = comments.filter((c) => c.timestamp_seconds != null);
  const waveformMarkers: WaveformMarker[] = pinnedComments.map((c) => ({
    id: c.id!,
    time: c.timestamp_seconds!,
    color: '#a855f7', // purple to match neon-purple theme
  }));

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePublicComment({
        idea_id:           idea.id,
        body:              body.trim(),
        timestamp_seconds: generalNote ? null : currentTime,
        author_name:       guestName.trim() || null,
      });
      setBody('');
      onRefreshComments();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sortedComments = [...comments].sort(
    (a, b) => (a.timestamp_seconds ?? Infinity) - (b.timestamp_seconds ?? Infinity),
  );

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-start gap-4">
        <button type="button" onClick={onBack} className="btn-secondary shrink-0 mt-1 !px-3 !py-2">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={cn('badge border', meta.cls)}>{meta.label}</span>
            <span className="badge bg-brand-dim text-brand flex items-center gap-1">
              <Users className="h-2.5 w-2.5" /> Open collab
            </span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary">{idea.title}</h2>
          {idea.description && (
            <p className="mt-1 text-text-secondary text-sm">{idea.description}</p>
          )}
        </div>
      </div>

      {/* Audio player card */}
      <div className="glass-card p-6">
        {audioAsset ? (
          <>
            <audio
              ref={audioRef}
              src={audioAsset.file_url}
              preload="metadata"
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="flex items-center gap-2 mb-4">
              <Music2 className="h-4 w-4 text-text-muted shrink-0" />
              <p className="text-sm font-medium text-text-secondary truncate">
                {(audioAsset.metadata as any)?.name ?? 'Audio file'}
              </p>
            </div>

            {/* Waveform scrubber */}
            <AudioWaveform
              audioUrl={audioAsset.file_url}
              currentTime={currentTime}
              duration={duration}
              onSeek={(t) => { if (audioRef.current) audioRef.current.currentTime = t; }}
              markers={waveformMarkers}
              height={56}
            />

            <div className="flex items-center gap-4 mt-3">
              <button
                type="button"
                onClick={toggle}
                className="w-10 h-10 rounded-full bg-brand hover:bg-brand-hover flex items-center justify-center transition-colors shrink-0"
              >
                {isPlaying
                  ? <Pause className="h-4 w-4 text-white fill-white" />
                  : <Play  className="h-4 w-4 text-white fill-white ml-0.5" />}
              </button>
              <span className="text-xs font-mono text-text-muted tabular-nums">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-4 text-text-muted">
            <Music2 className="h-5 w-5 shrink-0" />
            <p className="text-sm">No audio attached to this track yet.</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feedback form */}
        <div className="glass-card p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">
            Leave Feedback
          </p>
          <div className="space-y-3">
            <input
              className="input-base"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name (optional)"
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-muted">
                  {generalNote ? 'General note' : `Pinned to ${fmt(currentTime)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setGeneralNote((v) => !v)}
                  className="text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors"
                >
                  {generalNote ? '+ Use timestamp' : 'Make general'}
                </button>
              </div>
              <textarea
                rows={3}
                className="input-base resize-none"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Feedback, mix notes, production ideas…"
              />
            </div>
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={saving || !body.trim()}
              className="btn-primary w-full disabled:opacity-40"
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send    className="h-4 w-4" />}
              Submit feedback
            </button>
          </div>
        </div>

        {/* Comments feed */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Feedback ({comments.length})
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {sortedComments.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-sm text-text-muted">No feedback yet — be the first.</p>
              </div>
            ) : (
              <ul>
                {sortedComments.map((c, i) => (
                  <li
                    key={c.id}
                    className={cn(
                      'px-6 py-4 hover:bg-surface-raised transition-colors',
                      i < sortedComments.length - 1 && 'border-b border-border',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {c.timestamp_seconds != null ? (
                        <span className="rounded-md bg-brand-dim px-2 py-0.5 text-[11px] font-bold text-brand font-mono">
                          {fmt(c.timestamp_seconds)}
                        </span>
                      ) : (
                        <span className="rounded-md bg-surface-raised border border-border px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                          note
                        </span>
                      )}
                      {c.author_name && (
                        <span className="text-[11px] font-semibold text-text-secondary">
                          {c.author_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Collab CTA */}
      <div className="rounded-2xl border border-brand/20 bg-brand-dim p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-text-primary">Want to collaborate on this track?</p>
            <p className="text-sm text-text-secondary mt-0.5">
              Producer, vocalist, mixing engineer — reach out directly.
            </p>
          </div>
          <button type="button" onClick={onCollab} className="btn-primary shrink-0">
            <Users className="h-4 w-4" />
            I want to collaborate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CollabLab() {
  const { ideaId } = useParams<{ ideaId?: string }>();
  const navigate = useNavigate();

  const [ideas,      setIdeas]      = useState<IdeaRecord[]>([]);
  const [selected,   setSelected]   = useState<IdeaRecord | null>(null);
  const [assets,     setAssets]     = useState<IdeaAsset[]>([]);
  const [comments,   setComments]   = useState<IdeaComment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [collabIdea, setCollabIdea] = useState<IdeaRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('ideas')
          .select('*')
          .eq('is_collab', true)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        setIdeas((data ?? []) as IdeaRecord[]);
      } catch (err: any) {
        setFetchError(err?.message ?? 'Could not load tracks.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openIdea = useCallback(async (idea: IdeaRecord) => {
    setSelected(idea);
    navigate(`/collab-lab/${idea.id}`, { replace: true });
    const [a, c] = await Promise.all([
      fetchIdeaAssets(idea.id),
      fetchIdeaComments(idea.id),
    ]);
    setAssets(a);
    setComments(c);
  }, [navigate]);

  useEffect(() => {
    if (!ideaId || ideas.length === 0 || selected) return;
    const match = ideas.find((i) => i.id === ideaId || i.share_slug === ideaId);
    if (match) openIdea(match);
  }, [ideaId, ideas, selected, openIdea]);

  const refreshComments = useCallback(async () => {
    if (!selected) return;
    setComments(await fetchIdeaComments(selected.id));
  }, [selected]);

  const goBack = () => {
    setSelected(null);
    setAssets([]);
    setComments([]);
    navigate('/collab-lab', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches app navbar style */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold tracking-[0.18em] text-text-primary uppercase select-none">
              WES
            </span>
            <span className="hidden sm:block text-sm text-border select-none">|</span>
            <span className="hidden sm:block text-sm font-semibold text-text-secondary">
              Collab Lab
            </span>
          </div>
          <a
            href="/"
            className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            ← Artist Hub
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-sm text-red-500 max-w-sm">{fetchError}</p>
          </div>
        ) : selected ? (
          <DetailView
            idea={selected}
            assets={assets}
            comments={comments}
            onBack={goBack}
            onRefreshComments={refreshComments}
            onCollab={() => setCollabIdea(selected)}
          />
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="w-14 h-14 rounded-full glass-card flex items-center justify-center">
              <Music2 className="h-6 w-6 text-text-muted" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Nothing open for collab yet</h2>
              <p className="text-sm text-text-muted mt-1 max-w-xs">
                Check back soon — tracks appear here when open for collaboration.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-text-primary">Open for Collaboration</h2>
              <p className="mt-1 text-text-secondary">
                Listen, leave feedback, or reach out to collaborate.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onSelect={() => openIdea(idea)}
                  onCollab={() => setCollabIdea(idea)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {collabIdea && (
        <CollabModal idea={collabIdea} onClose={() => setCollabIdea(null)} />
      )}
    </div>
  );
}
