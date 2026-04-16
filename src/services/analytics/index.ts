/**
 * Analytics provider registry.
 * Import from here to get all registered providers.
 */
import { spotifyProvider }     from './spotifyProvider';
import { songstatsProvider }   from './songstatsProvider';
import { soundchartsProvider } from './soundchartsProvider';
import type { AnalyticsProvider } from './baseProvider';

export const ANALYTICS_REGISTRY: AnalyticsProvider[] = [
  spotifyProvider,
  songstatsProvider,
  soundchartsProvider,
];

export { spotifyProvider, songstatsProvider, soundchartsProvider };
export type { AnalyticsProvider } from './baseProvider';
export { emptyAnalyticsPayload } from './baseProvider';
