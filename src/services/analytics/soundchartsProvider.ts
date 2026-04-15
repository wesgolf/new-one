import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

export const soundchartsProvider: AnalyticsProvider = {
  id: 'soundcharts',
  label: 'Soundcharts',
  async load() {
    return emptyAnalyticsPayload('soundcharts');
  },
  async getState(): Promise<AnalyticsProviderState> {
    return {
      provider: 'soundcharts',
      status: 'not_configured',
      errorMessage: 'Soundcharts benchmarking and playlist intelligence hooks are ready for future wiring.',
    };
  },
};

