import React, { useState, useEffect, useCallback } from 'react';
import { X, Film, Instagram, Music2, Youtube, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { PlatformPost, ContentItemWithAssets, ContentAsset } from '../types';
import { UploadDropzone } from './UploadDropzone';
import { PlatformTabs } from './PlatformTabs';
import { ScheduleControls } from './ScheduleControls';
import { contentService } from '../../services/contentService';
import { publishService } from '../../services/publishService';

interface PostEditorProps {
  isOpen: boolean;
  onClose: () => void;
  contentItem?: ContentItemWithAssets | null;
  onSaved?: (item: ContentItemWithAssets) => void;
}

type AvailablePlatform = 'Instagram' | 'TikTok' | 'YouTube';

const allPlatforms: { id: AvailablePlatform; label: string; icon: React.ElementType }[] = [
  { id: 'Instagram', label: 'Instagram Reel', icon: Instagram },
  { id: 'TikTok', label: 'TikTok', icon: Music2 },
  { id: 'YouTube', label: 'YouTube Short', icon: Youtube },
];

export function PostEditor({ isOpen, onClose, contentItem, onSaved }: PostEditorProps) {
  const [title, setTitle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [notes, setNotes] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<AvailablePlatform[]>([]);
  const [step, setStep] = useState<'upload' | 'platforms' | 'editor'>('upload');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contentItemId, setContentItemId] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  useEffect(() => {
    if (contentItem) {
      setTitle(contentItem.title || '');
      setCampaign(contentItem.campaign || '');
      setNotes(contentItem.notes || '');
      setVideoPreviewUrl(contentItem.media_url || contentItem.assets?.[0]?.file_url || null);
      setContentItemId(contentItem.id);
      if (contentItem.platform_posts?.length) {
        setPlatformPosts(contentItem.platform_posts);
        setSelectedPlatforms(contentItem.platform_posts.map(p => p.platform));
        setStep('editor');
      } else {
        setStep(contentItem.media_url || contentItem.assets?.length ? 'platforms' : 'upload');
      }
    } else {
      resetForm();
    }
  }, [contentItem, isOpen]);

  const resetForm = () => {
    setTitle('');
    setCampaign('');
    setNotes('');
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setPlatformPosts([]);
    setSelectedPlatforms([]);
    setStep('upload');
    setContentItemId(null);
    setSaveError(null);
    setPublishResults({});
  };

  const handleUploadComplete = useCallback((file: File, previewUrl: string) => {
    setVideoFile(file);
    setVideoPreviewUrl(previewUrl);
    setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
    setStep('platforms');
  }, []);

  const togglePlatform = (platform: AvailablePlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleContinueToEditor = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      let itemId = contentItemId;

      if (!itemId) {
        let mediaUrl = videoPreviewUrl || undefined;

        if (videoFile) {
          try {
            const asset = await contentService.uploadVideo(videoFile);
            if (asset) {
              mediaUrl = asset.file_url;
            }
          } catch (err) {
            console.warn('Supabase storage upload failed, using local preview:', err);
          }
        }

        itemId = await contentService.createContentItem({
          title: title || 'Untitled Upload',
          campaign,
          notes,
          media_url: mediaUrl,
        });

        if (!itemId) {
          itemId = `local_${Date.now()}`;
        }

        setContentItemId(itemId);

        if (videoFile && itemId && !itemId.startsWith('local_')) {
          await contentService.createAsset(itemId, {
            file_url: mediaUrl || '',
            file_name: videoFile.name,
            mime_type: videoFile.type,
            asset_type: 'video',
            file_size_bytes: videoFile.size,
          });
        }
      }

      const newPosts: PlatformPost[] = [];
      for (const platform of selectedPlatforms) {
        const existing = platformPosts.find(p => p.platform === platform);
        if (existing) {
          newPosts.push(existing);
          continue;
        }

        if (itemId && !itemId.startsWith('local_')) {
          const created = await contentService.createPlatformPost(itemId, platform);
          if (created) {
            newPosts.push(created);
            continue;
          }
        }

        newPosts.push({
          id: `pp_${platform}_${Date.now()}`,
          content_item_id: itemId || '',
          platform,
          status: 'draft',
          caption: '',
          title: title || '',
          hashtags: [],
          platform_settings_json: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      setPlatformPosts(newPosts);
      setStep('editor');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to create content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePlatformPost = (postId: string, updates: Partial<PlatformPost>) => {
    setPlatformPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
    );
  };

  const handleRemovePlatform = async (postId: string) => {
    const post = platformPosts.find(p => p.id === postId);
    if (post && !post.id.startsWith('pp_')) {
      await contentService.deletePlatformPost(postId);
    }
    setPlatformPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPlatforms(prev => {
      const removedPlatform = post?.platform;
      return removedPlatform ? prev.filter(p => p !== removedPlatform) : prev;
    });
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!videoPreviewUrl && !contentItem?.media_url) {
      errors.push('No video uploaded');
    }
    for (const post of platformPosts) {
      const err = publishService.validatePost(post);
      if (err) errors.push(`${post.platform}: ${err}`);
    }
    return errors;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (contentItemId && !contentItemId.startsWith('local_')) {
        await contentService.updateContentItem(contentItemId, { title, campaign, notes } as ContentItemWithAssets);
        for (const post of platformPosts) {
          if (!post.id.startsWith('pp_')) {
            await contentService.updatePlatformPost(post.id, post);
          }
        }
      }

      onSaved?.({
        id: contentItemId || `local_${Date.now()}`,
        user_id: 'user_1',
        title,
        hook: '',
        caption: platformPosts[0]?.caption || '',
        hashtags: platformPosts[0]?.hashtags || [],
        platform: platformPosts[0]?.platform || 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'drafting',
        publish_status: 'draft',
        media_url: videoPreviewUrl || undefined,
        created_at: contentItem?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        campaign,
        notes,
        platform_posts: platformPosts,
      });
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostNow = async () => {
    setIsPublishing(true);
    setPublishResults({});
    const results: Record<string, { success: boolean; error?: string }> = {};
    const failures: string[] = [];

    for (const post of platformPosts) {
      const result = await publishService.publishNow(post, videoPreviewUrl || contentItem?.media_url);
      results[post.id] = { success: result.success, error: result.error };

      if (result.success) {
        handleUpdatePlatformPost(post.id, {
          status: 'published',
          published_at: new Date().toISOString(),
          external_post_id: result.externalPostId,
          external_post_url: result.externalPostUrl,
        });
      } else {
        handleUpdatePlatformPost(post.id, {
          status: 'failed',
          error_message: result.error,
        });
        failures.push(`${post.platform}: ${result.error}`);
      }
    }

    setPublishResults(results);
    setIsPublishing(false);

    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }

    const allSuccess = Object.values(results).every(r => r.success);
    if (allSuccess) {
      onSaved?.({
        id: contentItemId || '',
        user_id: 'user_1',
        title,
        hook: '',
        caption: '',
        hashtags: [],
        platform: platformPosts[0]?.platform || 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'posted',
        publish_status: 'published',
        media_url: videoPreviewUrl || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        platform_posts: platformPosts,
      });
    }
  };

  const handleSchedule = async (scheduledAt: string) => {
    setIsPublishing(true);
    setPublishResults({});
    const results: Record<string, { success: boolean; error?: string }> = {};
    const failures: string[] = [];

    for (const post of platformPosts) {
      const result = await publishService.schedulePost(post, scheduledAt, videoPreviewUrl || contentItem?.media_url);
      results[post.id] = { success: result.success, error: result.error };

      if (result.success) {
        handleUpdatePlatformPost(post.id, {
          status: 'scheduled',
          scheduled_at: scheduledAt,
        });
      } else {
        failures.push(`${post.platform}: ${result.error}`);
      }
    }

    setPublishResults(results);
    setIsPublishing(false);

    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }

    const allSuccess = Object.values(results).every(r => r.success);
    if (allSuccess) {
      onSaved?.({
        id: contentItemId || '',
        user_id: 'user_1',
        title,
        hook: '',
        caption: '',
        hashtags: [],
        platform: platformPosts[0]?.platform || 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'scheduled',
        publish_status: 'scheduled',
        scheduled_at: scheduledAt,
        media_url: videoPreviewUrl || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        platform_posts: platformPosts,
      });
    }
  };

  const validationErrors = step === 'editor' ? getValidationErrors() : [];
  const isPublishDisabled = validationErrors.length > 0 || platformPosts.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {contentItem ? 'Edit Post' : 'New Post'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {step === 'upload' && 'Upload your video'}
                {step === 'platforms' && 'Choose platforms'}
                {step === 'editor' && 'Configure & publish'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {['upload', 'platforms', 'editor'].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "w-8 h-1.5 rounded-full transition-all",
                    step === s ? "bg-blue-500" : i < ['upload', 'platforms', 'editor'].indexOf(step) ? "bg-blue-300" : "bg-slate-200"
                  )}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <UploadDropzone
                  onUploadComplete={handleUploadComplete}
                  existingVideoUrl={contentItem?.media_url || contentItem?.assets?.[0]?.file_url}
                />

                {videoPreviewUrl && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Give your content a title..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                    <button
                      onClick={() => setStep('platforms')}
                      className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Continue to Platform Selection
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'platforms' && (
              <motion.div
                key="platforms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-xl font-black text-slate-900">Where do you want to post?</h3>
                  <p className="text-sm text-slate-500">Select one or more platforms</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {allPlatforms.map(({ id, label, icon: Icon }) => {
                    const selected = selectedPlatforms.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => togglePlatform(id)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all",
                          selected
                            ? "border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100"
                            : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                        )}
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                          selected ? "bg-blue-100" : "bg-slate-100"
                        )}>
                          <Icon className={cn("w-7 h-7", selected ? "text-blue-600" : "text-slate-400")} />
                        </div>
                        <span className={cn("text-sm font-black", selected ? "text-blue-700" : "text-slate-500")}>
                          {label}
                        </span>
                        {selected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Content title..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Campaign</label>
                      <input
                        type="text"
                        value={campaign}
                        onChange={(e) => setCampaign(e.target.value)}
                        placeholder="e.g. Summer Drop"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Notes</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Internal notes..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinueToEditor}
                    disabled={selectedPlatforms.length === 0 || isSaving}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg",
                      selectedPlatforms.length === 0 || isSaving
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                    )}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Continue to Editor
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'editor' && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    {videoPreviewUrl && (
                      <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[400px]">
                        <video
                          src={videoPreviewUrl}
                          className="w-full h-full object-contain"
                          controls
                          playsInline
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Campaign</label>
                          <input
                            type="text"
                            value={campaign}
                            onChange={(e) => setCampaign(e.target.value)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Notes</label>
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </div>

                    {Object.keys(publishResults).length > 0 && (
                      <div className="space-y-2">
                        {platformPosts.map(post => {
                          const r = publishResults[post.id];
                          if (!r) return null;
                          return (
                            <div
                              key={post.id}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium",
                                r.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              )}
                            >
                              {r.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                              {post.platform}: {r.success ? 'Published' : r.error}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-3 space-y-6">
                    <PlatformTabs
                      platformPosts={platformPosts}
                      onUpdate={handleUpdatePlatformPost}
                    />

                    {validationErrors.length > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
                        {validationErrors.map((err, i) => (
                          <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {err}
                          </p>
                        ))}
                      </div>
                    )}

                    <ScheduleControls
                      onPostNow={handlePostNow}
                      onSchedule={handleSchedule}
                      isPublishDisabled={isPublishDisabled}
                      disabledReason={validationErrors[0]}
                      isPublishing={isPublishing}
                    />

                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setStep('platforms')}
                        className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-slate-700 transition-all"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        Save as Draft
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
