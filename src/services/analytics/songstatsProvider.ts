import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

export const songstatsProvider: AnalyticsProvider = {
  id: 'songstats',
  label: 'Songstats',
  async load() {
    return emptyAnalyticsPayload('songstats');
  },
  async getState(): Promise<AnalyticsProviderState> {
    return {
      provider: 'songstats',
      status: 'not_configured',
      errorMessage: 'Songstats analytics contract is scaffolded for playlist and social reporting.',
    };
  },
};

