import { env } from './envConfig';
import { evaluateGoalFormula, type GoalFormulaDefinition, type GoalMetricSnapshot } from './goalFormulaEngine';
import { fetchArtistStats } from './songstatsService';
import { fetchZernioOverview } from '../services/zernioAnalyticsService';

export type GoalMetricDefinition = {
  id: string;
  label: string;
  sourceLabel: string;
  category: 'Social' | 'Streaming';
  unit: string;
  description: string;
};

const GOAL_METRICS: GoalMetricDefinition[] = [
  { id: 'instagram.followers', label: 'Instagram followers', sourceLabel: 'Zernio / Songstats', category: 'Social', unit: 'followers', description: 'Current Instagram follower count.' },
  { id: 'instagram.following', label: 'Instagram following', sourceLabel: 'Zernio', category: 'Social', unit: 'following', description: 'Accounts you currently follow on Instagram.' },
  { id: 'tiktok.followers', label: 'TikTok followers', sourceLabel: 'Zernio / Songstats', category: 'Social', unit: 'followers', description: 'Current TikTok follower count.' },
  { id: 'tiktok.following', label: 'TikTok following', sourceLabel: 'Zernio', category: 'Social', unit: 'following', description: 'Accounts you currently follow on TikTok.' },
  { id: 'youtube.subscribers', label: 'YouTube subscribers', sourceLabel: 'Songstats / Zernio', category: 'Social', unit: 'subscribers', description: 'Current YouTube subscriber count.' },
  { id: 'spotify.followers', label: 'Spotify followers', sourceLabel: 'Songstats', category: 'Streaming', unit: 'followers', description: 'Current Spotify follower count.' },
  { id: 'spotify.monthly_listeners', label: 'Spotify monthly listeners', sourceLabel: 'Songstats', category: 'Streaming', unit: 'listeners', description: 'Current Spotify monthly listeners.' },
  { id: 'soundcloud.followers', label: 'SoundCloud followers', sourceLabel: 'Songstats', category: 'Social', unit: 'followers', description: 'Current SoundCloud follower count.' },
  { id: 'facebook.followers', label: 'Facebook followers', sourceLabel: 'Songstats', category: 'Social', unit: 'followers', description: 'Current Facebook follower count.' },
  { id: 'twitter.followers', label: 'X followers', sourceLabel: 'Songstats', category: 'Social', unit: 'followers', description: 'Current X / Twitter follower count.' },
];

type GoalMetricSuggestion = {
  title?: string;
  strategy: 'single_metric' | 'calculated';
  metricId?: string;
  formula?: GoalFormulaDefinition;
  goalType?: 'count' | 'ratio' | 'custom';
  helperMessage: string;
};

function normalizePlatform(value: string) {
  const text = value.toLowerCase();
  if (text.includes('instagram') || text.includes('ig')) return 'instagram';
  if (text.includes('tiktok') || text.includes('tik tok')) return 'tiktok';
  if (text.includes('spotify')) return 'spotify';
  if (text.includes('soundcloud')) return 'soundcloud';
  if (text.includes('youtube')) return 'youtube';
  if (text.includes('facebook')) return 'facebook';
  if (text.includes('twitter') || text.includes('x ')) return 'twitter';
  return null;
}

function labelForMetric(metricId: string) {
  return GOAL_METRICS.find((metric) => metric.id === metricId)?.label ?? metricId;
}

function setMetricValue(target: Record<string, number>, key: string, value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return;
  if (!(key in target)) target[key] = normalized;
}

function sumByPlatform<T extends { platform: string; followers?: number; following?: number }>(
  rows: T[],
  platform: string,
  key: 'followers' | 'following',
) {
  return rows
    .filter((row) => String(row.platform).toLowerCase() === platform)
    .reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

export function getGoalMetricDefinitions() {
  return GOAL_METRICS;
}

export function describeMetric(metricId: string) {
  return GOAL_METRICS.find((metric) => metric.id === metricId) ?? null;
}

export async function loadGoalMetricSnapshot(): Promise<GoalMetricSnapshot> {
  const values: Record<string, number> = {};
  const loadedSources: string[] = [];
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  if (env.zernioApiKey) {
    tasks.push(
      fetchZernioOverview()
        .then((overview) => {
          if (!overview.configured) {
            if (overview.error) errors.push(overview.error);
            return;
          }
          const accounts = overview.accounts ?? [];
          const instagramFollowers = sumByPlatform(accounts, 'instagram', 'followers');
          const instagramFollowing = sumByPlatform(accounts, 'instagram', 'following');
          const tiktokFollowers = sumByPlatform(accounts, 'tiktok', 'followers');
          const tiktokFollowing = sumByPlatform(accounts, 'tiktok', 'following');
          const youtubeSubscribers = sumByPlatform(accounts, 'youtube', 'followers');

          setMetricValue(values, 'instagram.followers', instagramFollowers);
          setMetricValue(values, 'instagram.following', instagramFollowing);
          setMetricValue(values, 'tiktok.followers', tiktokFollowers);
          setMetricValue(values, 'tiktok.following', tiktokFollowing);
          setMetricValue(values, 'youtube.subscribers', youtubeSubscribers);
          loadedSources.push('zernio');
          if (overview.error) errors.push(overview.error);
        })
        .catch((error) => {
          errors.push(error instanceof Error ? error.message : String(error));
        }),
    );
  }

  if (env.songstatsArtistId) {
    tasks.push(
      fetchArtistStats(env.songstatsArtistId, 'all')
        .then((response) => {
          const bySource = Object.fromEntries((response.stats ?? []).map((entry) => [entry.source, entry.data]));
          const spotify = bySource.spotify ?? {};
          const instagram = bySource.instagram ?? {};
          const tiktok = bySource.tiktok ?? {};
          const soundcloud = bySource.soundcloud ?? {};
          const youtube = bySource.youtube ?? {};
          const facebook = bySource.facebook ?? {};
          const twitter = bySource.twitter ?? {};

          setMetricValue(values, 'spotify.followers', spotify.followers_total);
          setMetricValue(values, 'spotify.monthly_listeners', spotify.monthly_listeners_current);
          setMetricValue(values, 'instagram.followers', values['instagram.followers'] ?? instagram.followers_total);
          setMetricValue(values, 'tiktok.followers', values['tiktok.followers'] ?? tiktok.followers_total);
          setMetricValue(values, 'soundcloud.followers', soundcloud.followers_total);
          setMetricValue(values, 'youtube.subscribers', values['youtube.subscribers'] ?? youtube.subscribers_total ?? youtube.followers_total);
          setMetricValue(values, 'facebook.followers', facebook.followers_total);
          setMetricValue(values, 'twitter.followers', twitter.followers_total);
          loadedSources.push('songstats');
        })
        .catch((error) => {
          errors.push(error instanceof Error ? error.message : String(error));
        }),
    );
  }

  await Promise.all(tasks);

  return {
    values,
    loadedSources,
    errors,
    fetchedAt: new Date().toISOString(),
  };
}

export function suggestGoalSetupFromPrompt(prompt: string): GoalMetricSuggestion | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return null;

  const platform = normalizePlatform(normalized) ?? 'instagram';

  if (
    normalized.includes('followers to following') ||
    normalized.includes('follower to following') ||
    (normalized.includes('ratio') && normalized.includes('followers') && normalized.includes('following'))
  ) {
    return {
      strategy: 'calculated',
      goalType: 'ratio',
      formula: {
        version: 1,
        type: 'binary',
        operator: 'divide',
        left: { kind: 'metric', metricId: `${platform}.followers` },
        right: { kind: 'metric', metricId: `${platform}.following` },
        display_as: 'ratio',
        left_label: 'Followers',
        right_label: 'Following',
      },
      helperMessage: `Built a ${platform} followers ÷ following ratio formula.`,
    };
  }

  const directMetric = GOAL_METRICS.find((metric) => normalized.includes(metric.label.toLowerCase()));
  if (directMetric) {
    return {
      strategy: 'single_metric',
      metricId: directMetric.id,
      goalType: directMetric.id.includes('followers') || directMetric.id.includes('listeners') ? 'count' : 'custom',
      helperMessage: `Using ${directMetric.label} as the connected metric.`,
    };
  }

  return null;
}

export function evaluateGoalMetric(metricId: string | null | undefined, snapshot: GoalMetricSnapshot) {
  if (!metricId) {
    return {
      current: null,
      formatted: null,
      explanation: 'No metric selected.',
    };
  }

  const value = snapshot.values[metricId];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      current: null,
      formatted: null,
      explanation: `No live value found for ${labelForMetric(metricId)}.`,
    };
  }

  return {
    current: value,
    formatted: value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    explanation: `${labelForMetric(metricId)}: ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  };
}

export function explainFormula(formula: GoalFormulaDefinition | null | undefined) {
  if (!formula) return 'No formula configured.';
  return `${labelForMetric(formula.left.kind === 'metric' ? formula.left.metricId : 'constant')} ${formula.operator} ${labelForMetric(formula.right.kind === 'metric' ? formula.right.metricId : 'constant')}`;
}

export function evaluateGoalComputation(
  strategy: 'manual' | 'single_metric' | 'calculated',
  snapshot: GoalMetricSnapshot,
  metricId?: string | null,
  formula?: GoalFormulaDefinition | null,
) {
  if (strategy === 'manual') {
    return {
      current: null,
      formatted: null,
      explanation: 'Manual goal',
    };
  }

  if (strategy === 'single_metric') {
    return evaluateGoalMetric(metricId, snapshot);
  }

  return evaluateGoalFormula(formula, snapshot);
}
