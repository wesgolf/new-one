import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music2, Paperclip, Upload, X } from 'lucide-react';
import { saveIdea, saveIdeaAsset, uploadIdeaAudio } from '../lib/supabaseData';
import { dropboxConfigured, uploadAudioToDropbox } from '../services/dropboxService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { cn } from '../lib/utils';
import type { IdeaRecord } from '../types/domain';

const STATUSES = [
  { value: 'demo',        label: 'Demo',        desc: 'First spark, raw idea'    },
  { value: 'in_progress', label: 'In Progress', desc: 'Actively building'        },
  { value: 'review',      label: 'Review',      desc: 'Ready for feedback'       },
  { value: 'done',        label: 'Done',        desc: 'Finished and wrapped'     },
] as const;

const KEY_OPTIONS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
] as const;

const GENRES = [
  'Electronic', 'Hip-Hop', 'R&B', 'House', 'Techno',
  'Ambient', 'Pop', 'Afrobeats', 'Drill', 'Lo-fi', 'Experimental', 'Other',
];

const MAX_AUDIO_MB = 50;

const inputCls =
  'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';
const labelCls =
  'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

interface IdeaFormModalProps {
  open: boolean;
  idea: IdeaRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export function IdeaFormModal({ open, idea, onClose, onSaved }: IdeaFormModalProps) {
  const { authUser } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('demo');
  const [bpm, setBpm] = useState('');
  const [keySig, setKeySig] = useState('');
  const [genre, setGenre] = useState('');
  const [isCollab, setIsCollab] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [projectLink, setProjectLink] = useState('');
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
    setBpm(idea?.bpm != null ? String(idea.bpm) : '');
    setKeySig(idea?.key_sig ?? '');
    setGenre(idea?.genre ?? '');
    setIsCollab(idea?.is_collab ?? false);
    setIsPublic(idea?.is_public ?? false);
    setProjectLink('');
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
        bpm: bpm ? Number(bpm) : null,
        key_sig: keySig || null,
        genre: genre || null,
        is_collab: isCollab,
        is_public: isPublic,
        user_id: idea?.user_id ?? authUser?.id ?? null,
      });

      if (audioFile && saved.id) {
        try {
          if (dropboxConfigured()) {
            const { url, path } = await uploadAudioToDropbox(audioFile, saved.id);
            await saveIdeaAsset({
              idea_id: saved.id,
              file_url: url,
              asset_type: 'audio',
              metadata: { name: audioFile.name, size: audioFile.size, dropbox_path: path },
            });
          } else {
            await uploadIdeaAudio(audioFile, saved.id);
          }
        } catch (uploadErr: any) {
          setFormError(
            `Idea saved — but audio upload failed: ${uploadErr?.message ?? 'unknown error'}`,
          );
          onSaved();
          return;
        }
      }

      if (projectLink.trim() && saved.id) {
        await saveIdeaAsset({
          idea_id: saved.id,
          file_url: projectLink.trim(),
          asset_type: 'project_link',
          metadata: { label: 'Project / Dropbox link' },
        });
      }

      onSaved();
    } catch (err: any) {
      const msg: string = err?.message ?? 'Failed to save — please try again.';
      setFormError(
        msg.includes('schema cache') || msg.includes('column')
          ? 'Database schema mismatch. Please run the latest SQL migration in Supabase.'
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
              <Music2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {idea ? 'Edit Track' : 'New Track Idea'}
              </h3>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                Studio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Error banner */}
        {formError && (
          <div className="mx-8 mb-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <span className="flex-1">{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-400 hover:text-rose-600 mt-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Scrollable form */}
        <form
          onSubmit={handleSubmit}
          id="idea-form"
          className="overflow-y-auto px-8 pb-8 space-y-5"
        >
          {/* Title */}
          <div>
            <label className={labelCls}>Track Title *</label>
            <input
              autoFocus
              required
              type="text"
              placeholder="e.g. Float Away demo"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(false);
              }}
              className={cn(
                inputCls,
                titleError && 'border-rose-300 focus:ring-rose-300 bg-rose-50',
              )}
            />
            {titleError && (
              <p className="mt-1 text-[11px] text-rose-500">A title is required.</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              Description{' '}
              <span className="normal-case font-normal text-slate-400">(optional)</span>
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
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    status === s.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200',
                  )}
                >
                  <p className="text-xs font-bold text-slate-900">{s.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* BPM + Key */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>BPM</label>
              <input
                type="number"
                min={40}
                max={300}
                placeholder="120"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Key</label>
              <select
                value={keySig}
                onChange={(e) => setKeySig(e.target.value)}
                className={inputCls}
              >
                <option value="">None</option>
                {KEY_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className={labelCls}>Genre</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(genre === g ? '' : g)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                    genre === g
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-100 text-slate-600 hover:border-slate-200',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Audio upload */}
          <div>
            <label className={labelCls}>Audio file — max {MAX_AUDIO_MB} MB</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !audioFile && fileRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-sm transition-all relative',
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
                    <span className="text-sm font-semibold truncate max-w-[220px]">
                      {audioFile.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioFile(null);
                      setFileError(null);
                    }}
                    className="absolute right-3 top-3 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-400" />
                  <p className="font-medium text-slate-600">
                    Drop an audio file here, or click to browse
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
            {fileError && <p className="mt-1.5 text-xs text-rose-500">{fileError}</p>}
          </div>

          {/* Project link */}
          <div>
            <label className={labelCls}>
              Dropbox / Project link{' '}
              <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <Paperclip className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="url"
                placeholder="https://dropbox.com/..."
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {(
              [
                {
                  checked: isCollab,
                  set: setIsCollab,
                  label: 'Open for collaboration',
                  sub: 'Show this track to potential collaborators',
                },
                {
                  checked: isPublic,
                  set: setIsPublic,
                  label: 'Visible on public portal',
                  sub: 'Fans can see this on your public hub',
                },
              ] as const
            ).map(({ checked, set, label, sub }) => (
              <label key={label} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  onClick={() => set(!checked)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none',
                    checked ? 'bg-blue-600' : 'bg-slate-200',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                      checked ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : idea ? (
                'Save changes'
              ) : (
                'Create track'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
