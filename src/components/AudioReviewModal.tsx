import React, { useMemo, useRef, useState } from 'react';
import { Download, MessageSquare, Pause, Play, Send } from 'lucide-react';
import { saveIdeaComment } from '../lib/supabaseData';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';

function fmt(value: number) {
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [body, setBody] = useState('');
  const [generalNote, setGeneralNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const audioAsset = assets.find((a) => a.asset_type === 'audio');

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          (a.timestamp_seconds ?? Number.MAX_SAFE_INTEGER) -
          (b.timestamp_seconds ?? Number.MAX_SAFE_INTEGER),
      ),
    [comments],
  );

  if (!open || !idea) return null;

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

  const addComment = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await saveIdeaComment({
        idea_id: idea.id,
        body: body.trim(),
        timestamp_seconds: generalNote ? null : currentTime,
      });
      setBody('');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const jumpTo = (ts: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = ts;
    a.play();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Audio Review</p>
            <h3 className="mt-0.5 text-lg font-bold text-text-primary truncate">{idea.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary shrink-0">Close</button>
        </div>

        <div className="flex-1 overflow-hidden grid lg:grid-cols-[1fr_1fr]">

          {/* ── Left: Player + compose ─────────────────────────────── */}
          <div className="flex flex-col border-r border-border">

            {/* Dark player */}
            <div className="bg-slate-950 px-6 py-5 shrink-0">
              {audioAsset ? (
                <>
                  <audio
                    ref={audioRef}
                    src={audioAsset.file_url}
                    onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                    onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => console.error('[AudioReview] Failed to load audio src:', audioAsset.file_url)}
                    preload="metadata"
                  />

                  {/* Track name + download */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-white truncate">
                      {(audioAsset.metadata as any)?.name ?? 'Audio file'}
                    </p>
                    <a
                      href={audioAsset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 shrink-0 text-slate-500 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Progress bar + comment markers */}
                  <div
                    ref={progressRef}
                    onClick={seek}
                    className="relative h-2 rounded-full bg-slate-700 cursor-pointer group mb-4"
                  >
                    {/* Fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-violet-500 pointer-events-none transition-none"
                      style={{ width: `${progress}%` }}
                    />
                    {/* Comment markers */}
                    {duration > 0 &&
                      sortedComments
                        .filter((c) => c.timestamp_seconds != null)
                        .map((c) => (
                          <div
                            key={c.id}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 border-2 border-slate-950 pointer-events-none"
                            style={{ left: `calc(${(c.timestamp_seconds! / duration) * 100}% - 4px)` }}
                          />
                        ))}
                    {/* Hover playhead */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${progress}% - 7px)` }}
                    />
                  </div>

                  {/* Controls row */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors shrink-0"
                    >
                      {isPlaying
                        ? <Pause className="h-4 w-4 text-white fill-white" />
                        : <Play className="h-4 w-4 text-white fill-white ml-0.5" />}
                    </button>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {fmt(currentTime)} / {fmt(duration)}
                    </span>
                    {sortedComments.filter((c) => c.timestamp_seconds != null).length > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                        {sortedComments.filter((c) => c.timestamp_seconds != null).length} marker{sortedComments.filter((c) => c.timestamp_seconds != null).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 py-2">No audio uploaded yet.</p>
              )}
            </div>

            {/* Compose */}
            <div className="p-5 flex-1 flex flex-col justify-start">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">
                  {generalNote ? 'General note' : `Comment at ${fmt(currentTime)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setGeneralNote((v) => !v)}
                  className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {generalNote ? '+ Use timestamp' : 'Make general'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl border border-border bg-slate-50 px-4 py-2.5 text-sm text-text-primary outline-none focus:border-violet-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={addComment}
                  disabled={saving || !body.trim()}
                  className="btn-primary px-3 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Comments feed ────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border shrink-0">
              <p className="text-sm font-semibold text-text-primary">
                {comments.length > 0
                  ? `${comments.length} note${comments.length === 1 ? '' : 's'}`
                  : 'Notes'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <MessageSquare className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">No notes yet</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Play the track and drop a comment at any moment.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sortedComments.map((c) => (
                    <li key={c.id} className="flex gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                      {c.timestamp_seconds != null ? (
                        <button
                          type="button"
                          onClick={() => jumpTo(c.timestamp_seconds!)}
                          className="shrink-0 mt-0.5 rounded-md bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-0.5 text-[11px] font-bold text-violet-600 font-mono transition-colors"
                          title="Jump to this moment"
                        >
                          {fmt(c.timestamp_seconds)}
                        </button>
                      ) : (
                        <span className="shrink-0 mt-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-text-tertiary">
                          note
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary leading-relaxed">{c.body}</p>
                        {c.created_at && (
                          <p className="text-[10px] text-text-tertiary mt-1">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
