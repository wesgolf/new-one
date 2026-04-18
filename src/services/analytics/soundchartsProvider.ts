import { emptyAnalyticsPayload, type AnalyticsProvider } from './baseProvider';
import type { AnalyticsProviderState } from '../../types/domain';

const hasSoundchartsKey = !!(import.meta.env.VITE_SOUNDCHARTS_APP_ID && import.meta.env.VITE_SOUNDCHARTS_APP_SECRET);

export const soundchartsProvider: AnalyticsProvider = {
  id: 'soundcharts',
  label: 'Soundcharts',
  async load() {
    return emptyAnalyticsPayload('soundcharts');
  },
  async getState(): Promise<AnalyticsProviderState> {
    return {
      provider: 'Soundcharts',
      status: 'not_configured',
      errorMessage: hasSoundchartsKey
        ? 'Soundcharts credentials detected. Full data fetch integration is ready to wire.'
        : 'Set VITE_SOUNDCHARTS_APP_ID and VITE_SOUNDCHARTS_APP_SECRET to enable benchmarking and playlist intelligence.',
    };
  },
};

