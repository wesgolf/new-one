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

export async function analyzeArtistState(
  releases: Release[],
  content: ContentItem[],
  goals: Goal[],
  todos: Todo[]
): Promise<AIAnalysisResult> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ releases, content, goals, todos }),
  });
  if (!res.ok) throw new Error(`AI analysis failed: HTTP ${res.status}`);
  return res.json() as Promise<AIAnalysisResult>;
}
