import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Upload, X } from 'lucide-react';
import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { IdeaRecord } from '../types/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['demo', 'in_progress', 'review', 'done'] as const;

const STATUS_LABELS: Record<string, string> = {
  demo:        'Demo — first spark',
  in_progress: 'In Progress — actively building',
  review:      'Review — ready for feedback',
  done:        'Done — finished',
};

const MAX_AUDIO_MB = 50;

// ─── Props ────────────────────────────────────────────────────────────────────

interface IdeaFormModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IdeaFormModal({ open, idea, onClose, onSaved }: IdeaFormModalProps) {
  const { authUser } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState<string>('demo');
  const [isCollab,    setIsCollab]    = useState(false);
  const [isPublic,    setIsPublic]    = useState(false);
  const [projectLink, setProjectLink] = useState('');
  const [audioFile,   setAudioFile]   = useState<File | null>(null);
  const [fileError,   setFileError]   = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (!open) return;
    setTitle(idea?.title ?? '');
    setDescription(idea?.description ?? '');
    setStatus(idea?.status ?? 'demo');
    setIsCollab(idea?.is_collab ?? false);
    setIsPublic(idea?.is_public ?? false);
    setProjectLink('');
    setAudioFile(null);
    setFileError(null);
    setError(null);
  }, [open, idea]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setFileError('Only audio files are accepted (MP3, WAV, FLAC, AAC, etc.).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setFileError(`File must be under ${MAX_AUDIO_MB} MB.`);
      e.target.value = '';
      return;
    }
    setFileError(null);
    setAudioFile(file);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const saved = await saveIdea({
        ...(idea?.id ? { id: idea.id } : {}),
        title: title.trim(),
        description: description.trim() || null,
        status,
        is_collab: isCollab,
        is_public: isPublic,
        created_by: idea?.created_by ?? authUser?.id ?? null,
      });

      const ideaId = saved.id;

      // Upload audio file if provided
      if (audioFile && ideaId) {
        await uploadIdeaAudio(audioFile, ideaId);
      }

      // Save project / Dropbox link if provided
      if (projectLink.trim() && ideaId) {
        await saveIdeaAsset({
          idea_id: ideaId,
          file_url: projectLink.trim(),
          asset_type: 'project_link',
          metadata: { label: 'Project / Dropbox link' },
        });
      }

      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-[2rem] border border-border bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Studio</p>
            <h3 className="mt-1 text-2xl font-bold text-text-primary">
              {idea ? 'Edit idea' : 'New idea'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition-colors hover:bg-surface-raised"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Title */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Title *
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 'Float Away' demo"
              className="input-base"
            />
          </label>

          {/* Description */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concept, BPM, key, references, vibe…"
              className="min-h-24 w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>

          {/* Status */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          {/* Audio upload */}
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Audio file (MP3 / WAV / FLAC — max {MAX_AUDIO_MB} MB)
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-slate-50 px-5 py-7 text-sm text-text-secondary transition-colors hover:border-brand hover:bg-brand/5"
            >
              <Upload className="h-5 w-5 shrink-0 text-brand" />
              {audioFile ? (
                <span className="font-medium text-text-primary">{audioFile.name}</span>
              ) : (
                <span>Click or drag an audio file here</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileError && (
              <p className="mt-2 text-xs text-red-600">{fileError}</p>
            )}
          </div>

          {/* Project / Dropbox link */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Dropbox / project link (optional)
            </span>
            <div className="relative">
              <Paperclip className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="url"
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                placeholder="https://dropbox.com/…"
                className="input-base pl-10"
              />
            </div>
          </label>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isCollab}
                onChange={(e) => setIsCollab(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium text-text-primary">Open for collaboration</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm font-medium text-text-primary">Visible on public portal</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save idea'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
