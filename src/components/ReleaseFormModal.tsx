import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { saveRelease, uploadReleaseArtwork } from '../lib/supabaseData';
import type { ReleaseRecord } from '../types/domain';

const STATUSES = ['unreleased', 'scheduled', 'released'] as const;
const KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm',
  'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
];

interface Props {
  open: boolean;
  release: ReleaseRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ReleaseFormModal({ open, release, onClose, onSaved }: Props) {
  const [title,           setTitle]           = useState('');
  const [artistName,      setArtistName]      = useState('');
  const [releaseDate,     setReleaseDate]     = useState('');
  const [status,          setStatus]          = useState<string>('unreleased');
  const [bpm,             setBpm]             = useState('');
  const [musicalKey,      setMusicalKey]      = useState('');
  const [isrc,            setIsrc]            = useState('');
  const [spotifyTrackId,  setSpotifyTrackId]  = useState('');
  const [soundcloudId,    setSoundcloudId]    = useState('');
  const [notes,           setNotes]           = useState('');
  const [artworkFile,     setArtworkFile]     = useState<File | null>(null);
  const [artworkPreview,  setArtworkPreview]  = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (release) {
      setTitle(release.title ?? '');
      setArtistName(release.artist_name ?? '');
      setReleaseDate(release.release_date ?? '');
      setStatus(release.status ?? 'unreleased');
      setBpm(release.bpm != null ? String(release.bpm) : '');
      setMusicalKey(release.musical_key ?? '');
      setIsrc(release.isrc ?? '');
      setSpotifyTrackId(release.spotify_track_id ?? '');
      setSoundcloudId(release.soundcloud_track_id ?? '');
      setNotes(release.notes ?? '');
      setArtworkPreview(release.cover_art_url ?? null);
    } else {
      setTitle(''); setArtistName(''); setReleaseDate(''); setStatus('unreleased');
      setBpm(''); setMusicalKey(''); setIsrc(''); setSpotifyTrackId('');
      setSoundcloudId(''); setNotes('');
      setArtworkPreview(null);
    }
    setArtworkFile(null);
    setError(null);
  }, [open, release]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB'); return; }
    setArtworkFile(file);
    setArtworkPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<ReleaseRecord> = {
        ...(release?.id ? { id: release.id } : {}),
        title: title.trim(),
        artist_name: artistName.trim() || null,
        release_date: releaseDate || null,
        status,
        bpm: bpm ? parseInt(bpm, 10) : null,
        musical_key: musicalKey || null,
        isrc: isrc.trim() || null,
        spotify_track_id: spotifyTrackId.trim() || null,
        soundcloud_track_id: soundcloudId.trim() || null,
        notes: notes.trim() || null,
      };
      await saveRelease(payload);

      // Upload artwork after we have an id
      if (artworkFile && release?.id) {
        await uploadReleaseArtwork(release.id, artworkFile);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-8 pt-8 pb-0">
          <h2 className="text-2xl font-bold text-slate-900">
            {release ? 'Edit release' : 'New release'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Artwork upload */}
          <div
            className="relative flex aspect-[3/1] cursor-pointer items-center justify-center overflow-hidden rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
            onClick={() => fileInputRef.current?.click()}
          >
            {artworkPreview ? (
              <img src={artworkPreview} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImagePlus className="h-8 w-8" />
                <p className="text-xs font-medium">Upload cover art (max 10 MB)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title + artist */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Title *</label>
              <input
                className="input-base mt-1"
                placeholder="Song or project title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Artist name</label>
              <input
                className="input-base mt-1"
                placeholder="WES, feat. …"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>
          </div>

          {/* Date + status */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Release date</label>
              <input
                type="date"
                className="input-base mt-1"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</label>
              <select
                className="input-base mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BPM + Key */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">BPM</label>
              <input
                type="number"
                min={40}
                max={300}
                className="input-base mt-1"
                placeholder="128"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Musical key</label>
              <select
                className="input-base mt-1"
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
              >
                <option value="">Select key</option>
                {KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          {/* IDs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ISRC</label>
              <input
                className="input-base mt-1"
                placeholder="USRC12345678"
                value={isrc}
                onChange={(e) => setIsrc(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Spotify track ID</label>
              <input
                className="input-base mt-1"
                placeholder="4uLU6hMCjMI75M1A2tKUQC"
                value={spotifyTrackId}
                onChange={(e) => setSpotifyTrackId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">SoundCloud track ID</label>
            <input
              className="input-base mt-1"
              placeholder="12345678"
              value={soundcloudId}
              onChange={(e) => setSoundcloudId(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
            <textarea
              className="input-base mt-1 min-h-[80px]"
              placeholder="Mix notes, context, campaign ideas…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : release ? 'Save changes' : 'Create release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
