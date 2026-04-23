import { Release, ContentItem, Goal, Todo } from "../types";

export interface AIAnalysisResult {
  focusTrackId: string;
  focusRationale: string;
  signals: {
    type: 'momentum' | 'warning' | 'opportunity' | 'insight';
    title: string;
    description: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
    category: 'Streaming' | 'Social' | 'General';
  }[];
  dailyTasks: {
    task: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    category: 'Content' | 'Release' | 'Engagement' | 'Admin';
  }[];
}

// ── Payload summarisers ───────────────────────────────────────────────────────
// Reduce full DB objects to the minimal fields Gemini needs. Keeps token usage
// proportional to dataset size rather than object shape bloat.

function summariseRelease(r: Release) {
  return {
    id:     r.id,
    title:  r.title,
    status: r.status,
    date:   (r as any).distribution?.release_date ?? null,
    streams: r.performance?.streams
      ? Object.values(r.performance.streams as Record<string, number>).reduce((a, b) => a + b, 0)
      : 0,
  };
}

function summariseContent(c: ContentItem) {
  return {
    id:         c.id,
    title:      c.title,
    platform:   c.platform,
    status:     c.status,
    views:      c.metrics?.views ?? 0,
    releaseId:  c.linked_release_id ?? null,
  };
}

function summariseGoal(g: Goal) {
  return { id: g.id, title: g.title, current: g.current, target: g.target, unit: g.unit };
}

function summariseTodo(t: Todo) {
  return { id: t.id, task: t.task, completed: t.completed };
}

export async function analyzeArtistState(
  releases: Release[],
  content: ContentItem[],
  goals: Goal[],
  todos: Todo[]
): Promise<AIAnalysisResult> {
  // Cap array sizes and summarise — avoids sending multi-KB JSON blobs to Gemini
  const payload = {
    releases: releases.slice(0, 10).map(summariseRelease),
    content:  content.slice(0, 12).map(summariseContent),
    goals:    goals.slice(0, 8).map(summariseGoal),
    todos:    todos.slice(0, 10).map(summariseTodo),
  };

  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`AI analysis failed: HTTP ${res.status}`);
  return res.json() as Promise<AIAnalysisResult>;
}
