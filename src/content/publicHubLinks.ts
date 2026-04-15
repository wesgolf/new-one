import type { PublicHubLink } from '../types/domain';

export const publicHubLinks: PublicHubLink[] = [
  {
    id: 'spotify',
    label: 'Spotify',
    href: 'https://open.spotify.com',
    description: 'Latest releases and playlists',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    href: 'https://soundcloud.com',
    description: 'Demos, edits, and live versions',
    accent: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com',
    description: 'Daily content and studio process',
    accent: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'collab',
    label: 'Collab Portal',
    href: '/collab',
    description: 'Audio review and feedback',
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
  },
];
