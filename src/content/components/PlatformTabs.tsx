import React from 'react';
import { Instagram, Music2, Youtube, Hash, Eye, MessageSquare, Scissors, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PlatformPost } from '../types';

interface PlatformTabsProps {
  platformPosts: PlatformPost[];
  onUpdate: (postId: string, updates: Partial<PlatformPost>) => void;
}

const platformConfig = {
  Instagram: { icon: Instagram, color: 'pink', label: 'Instagram Reel' },
  TikTok: { icon: Music2, color: 'slate', label: 'TikTok' },
  YouTube: { icon: Youtube, color: 'red', label: 'YouTube Shorts' },
} as const;

export function PlatformTabs({ platformPosts, onUpdate }: PlatformTabsProps) {
  const [activeTab, setActiveTab] = React.useState(platformPosts[0]?.platform || 'Instagram');

  const activePost = platformPosts.find(p => p.platform === activeTab);
  if (!activePost) return null;

  const updateSettings = (key: string, value: any) => {
    onUpdate(activePost.id, {
      platform_settings_json: {
        ...activePost.platform_settings_json,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        {platformPosts.map(post => {
          const config = platformConfig[post.platform];
          const Icon = config.icon;
          return (
            <button
              key={post.id}
              onClick={() => setActiveTab(post.platform)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                activeTab === post.platform
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {post.platform}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {activePost.platform === 'Instagram' && (
          <InstagramFields post={activePost} onUpdate={onUpdate} updateSettings={updateSettings} />
        )}
        {activePost.platform === 'TikTok' && (
          <TikTokFields post={activePost} onUpdate={onUpdate} updateSettings={updateSettings} />
        )}
        {activePost.platform === 'YouTube' && (
          <YouTubeFields post={activePost} onUpdate={onUpdate} updateSettings={updateSettings} />
        )}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, multiline, required }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      )}
    </div>
  );
}

function ToggleField({ label, checked, onChange, icon: Icon }: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon?: React.ElementType;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className="text-sm text-slate-600 font-medium">{label}</span>
      </div>
      <div className={cn(
        "w-10 h-6 rounded-full relative transition-all",
        checked ? "bg-blue-500" : "bg-slate-200"
      )}>
        <div className={cn(
          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm",
          checked ? "left-5" : "left-1"
        )} />
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all appearance-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function InstagramFields({ post, onUpdate, updateSettings }: {
  post: PlatformPost;
  onUpdate: (id: string, updates: Partial<PlatformPost>) => void;
  updateSettings: (key: string, value: any) => void;
}) {
  const settings = post.platform_settings_json || {};
  return (
    <div className="space-y-4">
      <InputField
        label="Caption"
        value={post.caption || ''}
        onChange={(val) => onUpdate(post.id, { caption: val })}
        placeholder="Write your Instagram caption..."
        multiline
        required
      />
      <InputField
        label="Hashtags"
        value={(post.hashtags || []).join(' ')}
        onChange={(val) => onUpdate(post.id, { hashtags: val.split(/\s+/).filter(Boolean) })}
        placeholder="#music #newrelease #artist"
      />
      <InputField
        label="Cover Image URL"
        value={settings.cover_image_url || ''}
        onChange={(val) => updateSettings('cover_image_url', val)}
        placeholder="https://... (optional cover frame)"
      />
      <ToggleField
        label="Share to Feed"
        checked={settings.share_to_feed !== false}
        onChange={(val) => updateSettings('share_to_feed', val)}
        icon={Eye}
      />
      <ToggleField
        label="Trial Reel"
        checked={settings.trial_reel || false}
        onChange={(val) => updateSettings('trial_reel', val)}
      />
    </div>
  );
}

function TikTokFields({ post, onUpdate, updateSettings }: {
  post: PlatformPost;
  onUpdate: (id: string, updates: Partial<PlatformPost>) => void;
  updateSettings: (key: string, value: any) => void;
}) {
  const settings = post.platform_settings_json || {};
  return (
    <div className="space-y-4">
      <InputField
        label="Caption"
        value={post.caption || ''}
        onChange={(val) => onUpdate(post.id, { caption: val })}
        placeholder="Write your TikTok caption..."
        multiline
        required
      />
      <InputField
        label="Hashtags"
        value={(post.hashtags || []).join(' ')}
        onChange={(val) => onUpdate(post.id, { hashtags: val.split(/\s+/).filter(Boolean) })}
        placeholder="#fyp #music #viral"
      />
      <SelectField
        label="Privacy"
        value={settings.privacy_level || 'PUBLIC_TO_EVERYONE'}
        onChange={(val) => updateSettings('privacy_level', val)}
        options={[
          { value: 'PUBLIC_TO_EVERYONE', label: 'Public' },
          { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
          { value: 'SELF_ONLY', label: 'Private' },
        ]}
      />
      <div className="space-y-1 border-t border-slate-100 pt-3">
        <ToggleField
          label="Allow Comments"
          checked={settings.allow_comments !== false}
          onChange={(val) => updateSettings('allow_comments', val)}
          icon={MessageSquare}
        />
        <ToggleField
          label="Allow Duet"
          checked={settings.allow_duet !== false}
          onChange={(val) => updateSettings('allow_duet', val)}
          icon={Scissors}
        />
        <ToggleField
          label="Allow Stitch"
          checked={settings.allow_stitch !== false}
          onChange={(val) => updateSettings('allow_stitch', val)}
          icon={Scissors}
        />
      </div>
    </div>
  );
}

function YouTubeFields({ post, onUpdate, updateSettings }: {
  post: PlatformPost;
  onUpdate: (id: string, updates: Partial<PlatformPost>) => void;
  updateSettings: (key: string, value: any) => void;
}) {
  const settings = post.platform_settings_json || {};
  return (
    <div className="space-y-4">
      <InputField
        label="Title"
        value={post.title || ''}
        onChange={(val) => onUpdate(post.id, { title: val })}
        placeholder="Short title for your YouTube Short"
        required
      />
      <InputField
        label="Description"
        value={post.description || ''}
        onChange={(val) => onUpdate(post.id, { description: val })}
        placeholder="Describe your video..."
        multiline
      />
      <InputField
        label="Tags"
        value={(settings.tags || []).join(', ')}
        onChange={(val) => updateSettings('tags', val.split(',').map((t: string) => t.trim()).filter(Boolean))}
        placeholder="music, shorts, artist"
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Category"
          value={settings.category || 'Music'}
          onChange={(val) => updateSettings('category', val)}
          options={[
            { value: 'Music', label: 'Music' },
            { value: 'Entertainment', label: 'Entertainment' },
            { value: 'Education', label: 'Education' },
            { value: 'People & Blogs', label: 'People & Blogs' },
          ]}
        />
        <SelectField
          label="Audience"
          value={settings.audience || 'not_kids'}
          onChange={(val) => updateSettings('audience', val)}
          options={[
            { value: 'not_kids', label: 'Not made for kids' },
            { value: 'kids', label: 'Made for kids' },
          ]}
          required
        />
      </div>
      <SelectField
        label="Privacy"
        value={settings.privacy || 'public'}
        onChange={(val) => updateSettings('privacy', val)}
        options={[
          { value: 'public', label: 'Public' },
          { value: 'unlisted', label: 'Unlisted' },
          { value: 'private', label: 'Private' },
        ]}
      />
    </div>
  );
}
