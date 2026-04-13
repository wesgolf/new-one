import React from 'react';
import {
  X,
  Send,
  Clock,
  Sparkles,
  Music,
  Smartphone,
  Youtube,
  Instagram,
  Twitter,
  Image,
  Hash,
  MessageSquare,
  Zap,
  Target,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar as CalendarIcon,
  XCircle,
  Settings2,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import { ContentItem, Platform, PostType, ContentAngle, PublishStatus, PlatformSettings } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PlatformSettingsForm } from './PlatformSettingsForm';
import { BestPostingTimes } from './BestPostingTimes';
import { getDefaultSettings } from '../platformSettingsRegistry';

interface PostComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ContentItem>) => void;
  onPublishNow: (item: ContentItem) => Promise<void>;
  onSchedule: (item: ContentItem, scheduledAt: string) => Promise<void>;
  onCancel?: (item: ContentItem) => Promise<void>;
  releases: Release[];
  initialItem?: ContentItem | null;
  initialDate?: string;
}

const platforms: Platform[] = ['Instagram', 'TikTok', 'YouTube'];
const postTypes: { value: PostType; label: string }[] = [
  { value: 'drop_clip', label: 'Drop Clip' },
  { value: 'teaser', label: 'Teaser' },
  { value: 'talking', label: 'Talking' },
  { value: 'mashup', label: 'Mashup' },
  { value: 'performance', label: 'Performance' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'behind_the_scenes', label: 'Behind the Scenes' },
];
const angles: { value: ContentAngle; label: string }[] = [
  { value: 'hype', label: 'Hype' },
  { value: 'educational', label: 'Educational' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'personal', label: 'Personal' },
  { value: 'technical', label: 'Technical' },
];

const platformIcons: Record<Platform, any> = {
  Instagram,
  TikTok: Smartphone,
  YouTube: Youtube,
  Twitter,
};

const publishStatusConfig: Record<PublishStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  scheduled: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
  published: { label: 'Published', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-100' },
  cancelled: { label: 'Cancelled', color: 'text-amber-600', bg: 'bg-amber-100' },
};

export function PostComposerModal({
  isOpen,
  onClose,
  onSave,
  onPublishNow,
  onSchedule,
  onCancel,
  releases,
  initialItem,
  initialDate,
}: PostComposerModalProps) {
  const isEditing = !!initialItem?.id;

  const [formData, setFormData] = React.useState<Partial<ContentItem>>({
    title: '',
    hook: '',
    caption: '',
    hashtags: [],
    platform: 'Instagram',
    post_type: 'drop_clip',
    angle: 'hype',
    status: 'idea',
    publish_status: 'draft',
    platform_settings: getDefaultSettings('Instagram'),
    media_url: '',
    scheduled_at: initialDate ? `${initialDate}T12:00` : '',
  });

  const [hashtagInput, setHashtagInput] = React.useState('');
  const [showPlatformSettings, setShowPlatformSettings] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialItem) {
      setFormData({
        ...initialItem,
        platform_settings: initialItem.platform_settings || getDefaultSettings(initialItem.platform),
        scheduled_at: initialItem.scheduled_at || (initialDate ? `${initialDate}T12:00` : ''),
      });
    } else {
      setFormData({
        title: '',
        hook: '',
        caption: '',
        hashtags: [],
        platform: 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'idea',
        publish_status: 'draft',
        platform_settings: getDefaultSettings('Instagram'),
        media_url: '',
        scheduled_at: initialDate ? `${initialDate}T12:00` : '',
      });
    }
    setActionSuccess(null);
    setActionError(null);
    setShowPlatformSettings(false);
  }, [initialItem, isOpen, initialDate]);

  const handlePlatformChange = (platform: Platform) => {
    setFormData({
      ...formData,
      platform,
      platform_settings: getDefaultSettings(platform),
    });
  };

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hashtagInput.trim()) {
      e.preventDefault();
      const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
      if (!formData.hashtags?.includes(tag)) {
        setFormData({ ...formData, hashtags: [...(formData.hashtags || []), tag] });
      }
      setHashtagInput('');
    }
  };

  const handleSaveDraft = () => {
    onSave({ ...formData, status: 'idea', publish_status: 'draft' });
  };

  const handleSaveReady = () => {
    onSave({ ...formData, status: 'ready', publish_status: 'draft' });
  };

  const validateForm = (): string | null => {
    if (!formData.title?.trim() && !formData.hook?.trim()) {
      return 'Please enter a title or hook for your post';
    }
    if (!formData.caption?.trim()) {
      return 'Please add a caption for your post';
    }
    return null;
  };

  const handlePublishNow = async () => {
    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }
    if (!formData.id) {
      onSave({ ...formData, status: 'ready', publish_status: 'draft' });
      return;
    }
    setIsPublishing(true);
    setActionError(null);
    try {
      await onPublishNow(formData as ContentItem);
      setActionSuccess('Published successfully!');
      setTimeout(() => { onClose(); setActionSuccess(null); }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedule = async () => {
    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }
    if (!formData.scheduled_at) {
      setActionError('Please select a date and time to schedule');
      return;
    }
    const scheduledDate = new Date(formData.scheduled_at);
    if (scheduledDate <= new Date()) {
      setActionError('Schedule time must be in the future');
      return;
    }
    setIsScheduling(true);
    setActionError(null);
    try {
      const itemToSchedule: ContentItem = {
        id: formData.id || `cont_${Date.now()}`,
        user_id: formData.user_id || 'user_1',
        title: formData.title || 'Untitled',
        hook: formData.hook || '',
        caption: formData.caption || '',
        hashtags: formData.hashtags || [],
        platform: formData.platform || 'Instagram',
        post_type: formData.post_type || 'drop_clip',
        angle: formData.angle || 'hype',
        status: 'scheduled',
        publish_status: 'scheduled',
        platform_settings: formData.platform_settings || {},
        media_url: formData.media_url,
        scheduled_at: formData.scheduled_at,
        created_at: formData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await onSchedule(itemToSchedule, formData.scheduled_at!);
      setActionSuccess('Scheduled successfully!');
      setTimeout(() => { onClose(); setActionSuccess(null); }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to schedule');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelPost = async () => {
    if (!formData.id || !onCancel) return;
    try {
      await onCancel(formData as ContentItem);
      setActionSuccess('Post cancelled');
      setTimeout(() => { onClose(); setActionSuccess(null); }, 1500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel');
    }
  };

  const handleBestTimeSelect = (_date: string, time: string) => {
    const currentDate = formData.scheduled_at?.split('T')[0] || new Date().toISOString().split('T')[0];
    setFormData({ ...formData, scheduled_at: `${currentDate}T${time}` });
  };

  const generateHook = () => {
    const hooks = [
      "POV: You found the track of the summer",
      "I spent 40 hours on this lead synth... was it worth it?",
      "Wait for the second drop...",
      "How I made my new single in a hotel room",
      "This track was inspired by a dream I had",
      "Nobody's talking about this production trick",
      "The sample that changed everything",
    ];
    setFormData({ ...formData, hook: hooks[Math.floor(Math.random() * hooks.length)] });
  };

  if (!isOpen) return null;

  const currentPubStatus = formData.publish_status || 'draft';
  const pubConfig = publishStatusConfig[currentPubStatus];
  const canSchedule = currentPubStatus === 'draft' || currentPubStatus === 'cancelled' || currentPubStatus === 'failed';
  const canPublish = currentPubStatus === 'draft' || currentPubStatus === 'scheduled';
  const canCancel = currentPubStatus === 'scheduled' && onCancel;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[92vh]"
      >
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar border-r border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isEditing ? 'Edit Post' : 'Create Post'}
                </h2>
                {isEditing && (
                  <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider", pubConfig.bg, pubConfig.color)}>
                    {pubConfig.label}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium">Compose and schedule your content.</p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {actionSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-700">{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold text-red-700">{actionError}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Post title..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  The Hook
                </label>
                <button onClick={generateHook} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <textarea
                value={formData.hook || ''}
                onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                placeholder="What's the first thing they see/hear?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-black italic text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/30 transition-all resize-none min-h-[90px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                Caption
              </label>
              <textarea
                value={formData.caption || ''}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Your caption text..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-purple-500/30 transition-all resize-none min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-indigo-500" />
                Media URL
              </label>
              <input
                type="url"
                value={formData.media_url || ''}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                placeholder="https://cdn.example.com/video.mp4"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-emerald-500" />
                Hashtags
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.hashtags?.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-emerald-100">
                    {tag}
                    <button onClick={() => setFormData({ ...formData, hashtags: formData.hashtags?.filter((t) => t !== tag) })}>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleAddHashtag}
                placeholder="Type and press Enter..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPlatformSettings(!showPlatformSettings)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Platform-Specific Settings</span>
              </div>
              {showPlatformSettings ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {showPlatformSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <PlatformSettingsForm
                      platform={formData.platform || 'Instagram'}
                      settings={formData.platform_settings || {}}
                      onChange={(ps) => setFormData({ ...formData, platform_settings: ps })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full lg:w-[380px] bg-slate-50/50 p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform</label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((p) => {
                  const PIcon = platformIcons[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePlatformChange(p)}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left",
                        formData.platform === p
                          ? "bg-white border-blue-500 shadow-lg shadow-blue-500/10 text-slate-900"
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      <PIcon className={cn("w-4 h-4", formData.platform === p ? "text-blue-500" : "text-slate-300")} />
                      <span className="text-xs font-black">{p}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format</label>
                <select
                  value={formData.post_type || 'drop_clip'}
                  onChange={(e) => setFormData({ ...formData, post_type: e.target.value as PostType })}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                >
                  {postTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Angle</label>
                <select
                  value={formData.angle || 'hype'}
                  onChange={(e) => setFormData({ ...formData, angle: e.target.value as ContentAngle })}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                >
                  {angles.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Track</label>
              <div className="relative">
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={formData.track_id || ''}
                  onChange={(e) => setFormData({ ...formData, track_id: e.target.value })}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all appearance-none"
                >
                  <option value="">No Track</option>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                Schedule Date & Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="datetime-local"
                  value={formData.scheduled_at ? (formData.scheduled_at.includes('T') ? formData.scheduled_at.slice(0, 16) : formData.scheduled_at) : ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                />
              </div>
            </div>

            <BestPostingTimes
              platform={formData.platform || 'Instagram'}
              onSelectTime={handleBestTimeSelect}
              selectedDate={formData.scheduled_at?.split('T')[0]}
            />
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200 space-y-2.5">
            {canSchedule && formData.scheduled_at && (
              <button
                onClick={handleSchedule}
                disabled={isScheduling || !!actionSuccess}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isScheduling ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
                ) : (
                  <><Clock className="w-4 h-4" /> Schedule Post</>
                )}
              </button>
            )}

            {canPublish && (
              <button
                onClick={handlePublishNow}
                disabled={isPublishing || !!actionSuccess}
                className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isPublishing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                ) : (
                  <><Send className="w-4 h-4" /> Publish Now</>
                )}
              </button>
            )}

            {canCancel && (
              <button
                onClick={handleCancelPost}
                className="w-full py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Cancel Scheduled Post
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveReady}
                className="py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Target className="w-3.5 h-3.5" /> Save Ready
              </button>
              <button
                onClick={handleSaveDraft}
                className="py-3 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
