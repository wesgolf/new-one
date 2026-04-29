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

  let body: { sections?: unknown[]; artistName?: string; start?: string; end?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { sections, artistName, start, end } = body;
  if (!sections?.length) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ summary: null }) };
  }

  const digest = (sections as Array<{ title?: string; stats?: unknown; items?: Array<{ status?: string; text?: string }> }>)
    .map((s) => ({
      section: s.title,
      stats:   s.stats,
      items:   (s.items ?? []).slice(0, 3).map((i) =>
        `${i.status === 'positive' ? '✓' : i.status === 'negative' ? '✗' : '·'} ${i.text}`
      ),
    }));

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are writing a 2-3 sentence executive summary for ${String(artistName ?? 'the artist')}'s weekly artist report.\nPeriod: ${start ?? ''} – ${end ?? ''}\nData: ${JSON.stringify(digest)}\nBe direct, specific, and action-oriented. Avoid fluff. Focus on the most impactful insight.`,
    });

    const summary = response.text?.trim() ?? null;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ summary }) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[report-summary] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Summary generation failed.' }) };
  }
};
