import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Upload, X } from 'lucide-react';
import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { dropboxConfigured, uploadAudioToDropbox } from '../services/dropboxService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from '../lib/utils';
import type { IdeaRecord } from '../types/domain';

const STATUSES = [
  { value: 'demo',        label: 'Demo'        },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review'      },
  { value: 'done',        label: 'Done'        },
] as const;

const MAX_AUDIO_MB = 50;

const inputCls =
  'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
const labelCls =
  'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

interface IdeaFormModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  existingAudioCount?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function IdeaFormModal({ open, idea, existingAudioCount = 0, onClose, onSaved }: IdeaFormModalProps) {
  const { authUser } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('demo');
  const [isCollab, setIsCollab] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(idea?.title ?? '');
    setTitleError(false);
    setDescription(idea?.description ?? '');
    setStatus(idea?.status ?? 'demo');
    setIsCollab(idea?.is_collab ?? false);
    setAudioFile(null);
    setIsDragging(false);
    setFileError(null);
    setFormError(null);
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

    try {
      const saved = await saveIdea({
        ...(idea?.id ? { id: idea.id } : {}),
        title: title.trim(),
        description: description.trim() || null,
        status,
        is_collab: isCollab,
        is_public: isCollab,  // public collab lab listing
        user_id: idea?.user_id ?? authUser?.id ?? null,
      });

      if (audioFile && saved.id) {
        const nextVersion = existingAudioCount + 1;
        try {
          if (dropboxConfigured()) {
            const { url, path } = await uploadAudioToDropbox(audioFile, saved.id);
            await saveIdeaAsset({
              idea_id: saved.id,
              file_url: url,
              asset_type: 'audio',
              metadata: { name: audioFile.name, size: audioFile.size, dropbox_path: path, version: nextVersion },
            });
          } else {
            await uploadIdeaAudio(audioFile, saved.id, { version: nextVersion });
          }
        } catch (uploadErr: any) {
          setFormError(
            `Idea saved — but audio upload failed: ${uploadErr?.message ?? 'unknown error'}`,
          );
          onSaved();
          return;
        }
      }

      onSaved();
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-md shadow-blue-100">
              <Music2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {idea ? 'Edit Track' : 'New Track Idea'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Error banner */}
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

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-7 pb-7 space-y-4">

          {/* Title */}
          <div>
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
          </div>

          {/* Description */}
          <div>
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
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>Status</label>
            <div className="grid grid-cols-4 gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'py-2 rounded-xl border text-center text-xs font-semibold transition-all',
                    status === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-700',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio upload */}
          <div>
            <label className={labelCls}>Audio — max {MAX_AUDIO_MB} MB</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !audioFile && fileRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm transition-all relative',
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : audioFile
                    ? 'border-emerald-200 bg-emerald-50 cursor-default'
                    : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40',
              )}
            >
              {audioFile ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Music2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-semibold truncate max-w-[200px]">
                      {audioFile.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAudioFile(null); setFileError(null); }}
                    className="absolute right-2.5 top-2.5 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400" />
                  <p className="font-medium text-slate-600 text-center">
                    Drop a file here, or click to browse
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
          </div>

          {/* Collab toggle */}
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <div>
              <p className="text-sm font-semibold text-slate-800">Open for collab</p>
              <p className="text-[11px] text-slate-400 mt-0.5">List this track on the public Collab Lab for feedback &amp; contributions</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isCollab}
              onClick={() => setIsCollab((v) => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ml-4',
                isCollab ? 'bg-blue-600' : 'bg-slate-200',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  isCollab ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              ) : idea ? 'Save changes' : 'Create track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

