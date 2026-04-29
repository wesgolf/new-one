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

  let body: { releases?: unknown[]; content?: unknown[]; goals?: unknown[]; todos?: unknown[] };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { releases, content, goals, todos } = body;
  const safeReleases = Array.isArray(releases) ? releases.slice(0, 10) : [];
  const safeContent  = Array.isArray(content)  ? content.slice(0, 12)  : [];
  const safeGoals    = Array.isArray(goals)     ? goals.slice(0, 8)     : [];
  const safeTodos    = Array.isArray(todos)     ? todos.slice(0, 10)    : [];

  const prompt = `Analyze the current state of an independent artist and generate a strategic game plan.
Releases: ${JSON.stringify(safeReleases)}
Content: ${JSON.stringify(safeContent)}
Goals: ${JSON.stringify(safeGoals)}
Todos: ${JSON.stringify(safeTodos)}
Current Date: ${new Date().toISOString()}
Tasks: 1) Select the Focus Track needing most attention. 2) Rationale. 3) Generate momentum/warning/opportunity/insight Signals. 4) Generate 3-5 Daily Tasks. Be specific and data-driven.`;

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            focusTrackId:   { type: Type.STRING },
            focusRationale: { type: Type.STRING },
            signals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type:        { type: Type.STRING },
                  title:       { type: Type.STRING },
                  description: { type: Type.STRING },
                  action:      { type: Type.STRING },
                  impact:      { type: Type.STRING },
                  category:    { type: Type.STRING },
                },
                required: ['type', 'title', 'description', 'action', 'impact', 'category'],
              },
            },
            dailyTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task:     { type: Type.STRING },
                  reason:   { type: Type.STRING },
                  priority: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ['task', 'reason', 'priority', 'category'],
              },
            },
          },
          required: ['focusTrackId', 'focusRationale', 'signals', 'dailyTasks'],
        },
      },
    });

    const result = JSON.parse(response.text ?? '{}');
    return { statusCode: 200, headers: CORS, body: JSON.stringify(result) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-analyze] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AI analysis failed.' }) };
  }
};
