import { updateIdeaAudioMetadata } from './supabaseData';

const IDEA_AUDIO_ANALYSIS_EVENT = 'artist-os:idea-audio-analysis';
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 24;
const ANALYSIS_DISABLED_KEY = 'artist-os:idea-audio-analysis-disabled';
const ANALYSIS_COOLDOWN_KEY = 'artist-os:idea-audio-analysis-cooldown';

const activeAnalyses = new Set<string>();

type IdeaAudioAnalysisDetail = {
  ideaId: string;
  assetId?: string | null;
  status: 'completed' | 'failed' | 'pending';
  bpm?: number | null;
  musicalKey?: string | null;
  message?: string;
};

function emit(detail: IdeaAudioAnalysisDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(IDEA_AUDIO_ANALYSIS_EVENT, { detail }));
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

class AnalysisHttpError extends Error {
  status: number;
  retryAfterMs: number | null;

  constructor(message: string, status: number, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'AnalysisHttpError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

type AnalysisResponse = {
  jobId?: string;
  status?: string;
  progress?: number;
  audioMetadata?: {
    bpm?: number | null;
    key?: string | null;
  } | null;
  message?: string;
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getDisabledReason(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(ANALYSIS_DISABLED_KEY);
}

function disableAnalysis(reason: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ANALYSIS_DISABLED_KEY, reason);
}

function getCooldownUntil(): number {
  const storage = getStorage();
  if (!storage) return 0;
  return Number(storage.getItem(ANALYSIS_COOLDOWN_KEY) ?? '0') || 0;
}

function setCooldown(ms: number): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ANALYSIS_COOLDOWN_KEY, String(Date.now() + ms));
}

function clearCooldown(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ANALYSIS_COOLDOWN_KEY);
}

function parseRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get('Retry-After');
  if (!raw) return null;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const timestamp = Date.parse(raw);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return null;
}

async function startAnalysis(sourceUrl: string): Promise<AnalysisResponse> {
  const response = await fetch('/api/ideas/audio-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sourceUrl }),
  });

  const payload = (await response.json().catch(() => ({}))) as AnalysisResponse & { error?: string };
  if (!response.ok) {
    throw new AnalysisHttpError(
      payload.message || payload.error || `Audio analysis failed with ${response.status}`,
      response.status,
      parseRetryAfterMs(response),
    );
  }
  return payload;
}

async function getAnalysis(jobId: string): Promise<AnalysisResponse> {
  const response = await fetch(`/api/ideas/audio-analysis/${encodeURIComponent(jobId)}`);
  const payload = (await response.json().catch(() => ({}))) as AnalysisResponse & { error?: string };
  if (!response.ok) {
    throw new AnalysisHttpError(
      payload.message || payload.error || `Audio analysis polling failed with ${response.status}`,
      response.status,
      parseRetryAfterMs(response),
    );
  }
  return payload;
}

export async function analyzeIdeaAudioInBackground({
  ideaId,
  assetId,
  sourceUrl,
}: {
  ideaId: string;
  assetId?: string | null;
  sourceUrl: string;
}) {
  const analysisKey = assetId || `${ideaId}:${sourceUrl}`;
  if (activeAnalyses.has(analysisKey)) return;

  const disabledReason = getDisabledReason();
  if (disabledReason) {
    emit({
      ideaId,
      assetId,
      status: 'pending',
      message: disabledReason,
    });
    return;
  }

  const cooldownUntil = getCooldownUntil();
  if (cooldownUntil > Date.now()) {
    emit({
      ideaId,
      assetId,
      status: 'pending',
      message: 'Audio analysis is cooling down after rate limiting.',
    });
    return;
  }

  activeAnalyses.add(analysisKey);
  try {
    const started = await startAnalysis(sourceUrl);
    clearCooldown();
    const initialMetadata = started.audioMetadata;
    if (started.status === 'COMPLETED' && initialMetadata) {
      await updateIdeaAudioMetadata({
        ideaId,
        assetId,
        bpm: initialMetadata.bpm ?? null,
        musicalKey: initialMetadata.key ?? null,
      });
      emit({
        ideaId,
        assetId,
        status: 'completed',
        bpm: initialMetadata.bpm ?? null,
        musicalKey: initialMetadata.key ?? null,
      });
      return;
    }

    const jobId = started.jobId;
    if (!jobId) {
      emit({
        ideaId,
        assetId,
        status: 'failed',
        message: 'StemSplit did not return a job id.',
      });
      return;
    }

    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const polled = await getAnalysis(jobId);

      if (polled.status === 'COMPLETED' && polled.audioMetadata) {
        await updateIdeaAudioMetadata({
          ideaId,
          assetId,
          bpm: polled.audioMetadata.bpm ?? null,
          musicalKey: polled.audioMetadata.key ?? null,
        });
        emit({
          ideaId,
          assetId,
          status: 'completed',
          bpm: polled.audioMetadata.bpm ?? null,
          musicalKey: polled.audioMetadata.key ?? null,
        });
        return;
      }

      if (polled.status === 'FAILED' || polled.status === 'EXPIRED') {
        emit({
          ideaId,
          assetId,
          status: 'failed',
          message: polled.message || `StemSplit job ${polled.status?.toLowerCase() || 'failed'}.`,
        });
        return;
      }
    }

    emit({
      ideaId,
      assetId,
      status: 'pending',
      message: 'Audio analysis is still processing in the background.',
    });
  } catch (error: any) {
    if (error instanceof AnalysisHttpError) {
      if (error.status === 402) {
        disableAnalysis('Audio analysis is unavailable until StemSplit credits are replenished.');
        emit({
          ideaId,
          assetId,
          status: 'pending',
          message: 'Audio analysis is unavailable until StemSplit credits are replenished.',
        });
        return;
      }

      if (error.status === 429) {
        setCooldown(error.retryAfterMs ?? 60_000);
        emit({
          ideaId,
          assetId,
          status: 'pending',
          message: 'Audio analysis is temporarily rate limited.',
        });
        return;
      }
    }

    emit({
      ideaId,
      assetId,
      status: 'failed',
      message: error?.message ?? 'Audio analysis failed.',
    });
  } finally {
    activeAnalyses.delete(analysisKey);
  }
}

export function subscribeIdeaAudioAnalysis(
  listener: (detail: IdeaAudioAnalysisDetail) => void,
) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<IdeaAudioAnalysisDetail>;
    listener(customEvent.detail);
  };
  window.addEventListener(IDEA_AUDIO_ANALYSIS_EVENT, handler);
  return () => window.removeEventListener(IDEA_AUDIO_ANALYSIS_EVENT, handler);
}
