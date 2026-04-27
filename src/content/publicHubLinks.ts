import type { PublicHubLink } from '../types/domain';

// ─────────────────────────────────────────────────────────────
// Social icon links — used in the profile header row
// icon must match a key in the SOCIAL_ICON_MAP in PublicHub.tsx
// ─────────────────────────────────────────────────────────────
export interface SocialLink {
  id: string;
  label: string;
  href: string;
  /** Lucide icon name key */
  icon: string;
}

export const ARTIST_SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    href: import.meta.env.VITE_INSTAGRAM_ACCOUNT || `https://instagram.com/${import.meta.env.VITE_INSTAGRAM_HANDLE?.replace('@', '') ?? 'wesleyrob'}`,
    icon: 'Instagram',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://youtube.com',
    icon: 'Youtube',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    href: `${import.meta.env.VITE_SOUNDCLOUD_ARTIST_URL ?? import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1'}`,
    icon: 'Radio',
  },
];

// ─────────────────────────────────────────────────────────────
// Primary link cards — rendered in the main links column
// order controls render sequence (ascending)
// ─────────────────────────────────────────────────────────────
export const publicHubLinks: PublicHubLink[] = [
  {
    id: 'spotify',
    label: 'Stream on Spotify',
    href: 'https://open.spotify.com',
    description: 'Latest releases and full catalog',
    icon: 'Music2',
    category: 'music',
    external: true,
    highlight: true,
    order: 1,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    href: `${import.meta.env.VITE_SOUNDCLOUD_ARTIST_URL ?? import.meta.env.VITE_SOUNDCLOUD_URL ?? 'https://soundcloud.com/wesmusic1'}`,
    description: 'Demos, edits and live versions',
    icon: 'Radio',
    category: 'music',
    external: true,
    order: 2,
    accent: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    href: 'https://music.apple.com',
    description: 'Available everywhere you stream',
    icon: 'Headphones',
    category: 'music',
    external: true,
    order: 3,
    accent: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'collab',
    label: 'Collab Portal',
    href: '/collab',
    description: 'Submit audio, review demos, collaborate',
    icon: 'Users',
    category: 'collab',
    external: false,
    order: 4,
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: import.meta.env.VITE_INSTAGRAM_ACCOUNT || `https://instagram.com/${import.meta.env.VITE_INSTAGRAM_HANDLE?.replace('@', '') ?? 'wesleyrob'}`,
    description: 'Studio process and daily content',
    icon: 'Camera',
    category: 'social',
    external: true,
    order: 5,
    accent: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];
