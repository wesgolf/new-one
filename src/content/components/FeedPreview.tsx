import React from 'react';
import {
  Heart, MessageCircle, Share2, Music, MoreHorizontal, MoreVertical,
  ThumbsUp, ThumbsDown, Home, Plus, Filter, Repeat2,
  RefreshCcw, Globe, ChevronLeft, PlaySquare, Tv, Bookmark,
  PlusSquare, User, Search, Wifi, Send,
} from 'lucide-react';
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
  carouselItems?: string[];
}

const USERNAME = 'musicbywes_';

// ─── Phone Shell (TikTok / YouTube / IG Post & Story) ────────────────────────
function Phone({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className={cn(
          'relative overflow-hidden flex-shrink-0',
          'rounded-[2.2rem] shadow-[0_20px_60px_rgba(0,0,0,0.55)]',
          light
            ? 'border-[5px] border-slate-300 bg-white'
            : 'border-[5px] border-[#1c1c1e] bg-black',
        )}
        style={{ width: 220, aspectRatio: '9/19.5' }}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[65px] h-[17px] bg-black rounded-full z-50" />
        {children}
      </div>
    </div>
  );
}

// ─── Status Bar (phone mockup only) ──────────────────────────────────────────
function Bar({ light }: { light?: boolean }) {
  const fg = light ? 'text-black' : 'text-white';
  const stroke = light ? 'black' : 'white';
  return (
    <div className={cn('absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-5 pt-[13px]', fg)}>
      <span className="text-[9px] font-semibold leading-none">9:41</span>
      <div className="flex items-center gap-[5px]">
        <svg width="9" height="10" viewBox="0 0 18 20" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
          <path d="M13.73 19a2 2 0 01-3.46 0" />
          <path d="M10 3.05A6 6 0 0115 9v3l2 4H1l2-4V9A6 6 0 016 3.05" />
          <line x1="1" y1="1" x2="17" y2="17" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 16 12" fill={stroke}>
          <rect x="0" y="8" width="3" height="4" rx="0.4" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.4" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.4" opacity="0.35" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.4" opacity="0.35" />
        </svg>
        <Wifi className="w-[13px] h-[10px]" color={stroke} />
        <div style={{ fontSize: 7, border: `1px solid ${stroke}`, borderRadius: 2, padding: '1px 3px', opacity: 0.9, color: stroke }}>23</div>
      </div>
    </div>
  );
}

// ─── Media Fill ───────────────────────────────────────────────────────────────
function Fill({ mediaUrl, coverImageUrl }: { mediaUrl?: string; coverImageUrl?: string }) {
  const src = coverImageUrl || mediaUrl;
  if (src) {
    return mediaUrl && !coverImageUrl
      ? <video src={mediaUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
      : <img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
  }
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.45 }}>
        <Music style={{ width: 32, height: 32, color: 'white' }} />
        <span style={{ color: 'white', fontSize: 11, fontWeight: 500 }}>No media</span>
      </div>
    </div>
  );
}

// ─── Phone action item helper ─────────────────────────────────────────────────
function Btn({ Icon, label, light }: { Icon: React.ElementType; label?: string; light?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[2px]">
      <Icon className={cn('w-[21px] h-[21px]', light ? 'text-gray-800' : 'text-white')} strokeWidth={1.5} />
      {label && <span className={cn('text-[6.5px] font-semibold leading-none', light ? 'text-gray-700' : 'text-white')}>{label}</span>}
    </div>
  );
}

// Instagram profile pic — fetched from public OG image
const IG_PROFILE_PIC = 'https://scontent-yyz1-1.cdninstagram.com/v/t51.2885-19/469724064_603647298766721_3704408617320715076_n.jpg?stp=dst-jpg_s100x100_tt6&_nc_cat=110&ccb=7-5&_nc_sid=bf7eb4&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy45NTkuQzMifQ%3D%3D&_nc_ohc=c7ueyEBpfcgQ7kNvwFALwCZ&_nc_oc=Adp86Of72kQNQ0i5HcLho00SbfB85X6Atfu90wxakCDwyMQTbs4w-bwnULuf6uAJr3eXCkPVPNxrpbqob2Di1fBL&_nc_zt=24&_nc_ht=scontent-yyz1-1.cdninstagram.com&_nc_ss=7a20f&oh=00_Af2Ceo10JfwgCIf1bcVGzQ8xGydFCuLCCCESOtsa07hL1A&oe=69E3744B';

// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM REEL — Contained card with rounded corners, proper 9:16 aspect
// Width-fixed at 240px; height computed via aspect-ratio. Centered in panel.
// ═══════════════════════════════════════════════════════════════════════════════
function InstagramReel({ mediaUrl, coverImageUrl, caption, hashtags, soundLabel }: FeedPreviewProps) {
  const text = [caption, ...(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join(' ');
  const sound = soundLabel || `Original audio · ${USERNAME}`;
  const [picLoaded, setPicLoaded] = React.useState(true);

  const Avatar = ({ size, border }: { size: number; border?: string }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: border || '1.5px solid white',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    }}>
      {picLoaded && (
        <img
          src={IG_PROFILE_PIC}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          alt=""
          onError={() => setPicLoaded(false)}
        />
      )}
    </div>
  );

  return (
    <div style={{
      position: 'relative',
      width: 240,
      aspectRatio: '9/16',
      borderRadius: 20,
      overflow: 'hidden',
      background: 'black',
      flexShrink: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      {/* ── Full-bleed media with object-fit: cover ── */}
      <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />

      {/* ── Top gradient ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '28%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* ── Bottom gradient ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '65%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* ── Top bar: back | Following · For You | search ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 11px 6px',
      }}>
        <ChevronLeft style={{ width: 12, height: 12, color: 'white' }} strokeWidth={2.5} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600 }}>Following</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>For You</span>
            <div style={{ width: '100%', height: 1.5, background: 'white', borderRadius: 1 }} />
          </div>
        </div>
        <Search style={{ width: 12, height: 12, color: 'white' }} strokeWidth={2} />
      </div>

      {/* ── Right action rail ── */}
      <div style={{
        position: 'absolute', right: 7, bottom: '11%', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        {/* Heart / Likes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Heart style={{ width: 16, height: 16, color: 'white' }} strokeWidth={1.5} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>2,441</span>
        </div>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <MessageCircle style={{ width: 16, height: 16, color: 'white' }} strokeWidth={1.5} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>89</span>
        </div>

        {/* Repost */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Repeat2 style={{ width: 15, height: 15, color: 'white' }} strokeWidth={1.5} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>412</span>
        </div>

        {/* Send / Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Send style={{ width: 15, height: 15, color: 'white' }} strokeWidth={1.5} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>156</span>
        </div>

        {/* More — no Bookmark */}
        <MoreHorizontal style={{ width: 14, height: 14, color: 'white' }} strokeWidth={1.5} />

        {/* Album art — rounded square */}
        <div style={{
          width: 24, height: 24,
          borderRadius: 5,
          background: 'linear-gradient(135deg, #555 0%, #222 100%)',
          border: '1.5px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1,
          overflow: 'hidden',
        }}>
          <Music style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.75)' }} />
        </div>
      </div>

      {/* ── Bottom metadata ── */}
      <div style={{
        position: 'absolute', bottom: 38, left: 9, right: 46, zIndex: 10,
      }}>
        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <Avatar size={20} />
          <span style={{ color: 'white', fontSize: 9.5, fontWeight: 700, lineHeight: 1 }}>{USERNAME}</span>
          <button style={{
            color: 'white', fontSize: 8, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.75)',
            borderRadius: 3, padding: '1px 5px',
            background: 'transparent', cursor: 'pointer', flexShrink: 0,
          }}>Follow</button>
        </div>

        {/* Caption */}
        {text && (
          <p style={{
            color: 'white', fontSize: 9, lineHeight: 1.35, marginBottom: 5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{text}</p>
        )}

        {/* Audio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Music style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sound}</span>
        </div>
      </div>

      {/* ── Bottom navigation ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '5px 12px 9px',
        background: 'rgba(0,0,0,0.05)',
      }}>
        <Home style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.6)' }} strokeWidth={1.5} />
        <Search style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.6)' }} strokeWidth={1.5} />
        <PlusSquare style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.6)' }} strokeWidth={1.5} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <PlaySquare style={{ width: 15, height: 15, color: 'white' }} strokeWidth={2} />
          <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'white' }} />
        </div>
        <div style={{ width: 15, height: 15, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.6)', background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
          {picLoaded && <img src={IG_PROFILE_PIC} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
        </div>
      </div>
    </div>
  );
}

// ═══ INSTAGRAM STORY (phone frame) ════════════════════════════════════════════
function InstagramStory({ mediaUrl, coverImageUrl, soundLabel }: FeedPreviewProps) {
  return (
    <Phone>
      <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 z-10" />
      <Bar />
      <div className="absolute top-[34px] left-3 right-3 flex gap-[3px] z-20">
        {[66, 0, 0].map((fill, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${fill}%` }} />
          </div>
        ))}
      </div>
      <div className="absolute top-[40px] left-3 right-3 flex items-center gap-2 z-20">
        <div className="w-6 h-6 rounded-full ring-2 ring-white overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 shrink-0" />
        <span className="text-white font-bold leading-none" style={{ fontSize: 8.5 }}>{USERNAME}</span>
        <span className="text-white/60 leading-none" style={{ fontSize: 7.5 }}>2m</span>
        <MoreHorizontal className="w-3.5 h-3.5 text-white ml-auto" />
      </div>
    </Phone>
  );
}

// ═══ INSTAGRAM POST (phone frame, supports carousel) ══════════════════════════
function InstagramPost({ mediaUrl, coverImageUrl, caption, hashtags, carouselItems }: FeedPreviewProps) {
  const text = [caption, ...(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join(' ');
  const [idx, setIdx] = React.useState(0);
  const slides = carouselItems?.length ? carouselItems : (mediaUrl ? [mediaUrl] : []);

  return (
    <Phone light>
      <div className="absolute inset-0 bg-white flex flex-col" style={{ paddingTop: 30 }}>
        <Bar light />
        <div className="flex items-center justify-between px-3 py-[5px] border-b border-slate-100 shrink-0">
          <span className="font-black text-slate-900 italic" style={{ fontSize: 11 }}>Instagram</span>
          <div className="flex gap-2">
            <PlusSquare className="w-4 h-4 text-slate-800" />
            <MessageCircle className="w-4 h-4 text-slate-800" />
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-[5px] shrink-0">
          <div className="w-6 h-6 rounded-full ring-[2px] ring-[#e1306c] ring-offset-[1px] overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500" />
          <span className="text-slate-900 font-bold flex-1" style={{ fontSize: 9 }}>{USERNAME}</span>
          <MoreHorizontal className="w-3 h-3 text-slate-500" />
        </div>
        <div className="relative shrink-0">
          <div className="aspect-square bg-slate-900 overflow-hidden relative">
            {slides.length > 0
              ? <img src={slides[idx]} className="absolute inset-0 w-full h-full object-cover" alt="" />
              : <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />}
          </div>
          {slides.length > 1 && (
            <>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {slides.map((_, i) => (
                  <div key={i} className={cn('rounded-full', i === idx ? 'w-[6px] h-[6px] bg-blue-500' : 'w-1 h-1 bg-white/60')} />
                ))}
              </div>
              {idx < slides.length - 1 && (
                <button onClick={() => setIdx(i => i + 1)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center font-black text-slate-700 shadow" style={{ fontSize: 9 }}>›</button>
              )}
              {idx > 0 && (
                <button onClick={() => setIdx(i => i - 1)} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center font-black text-slate-700 shadow" style={{ fontSize: 9 }}>‹</button>
              )}
            </>
          )}
        </div>
        <div className="px-3 pt-[7px] pb-[5px] shrink-0">
          <div className="flex items-center gap-3 mb-[3px]">
            <Heart className="w-4 h-4 text-slate-800" />
            <MessageCircle className="w-4 h-4 text-slate-800" />
            <Send className="w-4 h-4 text-slate-800" />
            <Bookmark className="w-4 h-4 text-slate-800 ml-auto" />
          </div>
          <p className="font-black text-slate-900" style={{ fontSize: 8 }}>1,234 likes</p>
          {text && <p className="text-slate-700 line-clamp-2 mt-[2px]" style={{ fontSize: 7.5 }}><span className="font-black">{USERNAME}</span> {text}</p>}
        </div>
        <div className="mt-auto border-t border-slate-100 flex justify-around py-[7px] shrink-0">
          <Home className="w-4 h-4 text-slate-900" />
          <Search className="w-4 h-4 text-slate-400" />
          <PlusSquare className="w-4 h-4 text-slate-400" />
          <div className="w-4 h-4 rounded-sm bg-slate-200" />
          <User className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </Phone>
  );
}

// ═══ TIKTOK — Contained 240px card, real FYP UI scaled ~0.6x ═════════════════
function TikTok({ mediaUrl, coverImageUrl, caption, hashtags, soundLabel }: FeedPreviewProps) {
  const text = [caption, ...(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`)].filter(Boolean).join(' ');
  const sound = soundLabel || `Original Sound – ${USERNAME}`;

  return (
    <div style={{
      position: 'relative',
      width: 240,
      aspectRatio: '9/16',
      borderRadius: 20,
      overflow: 'hidden',
      background: 'black',
      flexShrink: 0,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      {/* ── Full-bleed video/image — object-fit: cover ── */}
      <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />

      {/* ── Top gradient ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '22%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* ── Bottom gradient ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '68%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
        zIndex: 1,
      }} />

      {/* ── Top bar: back | Following · For You | search ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 11px 6px',
      }}>
        <ChevronLeft style={{ width: 14, height: 14, color: 'white' }} strokeWidth={2.5} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600 }}>Following</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 800 }}>For You</span>
            <div style={{ width: '100%', height: 1.5, background: 'white', borderRadius: 1 }} />
          </div>
        </div>
        <Search style={{ width: 13, height: 13, color: 'white' }} strokeWidth={2} />
      </div>

      {/* ── Right action rail ── */}
      <div style={{
        position: 'absolute', right: 7, bottom: '10%', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13,
      }}>
        {/* Profile with red + badge */}
        <div style={{ position: 'relative', marginBottom: 5 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '1.5px solid white',
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7c948 100%)',
            overflow: 'hidden',
          }} />
          <div style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            width: 13, height: 13, borderRadius: '50%',
            background: '#fe2c55',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Plus style={{ width: 7, height: 7, color: 'white' }} strokeWidth={3} />
          </div>
        </div>
        <div style={{ height: 2 }} />

        {/* Heart — filled red (TikTok style) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Heart style={{ width: 18, height: 18, color: '#fe2c55', fill: '#fe2c55' }} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>6</span>
        </div>

        {/* Comment — TikTok speech bubble with 3 dots */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
            <circle cx="8" cy="12" r="1.2" fill="#333"/>
            <circle cx="12" cy="12" r="1.2" fill="#333"/>
            <circle cx="16" cy="12" r="1.2" fill="#333"/>
          </svg>
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>1</span>
        </div>

        {/* Bookmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Bookmark style={{ width: 17, height: 17, color: 'white', fill: 'white' }} />
          <span style={{ color: 'white', fontSize: 8, fontWeight: 600, lineHeight: 1 }}>1</span>
        </div>

        {/* More */}
        <MoreHorizontal style={{ width: 18, height: 18, color: 'white' }} strokeWidth={2} />

        {/* Profile circle at bottom of rail — spinning album disc */}
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, #444, #111)',
          border: '4px solid #555',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#888' }} />
        </div>
      </div>

      {/* ── Bottom metadata: username, caption, sound ── */}
      <div style={{
        position: 'absolute', bottom: 40, left: 9, right: 50, zIndex: 10,
      }}>
        {/* Username + follow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>@{USERNAME}</span>
          <span style={{
            color: 'white', fontSize: 7.5, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.75)',
            borderRadius: 3, padding: '1px 4px', flexShrink: 0,
          }}>Follow</span>
        </div>

        {/* Caption */}
        {text && (
          <p style={{
            color: 'white', fontSize: 9, lineHeight: 1.3, marginBottom: 5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{text}</p>
        )}

        {/* Sound ticker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Music style={{ width: 9, height: 9, color: 'white', flexShrink: 0 }} />
          <span style={{ color: 'white', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sound}</span>
        </div>
      </div>

      {/* ── Bottom navigation — solid black bar ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '5px 10px 9px',
        background: 'rgba(0,0,0,0.85)',
      }}>
        {/* Home (active — white dot below) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Home style={{ width: 15, height: 15, color: 'white' }} strokeWidth={2.5} />
          <div style={{ width: 3, height: 1.5, background: 'white', borderRadius: 1 }} />
        </div>

        {/* Friends */}
        <User style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />

        {/* TikTok create button — cyan + red shadow */}
        <div style={{ position: 'relative', width: 30, height: 18 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: '#25f4ee', transform: 'translateX(-2px)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: '#fe2c55', transform: 'translateX(2px)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 5, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus style={{ width: 11, height: 11, color: 'black' }} strokeWidth={3} />
          </div>
        </div>

        {/* Inbox */}
        <MessageCircle style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.5)' }} strokeWidth={1.5} />

        {/* Profile */}
        <div style={{ width: 15, height: 15, borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b35, #f7c948)', border: '1px solid rgba(255,255,255,0.5)' }} />
      </div>
    </div>
  );
}

// ═══ YOUTUBE SHORTS (phone frame) ════════════════════════════════════════════
function YouTubeShort({ mediaUrl, coverImageUrl, title, soundLabel }: FeedPreviewProps) {
  const videoTitle = title || 'Your video title goes here';
  const sound = soundLabel || 'Stutter House Remix';
  return (
    <Phone>
      <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/40 z-10" />
      <Bar />
      <div className="absolute top-[34px] left-0 right-0 flex items-center justify-between px-3 z-20">
        <ChevronLeft className="w-4 h-4 text-white" />
        <div className="flex items-center gap-3">
          <Search className="w-[13px] h-[13px] text-white" />
          <MoreVertical className="w-[13px] h-[13px] text-white" />
          <svg width="13" height="11" viewBox="0 0 16 13" fill="white">
            <rect x="0" y="7" width="4" height="6" rx="0.5" />
            <rect x="6" y="3.5" width="4" height="9.5" rx="0.5" />
            <rect x="12" y="0" width="4" height="13" rx="0.5" />
          </svg>
        </div>
      </div>
      <div className="absolute top-[58px] left-3 right-11 z-20">
        <p className="text-white font-black leading-tight drop-shadow" style={{ fontSize: 10.5 }}>{videoTitle}</p>
      </div>
      <div className="absolute right-2 bottom-[22%] flex flex-col items-center gap-[13px] z-20">
        <Btn Icon={ThumbsUp} label="7" />
        <Btn Icon={ThumbsDown} label="Dislike" />
        <Btn Icon={MessageCircle} label="2" />
        <Btn Icon={Share2} label="Share" />
        <Btn Icon={RefreshCcw} label="Remix" />
        <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center mt-1">
          <span className="text-white font-black leading-none" style={{ fontSize: 7 }}>WES</span>
        </div>
      </div>
      <div className="absolute z-20 left-0 right-0 bottom-[38px] px-3 space-y-[3px]">
        <div className="flex items-center gap-1.5">
          <div className="w-[22px] h-[22px] rounded-full bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
            <span className="text-white font-black leading-none" style={{ fontSize: 5.5 }}>WES</span>
          </div>
          <span className="text-white font-bold leading-none" style={{ fontSize: 8.5 }}>@wesmusic1</span>
          <span className="bg-white/20 rounded-full text-white font-semibold leading-none px-[6px] py-[2px]" style={{ fontSize: 6.5 }}>Analytics</span>
        </div>
        <p className="text-white/75 leading-none" style={{ fontSize: 7 }}>{sound}</p>
        <div className="flex items-center gap-1">
          <Globe className="w-[9px] h-[9px] text-white/70" />
          <span className="text-white/75 leading-none" style={{ fontSize: 7 }}>Public · 944 views</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black flex items-center justify-around py-[7px] z-20">
        <Home className="w-[17px] h-[17px] text-white/55" strokeWidth={1.5} />
        <svg width="17" height="17" viewBox="0 0 24 24" fill="rgba(255,255,255,0.55)">
          <path d="M10 15.5l7-3.5-7-3.5v7zM21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81z" />
        </svg>
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
          <Plus className="w-[14px] h-[14px] text-black" strokeWidth={3} />
        </div>
        <div className="relative">
          <Tv className="w-[17px] h-[17px] text-white/55" strokeWidth={1.5} />
          <div className="absolute -top-[1px] -right-[1px] w-[7px] h-[7px] bg-red-500 rounded-full" />
        </div>
        <div className="w-[17px] h-[17px] rounded-full bg-slate-500" />
      </div>
      <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 w-[70px] h-[3px] bg-white/30 rounded-full z-30" />
    </Phone>
  );
}

// ═══ YOUTUBE LONG ═════════════════════════════════════════════════════════════
function YouTubeLong({ mediaUrl, coverImageUrl, title }: FeedPreviewProps) {
  return (
    <div className="w-full max-w-[260px] bg-white rounded-xl overflow-hidden shadow-xl border border-slate-200">
      <div className="relative aspect-video bg-slate-900">
        <Fill mediaUrl={mediaUrl} coverImageUrl={coverImageUrl} />
        <div className="absolute bottom-0 left-0 right-0 h-7 bg-black/70 flex items-center px-2 gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="flex-1 h-[3px] bg-white/20 rounded-full">
            <div className="w-1/3 h-full bg-red-500 rounded-full" />
          </div>
          <span className="text-white font-mono" style={{ fontSize: 7 }}>0:30 / 4:12</span>
        </div>
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="text-[9px] font-black text-slate-900 line-clamp-2 leading-tight">{title || 'Your video title'}</p>
        <div className="flex items-start gap-1.5">
          <div className="w-5 h-5 rounded-full bg-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[8px] font-black text-slate-800 leading-tight">WES</p>
            <p className="text-[7px] text-slate-500 leading-tight">1.2K views · 2 days ago</p>
          </div>
          <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT
// Instagram Reel → full-bleed (no phone frame, absolute inset-0)
// All others    → centered phone frame mockup
// ═══════════════════════════════════════════════════════════════════════════════
export function FeedPreview(props: FeedPreviewProps) {
  const { platform, instagramFormat = 'reel', youtubeFormat = 'short' } = props;

  // Instagram Reel fills the container completely — no phone wrapper
  if (platform === 'Instagram' && instagramFormat === 'reel') {
    return <InstagramReel {...props} />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center py-3">
      {platform === 'Instagram' && instagramFormat === 'story' && <InstagramStory {...props} />}
      {platform === 'Instagram' && instagramFormat === 'post' && <InstagramPost {...props} />}
      {platform === 'TikTok' && <TikTok {...props} />}
      {platform === 'YouTube' && (
        youtubeFormat === 'long' ? <YouTubeLong {...props} /> : <YouTubeShort {...props} />
      )}
    </div>
  );
}
