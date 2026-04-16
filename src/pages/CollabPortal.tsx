import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Headphones, Loader2, Music, Sparkles, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { fetchIdeaAssets, fetchIdeaComments, saveIdeaComment } from '../lib/supabaseData';
import type { IdeaRecord, IdeaAsset, IdeaComment } from '../types/domain';

function formatSecs(n: number) {
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Per-idea detail panel ─────────────────────────────────────────────────────

interface IdeaDetailPanelProps {
  idea: IdeaRecord;
  assets: IdeaAsset[];
  comments: IdeaComment[];
  onCommentSaved: () => void;
}

function IdeaDetailPanel({ idea, assets, comments, onCommentSaved }: IdeaDetailPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioAsset    = assets.find((a) => a.asset_type === 'audio');
  const projectLinks  = assets.filter((a) => a.asset_type === 'project_link');

  const [currentTime, setCurrentTime] = useState(0);
  const [body,        setBody]        = useState('');
  const [saving,      setSaving]      = useState(false);

  const submit = async (withTimestamp: boolean) => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await saveIdeaComment({
        idea_id: idea.id,
        body: body.trim(),
        timestamp_seconds: withTimestamp ? Math.floor(currentTime) : null,
      });
      setBody('');
      onCommentSaved();
    } catch {
      // anon writes may fail if bucket policy disallows — fail silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      {/* Left — audio player + links + comment form */}
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audio</p>
          {audioAsset ? (
            <>
              <audio
                ref={audioRef}
                src={audioAsset.file_url}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                controls
                className="mt-4 w-full rounded-xl"
              />
              <p className="mt-2 text-xs text-slate-400">
                Playback: {formatSecs(currentTime)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No audio file attached to this idea.</p>
          )}
        </div>

        {projectLinks.length > 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Project Files</p>
            <div className="mt-3 space-y-2">
              {projectLinks.map((l) => (
                <a
                  key={l.id}
                  href={l.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  {l.metadata?.label ?? 'Project link'}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leave a note</p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Feedback, ideas, mix notes…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || !body.trim() || !audioAsset}
              onClick={() => submit(true)}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              Note at {formatSecs(currentTime)}
            </button>
            <button
              type="button"
              disabled={saving || !body.trim()}
              onClick={() => submit(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              General note
            </button>
          </div>
        </div>
      </div>

      {/* Right — comment feed */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Review log ({comments.length})
        </p>
        <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-400">No notes yet — be the first!</p>
          ) : (
            [...comments]
              .sort((a, b) => (a.timestamp_seconds ?? Infinity) - (b.timestamp_seconds ?? Infinity))
              .map((c) => (
                <article key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      {c.timestamp_seconds != null ? formatSecs(c.timestamp_seconds) : 'General note'}
                    </span>
                    {c.created_at && (
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{c.body}</p>
                </article>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────

export function CollabPortal() {
  const { ideaId } = useParams<{ ideaId?: string }>();

  const [ideas,         setIdeas]         = useState<IdeaRecord[]>([]);
  const [selectedIdea,  setSelectedIdea]  = useState<IdeaRecord | null>(null);
  const [assets,        setAssets]        = useState<IdeaAsset[]>([]);
  const [comments,      setComments]      = useState<IdeaComment[]>([]);
  const [loading,       setLoading]       = useState(true);

  // Load all public ideas
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('ideas')
          .select('*')
          .eq('is_public', true)
          .order('updated_at', { ascending: false });
        setIdeas((data ?? []) as IdeaRecord[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-select when route param present
  useEffect(() => {
    if (!ideaId || ideas.length === 0) return;
    const match = ideas.find((i) => i.id === ideaId || i.share_slug === ideaId);
    if (match) selectIdea(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId, ideas]);

  const selectIdea = useCallback(async (idea: IdeaRecord) => {
    setSelectedIdea(idea);
    const [a, c] = await Promise.all([
      fetchIdeaAssets(idea.id),
      fetchIdeaComments(idea.id),
    ]);
    setAssets(a);
    setComments(c);
  }, []);

  const refreshComments = useCallback(async () => {
    if (!selectedIdea) return;
    setComments(await fetchIdeaComments(selectedIdea.id));
  }, [selectedIdea]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-6"
          >
            <Sparkles className="h-4 w-4" />
            Artist Collaboration Portal
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold leading-tight md:text-6xl"
          >
            {selectedIdea ? selectedIdea.title : 'Open Projects'}
          </motion.h1>
          {selectedIdea && (
            <button
              type="button"
              onClick={() => setSelectedIdea(null)}
              className="mt-4 text-sm text-blue-400 transition-colors hover:text-white"
            >
              ← All projects
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-14">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
          </div>
        ) : selectedIdea ? (
          <IdeaDetailPanel
            idea={selectedIdea}
            assets={assets}
            comments={comments}
            onCommentSaved={refreshComments}
          />
        ) : ideas.length === 0 ? (
          <div className="py-24 text-center">
            <Music className="mx-auto h-16 w-16 text-slate-200" />
            <h3 className="mt-4 text-xl font-bold text-slate-900">No public ideas yet</h3>
            <p className="mt-2 text-slate-500">Check back soon for new collaboration opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea, i) => (
              <motion.button
                key={idea.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => selectIdea(idea)}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {idea.is_collab && (
                    <span className="flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                      <Users className="h-2.5 w-2.5" />
                      Collab
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{idea.title}</h3>
                {idea.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{idea.description}</p>
                )}
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-blue-600">
                  <Headphones className="h-4 w-4" />
                  Open review
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
