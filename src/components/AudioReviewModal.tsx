import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Layers, MapPin, MessageSquare, Pause, Play, Send, X } from 'lucide-react';
import { saveIdeaComment, updateIdeaCommentTimestamp } from '../lib/supabaseData';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';
import { AudioWaveform } from './AudioWaveform';
import type { WaveformMarker } from './AudioWaveform';

function fmt(value: number) {
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Assign version numbers to audio assets — oldest = v1 */
function labeledAudioAssets(assets: IdeaAsset[]) {
  return [...assets]
    .filter((a) => a.asset_type === 'audio')
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
    .map((a, i) => ({
      ...a,
      version: (a.metadata as any)?.version ?? i + 1,
      versionLabel: `Version ${(a.metadata as any)?.version ?? i + 1}`,
    }));
}

/** Return comments that were created while `asset` was the active version.
 *  = created_at >= asset.created_at AND < next_asset.created_at (or all remaining) */
function commentsForVersion(
  comments: IdeaComment[],
  asset: IdeaAsset & { version: number },
  allVersions: (IdeaAsset & { version: number })[],
): IdeaComment[] {
  const from = asset.created_at ? new Date(asset.created_at).getTime() : 0;
  const idx = allVersions.findIndex((a) => a.id === asset.id);
  const next = allVersions[idx + 1];
  const to = next?.created_at ? new Date(next.created_at).getTime() : Infinity;
  return comments.filter((c) => {
    if (!c.created_at) return true; // include if no timestamp
    const t = new Date(c.created_at).getTime();
    return t >= from && t < to;
  });
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
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(0);
  const [body,          setBody]          = useState('');
  const [generalNote,   setGeneralNote]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [versionOpen,   setVersionOpen]   = useState(false);
  const [addMarkerMode, setAddMarkerMode] = useState(false);
  const [showSections,  setShowSections]  = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const versions = useMemo(() => labeledAudioAssets(assets), [assets]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Always default to the latest version
  const audioAsset = useMemo(() => {
    if (versions.length === 0) return null;
    if (selectedVersionId) {
      return versions.find((v) => v.id === selectedVersionId) ?? versions[versions.length - 1];
    }
    return versions[versions.length - 1];
  }, [versions, selectedVersionId]);

  const versionComments = useMemo(() => {
    if (!audioAsset) return [];
    return commentsForVersion(comments, audioAsset, versions);
  }, [comments, audioAsset, versions]);

  const sortedComments = useMemo(
    () =>
      [...versionComments].sort(
        (a, b) =>
          (a.timestamp_seconds ?? Number.MAX_SAFE_INTEGER) -
          (b.timestamp_seconds ?? Number.MAX_SAFE_INTEGER),
      ),
    [versionComments],
  );


  // Derive waveform markers with truncated labels
  const waveformMarkers: WaveformMarker[] = useMemo(
    () =>
      sortedComments
        .filter((c) => c.timestamp_seconds != null)
        .map((c) => ({
          id: c.id!,
          time: c.timestamp_seconds!,
          label: c.body ? c.body.slice(0, 10) : undefined,
          color: '#f59e0b',
        })),
    [sortedComments],
  );

  // Handle adding a marker: seek to position + focus comment input
  const handleMarkerAdd = useCallback((time: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = time;
    setGeneralNote(false);
    setAddMarkerMode(false);
    setTimeout(() => commentInputRef.current?.focus(), 50);
  }, []);

  // Handle moving a marker: update DB timestamp + refresh
  const handleMarkerMove = useCallback(async (markerId: string, newTime: number) => {
    try {
      await updateIdeaCommentTimestamp(markerId, newTime);
      onSaved();
    } catch (err) {
      console.warn('[AudioReviewModal] marker move failed:', err);
    }
  }, [onSaved]);

  if (!open || !idea) return null;


  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
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
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Audio Review</p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900 truncate">{idea.title}</h3>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {/* Version selector */}
            {versions.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setVersionOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {audioAsset ? `Version ${audioAsset.version}` : 'Version'}
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>
                {versionOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 min-w-[140px] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {[...versions].reverse().map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setSelectedVersionId(v.id); setVersionOpen(false); setCurrentTime(0); setDuration(0); setIsPlaying(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 ${v.id === audioAsset?.id ? 'text-slate-900 bg-slate-50' : 'text-slate-600'}`}
                      >
                        {v.versionLabel}
                        {v.id === versions[versions.length - 1].id && (
                          <span className="ml-2 text-[10px] text-emerald-500 font-bold">latest</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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

              {/* Full-width waveform / scrubber */}
              <AudioWaveform
                audioUrl={audioAsset.file_url}
                currentTime={currentTime}
                duration={duration}
                onSeek={(t) => { if (audioRef.current) audioRef.current.currentTime = t; }}
                markers={waveformMarkers}
                onMarkerAdd={handleMarkerAdd}
                onMarkerMove={handleMarkerMove}
                addMarkerMode={addMarkerMode}
                autoSections={showSections}
                height={72}
              />

              {/* Controls */}
              <div className="flex items-center gap-3 mt-3">
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

                {/* Marker tools */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    title={addMarkerMode ? 'Cancel marker placement' : 'Add marker: click waveform to place'}
                    onClick={() => setAddMarkerMode(v => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      addMarkerMode
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {addMarkerMode ? 'Click waveform…' : 'Mark'}
                  </button>
                  <button
                    type="button"
                    title="Toggle section detection overlay"
                    onClick={() => setShowSections(v => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      showSections
                        ? 'bg-violet-100 text-violet-700 border border-violet-300'
                        : 'border border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Sections
                  </button>
                </div>
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
              {addMarkerMode && (
                <span className="ml-2 text-amber-500 font-semibold">· Click waveform to position</span>
              )}
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
              ref={commentInputRef}
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
              placeholder={addMarkerMode ? 'Click waveform, then type a note…' : 'Add a note…'}
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
              {sortedComments.map((c, i) => {
                const initials = (c.author_name ?? 'A')
                  .split(' ')
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const displayName = c.author_name ?? 'Anonymous';
                const timeLabel = c.created_at
                  ? new Date(c.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : null;

                return (
                  <li
                    key={c.id}
                    className={`flex gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${
                      i < sortedComments.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={displayName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center ring-1 ring-slate-200">
                          <span className="text-[10px] font-bold text-slate-600 leading-none">{initials}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header row: name · time chip */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-slate-700 leading-none">{displayName}</span>
                        {c.timestamp_seconds != null && (
                          <button
                            type="button"
                            onClick={() => jumpTo(c.timestamp_seconds!)}
                            className="rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 font-mono transition-colors"
                            title="Jump to this moment"
                          >
                            ▶ {fmt(c.timestamp_seconds)}
                          </button>
                        )}
                        {timeLabel && (
                          <span className="text-[10px] text-slate-400 ml-auto">{timeLabel}</span>
                        )}
                      </div>
                      {/* Body */}
                      <p className="text-sm text-slate-800 leading-relaxed">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
