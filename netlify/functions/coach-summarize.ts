import { Handler } from '@netlify/functions';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

  let body: { transcript?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { transcript } = body;
  if (!transcript) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'transcript is required' }) };
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Summarize this coaching conversation in 3–4 sentences. Capture: the main topics discussed, any key decisions or action items, and the artist's current focus. Be concise and write in third-person. Do not use bullet points.\n\n${transcript.slice(0, 12000)}`,
        }],
      }],
      config: { temperature: 0.3 },
    });

    const summary = response.text?.trim() ?? null;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ summary }) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[coach-summarize] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Summarization failed' }) };
  }
};
