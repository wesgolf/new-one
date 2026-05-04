import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Upload, X } from 'lucide-react';
import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { analyzeIdeaAudioInBackground } from '../lib/ideaAudioAnalysis';
import { dropboxConfigured, shouldFallbackFromDropbox, uploadAudioToDropbox } from '../services/dropboxService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from '../lib/utils';
import type { IdeaRecord } from '../types/domain';

const STATUSES = [
  { value: 'demo',        label: 'Demo'        },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review'      },
  { value: 'done',        label: 'Done'        },
] as const;

const NEXT_ACTIONS = [
  { value: 'needs_feedback', label: 'Needs feedback' },
  { value: 'needs_rewrite', label: 'Needs rewrite' },
  { value: 'ready_to_promote', label: 'Ready to promote' },
  { value: 'release_planning', label: 'Release planning' },
  { value: 'archive', label: 'Archive' },
] as const;

const MAX_AUDIO_MB = 50;

const inputCls = 'input-base bg-white';
const labelCls =
  'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400';

interface IdeaFormModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  existingAudioCount?: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function IdeaFormModal({ open, idea, existingAudioCount = 0, onClose, onSaved }: IdeaFormModalProps) {
  const { authUser, profile } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('demo');
  const [nextAction, setNextAction] = useState<string>('needs_feedback');
  const [isCollab, setIsCollab] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [persistedIdeaId, setPersistedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPersistedIdeaId(idea?.id ?? null);
    setTitle(idea?.title ?? '');
    setTitleError(false);
    setDescription(idea?.description ?? '');
    setStatus(idea?.status ?? 'demo');
    setNextAction(idea?.next_action ?? 'needs_feedback');
    setIsCollab(idea?.is_collab ?? false);
    setAudioFile(null);
    setVersionNote('');
    setIsDragging(false);
    setFileError(null);
    setFormError(null);
    setFormNotice(null);
  }, [open, idea]);

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      setFileError('Only audio files are accepted (MP3, WAV, FLAC, AAC).');
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setFileError(`File must be under ${MAX_AUDIO_MB} MB.`);
      return;
    }
    setFileError(null);
    setAudioFile(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) acceptFile(file);
      e.target.value = '';
    },
    [acceptFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) acceptFile(file);
    },
    [acceptFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setSaving(true);
    setFormError(null);
    setFormNotice(null);

    try {
      const saved = await saveIdea({
        ...((idea?.id ?? persistedIdeaId) ? { id: idea?.id ?? persistedIdeaId ?? undefined } : {}),
        title: title.trim(),
        description: description.trim() || null,
        status,
        next_action: nextAction,
        is_collab: isCollab,
        is_public: isCollab,  // public collab lab listing
        user_id: idea?.user_id ?? authUser?.id ?? null,
      });
      setPersistedIdeaId(saved.id);

      if (audioFile && saved.id) {
        const nextVersion = existingAudioCount + 1;
        try {
          let uploadedAsset: { id: string; file_url: string } | null = null;
          if (dropboxConfigured()) {
            try {
              const { url, path } = await uploadAudioToDropbox(audioFile, saved.id);
              uploadedAsset = await saveIdeaAsset({
                idea_id: saved.id,
                file_url: url,
                asset_type: 'audio',
                metadata: {
                  name: audioFile.name,
                  size: audioFile.size,
                  dropbox_path: path,
                  uploaded_by: authUser?.id ?? null,
                  uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
                  version: nextVersion,
                  note: versionNote.trim() || null,
                  note_updated_at: versionNote.trim() ? new Date().toISOString() : null,
                },
              });
            } catch (dropboxErr) {
              if (!shouldFallbackFromDropbox(dropboxErr)) throw dropboxErr;
              uploadedAsset = await uploadIdeaAudio(audioFile, saved.id, {
                uploaded_by: authUser?.id ?? null,
                uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
                version: nextVersion,
                note: versionNote.trim() || null,
                note_updated_at: versionNote.trim() ? new Date().toISOString() : null,
              });
              setFormNotice('Dropbox upload failed, so the audio was saved to app storage instead.');
            }
          } else {
            uploadedAsset = await uploadIdeaAudio(audioFile, saved.id, {
              uploaded_by: authUser?.id ?? null,
              uploaded_by_name: profile?.full_name ?? authUser?.email ?? 'You',
              version: nextVersion,
              note: versionNote.trim() || null,
              note_updated_at: versionNote.trim() ? new Date().toISOString() : null,
            });
          }

          if (uploadedAsset?.file_url) {
            setFormNotice('Audio saved. BPM and key analysis is running in the background.');
            void analyzeIdeaAudioInBackground({
              ideaId: saved.id,
              assetId: uploadedAsset.id,
              sourceUrl: uploadedAsset.file_url,
            });
          }
        } catch (uploadErr: any) {
          setFormError(
            `Audio upload failed: ${uploadErr?.message ?? 'unknown error'}. The idea record was kept, so you can retry without losing the draft.`,
          );
          return;
        }
      }

      await onSaved();
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const nextVersionNumber = existingAudioCount + 1;
  const isEditing = Boolean(idea);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-modal flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden"
      >
        <div className="relative border-b border-border px-7 py-6">
          <div className="absolute inset-y-0 left-0 w-32 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_72%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-600 p-2.5 shadow-md shadow-blue-100">
                <Music2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {idea ? 'Update idea' : 'Capture idea'}
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {idea ? 'Edit Track' : 'New Track Idea'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Keep the creative context, attach the right version, and set the next action before it gets lost.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {formError && (
          <div className="mx-7 mb-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <span className="flex-1">{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-400 hover:text-rose-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {formNotice && (
          <div className="mx-7 mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <span className="flex-1">{formNotice}</span>
            <button
              type="button"
              onClick={() => setFormNotice(null)}
              className="text-amber-500 hover:text-amber-700 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-6">
          <section className="space-y-2">
            <label className={labelCls}>Track Title</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Float Away demo"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
              className={cn(inputCls, titleError && 'border-rose-300 focus:ring-rose-400 bg-rose-50')}
            />
            {titleError && (
              <p className="mt-1.5 text-[11px] text-rose-500 font-medium">A title is required.</p>
            )}
          </section>

          <section className="space-y-2">
            <label className={labelCls}>
              Notes <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Concept, references, mood, vibe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(inputCls, 'resize-none')}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition-all',
                      status === s.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-border bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Next Action</label>
              <select
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className={inputCls}
              >
                {NEXT_ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-4 rounded-[1.6rem] border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className={labelCls}>Audio — max {MAX_AUDIO_MB} MB</label>
                <p className="mb-3 text-sm text-slate-500">
                  Attach the version you want reviewed. If you upload a new file while editing, it becomes the next version automatically.
                </p>
              </div>
              {audioFile ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Ready
                </span>
              ) : null}
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !audioFile && fileRef.current?.click()}
              className={cn(
                'relative flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed px-5 py-8 text-sm transition-all',
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : audioFile
                    ? 'border-emerald-200 bg-emerald-50 cursor-default'
                    : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40',
              )}
            >
              {audioFile ? (
                <>
                  <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm">
                    <Music2 className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="text-center">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {audioFile.name}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAudioFile(null); setFileError(null); }}
                    className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Upload className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700 text-center">
                    Drop audio here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400">MP3 · WAV · FLAC · AAC</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileError && (
              <p className="mt-1.5 text-xs text-rose-500 font-medium">{fileError}</p>
            )}
            {audioFile ? (
              <div className="mt-4">
                <label className={labelCls}>Version Note</label>
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="e.g. tighter drums, mix pass 2"
                  className={inputCls}
                />
              </div>
            ) : null}
            {isEditing ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                {existingAudioCount > 0 ? (
                  <>
                    <p className="font-semibold text-slate-700">
                      {existingAudioCount} audio version{existingAudioCount === 1 ? '' : 's'} attached
                    </p>
                    <p className="mt-1">
                      Uploading a new file here will add <span className="font-semibold text-slate-700">Version {nextVersionNumber}</span>.
                    </p>
                  </>
                ) : (
                  <p>This idea does not have an audio version yet. Upload a file here to add Version 1.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.6rem] border border-border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Public collab workflow</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              This is paused for now, so new ideas can’t be opened to the public collab portal yet.
            </p>
            {isCollab ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                This idea is still marked as collaborative from an older workflow, but the public collab surface is currently paused.
              </div>
            ) : null}
          </section>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border bg-white/95 px-7 py-4 backdrop-blur">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              ) : isEditing ? (audioFile ? `Save + add Version ${nextVersionNumber}` : 'Save changes') : 'Create track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
