import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Clock, Send, RefreshCw,
  AlertCircle, Loader2, X, Zap, Image as ImageIcon, Video as VideoIcon,
  ArrowRight, Check, Calendar, Eye,
} from 'lucide-react';
import { zernioService, ZernioAccount, ZernioPost, BestTime } from '../services/zernioService';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  bluesky: 'Bluesky',
  facebook: 'Facebook',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  threads: 'Threads',
  googlebusiness: 'Google Business',
  telegram: 'Telegram',
  snapchat: 'Snapchat',
  whatsapp: 'WhatsApp',
  discord: 'Discord',
  reddit: 'Reddit',
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  tiktok: '#010101',
  bluesky: '#0085FF',
  facebook: '#1877F2',
  youtube: '#FF0000',
  pinterest: '#E60023',
  threads: '#101010',
  googlebusiness: '#4285F4',
  telegram: '#2CA5E0',
  snapchat: '#FFFC00',
  whatsapp: '#25D366',
  discord: '#5865F2',
  reddit: '#FF4500',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function formatHour(h: number) {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function platformLabel(p: string) {
  return PLATFORM_LABELS[p.toLowerCase()] ?? p;
}

function platformColor(p: string) {
  return PLATFORM_COLORS[p.toLowerCase()] ?? '#888';
}

function platformInitial(p: string) {
  return (PLATFORM_LABELS[p.toLowerCase()] ?? p)[0].toUpperCase();
}

// ─── Platform Previews ───────────────────────────────────────────────────────

function InstagramPreview({ account, content, mediaUrl, mediaType }: {
  account: ZernioAccount; content: string; mediaUrl: string; mediaType: string;
}) {
  const handle = account.username || account.displayName || 'you';
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-white text-black text-xs max-w-xs mx-auto">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-[9px]">
          {handle[0]?.toUpperCase()}
        </div>
        <span className="font-semibold text-[11px]">{handle}</span>
        <span className="ml-auto text-gray-400">···</span>
      </div>
      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
        {mediaUrl ? (
          mediaType === 'video'
            ? <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline loop autoPlay />
            : <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <ImageIcon className="w-10 h-10 text-gray-300" />
        )}
      </div>
      <div className="px-3 py-2 space-y-1">
        <div className="flex gap-3 text-gray-700 text-base">
          <span>♡</span><span>💬</span><span>↗</span><span className="ml-auto">🔖</span>
        </div>
        <p className="text-[11px] leading-snug">
          <span className="font-semibold">{handle}</span>{' '}
          {content ? content.slice(0, 120) + (content.length > 120 ? '… more' : '') : <span className="text-gray-400">Caption will appear here</span>}
        </p>
      </div>
    </div>
  );
}

function TwitterPreview({ account, content, mediaUrl, mediaType }: {
  account: ZernioAccount; content: string; mediaUrl: string; mediaType: string;
}) {
  const handle = account.username || account.displayName || 'you';
  const overLimit = content.length > 280;
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-white text-black text-xs max-w-xs mx-auto p-3 space-y-2">
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-sky-400 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {handle[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-[11px]">{handle}</span>
            <span className="text-gray-400 text-[10px]">@{handle}</span>
          </div>
          <p className="text-[11px] leading-snug mt-1">
            {content || <span className="text-gray-400">What's happening?</span>}
          </p>
          {mediaUrl && (
            <div className="mt-2 rounded-lg overflow-hidden bg-gray-100 aspect-video flex items-center justify-center">
              {mediaType === 'video'
                ? <VideoIcon className="w-6 h-6 text-gray-400" />
                : <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </div>
          )}
          <div className="flex gap-4 mt-2 text-gray-400 text-xs">
            <span>💬</span><span>🔄</span><span>♡</span><span>📤</span>
          </div>
          {overLimit && <p className="text-rose-500 text-[10px] mt-1">{content.length}/280 — over limit</p>}
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ account, content, mediaUrl }: {
  account: ZernioAccount; content: string; mediaUrl: string;
}) {
  const handle = account.username || account.displayName || 'you';
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-black text-white text-xs max-w-[160px] mx-auto aspect-[9/16] relative flex flex-col justify-end">
      {mediaUrl
        ? <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline loop autoPlay />
        : <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3 text-base">
        <div>❤️<div className="text-[9px] text-center">0</div></div>
        <div>💬<div className="text-[9px] text-center">0</div></div>
        <div>↗<div className="text-[9px] text-center">0</div></div>
      </div>
      <div className="relative z-10 p-2 space-y-1">
        <p className="font-bold text-[10px]">@{handle}</p>
        <p className="text-[9px] leading-snug text-white/80 line-clamp-2">{content || 'Caption here…'}</p>
        <p className="text-[9px] text-white/50">♫ Original Audio</p>
      </div>
    </div>
  );
}

function YouTubePreview({ account, content, mediaUrl }: {
  account: ZernioAccount; content: string; mediaUrl: string;
}) {
  const handle = account.username || account.displayName || 'you';
  const title = content.split('\n')[0].slice(0, 100) || 'Untitled Video';
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-white text-black text-xs max-w-xs mx-auto space-y-2">
      <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
        {mediaUrl
          ? <VideoIcon className="w-10 h-10 text-white/30" />
          : <div className="text-white/20 text-sm">▶</div>}
      </div>
      <div className="px-2 pb-2 flex gap-2">
        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {handle[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-[11px] leading-tight">{title}</p>
          <p className="text-gray-500 text-[10px]">{handle} · 0 views</p>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ account, content, mediaUrl, mediaType }: {
  account: ZernioAccount; content: string; mediaUrl: string; mediaType: string;
}) {
  const handle = account.username || account.displayName || 'you';
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-white text-black text-xs max-w-xs mx-auto p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
          {handle[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-[11px]">{handle}</p>
          <p className="text-gray-400 text-[10px]">1st · Just now</p>
        </div>
        <button className="ml-auto text-blue-600 border border-blue-600 rounded-full px-2 py-0.5 text-[10px] font-semibold">+ Follow</button>
      </div>
      <p className="text-[11px] leading-snug">
        {content.slice(0, 200) + (content.length > 200 ? '…' : '') || <span className="text-gray-400">Post content…</span>}
      </p>
      {mediaUrl && (
        <div className="w-full aspect-video bg-gray-100 rounded flex items-center justify-center">
          {mediaType === 'video' ? <VideoIcon className="w-6 h-6 text-gray-400" /> : <img src={mediaUrl} alt="" className="w-full h-full object-cover rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
      )}
      <div className="flex gap-3 text-gray-400 border-t border-gray-100 pt-2 text-[10px]">
        <span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span>
      </div>
    </div>
  );
}

function GenericPreview({ account, content, mediaUrl, mediaType }: {
  account: ZernioAccount; content: string; mediaUrl: string; mediaType: string;
}) {
  const handle = account.username || account.displayName || 'you';
  const color = platformColor(account.platform);
  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-white text-black text-xs max-w-xs mx-auto p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ background: color }}>
          {platformInitial(account.platform)}
        </div>
        <div>
          <p className="font-semibold text-[11px]">{handle}</p>
          <p className="text-gray-400 text-[10px]">{platformLabel(account.platform)}</p>
        </div>
      </div>
      {mediaUrl && (
        <div className="w-full aspect-video bg-gray-100 rounded flex items-center justify-center">
          {mediaType === 'video' ? <VideoIcon className="w-6 h-6 text-gray-400" /> : <img src={mediaUrl} alt="" className="w-full h-full object-cover rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
      )}
      <p className="text-[11px] leading-snug">{content || <span className="text-gray-400">Content…</span>}</p>
    </div>
  );
}

function PlatformPreview(props: { account: ZernioAccount; content: string; mediaUrl: string; mediaType: string }) {
  switch (props.account.platform.toLowerCase()) {
    case 'instagram': return <InstagramPreview {...props} />;
    case 'twitter': return <TwitterPreview {...props} />;
    case 'tiktok': return <TikTokPreview {...props} />;
    case 'youtube': return <YouTubePreview {...props} />;
    case 'linkedin': return <LinkedInPreview {...props} />;
    default: return <GenericPreview {...props} />;
  }
}

// ─── Calendar Post Card ───────────────────────────────────────────────────────

function PostEventCard({ post }: { post: ZernioPost }) {
  const time = post.scheduledFor || post.publishedAt;
  const timeStr = time ? new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  const platforms = post.platforms.slice(0, 3);
  return (
    <div className="rounded-lg px-2 py-1.5 text-xs space-y-1 border border-border/40 hover:border-brand/40 transition-colors cursor-pointer"
      style={{ background: 'var(--shell-panel)' }}>
      {timeStr && <p className="text-text-muted text-[10px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{timeStr}</p>}
      <p className="text-text-primary line-clamp-2 leading-snug">{post.content || '(no caption)'}</p>
      <div className="flex gap-1 flex-wrap">
        {platforms.map((p, i) => (
          <span key={i} className="rounded-full px-1.5 py-0.5 text-white text-[9px] font-medium"
            style={{ background: platformColor(p.platform) }}>
            {platformInitial(p.platform)}
          </span>
        ))}
        {post.platforms.length > 3 && <span className="text-text-muted text-[9px]">+{post.platforms.length - 3}</span>}
      </div>
    </div>
  );
}

// ─── New Post Modal ───────────────────────────────────────────────────────────

type IgContentType = 'feed' | 'reels' | 'carousel' | 'story';

type ModalState = {
  mediaUrl: string;
  mediaFile: File | null;
  mediaType: 'image' | 'video';
  uploadProgress: number;
  content: string;
  customContents: Record<string, string>;
  useCustom: Record<string, boolean>;
  platformSettings: Record<string, Record<string, any>>; // accountId → settings
  selectedIds: string[];
  activePreviewId: string | null;
  igContentType: IgContentType;
  scheduleDate: string;
  scheduleHour: number | null;
};

const EMPTY_MODAL: ModalState = {
  mediaUrl: '', mediaFile: null, mediaType: 'video', uploadProgress: 0,
  content: '', customContents: {}, useCustom: {}, platformSettings: {},
  selectedIds: [], activePreviewId: null,
  igContentType: 'feed',
  scheduleDate: '', scheduleHour: null,
};

async function uploadToDropbox(file: File): Promise<string> {
  const res = await fetch('/api/dropbox/upload-post-media', {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Dropbox upload failed');
  }
  const data = await res.json();
  return data.url as string;
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Media', 'Content', 'Schedule'];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done ? 'bg-brand text-white' : active ? 'bg-brand text-white' : 'bg-border/40 text-text-muted'
              }`}>
                {done ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-px ${step > n ? 'bg-brand' : 'bg-border/40'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Step1Media({ state, setState }: { state: ModalState; setState: React.Dispatch<React.SetStateAction<ModalState>> }) {
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const blobRef = React.useRef<string | null>(null);

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) return;

    // Show local preview immediately
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const blob = URL.createObjectURL(file);
    blobRef.current = blob;

    setState(s => ({ ...s, mediaFile: file, mediaUrl: blob, mediaType: isVideo ? 'video' : 'image', uploadProgress: 1 }));
    setUploadError(null);

    try {
      // Simulate progress while uploading (fetch doesn't expose upload progress)
      let prog = 10;
      const tick = setInterval(() => {
        prog = Math.min(prog + Math.random() * 15, 85);
        setState(s => ({ ...s, uploadProgress: Math.round(prog) }));
      }, 400);

      const hostedUrl = await uploadToDropbox(file);
      clearInterval(tick);

      // Replace blob URL with real hosted URL
      setState(s => ({ ...s, mediaUrl: hostedUrl, uploadProgress: 100 }));
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed');
      setState(s => ({ ...s, uploadProgress: -1 }));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    setState(s => ({ ...s, mediaUrl: '', mediaFile: null, uploadProgress: 0 }));
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const uploading = state.uploadProgress > 0 && state.uploadProgress < 100;
  const uploaded = state.uploadProgress === 100;
  const hasFile = !!state.mediaFile;
  const hasMedia = !!state.mediaUrl;

  return (
    <div className="space-y-5">
      {!hasMedia ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-16 ${
            dragging ? 'border-brand bg-brand/10 scale-[1.01]' : 'border-border/50 hover:border-brand/50 hover:bg-brand/5'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onInputChange} />
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-brand/20' : 'bg-border/20'}`}>
            {dragging ? <ArrowRight className="w-7 h-7 text-brand rotate-90" /> : <Plus className="w-7 h-7 text-text-muted" />}
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-text-primary">{dragging ? 'Drop to upload' : 'Drag & drop your media'}</p>
            <p className="text-xs text-text-muted">or click to browse · MP4, MOV, JPG, PNG, WebP</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black">
          {state.mediaType === 'image'
            ? <img src={state.mediaUrl} alt="Preview" className="w-full max-h-72 object-contain" />
            : <video src={state.mediaUrl} controls className="w-full max-h-72" />}

          <button onClick={clear}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Upload status bar */}
          {hasFile && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white text-[10px] font-medium truncate max-w-[60%]">
                  {state.mediaFile?.name}
                </span>
                {uploading && <span className="text-white/60 text-[10px]">Uploading to Dropbox…</span>}
                {uploaded && <span className="text-green-400 text-[10px] flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Saved to Dropbox</span>}
                {uploadError && <span className="text-rose-400 text-[10px]">Upload failed</span>}
              </div>
              {uploading && (
                <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${state.uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Dropbox upload failed: {uploadError}</p>
            <p className="text-rose-400/70 mt-0.5">Your file is still set for preview. You can also paste a hosted URL below instead.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-xs text-text-muted">or paste a hosted URL</span>
        <div className="flex-1 h-px bg-border/40" />
      </div>

      <input
        type="url"
        value={hasFile ? '' : state.mediaUrl}
        onChange={e => { if (!hasFile) setState(s => ({ ...s, mediaUrl: e.target.value, uploadProgress: 0 })); }}
        placeholder="https://cdn.example.com/your-video.mp4"
        disabled={hasFile}
        className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-40"
      />

      <p className="text-xs text-text-muted">
        Skip media for text-only posts on platforms that support it (Twitter, LinkedIn, Bluesky).
      </p>
    </div>
  );
}

// ─── Platform Settings Panel ─────────────────────────────────────────────────

function PlatformSettingsPanel({ platform, settings, onChange }: {
  platform: string;
  settings: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const p = platform.toLowerCase();

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 min-h-[28px]">
      <span className="text-[11px] text-text-muted shrink-0">{label}</span>
      {children}
    </div>
  );

  const Toggle = ({ k, label, defaultVal = true }: { k: string; label: string; defaultVal?: boolean }) => {
    const val = settings[k] ?? defaultVal;
    return (
      <Row label={label}>
        <button onClick={() => onChange(k, !val)}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${val ? 'bg-brand' : 'bg-border/60'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150 ${val ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </Row>
    );
  };

  const Select = ({ k, label, options }: { k: string; label: string; options: { value: string; label: string }[] }) => (
    <Row label={label}>
      <select value={settings[k] ?? options[0].value} onChange={e => onChange(k, e.target.value)}
        className="rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand/40 max-w-[160px]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Row>
  );

  const TextInput = ({ k, label, placeholder, maxLength }: { k: string; label: string; placeholder: string; maxLength?: number }) => (
    <Row label={label}>
      <input type="text" value={settings[k] ?? ''} onChange={e => onChange(k, e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className="flex-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand/40 min-w-0" />
    </Row>
  );

  const sectionClass = 'space-y-2 border-t border-border/40 pt-2.5 mt-2.5';
  const header = (label: string) => (
    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">{label}</p>
  );

  if (p === 'tiktok') return (
    <div className={sectionClass}>
      {header('TikTok Settings')}
      <Select k="privacyLevel" label="Privacy" options={[
        { value: 'PUBLIC_TO_EVERYONE', label: 'Everyone' },
        { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
        { value: 'FOLLOWER_OF_CREATOR', label: 'Followers only' },
        { value: 'SELF_ONLY', label: 'Only me' },
      ]} />
      <Toggle k="allowComment" label="Allow comments" />
      <Toggle k="allowDuet" label="Allow duets" />
      <Toggle k="allowStitch" label="Allow stitches" />
      <Toggle k="videoMadeWithAi" label="AI-generated content" defaultVal={false} />
    </div>
  );

  if (p === 'youtube') return (
    <div className={sectionClass}>
      {header('YouTube Settings')}
      <TextInput k="title" label="Title" placeholder="Video title (max 100 chars)" maxLength={100} />
      <Select k="visibility" label="Visibility" options={[
        { value: 'public', label: 'Public' },
        { value: 'unlisted', label: 'Unlisted' },
        { value: 'private', label: 'Private' },
      ]} />
      <Select k="categoryId" label="Category" options={[
        { value: '22', label: 'People & Blogs' },
        { value: '10', label: 'Music' },
        { value: '20', label: 'Gaming' },
        { value: '27', label: 'Education' },
        { value: '28', label: 'Science & Tech' },
        { value: '23', label: 'Comedy' },
        { value: '24', label: 'Entertainment' },
        { value: '1', label: 'Film & Animation' },
        { value: '17', label: 'Sports' },
        { value: '25', label: 'News & Politics' },
      ]} />
      <Toggle k="containsSyntheticMedia" label="AI-generated content" defaultVal={false} />
      <Toggle k="madeForKids" label="Made for kids (COPPA)" defaultVal={false} />
    </div>
  );

  if (p === 'facebook') return (
    <div className={sectionClass}>
      {header('Facebook Settings')}
      <Select k="contentType" label="Post type" options={[
        { value: 'feed', label: 'Feed post' },
        { value: 'reel', label: 'Reel' },
        { value: 'story', label: 'Story (24h)' },
      ]} />
      <TextInput k="firstComment" label="First comment" placeholder="Auto-posted comment…" />
    </div>
  );

  if (p === 'linkedin') return (
    <div className={sectionClass}>
      {header('LinkedIn Settings')}
      <Toggle k="disableLinkPreview" label="Disable link preview" defaultVal={false} />
      <TextInput k="firstComment" label="First comment" placeholder="Auto-posted comment…" />
    </div>
  );

  if (p === 'twitter') return (
    <div className={sectionClass}>
      {header('Twitter / X Settings')}
      <Select k="replySettings" label="Who can reply" options={[
        { value: 'everyone', label: 'Everyone' },
        { value: 'subscribers', label: 'Subscribers' },
        { value: 'mentionedUsers', label: 'Mentioned users only' },
      ]} />
    </div>
  );

  if (p === 'pinterest') return (
    <div className={sectionClass}>
      {header('Pinterest Settings')}
      <TextInput k="title" label="Pin title" placeholder="Title (max 100 chars)" maxLength={100} />
      <TextInput k="link" label="Destination URL" placeholder="https://…" />
    </div>
  );

  if (p === 'instagram') return (
    <div className={sectionClass}>
      {header('Instagram Settings')}
      <TextInput k="firstComment" label="First comment" placeholder="Auto-posted comment (not Stories)…" />
      <TextInput k="audioName" label="Audio name" placeholder="Custom Reels audio name…" />
    </div>
  );

  if (p === 'threads') return (
    <div className={sectionClass}>
      {header('Threads Settings')}
      <Select k="replyControl" label="Who can reply" options={[
        { value: 'everyone', label: 'Everyone' },
        { value: 'accounts_you_follow', label: 'Accounts you follow' },
        { value: 'mentioned_only', label: 'Mentioned only' },
      ]} />
    </div>
  );

  if (p === 'snapchat') return (
    <div className={sectionClass}>
      {header('Snapchat Settings')}
      <Select k="contentType" label="Post type" options={[
        { value: 'story', label: 'Story (24h)' },
        { value: 'saved_story', label: 'Saved Story' },
        { value: 'spotlight', label: 'Spotlight' },
      ]} />
    </div>
  );

  if (p === 'telegram') return (
    <div className={sectionClass}>
      {header('Telegram Settings')}
      <Select k="parseMode" label="Format" options={[
        { value: 'HTML', label: 'HTML' },
        { value: 'Markdown', label: 'Markdown' },
        { value: 'MarkdownV2', label: 'MarkdownV2' },
      ]} />
      <Toggle k="disableNotification" label="Silent message" defaultVal={false} />
      <Toggle k="protectContent" label="Protect content" defaultVal={false} />
    </div>
  );

  return null;
}

function Step2Content({ state, setState, accounts }: {
  state: ModalState; setState: React.Dispatch<React.SetStateAction<ModalState>>; accounts: ZernioAccount[];
}) {
  const toggleAccount = (id: string) => {
    setState(s => {
      const selected = s.selectedIds.includes(id)
        ? s.selectedIds.filter(x => x !== id)
        : [...s.selectedIds, id];
      return { ...s, selectedIds: selected, activePreviewId: selected[0] ?? null };
    });
  };

  const activeAccount = accounts.find(a => a._id === state.activePreviewId);
  const contentForAccount = (id: string) =>
    state.useCustom[id] ? (state.customContents[id] ?? '') : state.content;

  return (
    <div className="flex gap-6 h-full">
      {/* Left: editor */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div>
          <p className="text-sm font-semibold text-text-primary mb-2">Caption</p>
          <textarea
            value={state.content}
            onChange={e => setState(s => ({ ...s, content: e.target.value }))}
            placeholder="Write your caption here…"
            rows={5}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-text-primary mb-3">Post to</p>
          {accounts.length === 0 ? (
            <p className="text-sm text-text-muted">No connected accounts found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map(a => {
                const active = state.selectedIds.includes(a._id);
                const color = platformColor(a.platform);
                return (
                  <button key={a._id} onClick={() => toggleAccount(a._id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      active ? 'text-white border-transparent' : 'border-border/60 text-text-muted hover:text-text-primary hover:border-border'
                    }`}
                    style={active ? { background: color, borderColor: color } : {}}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: active ? 'rgba(255,255,255,0.25)' : color }}>
                      {platformInitial(a.platform)}
                    </span>
                    {platformLabel(a.platform)}
                    {a.username && <span className="opacity-70 font-normal">@{a.username}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Instagram content type selector */}
        {state.selectedIds.some(id => accounts.find(a => a._id === id)?.platform.toLowerCase() === 'instagram') && (
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Instagram post type</p>
            <div className="flex gap-2 flex-wrap">
              {(['feed', 'reels', 'carousel', 'story'] as IgContentType[]).map(t => (
                <button key={t} onClick={() => setState(s => ({ ...s, igContentType: t }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-colors ${
                    state.igContentType === t
                      ? 'bg-[#E1306C] text-white border-[#E1306C]'
                      : 'border-border/60 text-text-muted hover:text-text-primary'
                  }`}>
                  {t === 'feed' ? '📸 Feed' : t === 'reels' ? '🎬 Reel' : t === 'carousel' ? '🎠 Carousel' : '⚡ Story'}
                </button>
              ))}
            </div>
            {state.igContentType === 'story' && (
              <p className="text-xs text-text-muted mt-1.5">Stories disappear after 24h. Captions are not displayed in Stories.</p>
            )}
            {state.igContentType === 'carousel' && (
              <p className="text-xs text-text-muted mt-1.5">Upload up to 10 images/videos. All items should share the same aspect ratio.</p>
            )}
            {state.igContentType === 'reels' && (
              <p className="text-xs text-text-muted mt-1.5">Vertical 9:16 video, max 90 seconds. Will be shared to feed by default.</p>
            )}
          </div>
        )}

        {state.selectedIds.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Per-platform captions</p>
            {state.selectedIds.map(id => {
              const acc = accounts.find(a => a._id === id);
              if (!acc) return null;
              const isCustom = state.useCustom[id];
              return (
                <div key={id} className="rounded-xl border border-border/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: platformColor(acc.platform) }}>
                        {platformInitial(acc.platform)}
                      </span>
                      {platformLabel(acc.platform)}
                      {acc.username && <span className="text-text-muted font-normal">@{acc.username}</span>}
                    </div>
                    <button onClick={() => setState(s => ({ ...s, useCustom: { ...s.useCustom, [id]: !isCustom } }))}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
                        isCustom ? 'bg-brand text-white border-brand' : 'border-border/60 text-text-muted hover:text-text-primary'
                      }`}>
                      {isCustom ? 'Custom ✓' : 'Customize'}
                    </button>
                  </div>
                  {isCustom && (
                    <textarea
                      value={state.customContents[id] ?? ''}
                      onChange={e => setState(s => ({ ...s, customContents: { ...s.customContents, [id]: e.target.value } }))}
                      placeholder={`Custom caption for ${platformLabel(acc.platform)}…`}
                      rows={3}
                      className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  )}
                  <PlatformSettingsPanel
                    platform={acc.platform}
                    settings={state.platformSettings[id] || {}}
                    onChange={(key, val) => setState(s => ({
                      ...s,
                      platformSettings: {
                        ...s.platformSettings,
                        [id]: { ...(s.platformSettings[id] || {}), [key]: val },
                      },
                    }))}
                  />

                  <button onClick={() => setState(s => ({ ...s, activePreviewId: id }))}
                    className={`flex items-center gap-1 text-[10px] ${state.activePreviewId === id ? 'text-brand' : 'text-text-muted hover:text-brand'}`}>
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: preview */}
      <div className="w-64 shrink-0">
        <p className="text-sm font-semibold text-text-primary mb-3">Preview</p>
        {activeAccount ? (
          <PlatformPreview
            account={activeAccount}
            content={contentForAccount(activeAccount._id)}
            mediaUrl={state.mediaUrl}
            mediaType={state.mediaType}
          />
        ) : (
          <div className="rounded-xl border border-border/60 border-dashed aspect-square flex flex-col items-center justify-center gap-2 text-text-muted">
            <Eye className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">Select a platform<br />to see a preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Step3Schedule({ state, setState, bestTimes, submitting, onSubmit }: {
  state: ModalState;
  setState: React.Dispatch<React.SetStateAction<ModalState>>;
  bestTimes: BestTime[];
  submitting: boolean;
  onSubmit: (mode: 'now' | 'schedule') => void;
}) {
  const selectedDate = state.scheduleDate ? new Date(state.scheduleDate) : null;
  const dayOfWeek = selectedDate ? selectedDate.getDay() : null;

  const timesForDay = useMemo(() => {
    if (dayOfWeek === null || bestTimes.length === 0) return [];
    return bestTimes
      .filter(t => t.dayOfWeek === dayOfWeek)
      .sort((a, b) => b.score - a.score);
  }, [bestTimes, dayOfWeek]);

  const topBestHours = new Set(timesForDay.slice(0, 3).map(t => t.hour));

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onSubmit('now')} disabled={submitting}
          className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-brand bg-brand/10 hover:bg-brand/20 transition-colors disabled:opacity-40">
          <Send className="w-6 h-6 text-brand" />
          <span className="text-sm font-semibold text-brand">Post Now</span>
          <span className="text-xs text-text-muted text-center">Publish immediately to all selected platforms</span>
        </button>
        <button onClick={() => setState(s => ({ ...s, scheduleDate: s.scheduleDate || new Date().toISOString().split('T')[0] }))}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-colors ${
            state.scheduleDate ? 'border-brand bg-brand/10' : 'border-border/60 hover:border-brand/40'
          }`}>
          <Calendar className="w-6 h-6 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">Schedule</span>
          <span className="text-xs text-text-muted text-center">Pick a date and time</span>
        </button>
      </div>

      {state.scheduleDate !== '' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Date</p>
            <input type="date" value={state.scheduleDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setState(s => ({ ...s, scheduleDate: e.target.value, scheduleHour: null }))}
              className="rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>

          {state.scheduleDate && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-text-primary">Time</p>
                {timesForDay.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <Zap className="w-3 h-3" /> Best times highlighted
                  </span>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {hours.map(h => {
                  const isBest = topBestHours.has(h);
                  const selected = state.scheduleHour === h;
                  return (
                    <button key={h} onClick={() => setState(s => ({ ...s, scheduleHour: h }))}
                      className={`rounded-lg px-1 py-2 text-[10px] font-medium transition-all relative ${
                        selected
                          ? 'bg-brand text-white'
                          : isBest
                          ? 'bg-amber-500/15 text-amber-600 border border-amber-500/40 hover:bg-amber-500/25'
                          : 'border border-border/40 text-text-muted hover:border-brand/40 hover:text-text-primary'
                      }`}>
                      {isBest && !selected && <Zap className="w-2 h-2 absolute top-0.5 right-0.5 text-amber-500" />}
                      {formatHour(h)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {state.scheduleDate && state.scheduleHour !== null && (
            <button onClick={() => onSubmit('schedule')} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Schedule for {formatHour(state.scheduleHour)} on {new Date(state.scheduleDate + 'T12:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NewPostModal({ accounts, bestTimes, onClose, onSuccess }: {
  accounts: ZernioAccount[];
  bestTimes: BestTime[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<ModalState>(EMPTY_MODAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext1 = true; // media is optional
  const canNext2 = state.content.trim().length > 0 || state.mediaUrl.length > 0;

  const handleSubmit = useCallback(async (mode: 'now' | 'schedule') => {
    if (state.selectedIds.length === 0) {
      setError('Select at least one platform to post to.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const platforms = state.selectedIds.map(id => {
        const acc = accounts.find(a => a._id === id)!;
        const p = acc.platform.toLowerCase();
        const ps = state.platformSettings[id] || {};
        const entry: Record<string, any> = { platform: p, accountId: id };

        if (state.useCustom[id] && state.customContents[id]) {
          entry.customContent = state.customContents[id];
        }

        if (p === 'instagram') {
          const igData: Record<string, any> = {};
          if (state.igContentType === 'story') igData.contentType = 'story';
          if (state.igContentType === 'reels') { igData.contentType = 'reels'; igData.shareToFeed = true; }
          if (ps.firstComment) igData.firstComment = ps.firstComment;
          if (ps.audioName) igData.audioName = ps.audioName;
          if (Object.keys(igData).length > 0) entry.platformSpecificData = igData;
        }

        if (p === 'tiktok') {
          payload.tiktokSettings = {
            privacyLevel: ps.privacyLevel || 'PUBLIC_TO_EVERYONE',
            allowComment: ps.allowComment !== false,
            allowDuet: ps.allowDuet !== false,
            allowStitch: ps.allowStitch !== false,
            contentPreviewConfirmed: true,
            expressConsentGiven: true,
            ...(ps.videoMadeWithAi ? { videoMadeWithAi: true } : {}),
          };
        }

        if (p === 'youtube') {
          entry.platformSpecificData = {
            title: ps.title || state.content.split('\n')[0].slice(0, 100) || '',
            visibility: ps.visibility || 'public',
            categoryId: ps.categoryId || '22',
            ...(ps.madeForKids ? { madeForKids: true } : {}),
            ...(ps.containsSyntheticMedia ? { containsSyntheticMedia: true } : {}),
          };
        }

        if (p === 'facebook') {
          const fbData: Record<string, any> = {};
          if (ps.contentType) fbData.contentType = ps.contentType;
          if (ps.firstComment) fbData.firstComment = ps.firstComment;
          if (Object.keys(fbData).length > 0) entry.platformSpecificData = fbData;
        }

        if (p === 'linkedin') {
          const liData: Record<string, any> = {};
          if (ps.firstComment) liData.firstComment = ps.firstComment;
          if (ps.disableLinkPreview) liData.disableLinkPreview = true;
          if (Object.keys(liData).length > 0) entry.platformSpecificData = liData;
        }

        if (p === 'twitter' && ps.replySettings) {
          entry.platformSpecificData = { replySettings: ps.replySettings };
        }

        if (p === 'pinterest') {
          const pinData: Record<string, any> = {};
          if (ps.title) pinData.title = ps.title;
          if (ps.link) pinData.link = ps.link;
          if (Object.keys(pinData).length > 0) entry.platformSpecificData = pinData;
        }

        if (p === 'snapchat' && ps.contentType) {
          entry.platformSpecificData = { contentType: ps.contentType };
        }

        if (p === 'telegram') {
          const tgData: Record<string, any> = {};
          if (ps.parseMode) tgData.parseMode = ps.parseMode;
          if (ps.disableNotification) tgData.disableNotification = true;
          if (ps.protectContent) tgData.protectContent = true;
          if (Object.keys(tgData).length > 0) entry.platformSpecificData = tgData;
        }

        if (p === 'threads' && ps.replyControl) {
          entry.platformSpecificData = { replyControl: ps.replyControl };
        }

        return entry;
      });

      const payload: Record<string, any> = { content: state.content, platforms };

      if (state.mediaUrl) {
        payload.mediaItems = [{ type: state.mediaType, url: state.mediaUrl }];
      }

      if (mode === 'now') {
        payload.publishNow = true;
      } else if (state.scheduleHour !== null && state.scheduleDate) {
        const pad = (n: number) => String(n).padStart(2, '0');
        payload.scheduledFor = `${state.scheduleDate}T${pad(state.scheduleHour)}:00:00`;
        payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      await zernioService.createPost(payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [state, accounts, onClose, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl rounded-2xl border border-border/60 shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--color-background)', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <h2 className="text-base font-bold text-text-primary">New Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-border/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-4 border-b border-border/60 shrink-0">
          <StepIndicator step={step} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && <Step1Media state={state} setState={setState} />}
          {step === 2 && <Step2Content state={state} setState={setState} accounts={accounts} />}
          {step === 3 && (
            <Step3Schedule state={state} setState={setState} bestTimes={bestTimes}
              submitting={submitting} onSubmit={handleSubmit} />
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-rose-500 bg-rose-500/10 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between shrink-0">
          <button onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3) : onClose()}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border/60 text-text-muted hover:text-text-primary transition-colors">
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 && (
            <button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 2 && !canNext2}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PostSchedule() {
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [posts, setPosts] = useState<ZernioPost[]>([]);
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showModal, setShowModal] = useState(false);

  const noKey = !import.meta.env.VITE_ZERNIO_API_KEY;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accs, scheduled, published, bt] = await Promise.all([
        zernioService.listAccounts(),
        zernioService.listPosts({ status: 'scheduled', limit: 50 }),
        zernioService.listPosts({ status: 'published', limit: 50 }),
        zernioService.getBestTimes(),
      ]);
      setAccounts(accs);
      setPosts([...scheduled, ...published]);
      setBestTimes(bt);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const weekDays = useMemo(() => {
    const start = new Date(weekStart);
    if (view === 'past') start.setDate(start.getDate() - 7);
    return getWeekDays(start);
  }, [weekStart, view]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, ZernioPost[]>();
    weekDays.forEach(d => map.set(d.toDateString(), []));
    posts.forEach(p => {
      const dateStr = p.scheduledFor || p.publishedAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = d.toDateString();
      if (map.has(key)) map.get(key)!.push(p);
    });
    return map;
  }, [posts, weekDays]);

  const bestTimesByDay = useMemo(() => {
    const map = new Map<number, number[]>(); // dayOfWeek -> top hours
    bestTimes.forEach(bt => {
      if (!map.has(bt.dayOfWeek)) map.set(bt.dayOfWeek, []);
      map.get(bt.dayOfWeek)!.push(bt.hour);
    });
    return map;
  }, [bestTimes]);

  const navigateWeek = (dir: -1 | 1) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Post & Schedule</h1>
          <p className="mt-1 text-sm text-text-muted">Cross-post and schedule content across your connected accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border/60 text-text-muted hover:text-text-primary transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} disabled={noKey}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40">
            <Plus className="w-4 h-4" /> Add Post
          </button>
        </div>
      </div>

      {noKey && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-semibold">VITE_ZERNIO_API_KEY</span> is not set. Add it to your <code>.env</code> file to enable posting.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-500/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Calendar controls */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl border border-border/60 overflow-hidden text-sm">
          {(['upcoming', 'past'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                view === v ? 'bg-brand text-white' : 'text-text-muted hover:text-text-primary'
              }`}>
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {bestTimes.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-500/10 px-3 py-1.5 rounded-full">
              <Zap className="w-3 h-3" /> Best times shown
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => navigateWeek(-1)}
              className="p-1.5 rounded-lg border border-border/60 text-text-muted hover:text-text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-text-muted px-2 min-w-[120px] text-center">
              {weekDays[0]?.toLocaleDateString([], { month: 'short', day: 'numeric' })} – {weekDays[6]?.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => navigateWeek(1)}
              className="p-1.5 rounded-lg border border-border/60 text-text-muted hover:text-text-primary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map(day => {
          const dayPosts = postsByDay.get(day.toDateString()) ?? [];
          const isToday = isSameDay(day, today);
          const isPast = day < today;
          const dow = day.getDay();
          const topHours = bestTimesByDay.get(dow)?.slice(0, 2) ?? [];

          return (
            <div key={day.toDateString()}
              className={`rounded-2xl border p-3 space-y-2 min-h-[180px] transition-colors ${
                isToday ? 'border-brand/40 bg-brand/5' : 'border-border/60'
              }`}
              style={{ background: isToday ? undefined : 'var(--shell-panel)' }}>
              {/* Day header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isPast ? 'text-text-muted' : 'text-text-secondary'}`}>
                    {DAYS[day.getDay()]}
                  </span>
                  {isToday && <span className="text-[9px] bg-brand text-white rounded-full px-1.5 py-0.5 font-semibold">Today</span>}
                </div>
                <span className={`text-lg font-bold ${isPast ? 'text-text-muted' : 'text-text-primary'}`}>
                  {day.getDate()}
                </span>
                {topHours.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {topHours.map(h => (
                      <span key={h} className="flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/10 rounded-full px-1.5 py-0.5 font-medium">
                        <Zap className="w-2 h-2" />{formatHour(h)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Posts */}
              <div className="space-y-1.5">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                  </div>
                ) : dayPosts.length === 0 ? (
                  <p className="text-[10px] text-text-muted/50 text-center py-4">No posts</p>
                ) : (
                  dayPosts
                    .sort((a, b) => {
                      const ta = a.scheduledFor || a.publishedAt || '';
                      const tb = b.scheduledFor || b.publishedAt || '';
                      return ta.localeCompare(tb);
                    })
                    .map(p => <PostEventCard key={p._id} post={p} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Post Modal */}
      {showModal && (
        <NewPostModal
          accounts={accounts}
          bestTimes={bestTimes}
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
