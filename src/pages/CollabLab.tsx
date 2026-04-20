import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Headphones,
  Loader2,
  Mail,
  Music2,
  Pause,
  Play,
  Send,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchIdeaAssets, fetchIdeaComments, saveIdeaComment } from '../lib/supabaseData';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';

const CONTACT_EMAIL = 'wesleyrob27@gmail.com';

function fmt(n: number) {
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_COLORS: Record<string, string> = {
  demo: 'bg-slate-100 text-slate-500',
  in_progress: 'bg-blue-50 text-blue-600',
  review: 'bg-amber-50 text-amber-600',
  done: 'bg-emerald-50 text-emerald-600',
};

// ── Collab interest modal ─────────────────────────────────────────────────────

interface CollabModalProps {
  idea: IdeaRecord;
  onClose: () => void;
}

function CollabModal({ idea, onClose }: CollabModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  const subject = encodeURIComponent(`Collab interest: ${idea.title}`);
  const body = encodeURIComponent(
    `Hi Wes,\n\nI'm interested in collaborating on "${idea.title}".\n\nName: ${name}\nRole: ${role}\n\n${message}\n\n—`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-950/40 p-0 sm:p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '92vh' }}>
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Collab Lab</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Collaborate on "{idea.title}"</h3>
          <p className="mt-1 text-sm text-slate-500">
            Fill in your details and hit Send — this will open your email client.
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Turner"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              What do you do?
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Producer, vocalist, mixing engineer…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me about your vision or what you'd bring to the track…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Send email
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Idea card (list view) ─────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: IdeaRecord;
  onSelect: () => void;
  onCollab: () => void;
}

function IdeaCard({ idea, onSelect, onCollab }: IdeaCardProps) {
  const colorCls = STATUS_COLORS[idea.status] ?? STATUS_COLORS.demo;
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all overflow-hidden">
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colorCls}`}>
            {idea.status.replace('_', ' ')}
          </span>
          <span className="rounded-full bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> Open collab
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900">{idea.title}</h3>
        {idea.description && (
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">{idea.description}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Headphones className="h-3 w-3" />
          <span>Click to listen &amp; review</span>
        </div>
      </button>
      <div className="border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={onCollab}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <Users className="h-4 w-4" />
          I want to collaborate on this
        </button>
      </div>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

interface DetailViewProps {
  idea: IdeaRecord;
  assets: IdeaAsset[];
  comments: IdeaComment[];
  onBack: () => void;
  onRefreshComments: () => void;
  onCollab: () => void;
}

function DetailView({ idea, assets, comments, onBack, onRefreshComments, onCollab }: DetailViewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const audioAsset = assets.find((a) => a.asset_type === 'audio');
  const projectLinks = assets.filter((a) => a.asset_type === 'project_link');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [body, setBody] = useState('');
  const [guestName, setGuestName] = useState('');
  const [generalNote, setGeneralNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await saveIdeaComment({
        idea_id: idea.id,
        body: body.trim(),
        timestamp_seconds: generalNote ? null : currentTime,
        author_name: guestName.trim() || 'Anonymous',
      });
      setBody('');
      onRefreshComments();
    } finally {
      setSaving(false);
    }
  };

  const sortedComments = [...comments].sort(
    (a, b) => (a.timestamp_seconds ?? Infinity) - (b.timestamp_seconds ?? Infinity)
  );

  const colorCls = STATUS_COLORS[idea.status] ?? STATUS_COLORS.demo;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 mt-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${colorCls}`}>
              {idea.status.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{idea.title}</h2>
          {idea.description && (
            <p className="mt-1 text-slate-500 text-sm max-w-2xl">{idea.description}</p>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        {audioAsset ? (
          <>
            <audio
              ref={audioRef}
              src={audioAsset.file_url}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
              onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              preload="metadata"
            />
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {(audioAsset.metadata as any)?.name ?? 'Audio file'}
              </p>
              <a
                href={audioAsset.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 shrink-0 text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Download
              </a>
            </div>

            {/* Scrubber */}
            <div ref={progressRef} onClick={seek} className="relative h-10 cursor-pointer flex items-center">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-100" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-900 pointer-events-none"
                style={{ width: `${progress}%` }}
              />
              {duration > 0 && sortedComments.filter((c) => c.timestamp_seconds != null).map((c) => (
                <div
                  key={c.id}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white pointer-events-none"
                  style={{ left: `calc(${(c.timestamp_seconds! / duration) * 100}% - 4px)` }}
                />
              ))}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 shadow-md pointer-events-none"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>

            <div className="flex items-center gap-4 mt-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-700 flex items-center justify-center transition-colors shrink-0"
              >
                {isPlaying
                  ? <Pause className="h-4 w-4 text-white fill-white" />
                  : <Play className="h-4 w-4 text-white fill-white ml-0.5" />}
              </button>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 py-4 text-slate-400">
            <Music2 className="h-5 w-5 shrink-0" />
            <p className="text-sm">No audio attached yet.</p>
          </div>
        )}
      </div>

      {/* Project links */}
      {projectLinks.length > 0 && (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Project Files</p>
          <div className="space-y-2">
            {projectLinks.map((l) => (
              <a
                key={l.id}
                href={l.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {(l.metadata as any)?.label ?? 'Project link'}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comment form */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Leave feedback</p>
          <div className="space-y-3">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">
                  {generalNote ? 'General note' : `Comment at ${fmt(currentTime)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setGeneralNote((v) => !v)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {generalNote ? '+ Use timestamp' : 'Make general'}
                </button>
              </div>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Feedback, mix notes, production ideas…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors resize-none"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !body.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit feedback
            </button>
          </div>
        </div>

        {/* Comments feed */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Feedback ({comments.length})
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {sortedComments.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-sm text-slate-400">No feedback yet — be the first!</p>
              </div>
            ) : (
              <ul>
                {sortedComments.map((c, i) => (
                  <li
                    key={c.id}
                    className={`px-6 py-4 hover:bg-slate-50 transition-colors ${i < sortedComments.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {c.timestamp_seconds != null ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 font-mono">
                          {fmt(c.timestamp_seconds)}
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                          note
                        </span>
                      )}
                      {c.author_name && (
                        <span className="text-[11px] font-semibold text-slate-500">{c.author_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Collab CTA */}
      <div className="rounded-[1.5rem] border border-purple-100 bg-purple-50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900">Want to collaborate on this track?</p>
            <p className="text-sm text-slate-500 mt-0.5">Reach out — producer, vocalist, mixing engineer, or just a fan with ideas.</p>
          </div>
          <button
            type="button"
            onClick={onCollab}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
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

  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [selected, setSelected] = useState<IdeaRecord | null>(null);
  const [assets, setAssets] = useState<IdeaAsset[]>([]);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [collabIdea, setCollabIdea] = useState<IdeaRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('ideas')
          .select('*')
          .eq('is_collab', true)
          .order('updated_at', { ascending: false });
        setIdeas((data ?? []) as IdeaRecord[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-select from URL param
  useEffect(() => {
    if (!ideaId || ideas.length === 0) return;
    const match = ideas.find((i) => i.id === ideaId || i.share_slug === ideaId);
    if (match) openIdea(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, ideas]);

  const openIdea = useCallback(async (idea: IdeaRecord) => {
    setSelected(idea);
    navigate(`/collab-lab/${idea.id}`, { replace: true });
    const [a, c] = await Promise.all([fetchIdeaAssets(idea.id), fetchIdeaComments(idea.id)]);
    setAssets(a);
    setComments(c);
  }, [navigate]);

  const refreshComments = useCallback(async () => {
    if (!selected) return;
    setComments(await fetchIdeaComments(selected.id));
  }, [selected]);

  const goBack = () => {
    setSelected(null);
    navigate('/collab-lab', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Open Projects</p>
            <h1 className="text-xl font-bold text-slate-900">Collab Lab</h1>
          </div>
          <a
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            ← Artist Hub
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
              <Music2 className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-700">Nothing open for collab yet</h2>
            <p className="text-sm text-slate-400 mt-1">Check back soon — tracks will appear here when they're open for collaboration.</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Open for Collaboration</h2>
              <p className="mt-1 text-slate-500">Listen, leave feedback, or reach out to collaborate.</p>
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
