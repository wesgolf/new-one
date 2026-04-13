import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Film, Instagram, Music2, Youtube, CheckCircle2, AlertCircle, Loader2,
  Upload, Library, Image, Music, ChevronDown, Sparkles, Send, Calendar, Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { PlatformPost, ContentItemWithAssets } from '../types';
import { PlatformTabs } from './PlatformTabs';
import { FeedPreview } from './FeedPreview';
import { contentService } from '../../services/contentService';
import { publishService } from '../../services/publishService';
import { Release } from '../../types';

interface PostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  contentItem?: ContentItemWithAssets | null;
  onSaved?: (item: ContentItemWithAssets) => void;
  onDraftSaved?: () => void;
  releases?: Release[];
}

type AvailablePlatform = 'Instagram' | 'TikTok' | 'YouTube';
type Step = 'content' | 'editor' | 'publish';

const STEPS: { id: Step; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'editor', label: 'Configure' },
  { id: 'publish', label: 'Publish' },
];

const PLATFORMS: { id: AvailablePlatform; label: string; Icon: React.ElementType; color: string; activeColor: string }[] = [
  { id: 'Instagram', label: 'Instagram', Icon: Instagram, color: 'text-pink-500', activeColor: 'bg-pink-500' },
  { id: 'TikTok', label: 'TikTok', Icon: Music2, color: 'text-slate-700', activeColor: 'bg-slate-800' },
  { id: 'YouTube', label: 'YouTube', Icon: Youtube, color: 'text-red-500', activeColor: 'bg-red-500' },
];

function MediaDropzone({ onFile }: { onFile: (file: File, url: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (file: File) => {
    const ok = file.type.startsWith('video/') || file.type.startsWith('image/') || file.name.match(/\.(mp4|mov|m4v)$/i);
    if (!ok) { setError('Please upload .mp4, .mov or an image'); return; }
    if (file.size > 500 * 1024 * 1024) { setError('File must be under 500MB'); return; }
    setError(null);
    onFile(file, URL.createObjectURL(file));
  };
  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all p-12",
        dragging ? "border-blue-400 bg-blue-50/50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,.mp4,.mov,image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} className="hidden" />
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
        <Upload className={cn("w-8 h-8", dragging ? "text-blue-500" : "text-slate-400")} />
      </div>
      <p className="font-black text-slate-700 text-base">{dragging ? 'Drop it here' : 'Upload .mp4 or .mov'}</p>
      <p className="text-xs text-slate-400 mt-1">Or drag & drop · Max 500MB · Images also supported</p>
      {error && <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function CoverImageDropzone({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (file: File) => { if (file.type.startsWith('image/')) onChange(URL.createObjectURL(file)); };
  return (
    <div
      className={cn("border-2 border-dashed rounded-xl flex items-center gap-3 px-4 py-3 cursor-pointer transition-all",
        dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300")}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} className="hidden" />
      {value ? <img src={value} className="w-8 h-8 rounded-lg object-cover" alt="cover" /> : <Image className="w-5 h-5 text-slate-400" />}
      <span className="text-sm text-slate-500 font-medium">{value ? 'Change cover image' : 'Drop or click to add cover image'}</span>
    </div>
  );
}

function HashtagPillInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const cleaned = raw.trim().replace(/^#+/, '');
    if (!cleaned) return;
    const tag = `#${cleaned}`;
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => { if (input.trim()) addTag(input); };

  return (
    <div
      className="min-h-[42px] w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-black rounded-full">
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter(t => t !== tag)); }}
            className="text-blue-400 hover:text-blue-600 leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? '#music #newrelease — press space to add' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function PlatformPreviewPanel({
  selectedPlatforms, previewPlatform, setPreviewPlatform,
  effectiveMediaUrl, coverImageUrl, globalCaption, hashtagsList, soundLabel, platformPosts,
}: {
  selectedPlatforms: AvailablePlatform[];
  previewPlatform: AvailablePlatform;
  setPreviewPlatform: (p: AvailablePlatform) => void;
  effectiveMediaUrl: string;
  coverImageUrl: string;
  globalCaption: string;
  hashtagsList: string[];
  soundLabel: string;
  platformPosts: PlatformPost[];
}) {
  const igSettings = platformPosts.find(p => p.platform === 'Instagram')?.platform_settings_json || {};
  const ytSettings = platformPosts.find(p => p.platform === 'YouTube')?.platform_settings_json || {};
  const ytPost = platformPosts.find(p => p.platform === 'YouTube');

  return (
    <div className="flex flex-col overflow-hidden h-full bg-slate-50/50">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview</p>
        <div className="flex gap-1.5 flex-wrap">
          {selectedPlatforms.map(p => {
            const cfg = PLATFORMS.find(pl => pl.id === p)!;
            const isActive = previewPlatform === p;
            return (
              <button key={p} onClick={() => setPreviewPlatform(p)}
                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all",
                  isActive ? cfg.activeColor + " text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"
                )}
              >
                <cfg.Icon className="w-3 h-3" />
                {p === 'Instagram' ? 'IG' : p === 'TikTok' ? 'TT' : 'YT'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden p-3">
        <FeedPreview
          platform={previewPlatform}
          mediaUrl={effectiveMediaUrl}
          coverImageUrl={coverImageUrl || igSettings.cover_image_url}
          caption={globalCaption}
          hashtags={hashtagsList}
          title={ytPost?.title || ''}
          soundLabel={soundLabel}
          instagramFormat={igSettings.format || 'reel'}
          youtubeFormat={ytSettings.video_type || 'short'}
        />
      </div>
    </div>
  );
}

export function PostEditor({ isOpen, onClose, contentItem, onSaved, onDraftSaved, releases = [] }: PostEditorProps) {
  const [step, setStep] = useState<Step>('content');
  const [contentTab, setContentTab] = useState<'upload' | 'library'>('upload');

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<ContentItemWithAssets | null>(null);
  const [libraryItems, setLibraryItems] = useState<ContentItemWithAssets[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [selectedPlatforms, setSelectedPlatforms] = useState<AvailablePlatform[]>(['Instagram', 'TikTok', 'YouTube']);
  const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<AvailablePlatform>('Instagram');

  const [songId, setSongId] = useState('');
  const [globalCaption, setGlobalCaption] = useState('');
  const [hashtagsList, setHashtagsList] = useState<string[]>([]);
  const [soundLabel, setSoundLabel] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contentItemId, setContentItemId] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const effectiveMediaUrl = selectedLibraryItem?.media_url || selectedLibraryItem?.assets?.[0]?.file_url || mediaUrl;
  const igSettings = platformPosts.find(p => p.platform === 'Instagram')?.platform_settings_json || {};
  const ytSettings = platformPosts.find(p => p.platform === 'YouTube')?.platform_settings_json || {};

  useEffect(() => {
    if (!isOpen) return;
    if (contentItem) {
      setGlobalCaption(contentItem.platform_posts?.[0]?.caption || '');
      setHashtagsList(contentItem.platform_posts?.[0]?.hashtags || []);
      setSongId(contentItem.track_id || '');
      setMediaUrl(contentItem.media_url || contentItem.assets?.[0]?.file_url || '');
      setContentItemId(contentItem.id);
      if (contentItem.platform_posts?.length) {
        setPlatformPosts(contentItem.platform_posts);
        setSelectedPlatforms(contentItem.platform_posts.map(p => p.platform));
        setStep('editor');
      } else {
        setStep(contentItem.media_url ? 'editor' : 'content');
      }
    } else {
      resetForm();
    }
  }, [contentItem, isOpen]);

  useEffect(() => {
    if (contentTab === 'library' && libraryItems.length === 0) {
      setLoadingLibrary(true);
      contentService.getContentItemsWithPosts()
        .then(items => setLibraryItems(items))
        .catch(() => setLibraryItems([]))
        .finally(() => setLoadingLibrary(false));
    }
  }, [contentTab]);

  useEffect(() => {
    const hashtagsStr = hashtagsList.join(' ');
    setPlatformPosts(prev => prev.map(p => ({
      ...p,
      caption: globalCaption,
      hashtags: hashtagsList,
      platform_settings_json: p.platform === 'YouTube'
        ? { ...p.platform_settings_json, tags: hashtagsList.map(h => h.replace(/^#/, '')) }
        : p.platform_settings_json,
    })));
  }, [globalCaption, hashtagsList]);

  const resetForm = () => {
    setStep('content');
    setContentTab('upload');
    setMediaFile(null);
    setMediaUrl('');
    setMediaType('video');
    setSelectedLibraryItem(null);
    setSelectedPlatforms(['Instagram', 'TikTok', 'YouTube']);
    setPlatformPosts([]);
    setPreviewPlatform('Instagram');
    setSongId('');
    setGlobalCaption('');
    setHashtagsList([]);
    setSoundLabel('');
    setCoverImageUrl('');
    setIsSaving(false);
    setIsPublishing(false);
    setSaveError(null);
    setContentItemId(null);
    setPublishResults({});
    setPublishMode('now');
    setScheduleDate('');
    setScheduleTime('');
  };

  const handleMediaFile = useCallback((file: File, url: string) => {
    setMediaFile(file);
    setMediaUrl(url);
    setMediaType(file.type.startsWith('image/') ? 'image' : 'video');
    setSelectedLibraryItem(null);
  }, []);

  const buildPlatformPosts = (platforms: AvailablePlatform[]): PlatformPost[] => {
    return platforms.map(platform => {
      const existing = platformPosts.find(p => p.platform === platform);
      if (existing) return existing;
      return {
        id: `pp_${platform}_${Date.now()}`,
        content_item_id: contentItemId || '',
        platform,
        status: 'draft' as const,
        caption: globalCaption,
        title: platform === 'YouTube' ? '' : undefined,
        description: platform === 'YouTube' ? '' : undefined,
        hashtags: hashtagsList,
        platform_settings_json: platform === 'YouTube'
          ? { video_type: 'short', category: 'Music', privacy: 'public', audience: 'not_kids', tags: hashtagsList.map(h => h.replace(/^#/, '')) }
          : platform === 'TikTok'
          ? { privacy_level: 'PUBLIC_TO_EVERYONE', allow_comments: true, allow_duet: true, allow_stitch: true }
          : { format: 'reel', share_to_feed: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  };

  const handleContinue = () => {
    if (!effectiveMediaUrl && !mediaFile) { setSaveError('Please select or upload content first'); return; }
    setSaveError(null);
    const posts = buildPlatformPosts(selectedPlatforms);
    setPlatformPosts(posts);
    setStep('editor');
  };

  const handleNext = () => {
    setSaveError(null);
    const errors = getValidationErrors();
    if (errors.length) { setSaveError(errors[0]); return; }
    setPublishResults({});
    setStep('publish');
  };

  const togglePlatform = (platform: AvailablePlatform) => {
    setSelectedPlatforms(prev => {
      const next = prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform];
      setPlatformPosts(buildPlatformPosts(next));
      if (!next.includes(previewPlatform) && next.length > 0) setPreviewPlatform(next[0]);
      return next;
    });
  };

  const handleUpdatePlatformPost = (postId: string, updates: Partial<PlatformPost>) => {
    setPlatformPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!effectiveMediaUrl && !mediaFile) errors.push('No media selected');
    for (const post of platformPosts) {
      const err = publishService.validatePost(post);
      if (err) errors.push(`${post.platform}: ${err}`);
    }
    return errors;
  };

  const persistContent = async () => {
    if (contentItemId) return contentItemId;
    let mUrl = effectiveMediaUrl;
    if (mediaFile) {
      try { const asset = await contentService.uploadVideo(mediaFile); if (asset) mUrl = asset.file_url; } catch {}
    }
    const song = releases.find(r => r.id === songId);
    const id = await contentService.createContentItem({
      title: song?.title || 'New Post',
      campaign: song?.title,
      notes: soundLabel ? `Sound: ${soundLabel}` : undefined,
      media_url: mUrl,
    });
    const finalId = id || `local_${Date.now()}`;
    setContentItemId(finalId);
    return finalId;
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const id = await persistContent();
      if (id && !id.startsWith('local_')) {
        await contentService.updateContentItem(id, { title: releases.find(r => r.id === songId)?.title || 'Draft Post', notes: soundLabel } as any);
      }
      const song = releases.find(r => r.id === songId);
      onSaved?.({
        id: id || 'local', user_id: 'user_1', title: song?.title || 'Draft Post', hook: '',
        caption: globalCaption, hashtags: hashtagsList,
        platform: selectedPlatforms[0] || 'Instagram', post_type: 'drop_clip', angle: 'hype',
        status: 'drafting', publish_status: 'draft',
        track_id: songId || undefined, media_url: effectiveMediaUrl || undefined,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), platform_posts: platformPosts,
      });
      onDraftSaved?.();
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostNow = async () => {
    setIsPublishing(true);
    setSaveError(null);
    setPublishResults({});
    const id = await persistContent();
    const results: Record<string, { success: boolean; error?: string }> = {};
    for (const post of platformPosts) {
      const r = await publishService.publishNow({ ...post, content_item_id: id || '' }, effectiveMediaUrl);
      results[post.id] = { success: r.success, error: r.error };
      handleUpdatePlatformPost(post.id, r.success
        ? { status: 'published', published_at: new Date().toISOString(), external_post_id: r.externalPostId }
        : { status: 'failed', error_message: r.error });
    }
    setPublishResults(results);
    setIsPublishing(false);
    const failures = Object.entries(results).filter(([, r]) => !r.success);
    if (failures.length) { setSaveError(failures.map(([id, r]) => `${platformPosts.find(p => p.id === id)?.platform}: ${r.error}`).join('; ')); return; }
    const song = releases.find(r => r.id === songId);
    onSaved?.({
      id: id || '', user_id: 'user_1', title: song?.title || 'Published Post', hook: '',
      caption: globalCaption, hashtags: hashtagsList,
      platform: selectedPlatforms[0] || 'Instagram', post_type: 'drop_clip', angle: 'hype',
      status: 'posted', publish_status: 'published',
      track_id: songId || undefined, media_url: effectiveMediaUrl || undefined,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), platform_posts: platformPosts,
    });
    onClose();
  };

  const handleScheduleConfirm = async () => {
    if (!scheduleDate || !scheduleTime) { setSaveError('Please pick a date and time'); return; }
    const dt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (dt <= new Date()) { setSaveError('Scheduled time must be in the future'); return; }
    const scheduledAt = dt.toISOString();
    setIsPublishing(true);
    setSaveError(null);
    const id = await persistContent();
    const results: Record<string, { success: boolean; error?: string }> = {};
    for (const post of platformPosts) {
      const r = await publishService.schedulePost({ ...post, content_item_id: id || '' }, scheduledAt, effectiveMediaUrl);
      results[post.id] = { success: r.success, error: r.error };
      handleUpdatePlatformPost(post.id, r.success ? { status: 'scheduled', scheduled_at: scheduledAt } : { status: 'failed', error_message: r.error });
    }
    setPublishResults(results);
    setIsPublishing(false);
    const failures = Object.entries(results).filter(([, r]) => !r.success);
    if (failures.length) { setSaveError(failures.map(([id, r]) => `${platformPosts.find(p => p.id === id)?.platform}: ${r.error}`).join('; ')); return; }
    const song = releases.find(r => r.id === songId);
    onSaved?.({
      id: id || '', user_id: 'user_1', title: song?.title || 'Scheduled Post', hook: '',
      caption: globalCaption, hashtags: hashtagsList,
      platform: selectedPlatforms[0] || 'Instagram', post_type: 'drop_clip', angle: 'hype',
      status: 'scheduled', publish_status: 'scheduled', scheduled_at: scheduledAt,
      track_id: songId || undefined, media_url: effectiveMediaUrl || undefined,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), platform_posts: platformPosts,
    });
    onClose();
  };

  if (!isOpen) return null;

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        style={{ height: '92vh' }}
      >
        <div className="flex items-center justify-between px-7 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Film className="w-[18px] h-[18px] text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">{contentItem ? 'Edit Post' : 'New Post'}</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {STEPS[stepIdx]?.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all",
                      i < stepIdx ? "bg-blue-500 text-white" : i === stepIdx ? "bg-blue-500 text-white ring-2 ring-blue-200" : "bg-slate-100 text-slate-400"
                    )}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-wider hidden sm:block",
                      i === stepIdx ? "text-slate-700" : "text-slate-300"
                    )}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={cn("w-6 h-px", i < stepIdx ? "bg-blue-400" : "bg-slate-200")} />}
                </React.Fragment>
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">

            {step === 'content' && (
              <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col p-7 overflow-y-auto"
              >
                <div className="flex gap-2 border-b border-slate-100 mb-6">
                  {[{ id: 'upload', label: 'Upload', Icon: Upload }, { id: 'library', label: 'Content Library', Icon: Library }].map(tab => (
                    <button key={tab.id} onClick={() => setContentTab(tab.id as any)}
                      className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-black relative transition-all",
                        contentTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}
                    >
                      <tab.Icon className="w-4 h-4" />
                      {tab.label}
                      {contentTab === tab.id && <motion.div layoutId="cTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
                    </button>
                  ))}
                </div>

                <div className="flex-1">
                  {contentTab === 'upload' && (
                    mediaUrl && !selectedLibraryItem ? (
                      <div className="relative rounded-2xl overflow-hidden bg-black">
                        {mediaType === 'video'
                          ? <video src={mediaUrl} className="w-full max-h-72 object-contain" controls playsInline />
                          : <img src={mediaUrl} className="w-full max-h-72 object-contain" alt="preview" />}
                        <button onClick={() => { setMediaUrl(''); setMediaFile(null); }}
                          className="absolute top-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : <MediaDropzone onFile={handleMediaFile} />
                  )}

                  {contentTab === 'library' && (
                    loadingLibrary ? (
                      <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
                    ) : libraryItems.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <Library className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold">No items in library yet</p>
                        <p className="text-xs">Upload content to get started</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3">
                        {libraryItems.map(item => {
                          const isSelected = selectedLibraryItem?.id === item.id;
                          const thumb = item.media_url || item.assets?.[0]?.file_url;
                          return (
                            <button key={item.id} onClick={() => setSelectedLibraryItem(isSelected ? null : item)}
                              className={cn("relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 transition-all",
                                isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]" : "hover:scale-[1.02]")}
                            >
                              {thumb ? <video src={thumb} className="w-full h-full object-cover" muted preload="metadata" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-slate-600" /></div>}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2"><p className="text-white text-[9px] font-black truncate">{item.title || 'Untitled'}</p></div>
                              {isSelected && <div className="absolute top-2 right-2"><CheckCircle2 className="w-5 h-5 text-blue-400 drop-shadow" /></div>}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>

                {saveError && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4" />{saveError}
                  </div>
                )}

                <div className="mt-5">
                  <button onClick={handleContinue} disabled={!effectiveMediaUrl && !mediaFile}
                    className={cn("w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all",
                      (!effectiveMediaUrl && !mediaFile) ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                    )}>
                    Continue to Configure →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'editor' && (
              <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full grid grid-cols-[2fr_3fr] divide-x divide-slate-100"
              >
                <PlatformPreviewPanel
                  selectedPlatforms={selectedPlatforms} previewPlatform={previewPlatform} setPreviewPlatform={setPreviewPlatform}
                  effectiveMediaUrl={effectiveMediaUrl} coverImageUrl={coverImageUrl}
                  globalCaption={globalCaption} hashtagsList={hashtagsList} soundLabel={soundLabel} platformPosts={platformPosts}
                />

                <div className="overflow-y-auto p-6 space-y-5">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Platforms</p>
                    <div className="flex gap-2 flex-wrap">
                      {PLATFORMS.map(({ id, label, Icon, activeColor, color }) => {
                        const isActive = selectedPlatforms.includes(id);
                        return (
                          <button key={id} onClick={() => togglePlatform(id)}
                            className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all",
                              isActive ? activeColor + ' text-white border-transparent shadow-sm' : 'bg-white border-slate-200 ' + color + ' hover:border-current'
                            )}>
                            <Icon className="w-3.5 h-3.5" />{label}
                            {isActive && <CheckCircle2 className="w-3 h-3 opacity-70" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Song</label>
                    <div className="relative">
                      <select value={songId} onChange={e => setSongId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none pr-8">
                        <option value="">— No song linked —</option>
                        {releases.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Caption <span className="normal-case font-medium text-slate-300">(all platforms)</span>
                    </label>
                    <textarea value={globalCaption} onChange={e => setGlobalCaption(e.target.value)}
                      placeholder="Write your caption here — applies to all platforms..." rows={4}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3 h-3" /> Hashtags <span className="normal-case font-medium text-slate-300">(space or Enter to add)</span>
                    </label>
                    <HashtagPillInput tags={hashtagsList} onChange={setHashtagsList} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cover Image</label>
                    <CoverImageDropzone value={coverImageUrl} onChange={setCoverImageUrl} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Music className="w-3 h-3" /> Sound Label
                    </label>
                    <input type="text" value={soundLabel} onChange={e => setSoundLabel(e.target.value)}
                      placeholder="e.g. Original Sound - WES"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>

                  {platformPosts.length > 0 && (
                    <div className="border-t border-slate-100 pt-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Platform Settings</p>
                      <PlatformTabs platformPosts={platformPosts} onUpdate={handleUpdatePlatformPost} globalHashtags={hashtagsList.join(' ')} />
                    </div>
                  )}

                  {saveError && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{saveError}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'publish' && (
              <motion.div key="publish" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="h-full grid grid-cols-[2fr_3fr] divide-x divide-slate-100"
              >
                <PlatformPreviewPanel
                  selectedPlatforms={selectedPlatforms} previewPlatform={previewPlatform} setPreviewPlatform={setPreviewPlatform}
                  effectiveMediaUrl={effectiveMediaUrl} coverImageUrl={coverImageUrl}
                  globalCaption={globalCaption} hashtagsList={hashtagsList} soundLabel={soundLabel} platformPosts={platformPosts}
                />

                <div className="overflow-y-auto p-7 flex flex-col gap-5">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-0.5">Ready to publish</h3>
                    <p className="text-xs text-slate-400">All platform settings look good. Choose how you want to publish.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Publishing to</p>
                    {platformPosts.map(post => {
                      const err = publishService.validatePost(post);
                      const cfg = PLATFORMS.find(p => p.id === post.platform)!;
                      return (
                        <div key={post.id} className={cn("flex items-center justify-between px-4 py-3 rounded-2xl border",
                          err ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50")}>
                          <div className="flex items-center gap-2.5">
                            <cfg.Icon className={cn("w-4 h-4", err ? "text-red-400" : cfg.color)} />
                            <span className="text-sm font-black text-slate-800">{post.platform}</span>
                            {post.caption && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{post.caption}</span>}
                          </div>
                          {err
                            ? <div className="flex items-center gap-1 text-red-500 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" />{err}</div>
                            : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">When to post</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setPublishMode('now')}
                        className={cn("flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 font-black text-sm transition-all",
                          publishMode === 'now' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                        <Send className="w-5 h-5" />
                        Post Now
                      </button>
                      <button onClick={() => setPublishMode('schedule')}
                        className={cn("flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 font-black text-sm transition-all",
                          publishMode === 'schedule' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300")}>
                        <Calendar className="w-5 h-5" />
                        Schedule
                      </button>
                    </div>

                    {publishMode === 'schedule' && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Date</label>
                          <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Time</label>
                          <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {saveError && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{saveError}</span>
                    </div>
                  )}

                  {Object.keys(publishResults).length > 0 && (
                    <div className="space-y-2">
                      {platformPosts.map(post => {
                        const result = publishResults[post.id];
                        if (!result) return null;
                        return (
                          <div key={post.id} className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-medium",
                            result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                            {result.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            <span>{post.platform}: {result.success ? 'Published ✓' : result.error}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={publishMode === 'now' ? handlePostNow : handleScheduleConfirm}
                    disabled={isPublishing || platformPosts.length === 0}
                    className={cn("w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-base transition-all mt-auto",
                      isPublishing || platformPosts.length === 0
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200"
                    )}>
                    {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : publishMode === 'now' ? <Send className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    {publishMode === 'now' ? 'Post Now' : 'Confirm Schedule'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {(step === 'editor' || step === 'publish') && (
          <div className="border-t border-slate-100 px-7 py-4 flex items-center gap-3 bg-white shrink-0">
            <button onClick={() => setStep(step === 'publish' ? 'editor' : 'content')}
              className="px-4 py-2.5 border-2 border-slate-200 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-50 transition-all">
              Back
            </button>
            <button onClick={handleSaveDraft} disabled={isSaving || isPublishing}
              className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Draft
            </button>
            <div className="flex-1" />
            {step === 'editor' && (
              <button onClick={handleNext} disabled={selectedPlatforms.length === 0}
                className={cn("flex items-center gap-2 px-7 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg",
                  selectedPlatforms.length === 0 ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                )}>
                Next →
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
