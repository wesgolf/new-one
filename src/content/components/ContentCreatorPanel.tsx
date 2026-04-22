import React from 'react';
import { 
  Plus, 
  X, 
  Sparkles, 
  Music, 
  Smartphone, 
  Youtube, 
  Instagram, 
  Twitter,
  Hash,
  MessageSquare,
  Clock,
  Video,
  ChevronRight,
  Zap,
  Target
} from 'lucide-react';
import { ContentItem, Platform, PostType, ContentAngle, ContentStatus } from '../types';
import { Release } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ContentCreatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ContentItem>) => void;
  releases: Release[];
  initialItem?: ContentItem | null;
}

const platforms: Platform[] = ['Instagram', 'TikTok', 'YouTube', 'Twitter'];
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

export const ContentCreatorPanel: React.FC<ContentCreatorPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  releases,
  initialItem
}) => {
  const [formData, setFormData] = React.useState<Partial<ContentItem>>({
    title: '',
    hook: '',
    caption: '',
    hashtags: [],
    platform: 'Instagram',
    post_type: 'drop_clip',
    angle: 'hype',
    status: 'idea',
    ...initialItem
  });

  const [hashtagInput, setHashtagInput] = React.useState('');

  React.useEffect(() => {
    if (initialItem) {
      setFormData(initialItem);
    } else {
      setFormData({
        title: '',
        hook: '',
        caption: '',
        hashtags: [],
        platform: 'Instagram',
        post_type: 'drop_clip',
        angle: 'hype',
        status: 'idea'
      });
    }
  }, [initialItem, isOpen]);

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

  const removeHashtag = (tag: string) => {
    setFormData({ ...formData, hashtags: formData.hashtags?.filter(t => t !== tag) || [] });
  };

  const generateHook = () => {
    const hooks = [
      "POV: You found the track of the summer 🌴",
      "I spent 40 hours on this lead synth... was it worth it? 🎹",
      "Wait for the second drop... 🤯",
      "How I made my new single in a hotel room 🏨",
      "This track was inspired by a dream I had 😴"
    ];
    setFormData({ ...formData, hook: hooks[Math.floor(Math.random() * hooks.length)] });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row h-[90vh] lg:h-auto max-h-[90vh]"
      >
        {/* Left Side: Writing Inputs */}
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar border-r border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {initialItem ? 'Edit Content' : 'Create Content'}
              </h2>
              <p className="text-slate-500 font-medium">Design your next viral moment.</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Hook Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  The Hook (Primary Input)
                </label>
                <button 
                  onClick={generateHook}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Generate
                </button>
              </div>
              <textarea 
                value={formData.hook}
                onChange={e => setFormData({ ...formData, hook: e.target.value })}
                placeholder="What's the first thing they see/hear?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 text-xl font-black italic text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none min-h-[120px]"
              />
            </div>

            {/* Caption Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                Caption & Story
              </label>
              <textarea 
                value={formData.caption}
                onChange={e => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Tell the story behind the clip..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none min-h-[150px]"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-emerald-500" />
                Hashtags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                <AnimatePresence>
                  {formData.hashtags?.map(tag => (
                    <motion.span 
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 border border-emerald-100"
                    >
                      {tag}
                      <button onClick={() => removeHashtag(tag)} className="hover:text-emerald-800">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <input 
                type="text"
                value={hashtagInput}
                onChange={e => setHashtagInput(e.target.value)}
                onKeyDown={handleAddHashtag}
                placeholder="Type and press Enter..."
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Metadata & Scheduling */}
        <div className="w-full lg:w-[380px] bg-slate-50/50 p-8 lg:p-10 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex-1 space-y-8">
            {/* Platform Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Platform</label>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map(p => (
                  <button
                    key={p}
                    onClick={() => setFormData({ ...formData, platform: p })}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                      formData.platform === p 
                        ? "bg-white border-blue-500 shadow-lg shadow-blue-500/10 text-slate-900" 
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {p === 'Instagram' && <Instagram className={cn("w-4 h-4", formData.platform === p ? "text-blue-500" : "text-slate-300")} />}
                    {p === 'TikTok' && <Smartphone className={cn("w-4 h-4", formData.platform === p ? "text-blue-500" : "text-slate-300")} />}
                    {p === 'YouTube' && <Youtube className={cn("w-4 h-4", formData.platform === p ? "text-blue-500" : "text-slate-300")} />}
                    {p === 'Twitter' && <Twitter className={cn("w-4 h-4", formData.platform === p ? "text-blue-500" : "text-slate-300")} />}
                    <span className="text-xs font-black">{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Track Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Track</label>
              <div className="relative">
                <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={formData.track_id || ''}
                  onChange={e => setFormData({ ...formData, track_id: e.target.value })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all appearance-none"
                >
                  <option value="">No Track Linked</option>
                  {releases.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Post Type & Angle */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Format</label>
                <select 
                  value={formData.post_type}
                  onChange={e => setFormData({ ...formData, post_type: e.target.value as PostType })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                >
                  {postTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Angle</label>
                <select 
                  value={formData.angle}
                  onChange={e => setFormData({ ...formData, angle: e.target.value as ContentAngle })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                >
                  {angles.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule Post</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="datetime-local"
                  value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''}
                  onChange={e => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-10 mt-10 border-t border-slate-200 flex flex-col gap-3">
            <button 
              onClick={() => onSave({ ...formData, status: 'ready' })}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" />
              Save as Ready
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Save as Draft
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
