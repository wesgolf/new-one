import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

export const spotifyProvider: AnalyticsProvider = {
  id: 'spotify',
  label: 'Spotify',
  async load() {
    return emptyAnalyticsPayload('spotify');
  },
  async getState(): Promise<AnalyticsProviderState> {
    return {
      provider: 'spotify',
      status: 'not_configured',
      errorMessage: 'Spotify analytics contract is defined, but provider credentials are not wired yet.',
    };
  },
};

