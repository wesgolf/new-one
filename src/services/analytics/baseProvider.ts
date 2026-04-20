import type { AnalyticsDomainPayload, AnalyticsProviderState } from '../../types/domain';

export interface AnalyticsProvider {
  id: string;
  label: string;
  load(): Promise<AnalyticsDomainPayload>;
  getState(): Promise<AnalyticsProviderState>;
}

export function emptyAnalyticsPayload(provider: string): AnalyticsDomainPayload {
  return {
    audience: [],
    streaming: [],
    playlist: [],
    social: [],
    releases: [],
    platforms: [],
  };
}

