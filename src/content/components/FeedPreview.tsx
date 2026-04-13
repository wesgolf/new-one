import React from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Music, MoreHorizontal, ThumbsUp, ThumbsDown, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeedPreviewProps {
  platform: 'Instagram' | 'TikTok' | 'YouTube';
  mediaUrl?: string;
  coverImageUrl?: string;
  caption?: string;
  hashtags?: string[];
  title?: string;
  soundLabel?: string;
  instagramFormat?: 'reel' | 'story' | 'post';
  youtubeFormat?: 'short' | 'long';
}

const USERNAME = 'musicbywes_';
const CHANNEL = 'WES';

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border-[3px] border-slate-700", className)}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-b-2xl z-10" />
      {children}
    </div>
  );
}

function MediaArea({ mediaUrl, coverImageUrl, className }: { mediaUrl?: string; coverImageUrl?: string; className?: string }) {
  const src = coverImageUrl || mediaUrl;
  return (
    <div className={cn("w-full bg-slate-900 relative overflow-hidden", className)}>
      {src ? (
        mediaUrl && !coverImageUrl ? (
          <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <img src={src} className="w-full h-full object-cover" alt="preview" />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center text-slate-600 space-y-1">
            <div className="w-10 h-10 rounded-full bg-slate-700 mx-auto flex items-center justify-center">
              <Music className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-[9px] font-bold">No media yet</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InstagramReelPreview({ mediaUrl, coverImageUrl, caption, hashtags, soundLabel, format }: FeedPreviewProps & { format: 'reel' | 'story' | 'post' }) {
  const captionText = [caption, ...(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join(' ');

  if (format === 'post') {
    return (
      <PhoneFrame className="h-full aspect-[9/16]">
        <div className="h-full bg-white flex flex-col pt-5">
          <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
            <span className="text-[10px] font-black text-slate-900">{USERNAME}</span>
            <MoreHorizontal className="w-3 h-3 text-slate-500 ml-auto" />
          </div>
          <MediaArea mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} className="flex-1" />
          <div className="px-3 pt-1.5 pb-3 shrink-0 space-y-1">
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-slate-800" />
              <MessageCircle className="w-4 h-4 text-slate-800" />
              <Share2 className="w-4 h-4 text-slate-800" />
              <Bookmark className="w-4 h-4 text-slate-800 ml-auto" />
            </div>
            <p className="text-[8px] font-black text-slate-900">1,234 likes</p>
            {captionText && <p className="text-[7px] text-slate-700 line-clamp-2"><span className="font-black">{USERNAME}</span> {captionText}</p>}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame className="h-full aspect-[9/16]">
      <div className="relative h-full">
        {format === 'story' && (
          <div className="absolute top-5 left-0 right-0 z-20 flex gap-1 px-2">
            <div className="flex-1 h-0.5 bg-white rounded-full" />
          </div>
        )}
        <MediaArea mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} className="h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        {format !== 'story' && (
          <div className="absolute top-7 left-0 right-0 flex items-center px-3">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 border border-white/40" />
              <span className="text-[9px] font-black text-white">{USERNAME}</span>
              <span className="text-[8px] text-white/60 border border-white/40 rounded px-1 ml-1">Follow</span>
            </div>
            <MoreHorizontal className="w-4 h-4 text-white ml-auto" />
          </div>
        )}
        {format !== 'story' && (
          <div className="absolute right-2 bottom-[15%] flex flex-col items-center gap-4">
            {[{ Icon: Heart, label: '2.4K' }, { Icon: MessageCircle, label: '89' }, { Icon: Share2, label: '156' }, { Icon: Bookmark, label: '' }].map(({ Icon, label }, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Icon className="w-5 h-5 text-white drop-shadow" />
                {label && <span className="text-[7px] text-white font-bold">{label}</span>}
              </div>
            ))}
          </div>
        )}
        <div className="absolute bottom-4 left-3 right-10 space-y-0.5">
          {captionText && <p className="text-[7px] text-white line-clamp-2 font-medium">{captionText}</p>}
          {soundLabel && (
            <div className="flex items-center gap-1">
              <Music className="w-2.5 h-2.5 text-white/80" />
              <span className="text-[7px] text-white/80">{soundLabel}</span>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function TikTokPreview({ mediaUrl, coverImageUrl, caption, hashtags, soundLabel }: FeedPreviewProps) {
  const captionText = [caption, ...(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join(' ');
  return (
    <PhoneFrame className="h-full aspect-[9/16]">
      <div className="relative h-full">
        <MediaArea mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} className="h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
        <div className="absolute top-7 left-3 right-3 flex items-center justify-between">
          <span className="text-[9px] font-black text-white">Following</span>
          <span className="text-[9px] font-black text-white border-b border-white pb-0.5">For You</span>
          <span className="text-[9px] font-black text-white">LIVE</span>
        </div>
        <div className="absolute right-2 bottom-[18%] flex flex-col items-center gap-4">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 border-2 border-white" />
          {[{ Icon: Heart, label: '12.4K' }, { Icon: MessageCircle, label: '456' }, { Icon: Bookmark, label: '1.2K' }, { Icon: Share2, label: '789' }].map(({ Icon, label }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Icon className="w-5 h-5 text-white" />
              <span className="text-[7px] text-white font-bold">{label}</span>
            </div>
          ))}
          <div className="w-6 h-6 rounded-full border-2 border-white/60 flex items-center justify-center">
            <Music className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="absolute bottom-4 left-3 right-12 space-y-1">
          <p className="text-[9px] font-black text-white">@{USERNAME}</p>
          {captionText && <p className="text-[7px] text-white/90 line-clamp-2">{captionText}</p>}
          {soundLabel && (
            <div className="flex items-center gap-1">
              <Music className="w-2.5 h-2.5 text-white/80" />
              <span className="text-[7px] text-white/80">{soundLabel}</span>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function YouTubePreview({ mediaUrl, coverImageUrl, title, caption, youtubeFormat }: FeedPreviewProps) {
  const isShort = youtubeFormat === 'short';
  if (isShort) {
    return (
      <PhoneFrame className="h-full aspect-[9/16]">
        <div className="relative h-full">
          <MediaArea mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} className="h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-7 left-3 right-3 flex items-center justify-between">
            <span className="text-[9px] font-black text-white">Shorts</span>
          </div>
          <div className="absolute right-2 bottom-[18%] flex flex-col items-center gap-4">
            {[{ Icon: ThumbsUp, label: '4.3K' }, { Icon: ThumbsDown, label: '' }, { Icon: MessageCircle, label: '89' }, { Icon: Share2, label: 'Share' }].map(({ Icon, label }, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Icon className="w-5 h-5 text-white" />
                {label && <span className="text-[7px] text-white font-bold">{label}</span>}
              </div>
            ))}
          </div>
          <div className="absolute bottom-4 left-3 right-12 space-y-0.5">
            <p className="text-[8px] font-black text-white">{CHANNEL}</p>
            {title && <p className="text-[7px] text-white/90 line-clamp-2 font-medium">{title}</p>}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <div className="w-full max-w-[280px] bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200">
      <div className="relative aspect-video bg-slate-900">
        <MediaArea mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} className="aspect-video" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 h-7 bg-black/60 flex items-center px-2 gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="flex-1 h-0.5 bg-white/20 rounded-full">
            <div className="w-1/3 h-full bg-red-500 rounded-full" />
          </div>
          <span className="text-[7px] text-white">0:30 / 4:12</span>
        </div>
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="text-[9px] font-black text-slate-900 line-clamp-2">{title || 'Add a title for your video'}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-red-500" />
          <div>
            <p className="text-[8px] font-black text-slate-800">{CHANNEL}</p>
            <p className="text-[7px] text-slate-500">1.2K subscribers</p>
          </div>
          <button className="ml-auto text-[7px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">Subscribe</button>
        </div>
        <div className="flex items-center gap-3 pt-0.5">
          {[{ Icon: ThumbsUp, label: '245' }, { Icon: ThumbsDown, label: '' }, { Icon: Share2, label: 'Share' }, { Icon: Bell, label: '' }].map(({ Icon, label }, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <Icon className="w-3 h-3 text-slate-600" />
              {label && <span className="text-[7px] text-slate-600 font-bold">{label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedPreview(props: FeedPreviewProps) {
  const { platform, instagramFormat = 'reel', youtubeFormat = 'short' } = props;
  return (
    <div className="h-full w-full flex items-center justify-center">
      {platform === 'Instagram' && <InstagramReelPreview {...props} format={instagramFormat} />}
      {platform === 'TikTok' && <TikTokPreview {...props} />}
      {platform === 'YouTube' && <YouTubePreview {...props} youtubeFormat={youtubeFormat} />}
    </div>
  );
}
