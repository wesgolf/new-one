import React, { useMemo, useRef, useState } from 'react';
import { MessageSquareMore, Pause, Play, TimerReset } from 'lucide-react';
import { saveIdeaComment } from '../lib/supabaseData';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

interface AudioReviewModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  assets: IdeaAsset[];
  comments: IdeaComment[];
  onClose: () => void;
  onSaved: () => void;
}

export function AudioReviewModal({ open, idea, assets, comments, onClose, onSaved }: AudioReviewModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [body, setBody] = useState('');
  const [sortMode, setSortMode] = useState<'timestamp' | 'newest'>('timestamp');
  const [saving, setSaving] = useState(false);

  const audioAsset = assets.find((asset) => asset.asset_type === 'audio');
  const sortedComments = useMemo(() => {
    const items = [...comments];
    if (sortMode === 'newest') {
      return items.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    return items.sort((a, b) => (a.timestamp_seconds || Number.MAX_SAFE_INTEGER) - (b.timestamp_seconds || Number.MAX_SAFE_INTEGER));
  }, [comments, sortMode]);

  if (!open || !idea) return null;

  const addComment = async (withTimestamp: boolean) => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await saveIdeaComment({
        idea_id: idea.id,
        body: body.trim(),
        timestamp_seconds: withTimestamp ? currentTime : null,
      });
      setBody('');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Audio review</p>
            <h3 className="mt-2 text-2xl font-bold text-text-primary">{idea.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-r border-border p-6">
            <div className="rounded-[1.75rem] border border-border bg-slate-50 p-5">
              <p className="text-sm text-text-secondary">
                {audioAsset ? 'Primary MP3 asset loaded for review.' : 'No audio asset uploaded yet.'}
              </p>

              {audioAsset ? (
                <>
                  <audio
                    ref={audioRef}
                    src={audioAsset.file_url}
                    onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="mt-5 w-full"
                    controls
                  />

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        const audio = audioRef.current;
                        if (!audio) return;
                        if (audio.paused) audio.play();
                        else audio.pause();
                      }}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {formatSeconds(currentTime)}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-5 rounded-[1.75rem] border border-border bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Add note</p>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Capture feedback, mix notes, or timestamp-specific comments."
                className="mt-4 min-h-32 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" disabled={saving || !body.trim()} onClick={() => addComment(true)}>
                  <MessageSquareMore className="h-4 w-4" />
                  Add at {formatSeconds(currentTime)}
                </button>
                <button type="button" className="btn-secondary" disabled={saving || !body.trim()} onClick={() => addComment(false)}>
                  <TimerReset className="h-4 w-4" />
                  Add general note
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Review log</p>
                <h4 className="mt-1 text-xl font-bold text-text-primary">Comments and notes</h4>
              </div>
              <select className="input-base w-auto" value={sortMode} onChange={(event) => setSortMode(event.target.value as any)}>
                <option value="timestamp">Sort by timestamp</option>
                <option value="newest">Sort by newest</option>
              </select>
            </div>

            <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
              {sortedComments.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-border p-6 text-sm text-text-secondary">
                  No review notes yet.
                </div>
              ) : (
                sortedComments.map((comment) => (
                  <article key={comment.id} className="rounded-[1.75rem] border border-border bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                        {comment.timestamp_seconds != null ? formatSeconds(comment.timestamp_seconds) : 'General note'}
                      </span>
                      <span className="text-xs text-text-tertiary">{comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-text-primary">{comment.body}</p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
