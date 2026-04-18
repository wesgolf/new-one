import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

const hasSongstatsKey = !!import.meta.env.VITE_SONGSTATS_API_KEY;

export const songstatsProvider: AnalyticsProvider = {
  id: 'songstats',
  label: 'Songstats',
  async load() {
    return emptyAnalyticsPayload('songstats');
  },
  async getState(): Promise<AnalyticsProviderState> {
    return {
      provider: 'Songstats',
      status: 'not_configured',
      errorMessage: hasSongstatsKey
        ? 'Songstats key detected. Full data fetch integration is ready to wire.'
        : 'Set VITE_SONGSTATS_API_KEY to enable playlisting and social reporting.',
    };
  },
};

