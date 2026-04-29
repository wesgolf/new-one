import { Handler } from '@netlify/functions';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!GEMINI_API_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'AI service not configured on server.' }) };
  }

  let body: { goals?: unknown[]; shows?: unknown[]; currentDate?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { goals, shows, currentDate } = body;
  if (!goals?.length) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'goals is required' }) };
  }

  const safeGoals = (goals as Array<{ id?: unknown; title?: unknown; target?: number; current?: number; deadline?: unknown }>)
    .slice(0, 20);
  const safeShows = ((shows ?? []) as unknown[]).slice(0, 5);
  const today = String(currentDate ?? new Date().toISOString().split('T')[0]);

  const goalSummary = safeGoals.map((g) => ({
    id:       g.id,
    title:    g.title,
    progress: (g.target ?? 0) > 0 ? `${Math.round(((g.current ?? 0) / (g.target ?? 1)) * 100)}%` : 'timeless',
    deadline: g.deadline ?? null,
  }));

  const prompt = `Today: ${today}.
Upcoming shows: ${JSON.stringify(safeShows)}.
Artist goals: ${JSON.stringify(goalSummary)}.

Return a JSON object with exactly two keys:
1. "statuses": an object keyed by goal id, each value being { "status": "on-track"|"at-risk"|"behind", "reasoning": "<10 words>" }
2. "analysis": a 2-sentence strategic insight string (no bullet points)

Respond with valid JSON only.`;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config: { responseMimeType: 'application/json', temperature: 0.3 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    let result: { statuses?: Record<string, unknown>; analysis?: string } = {};
    try { result = JSON.parse(response.text ?? '{}'); } catch { /* ignore */ }

    const payload = {
      statuses: result.statuses ?? {},
      analysis: result.analysis ?? 'Keep pushing towards your targets!',
    };
    return { statusCode: 200, headers: CORS, body: JSON.stringify(payload) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[goals-analyze] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Goals analysis failed.' }) };
  }
};
