import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Film, Instagram, Music2, Youtube, CheckCircle2, AlertCircle, Loader2,
  Upload, Library, Image, Music, ChevronDown, Sparkles, Clock
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
type Step = 'content' | 'editor';

const PLATFORMS: { id: AvailablePlatform; label: string; Icon: React.ElementType; color: string; activeColor: string }[] = [
  { id: 'Instagram', label: 'Instagram', Icon: Instagram, color: 'text-pink-500', activeColor: 'bg-pink-500' },
  { id: 'TikTok', label: 'TikTok', Icon: Music2, color: 'text-slate-700', activeColor: 'bg-slate-800' },
  { id: 'YouTube', label: 'YouTube', Icon: Youtube, color: 'text-red-500', activeColor: 'bg-red-500' },
];

function MediaDropzone({ onFile, accept, compact }: { onFile: (file: File, url: string) => void; accept?: string; compact?: boolean }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (file: File) => {
    const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|m4v)$/i);
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) { setError('Please upload a video (.mp4, .mov) or image file'); return; }
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) { setError('File must be under 500MB'); return; }
    setError(null);
    onFile(file, URL.createObjectURL(file));
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
        compact ? "p-8" : "p-12",
        dragging ? "border-blue-400 bg-blue-50/50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept || "video/mp4,video/quicktime,.mp4,.mov,image/*"} onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} className="hidden" />
      <div className={cn("rounded-2xl flex items-center justify-center mb-3", compact ? "w-10 h-10 bg-slate-100" : "w-16 h-16 bg-blue-50")}>
        <Upload className={cn(dragging ? "text-blue-500" : "text-slate-400", compact ? "w-5 h-5" : "w-8 h-8")} />
      </div>
      <p className={cn("font-black text-slate-700", compact ? "text-sm" : "text-base")}>
        {dragging ? 'Drop it here' : 'Upload .mp4 or .mov'}
      </p>
      {!compact && <p className="text-xs text-slate-400 mt-1">Or drag & drop · Max 500MB · Images also supported</p>}
      {error && <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function CoverImageDropzone({ value, onChange }: { value: string; onChange: (url: string, name: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onChange(URL.createObjectURL(file), file.name);
  };
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl flex items-center gap-3 px-4 py-3 cursor-pointer transition-all",
        dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); }} className="hidden" />
      {value ? (
        <img src={value} className="w-8 h-8 rounded-lg object-cover" alt="cover" />
      ) : (
        <Image className="w-5 h-5 text-slate-400" />
      )}
      <span className="text-sm text-slate-500 font-medium truncate">
        {value ? 'Change cover image' : 'Drop or click to add cover image'}
      </span>
    </div>
  );
}

function InlineDateTimePicker({ onSchedule, isProcessing }: { onSchedule: (at: string) => Promise<void>; isProcessing: boolean }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!date || !time) { setError('Please pick a date and time'); return; }
    const dt = new Date(`${date}T${time}`);
    if (dt <= new Date()) { setError('Scheduled time must be in the future'); return; }
    setError(null);
    await onSchedule(dt.toISOString());
  };

  return (
    <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/30 space-y-3">
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Schedule Post</p>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      <button
        onClick={handleConfirm}
        disabled={isProcessing}
        className={cn("w-full py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2",
          isProcessing ? "bg-slate-100 text-slate-300" : "bg-blue-600 text-white hover:bg-blue-700"
        )}
      >
        {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Confirm Schedule
      </button>
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
  const [globalHashtags, setGlobalHashtags] = useState('');
  const [soundLabel, setSoundLabel] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contentItemId, setContentItemId] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; error?: string }>>({});
  const [showSchedule, setShowSchedule] = useState(false);

  const effectiveMediaUrl = selectedLibraryItem?.media_url || selectedLibraryItem?.assets?.[0]?.file_url || mediaUrl;
  const previewPost = platformPosts.find(p => p.platform === previewPlatform);
  const igSettings = platformPosts.find(p => p.platform === 'Instagram')?.platform_settings_json || {};
  const ytSettings = platformPosts.find(p => p.platform === 'YouTube')?.platform_settings_json || {};

  useEffect(() => {
    if (!isOpen) return;
    if (contentItem) {
      setGlobalCaption(contentItem.platform_posts?.[0]?.caption || '');
      setGlobalHashtags((contentItem.platform_posts?.[0]?.hashtags || []).join(' '));
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
    setPlatformPosts(prev => prev.map(p => ({
      ...p,
      caption: globalCaption,
      hashtags: globalHashtags.split(/\s+/).filter(Boolean),
      platform_settings_json: p.platform === 'YouTube'
        ? { ...p.platform_settings_json, tags: globalHashtags.split(/\s+/).filter(Boolean).map(h => h.replace(/^#/, '')) }
        : p.platform_settings_json,
    })));
  }, [globalCaption, globalHashtags]);

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
    setGlobalHashtags('');
    setSoundLabel('');
    setCoverImageUrl('');
    setIsSaving(false);
    setIsPublishing(false);
    setSaveError(null);
    setContentItemId(null);
    setPublishResults({});
    setShowSchedule(false);
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
        hashtags: globalHashtags.split(/\s+/).filter(Boolean),
        platform_settings_json: platform === 'YouTube'
          ? { video_type: 'short', category: 'Music', privacy: 'public', audience: 'not_kids', tags: globalHashtags.split(/\s+/).filter(Boolean).map(h => h.replace(/^#/, '')) }
          : platform === 'TikTok'
          ? { privacy_level: 'PUBLIC_TO_EVERYONE', allow_comments: true, allow_duet: true, allow_stitch: true }
          : { format: 'reel', share_to_feed: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  };

  const handleContinue = () => {
    const hasMedia = effectiveMediaUrl || mediaFile || selectedLibraryItem;
    if (!hasMedia) { setSaveError('Please select or upload content first'); return; }
    setSaveError(null);
    const posts = buildPlatformPosts(selectedPlatforms);
    setPlatformPosts(posts);
    setStep('editor');
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
      try {
        const asset = await contentService.uploadVideo(mediaFile);
        if (asset) mUrl = asset.file_url;
      } catch {}
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
        await contentService.updateContentItem(id, {
          title: releases.find(r => r.id === songId)?.title || 'Draft Post',
          notes: soundLabel,
        } as any);
        for (const post of platformPosts) {
          if (!post.id.startsWith('pp_')) {
            await contentService.updatePlatformPost(post.id, post);
          }
        }
      }
      const song = releases.find(r => r.id === songId);
      onSaved?.({
        id: id || 'local',
        user_id: 'user_1',
        title: song?.title || 'Draft Post',
        hook: '',
        caption: globalCaption,
        hashtags: globalHashtags.split(/\s+/).filter(Boolean),
        platform: selectedPlatforms[0] || 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'drafting',
        publish_status: 'draft',
        track_id: songId || undefined,
        media_url: effectiveMediaUrl || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        platform_posts: platformPosts,
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
    const errs = getValidationErrors();
    if (errs.length) { setSaveError(errs[0]); return; }
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
    const failures = Object.entries(results).filter(([, r]) => !r.success).map(([id, r]) => `${platformPosts.find(p => p.id === id)?.platform}: ${r.error}`);
    if (failures.length) { setSaveError(failures.join('; ')); return; }
    const song = releases.find(r => r.id === songId);
    onSaved?.({
      id: id || '',
      user_id: 'user_1',
      title: song?.title || 'Published Post',
      hook: '',
      caption: globalCaption,
      hashtags: globalHashtags.split(/\s+/).filter(Boolean),
      platform: selectedPlatforms[0] || 'Instagram',
      post_type: 'drop_clip',
      angle: 'hype',
      status: 'posted',
      publish_status: 'published',
      track_id: songId || undefined,
      media_url: effectiveMediaUrl || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      platform_posts: platformPosts,
    });
    onClose();
  };

  const handleSchedule = async (scheduledAt: string) => {
    const errs = getValidationErrors();
    if (errs.length) { setSaveError(errs[0]); return; }
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
    const failures = Object.entries(results).filter(([, r]) => !r.success).map(([id, r]) => `${platformPosts.find(p => p.id === id)?.platform}: ${r.error}`);
    if (failures.length) { setSaveError(failures.join('; ')); return; }
    const song = releases.find(r => r.id === songId);
    onSaved?.({
      id: id || '',
      user_id: 'user_1',
      title: song?.title || 'Scheduled Post',
      hook: '',
      caption: globalCaption,
      hashtags: globalHashtags.split(/\s+/).filter(Boolean),
      platform: selectedPlatforms[0] || 'Instagram',
      post_type: 'drop_clip',
      angle: 'hype',
      status: 'scheduled',
      publish_status: 'scheduled',
      scheduled_at: scheduledAt,
      track_id: songId || undefined,
      media_url: effectiveMediaUrl || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      platform_posts: platformPosts,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-7 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Film className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">{contentItem ? 'Edit Post' : 'New Post'}</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {step === 'content' ? 'Select content' : 'Configure & publish'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {(['content', 'editor'] as Step[]).map((s, i) => (
                <div key={s} className={cn("h-1.5 rounded-full transition-all", step === s ? "w-8 bg-blue-500" : i < (['content', 'editor'] as Step[]).indexOf(step) ? "w-4 bg-blue-300" : "w-4 bg-slate-200")} />
              ))}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {step === 'content' && (
              <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-7 space-y-6">
                <div className="flex gap-2 border-b border-slate-100 pb-0">
                  {[{ id: 'upload', label: 'Upload', Icon: Upload }, { id: 'library', label: 'Content Library', Icon: Library }].map(tab => (
                    <button key={tab.id} onClick={() => setContentTab(tab.id as any)}
                      className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-black relative transition-all",
                        contentTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <tab.Icon className="w-4 h-4" />
                      {tab.label}
                      {contentTab === tab.id && (
                        <motion.div layoutId="contentSourceTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                      )}
                    </button>
                  ))}
                </div>

                {contentTab === 'upload' && (
                  <div className="space-y-4">
                    {mediaUrl && !selectedLibraryItem ? (
                      <div className="relative rounded-2xl overflow-hidden bg-black">
                        {mediaType === 'video' ? (
                          <video src={mediaUrl} className="w-full max-h-64 object-contain" controls playsInline />
                        ) : (
                          <img src={mediaUrl} className="w-full max-h-64 object-contain" alt="preview" />
                        )}
                        <button onClick={() => { setMediaUrl(''); setMediaFile(null); }}
                          className="absolute top-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <MediaDropzone onFile={handleMediaFile} />
                    )}
                  </div>
                )}

                {contentTab === 'library' && (
                  <div>
                    {loadingLibrary ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      </div>
                    ) : libraryItems.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
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
                              className={cn("relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 transition-all group",
                                isSelected ? "ring-2 ring-blue-500 ring-offset-2 scale-[1.02]" : "hover:scale-[1.02]"
                              )}
                            >
                              {thumb ? (
                                <video src={thumb} className="w-full h-full object-cover" muted preload="metadata" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-6 h-6 text-slate-600" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-2 left-2 right-2">
                                <p className="text-white text-[9px] font-black truncate">{item.title || 'Untitled'}</p>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle2 className="w-5 h-5 text-blue-400 drop-shadow" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {saveError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleContinue}
                    disabled={!effectiveMediaUrl && !mediaFile}
                    className={cn("flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg",
                      (!effectiveMediaUrl && !mediaFile) ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                    )}
                  >
                    Continue to Editor
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'editor' && (
              <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-[2fr_3fr] divide-x divide-slate-100 min-h-0"
              >
                <div className="bg-slate-50/50 flex flex-col overflow-y-auto">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview</p>
                    <div className="flex gap-1.5">
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
                  <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
                    <FeedPreview
                      platform={previewPlatform}
                      mediaUrl={effectiveMediaUrl}
                      coverImageUrl={coverImageUrl || igSettings.cover_image_url}
                      caption={globalCaption}
                      hashtags={globalHashtags.split(/\s+/).filter(Boolean)}
                      title={platformPosts.find(p => p.platform === 'YouTube')?.title || ''}
                      soundLabel={soundLabel}
                      instagramFormat={igSettings.format || 'reel'}
                      youtubeFormat={ytSettings.video_type || 'short'}
                    />
                  </div>

                  {Object.keys(publishResults).length > 0 && (
                    <div className="p-4 space-y-2 border-t border-slate-100">
                      {platformPosts.map(post => {
                        const result = publishResults[post.id];
                        if (!result) return null;
                        return (
                          <div key={post.id} className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-medium",
                            result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          )}>
                            {result.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            <span>{post.platform}: {result.success ? 'Published' : result.error}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Platforms</p>
                    <div className="flex gap-2 flex-wrap">
                      {PLATFORMS.map(({ id, label, Icon, activeColor, color }) => {
                        const isActive = selectedPlatforms.includes(id);
                        return (
                          <button key={id} onClick={() => togglePlatform(id)}
                            className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all",
                              isActive ? activeColor + ' text-white border-transparent shadow-sm' : 'bg-white border-slate-200 ' + color + ' hover:border-current'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                            {isActive && <CheckCircle2 className="w-3 h-3 opacity-70" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Song</label>
                    <div className="relative">
                      <select
                        value={songId}
                        onChange={e => setSongId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 appearance-none pr-8"
                      >
                        <option value="">— No song linked —</option>
                        {releases.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Caption <span className="normal-case font-medium text-slate-300">(applies to all platforms)</span>
                    </label>
                    <textarea
                      value={globalCaption}
                      onChange={e => setGlobalCaption(e.target.value)}
                      placeholder="Write your caption here. It applies to all platforms..."
                      rows={4}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                      Hashtags <span className="normal-case font-medium text-slate-300">(global · auto-fills YouTube tags)</span>
                    </label>
                    <input
                      type="text"
                      value={globalHashtags}
                      onChange={e => setGlobalHashtags(e.target.value)}
                      placeholder="#music #newrelease #artist #producer"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cover Image</label>
                    <CoverImageDropzone value={coverImageUrl} onChange={(url) => setCoverImageUrl(url)} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                      <Music className="w-3 h-3" />
                      Sound Label
                    </label>
                    <input
                      type="text"
                      value={soundLabel}
                      onChange={e => setSoundLabel(e.target.value)}
                      placeholder="e.g. Original Sound - WES"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  {platformPosts.length > 0 && (
                    <div className="border-t border-slate-100 pt-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Platform Settings</p>
                      <PlatformTabs
                        platformPosts={platformPosts}
                        onUpdate={handleUpdatePlatformPost}
                        globalHashtags={globalHashtags}
                      />
                    </div>
                  )}

                  {saveError && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {showSchedule && (
                    <InlineDateTimePicker onSchedule={handleSchedule} isProcessing={isPublishing} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === 'editor' && (
          <div className="border-t border-slate-100 px-7 py-4 flex items-center gap-3 bg-white shrink-0">
            <button onClick={() => setStep('content')} className="px-4 py-2.5 border-2 border-slate-200 text-slate-500 rounded-xl font-black text-sm hover:bg-slate-50 transition-all">
              Back
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving || isPublishing}
              className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Draft
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              disabled={isPublishing || selectedPlatforms.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-50 transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              Schedule
            </button>
            <button
              onClick={handlePostNow}
              disabled={isPublishing || selectedPlatforms.length === 0}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg",
                isPublishing || selectedPlatforms.length === 0
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Post Now
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
