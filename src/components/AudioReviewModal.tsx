import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Layers, Loader2, MapPin, MessageSquare, Pause, Play, Plus, Rocket, Send, Upload, X } from 'lucide-react';
import { analyzeIdeaAudioInBackground } from '../lib/ideaAudioAnalysis';
import { saveIdea, saveIdeaAsset, saveIdeaComment, updateIdeaCommentTimestamp, uploadIdeaAudio } from '../lib/supabaseData';
import { dropboxConfigured, shouldFallbackFromDropbox, uploadAudioToDropbox } from '../services/dropboxService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { IdeaAsset, IdeaComment, IdeaRecord } from '../types/domain';
import AudioWaveform from './AudioWaveform';
import type { WaveformMarker } from './AudioWaveform';

function fmt(value: number) {
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatMetaDate(value?: string | null) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

/** Return comments for the selected version.
 * Prefer explicit asset/version linkage; fall back to the older timestamp-based
 * heuristic for legacy comments created before version ids were stored. */
function commentsForVersion(
  comments: IdeaComment[],
  asset: IdeaAsset & { version: number },
  allVersions: (IdeaAsset & { version: number })[],
): IdeaComment[] {
  const explicitIds = new Set<string>();
  const explicit = comments.filter((comment) => {
    if (comment.asset_id) return comment.asset_id === asset.id;
    if (comment.version != null) return comment.version === asset.version;
    return false;
  });
  for (const comment of explicit) explicitIds.add(comment.id);

  const from = asset.created_at ? new Date(asset.created_at).getTime() : 0;
  const idx = allVersions.findIndex((a) => a.id === asset.id);
  const next = allVersions[idx + 1];
  const to = next?.created_at ? new Date(next.created_at).getTime() : Infinity;
  const legacy = comments.filter((c) => {
    if (explicitIds.has(c.id)) return false;
    if (c.asset_id || c.version != null) return false;
    if (!c.created_at) return true; // include if no timestamp
    const t = new Date(c.created_at).getTime();
    return t >= from && t < to;
  });

  return [...explicit, ...legacy];
}

interface AudioReviewModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  assets: IdeaAsset[];
  comments: IdeaComment[];
  initialSelectedVersionId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

type TimelineItem = {
  id: string;
  at: number;
  title: string;
  meta?: string | null;
  body?: string | null;
};

export function AudioReviewModal({ open, idea, assets, comments, initialSelectedVersionId = null, onClose, onSaved }: AudioReviewModalProps) {
  const { authUser, profile } = useCurrentUser();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(0);
  const [body,          setBody]          = useState('');
  const [generalNote,   setGeneralNote]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [versionOpen,   setVersionOpen]   = useState(false);
  const [addMarkerMode, setAddMarkerMode] = useState(false);
  const [showSections,  setShowSections]  = useState(false);
  const [audioError,    setAudioError]    = useState<string | null>(null);
  const [versionUploadFile, setVersionUploadFile] = useState<File | null>(null);
  const [versionUploadNote, setVersionUploadNote] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionNotice, setVersionNotice] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'notes' | 'timeline'>('notes');
  const [promotingRelease, setPromotingRelease] = useState(false);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const versions = useMemo(() => labeledAudioAssets(assets), [assets]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedVersionId(initialSelectedVersionId);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setBody('');
    setGeneralNote(false);
    setAudioError(null);
    setVersionUploadFile(null);
    setVersionUploadNote('');
    setVersionNotice(null);
    setActiveView('notes');
  }, [open, idea?.id, initialSelectedVersionId]);

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

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!idea) return [];

    const items: TimelineItem[] = [];

    if (idea.created_at) {
      items.push({
        id: `idea-created-${idea.id}`,
        at: new Date(idea.created_at).getTime(),
        title: 'Idea created',
        meta: idea.next_action ? `Next action: ${idea.next_action.replaceAll('_', ' ')}` : null,
      });
    }

    for (const version of versions) {
      items.push({
        id: `version-${version.id}`,
        at: new Date(version.created_at ?? 0).getTime(),
        title: `${version.versionLabel} uploaded`,
        meta:
          ((version.metadata as any)?.uploaded_by_name as string | undefined) ??
          ((version.metadata as any)?.note as string | undefined) ??
          null,
        body: (version.metadata as any)?.note ?? null,
      });
    }

    for (const comment of comments) {
      items.push({
        id: `comment-${comment.id}`,
        at: new Date(comment.created_at ?? 0).getTime(),
        title: `${comment.author_name ?? 'A collaborator'} left feedback`,
        meta:
          comment.version != null
            ? `Version ${comment.version}`
            : comment.asset_id
              ? 'Version note'
              : 'General note',
        body: comment.body,
      });
    }

    if (idea.promoted_to_release_at) {
      items.push({
        id: `release-handoff-${idea.id}`,
        at: new Date(idea.promoted_to_release_at).getTime(),
        title: 'Moved into release planning',
        meta:
          idea.release_handoff?.selected_version != null
            ? `Based on Version ${idea.release_handoff.selected_version}`
            : 'Release handoff ready',
      });
    }

    return items.sort((a, b) => b.at - a.at);
  }, [comments, idea, versions]);


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
        asset_id: audioAsset?.id ?? null,
        version: audioAsset?.version ?? null,
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

  const handleVersionFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVersionUploadFile(file);
    event.target.value = '';
  }, []);

  const handleAddVersion = useCallback(async () => {
    if (!idea || !versionUploadFile) return;

    setUploadingVersion(true);
    setVersionNotice(null);
    try {
      const nextVersion = versions.length + 1;
      let createdAsset: IdeaAsset;
      const metadata = {
        version: nextVersion,
        note: versionUploadNote.trim() || null,
        note_updated_at: versionUploadNote.trim() ? new Date().toISOString() : null,
      };

      if (dropboxConfigured()) {
        try {
          const { url, path } = await uploadAudioToDropbox(versionUploadFile, idea.id);
          createdAsset = await saveIdeaAsset({
            idea_id: idea.id,
            file_url: url,
            file_path: path,
            asset_type: 'audio',
            metadata: {
              name: versionUploadFile.name,
              size: versionUploadFile.size,
              dropbox_path: path,
              uploaded_by: authUser?.id ?? null,
              uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
              ...metadata,
            },
          });
        } catch (dropboxErr) {
          if (!shouldFallbackFromDropbox(dropboxErr)) throw dropboxErr;
          createdAsset = await uploadIdeaAudio(versionUploadFile, idea.id, {
            uploaded_by: authUser?.id ?? null,
            uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
            ...metadata,
          });
          setVersionNotice('Dropbox upload failed, so this version was saved to app storage instead.');
        }
      } else {
        createdAsset = await uploadIdeaAudio(versionUploadFile, idea.id, {
          uploaded_by: authUser?.id ?? null,
          uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
          ...metadata,
        });
      }

      setSelectedVersionId(createdAsset.id);
      setVersionUploadFile(null);
      setVersionUploadNote('');
      setVersionNotice('Version saved. BPM and key analysis is running in the background.');
      void analyzeIdeaAudioInBackground({
        ideaId: idea.id,
        assetId: createdAsset.id,
        sourceUrl: createdAsset.file_url,
      });
      await onSaved();
    } catch (error: any) {
      setVersionNotice(error?.message ?? 'Version upload failed.');
    } finally {
      setUploadingVersion(false);
    }
  }, [authUser?.email, authUser?.id, idea, onSaved, profile?.full_name, versionUploadFile, versionUploadNote, versions.length]);

  const handlePromoteToRelease = useCallback(async () => {
    if (!idea) return;

    const promotedAt = new Date().toISOString();
    setPromotingRelease(true);
    try {
      await saveIdea({
        ...idea,
        next_action: 'release_planning',
        promoted_to_release_at: promotedAt,
        release_handoff: {
          promoted_at: promotedAt,
          selected_asset_id: audioAsset?.id ?? null,
          selected_version: audioAsset?.version ?? null,
          title: idea.title,
          notes: idea.description ?? idea.notes ?? null,
          bpm: (audioAsset?.metadata as any)?.analysis_bpm ?? idea.bpm ?? null,
          musical_key: (audioAsset?.metadata as any)?.analysis_key ?? idea.musical_key ?? null,
          audio_file_url: audioAsset?.file_url ?? null,
        },
      });
      setVersionNotice('Moved into release planning.');
      await onSaved();
    } finally {
      setPromotingRelease(false);
    }
  }, [audioAsset, idea, onSaved]);

  if (!open || !idea) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-950/50 p-0 sm:p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-modal flex w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{ maxHeight: '92vh' }}
      >

        <div className="relative shrink-0 border-b border-border px-6 py-5">
          <div className="absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_72%)]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Audio Review</p>
              <h3 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">{idea.title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {audioAsset ? audioAsset.versionLabel : 'No version yet'}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {sortedComments.length} note{sortedComments.length === 1 ? '' : 's'}
                </span>
                {idea.next_action ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                    {idea.next_action.replaceAll('_', ' ')}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handlePromoteToRelease()}
                disabled={promotingRelease || !audioAsset}
                className="btn-secondary !rounded-xl !px-3 !py-2 !text-xs"
              >
                {promotingRelease ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {idea.promoted_to_release_at ? 'Update handoff' : 'Promote'}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary !rounded-xl !px-3 !py-2 !text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add version
              </button>
              {versions.length > 1 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setVersionOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {audioAsset ? `Version ${audioAsset.version}` : 'Version'}
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </button>
                  {versionOpen && (
                    <div className="absolute right-0 top-full z-10 mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {[...versions].reverse().map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => { setSelectedVersionId(v.id); setVersionOpen(false); setCurrentTime(0); setDuration(0); setIsPlaying(false); }}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${v.id === audioAsset?.id ? 'bg-slate-50 text-slate-900' : 'text-slate-600'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{v.versionLabel}</span>
                            {v.id === versions[versions.length - 1].id && (
                              <span className="text-[10px] font-bold text-emerald-500">latest</span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">{formatMetaDate(v.created_at)}</p>
                          {(v.metadata as any)?.note ? (
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{String((v.metadata as any).note)}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={handleVersionFileChange}
        />

        <div className="shrink-0 border-b border-slate-100 px-6 py-6">
          {versionNotice ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {versionNotice}
            </div>
          ) : null}
          {versionUploadFile ? (
            <div className="mb-5 rounded-[1.6rem] border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Add Version {versions.length + 1}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{versionUploadFile.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVersionUploadFile(null);
                    setVersionUploadNote('');
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={versionUploadNote}
                  onChange={(event) => setVersionUploadNote(event.target.value)}
                  placeholder="Short note for this version"
                  className="flex-1 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => void handleAddVersion()}
                  disabled={uploadingVersion}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploadingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Save version
                </button>
              </div>
            </div>
          ) : null}

          {audioAsset ? (
            <div className="rounded-[1.8rem] border border-slate-200/80 bg-slate-50/80 p-5">
              <audio
                ref={audioRef}
                src={audioAsset.file_url}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={() => setAudioError(null)}
                onError={() => setAudioError('This audio file could not be loaded in the review player.')}
                preload="metadata"
              />

              <div className="mb-5 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-800">
                    {(audioAsset.metadata as any)?.name ?? 'Audio file'}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    {audioAsset.versionLabel}
                    {versions.length > 1 ? ` of ${versions.length}` : ''}
                  </p>
                </div>
                <a
                  href={audioAsset.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>

              {audioError ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {audioError} Try the download button above, then re-upload this version from the idea editor if the link is stale.
                </div>
              ) : null}

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

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 transition-colors hover:bg-slate-700"
                >
                  {isPlaying
                    ? <Pause className="h-4 w-4 text-white fill-white" />
                    : <Play className="h-4 w-4 text-white fill-white ml-0.5" />}
                </button>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    title={addMarkerMode ? 'Cancel marker placement' : 'Add marker: click waveform to place'}
                    onClick={() => setAddMarkerMode(v => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      addMarkerMode
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
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
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Sections
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">Upload the first version to start review.</p>
              <p className="mt-1 text-xs text-slate-400">Once a version is attached, comments and timeline activity will appear here.</p>
            </div>
          )}
        </div>

        {audioAsset ? (
          <div className="shrink-0 border-b border-slate-100 px-6 py-4">
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
                className="input-base flex-1 bg-slate-50"
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
        ) : null}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveView('notes')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeView === 'notes'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/70'
              }`}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveView('timeline')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeView === 'timeline'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-white/70'
              }`}
            >
              Timeline
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            {activeView === 'notes'
              ? `${sortedComments.length} note${sortedComments.length === 1 ? '' : 's'} on this version`
              : `${timelineItems.length} event${timelineItems.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {activeView === 'notes' ? (
            sortedComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <MessageSquare className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No notes yet for this version</p>
              <p className="text-xs text-slate-400 mt-1">
                {versions.length > 0
                  ? 'Play the track and drop feedback at any moment.'
                  : 'Upload the first version to start review.'}
              </p>
            </div>
            ) : (
            <ul className="px-4 py-4">
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
                    className={`flex gap-3 rounded-[1.25rem] px-4 py-3.5 transition-colors hover:bg-slate-50 ${
                      i < sortedComments.length - 1 ? 'mb-2' : ''
                    }`}
                  >
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

                    <div className="flex-1 min-w-0">
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
                      <p className="text-sm text-slate-800 leading-relaxed">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            )
          ) : timelineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Layers className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No timeline activity yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload a version or add feedback to build the track timeline.</p>
            </div>
          ) : (
            <ul className="space-y-3 px-6 py-5">
              {timelineItems.map((item) => (
                <li key={item.id} className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      {item.meta ? (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          {item.meta}
                        </p>
                      ) : null}
                      {item.body ? (
                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.body}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {formatMetaDate(new Date(item.at).toISOString())}
                    </span>
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
