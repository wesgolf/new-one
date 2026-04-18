import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

const hasSpotifyToken = !!import.meta.env.VITE_SPOTIFY_ACCESS_TOKEN;

export const spotifyProvider: AnalyticsProvider = {
  id: 'spotify',
  label: 'Spotify',
  async load() {
    return emptyAnalyticsPayload('spotify');
  },
  async getState(): Promise<AnalyticsProviderState> {
    if (!hasSpotifyToken) {
      return {
        provider: 'Spotify',
        status: 'not_configured',
        errorMessage: 'Set VITE_SPOTIFY_ACCESS_TOKEN to enable Spotify streaming analytics.',
      };
    }
    // Token present but full fetch not yet implemented
    return {
      provider: 'Spotify',
      status: 'not_configured',
      errorMessage: 'Spotify token detected. Full data fetch requires VITE_SPOTIFY_CLIENT_ID and backend OAuth flow.',
    };
  },
};

