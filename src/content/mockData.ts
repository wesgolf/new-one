import { ContentItem, ContentAnalytics, ContentReflection, ContentPlanSuggestion } from './types';
import { Release } from '../types';

export const mockReleases: Release[] = [
  {
    id: 'rel_1',
    title: 'Neon Nights',
    release_date: '2026-04-20',
    status: 'scheduled',
    production: { bpm: 128, key: 'Am' },
    assets: {},
    distribution: {},
    marketing: {},
    performance: { 
      streams: { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 }, 
      engagement: { likes: 0, saves: 0, reposts: 0 }, 
      growth_rate: 0, 
      engagement_rate: 0 
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'rel_2',
    title: 'Midnight Drive',
    release_date: '2026-03-15',
    status: 'mastered',
    production: { bpm: 124, key: 'Gm' },
    assets: {},
    distribution: {},
    marketing: {},
    performance: { 
      streams: { spotify: 12000, apple: 4000, soundcloud: 8000, youtube: 2000 }, 
      engagement: { likes: 1200, saves: 400, reposts: 200 }, 
      growth_rate: 5.2, 
      engagement_rate: 8.4 
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'rel_3',
    title: 'Solar Flare',
    release_date: '2026-05-10',
    status: 'production',
    production: { bpm: 130, key: 'C#m' },
    assets: {},
    distribution: {},
    marketing: {},
    performance: { 
      streams: { spotify: 0, apple: 0, soundcloud: 0, youtube: 0 }, 
      engagement: { likes: 0, saves: 0, reposts: 0 }, 
      growth_rate: 0, 
      engagement_rate: 0 
    },
    created_at: new Date().toISOString()
  }
];

export const mockContentItems: ContentItem[] = [
  {
    id: 'cont_1',
    user_id: 'user_1',
    track_id: 'rel_2',
    title: 'Midnight Drive Drop Clip',
    hook: 'POV: You found the track of the summer 🌴',
    caption: 'Midnight Drive is out now on all platforms! Go check it out.',
    hashtags: ['#housemusic', '#newmusic', '#djlife'],
    platform: 'Instagram',
    post_type: 'drop_clip',
    angle: 'hype',
    status: 'posted',
    posted_at: '2026-03-16T20:00:00Z',
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-16T20:00:00Z'
  },
  {
    id: 'cont_2',
    user_id: 'user_1',
    track_id: 'rel_2',
    title: 'Midnight Drive Tutorial',
    hook: 'I spent 40 hours on this lead synth... 🎹',
    caption: 'Here is how I made the lead synth for Midnight Drive.',
    hashtags: ['#musicproduction', '#tutorial', '#ableton'],
    platform: 'TikTok',
    post_type: 'tutorial',
    angle: 'technical',
    status: 'posted',
    posted_at: '2026-03-18T19:30:00Z',
    created_at: '2026-03-12T10:00:00Z',
    updated_at: '2026-03-18T19:30:00Z'
  },
  {
    id: 'cont_3',
    user_id: 'user_1',
    track_id: 'rel_1',
    title: 'Neon Nights Teaser',
    hook: 'Wait for the second drop... 🤯',
    caption: 'Neon Nights is coming soon! Pre-save link in bio.',
    hashtags: ['#techno', '#teaser', '#upcoming'],
    platform: 'Instagram',
    post_type: 'teaser',
    angle: 'hype',
    status: 'ready',
    scheduled_at: '2026-04-10T20:00:00Z',
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z'
  }
];

export const mockAnalytics: ContentAnalytics[] = [
  {
    id: 'ana_1',
    content_item_id: 'cont_1',
    platform: 'Instagram',
    date: '2026-03-17T00:00:00Z',
    views: 45200,
    likes: 2260,
    comments: 452,
    shares: 226,
    saves: 361,
    clicks: 452,
    engagement_rate: 7.3,
    performance_score: 15.4,
    velocity: 8.5
  },
  {
    id: 'ana_2',
    content_item_id: 'cont_2',
    platform: 'TikTok',
    date: '2026-03-19T00:00:00Z',
    views: 32100,
    likes: 1605,
    comments: 321,
    shares: 160,
    saves: 256,
    clicks: 321,
    engagement_rate: 10.8,
    performance_score: 12.4,
    velocity: 7.2
  }
];

export const mockReflections: ContentReflection[] = [
  {
    id: 'ref_1',
    content_item_id: 'cont_1',
    verdict: 'high_performer',
    summary: 'This post performed exceptionally well with 45.2k views.',
    why_it_worked: [
      'Strong hook captured attention in the first 3 seconds.',
      'Posted at a historically strong time for your audience.',
      'Aligned with focus track momentum.'
    ],
    why_it_didnt: [],
    next_experiment: 'Try a similar hook with a different track to see if the pattern holds.',
    generated_at: '2026-03-18T10:00:00Z'
  }
];
