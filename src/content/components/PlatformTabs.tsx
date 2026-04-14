import React from 'react';
import { Instagram, Music2, Youtube, Eye, MessageSquare, Scissors, Users, MapPin, Plus, X, Image } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PlatformPost } from '../types';

interface PlatformTabsProps {
  platformPosts: PlatformPost[];
  onUpdate: (postId: string, updates: Partial<PlatformPost>) => void;
  globalCaption?: string;
  globalHashtags?: string;
  mediaType?: 'video' | 'image';
}

const platformConfig = {
  Instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200', active: 'bg-pink-500 text-white' },
  TikTok: { icon: Music2, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', active: 'bg-slate-800 text-white' },
  YouTube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', active: 'bg-red-500 text-white' },
} as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
      {children} {required && <span className="text-red-400">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, multiline, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
}) {
  const cls = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
  return multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={cn(cls, 'resize-none')} />
    : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />;
}

function Toggle({ label, checked, onChange, icon: Icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ElementType;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-sm text-slate-600 font-medium">{label}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("w-10 h-5 rounded-full relative transition-all", checked ? "bg-blue-500" : "bg-slate-200")}
      >
        <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", checked ? "left-5" : "left-0.5")} />
      </button>
    </label>
  );
}

function ButtonGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-lg text-xs font-black transition-all",
            value === opt.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TagsInput({ label, tags, onChange, placeholder }: {
  label: string; tags: string[]; onChange: (tags: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = React.useState('');
  const add = () => {
    const t = input.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))}>
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function InstagramFields({ post, onUpdate, mediaType }: { post: PlatformPost; onUpdate: (id: string, u: Partial<PlatformPost>) => void; mediaType?: 'video' | 'image' }) {
  const s = post.platform_settings_json || {};
  const set = (key: string, value: any) => onUpdate(post.id, { platform_settings_json: { ...s, [key]: value } });

  // Images can't be reels — auto-correct if needed
  const rawFormat: 'reel' | 'story' | 'post' = s.format || (mediaType === 'image' ? 'post' : 'reel');
  const format = mediaType === 'image' && rawFormat === 'reel' ? 'post' : rawFormat;
  if (format !== rawFormat) set('format', format); // auto-correct stored value

  const carouselItems: string[] = s.carousel_items || [];
  const collaborators: string[] = s.collaborators || [];
  const userTags: string[] = s.user_tags || [];

  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const carouselInputRef = React.useRef<HTMLInputElement>(null);

  const handleCarouselFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map(f => URL.createObjectURL(f));
    set('carousel_items', [...carouselItems, ...urls]);
    if (carouselInputRef.current) carouselInputRef.current.value = '';
  };

  // Build format options — reels require video
  const formatOptions = [
    ...(mediaType !== 'image' ? [{ value: 'reel', label: '🎬 Reel' }] : []),
    { value: 'story', label: '📖 Story' },
    { value: 'post', label: '🖼️ Post' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Format</Label>
        {mediaType === 'image' && (
          <p className="text-[9px] text-amber-500 font-bold mb-1.5">⚠️ Reels require video — not available for images</p>
        )}
        <ButtonGroup
          value={format}
          onChange={v => set('format', v)}
          options={formatOptions}
        />
      </div>

      {format === 'post' && (
        <div>
          <Label>Carousel Media</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {carouselItems.map((url, i) => (
              <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                {url.includes('video') || url.endsWith('.mp4') || url.endsWith('.mov') ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  <img src={url} className="w-full h-full object-cover" alt="" />
                )}
                <button
                  type="button"
                  onClick={() => set('carousel_items', carouselItems.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => carouselInputRef.current?.click()}
              className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-blue-300 transition-all"
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <input ref={carouselInputRef} type="file" accept="image/*,video/mp4,video/quicktime" multiple onChange={handleCarouselFile} className="hidden" />
        </div>
      )}

      <div>
        <Label>Cover Image</Label>
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-pink-300 hover:bg-pink-50/30 cursor-pointer transition-all"
          onClick={() => coverInputRef.current?.click()}
        >
          <Image className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">
            {s.cover_image_name || 'Drop or click to add cover image'}
          </span>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              set('cover_image_url', URL.createObjectURL(file));
              set('cover_image_name', file.name);
            }
          }}
        />
      </div>

      <TagsInput
        label="Collaborators"
        tags={collaborators}
        onChange={v => set('collaborators', v)}
        placeholder="@username (press Enter)"
      />

      <TagsInput
        label="Tag People / Location"
        tags={userTags}
        onChange={v => set('user_tags', v)}
        placeholder="@person or location (press Enter)"
      />

      <div>
        <Label>First Comment</Label>
        <Input
          value={s.first_comment || ''}
          onChange={v => set('first_comment', v)}
          placeholder="Auto-post a first comment after publishing..."
          multiline
          rows={2}
        />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-0.5">
        {format === 'reel' && (
          <Toggle label="Share to Feed" checked={s.share_to_feed !== false} onChange={v => set('share_to_feed', v)} icon={Eye} />
        )}
        {format === 'reel' && (
          <Toggle label="Trial Reel" checked={s.trial_reel || false} onChange={v => set('trial_reel', v)} />
        )}
      </div>
    </div>
  );
}

function TikTokFields({ post, onUpdate }: { post: PlatformPost; onUpdate: (id: string, u: Partial<PlatformPost>) => void }) {
  const s = post.platform_settings_json || {};
  const set = (key: string, value: any) => onUpdate(post.id, { platform_settings_json: { ...s, [key]: value } });
  const privacy = s.privacy_level || 'PUBLIC_TO_EVERYONE';

  return (
    <div className="space-y-4">
      <div>
        <Label>Privacy</Label>
        <ButtonGroup
          value={privacy}
          onChange={v => set('privacy_level', v)}
          options={[
            { value: 'PUBLIC_TO_EVERYONE', label: 'Public' },
            { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
            { value: 'SELF_ONLY', label: 'Private' },
          ]}
        />
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-0.5">
        <Toggle label="Allow Comments" checked={s.allow_comments !== false} onChange={v => set('allow_comments', v)} icon={MessageSquare} />
        <Toggle label="Allow Duet" checked={s.allow_duet !== false} onChange={v => set('allow_duet', v)} icon={Scissors} />
        <Toggle label="Allow Stitch" checked={s.allow_stitch !== false} onChange={v => set('allow_stitch', v)} icon={Scissors} />
        <Toggle label="Made for Kids" checked={s.made_for_kids || false} onChange={v => set('made_for_kids', v)} />
      </div>
    </div>
  );
}

const YT_CATEGORIES = [
  'Music', 'Entertainment', 'People & Blogs', 'Gaming', 'Sports',
  'Education', 'Howto & Style', 'Science & Technology', 'Comedy',
  'Film & Animation', 'News & Politics', 'Travel & Events', 'Autos & Vehicles',
  'Pets & Animals', 'Nonprofits & Activism',
];

function YouTubeFields({ post, onUpdate }: { post: PlatformPost; onUpdate: (id: string, u: Partial<PlatformPost>) => void }) {
  const s = post.platform_settings_json || {};
  const set = (key: string, value: any) => onUpdate(post.id, { platform_settings_json: { ...s, [key]: value } });
  const privacy: 'public' | 'unlisted' | 'private' = s.privacy || 'public';
  const videoType: 'short' | 'long' = s.video_type || 'short';
  const category = s.category || 'Music';
  const tags: string[] = s.tags || post.hashtags?.map((h: string) => h.replace(/^#/, '')) || [];

  return (
    <div className="space-y-4">
      <div>
        <Label>Video Type</Label>
        <ButtonGroup
          value={videoType}
          onChange={v => set('video_type', v)}
          options={[{ value: 'short', label: 'Short' }, { value: 'long', label: 'Long Form' }]}
        />
      </div>

      <div>
        <Label required>Title</Label>
        <Input
          value={post.title || ''}
          onChange={v => onUpdate(post.id, { title: v })}
          placeholder="Enter your video title..."
        />
      </div>

      <div>
        <Label>Description</Label>
        <Input
          value={post.description || ''}
          onChange={v => onUpdate(post.id, { description: v })}
          placeholder="Describe your video..."
          multiline
          rows={3}
        />
      </div>

      <div>
        <Label>Tags <span className="normal-case text-[9px] font-medium text-slate-300">(auto-filled from hashtags)</span></Label>
        <TagsInput
          label=""
          tags={tags}
          onChange={v => set('tags', v)}
          placeholder="Add a tag (press Enter)"
        />
      </div>

      <div>
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {YT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => set('category', cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black border transition-all",
                category === cat
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-500"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-0.5">
        <div className="mb-2">
          <Label>Privacy</Label>
          <ButtonGroup
            value={privacy}
            onChange={v => set('privacy', v)}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'private', label: 'Private' },
            ]}
          />
        </div>
        <Toggle label="Made for Kids" checked={s.made_for_kids || false} onChange={v => set('made_for_kids', v)} />
      </div>
    </div>
  );
}

export function PlatformTabs({ platformPosts, onUpdate, globalHashtags, mediaType }: PlatformTabsProps) {
  const [activeTab, setActiveTab] = React.useState(platformPosts[0]?.platform || 'Instagram');

  React.useEffect(() => {
    if (!platformPosts.find(p => p.platform === activeTab) && platformPosts.length > 0) {
      setActiveTab(platformPosts[0].platform);
    }
  }, [platformPosts, activeTab]);

  React.useEffect(() => {
    if (!globalHashtags) return;
    const tags = globalHashtags.split(/\s+/).filter(Boolean);
    platformPosts.forEach(post => {
      if (post.platform === 'YouTube') {
        const s = post.platform_settings_json || {};
        const ytTags = tags.map(t => t.replace(/^#/, ''));
        onUpdate(post.id, { platform_settings_json: { ...s, tags: ytTags } });
      }
    });
  }, [globalHashtags]);

  const activePost = platformPosts.find(p => p.platform === activeTab);
  if (!activePost) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {platformPosts.map(post => {
          const cfg = platformConfig[post.platform];
          const Icon = cfg.icon;
          const isActive = activeTab === post.platform;
          return (
            <button
              key={post.id}
              onClick={() => setActiveTab(post.platform)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border",
                isActive ? cfg.active + ' border-transparent shadow-sm' : cfg.bg + ' ' + cfg.color + ' ' + cfg.border + ' hover:opacity-80'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {post.platform}
            </button>
          );
        })}
      </div>

      <div>
        {activePost.platform === 'Instagram' && <InstagramFields post={activePost} onUpdate={onUpdate} mediaType={mediaType} />}
        {activePost.platform === 'TikTok' && <TikTokFields post={activePost} onUpdate={onUpdate} />}
        {activePost.platform === 'YouTube' && <YouTubeFields post={activePost} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
