import React, { useMemo, useRef, useState } from 'react';
import { Download, MessageSquare, Pause, Play, Send, X } from 'lucide-react';
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-950/50 p-0 sm:p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Audio Review</p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900 truncate">{idea.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Player ───────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5 shrink-0 border-b border-slate-100">
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

              {/* File name + download */}
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {(audioAsset.metadata as any)?.name ?? 'Audio file'}
                </p>
                <a
                  href={audioAsset.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>

              {/* Full-width scrubber */}
              <div
                ref={progressRef}
                onClick={seek}
                className="relative h-10 cursor-pointer flex items-center"
              >
                {/* Track */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-100" />
                {/* Fill */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-900 pointer-events-none"
                  style={{ width: `${progress}%` }}
                />
                {/* Comment marker dots */}
                {duration > 0 &&
                  sortedComments
                    .filter((c) => c.timestamp_seconds != null)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white pointer-events-none"
                        style={{ left: `calc(${(c.timestamp_seconds! / duration) * 100}% - 4px)` }}
                      />
                    ))}
                {/* Scrubber thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 shadow-md pointer-events-none"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>

              {/* Controls */}
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
                {sortedComments.filter((c) => c.timestamp_seconds != null).length > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                    {sortedComments.filter((c) => c.timestamp_seconds != null).length} marker
                    {sortedComments.filter((c) => c.timestamp_seconds != null).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-2">No audio attached to this idea yet.</p>
          )}
        </div>

        {/* ── Compose ──────────────────────────────────────────── */}
        <div className="px-6 py-4 shrink-0 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
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
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              placeholder="Add a note…"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 transition-colors"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={saving || !body.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Comments feed ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {sortedComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No notes yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Play the track and add a comment at any moment.
              </p>
            </div>
          ) : (
            <ul>
              {sortedComments.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex gap-3 px-6 py-4 hover:bg-slate-50 transition-colors ${
                    i < sortedComments.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  {c.timestamp_seconds != null ? (
                    <button
                      type="button"
                      onClick={() => jumpTo(c.timestamp_seconds!)}
                      className="shrink-0 mt-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 font-mono transition-colors"
                      title="Jump to this moment"
                    >
                      {fmt(c.timestamp_seconds)}
                    </button>
                  ) : (
                    <span className="shrink-0 mt-0.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400">
                      note
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-relaxed">{c.body}</p>
                    {c.created_at && (
                      <p className="text-[10px] text-slate-400 mt-1">
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
  );
}
