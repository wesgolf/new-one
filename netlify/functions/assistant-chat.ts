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

  let body: { message?: string; pageContext?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { message, pageContext } = body;
  if (!message || typeof message !== 'string') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'message is required' }) };
  }

  const systemPrompt = `You are an AI assistant embedded in an artist management app called Artist OS.
The user is currently on the "${String(pageContext ?? 'dashboard')}" page.
Today is ${new Date().toDateString()}.
Parse the user's message and respond with a JSON object:
{"reply":"a short natural-language confirmation (1-2 sentences)","actions":[{"type":"create_task|create_calendar_event|open_content_scheduler|navigate","label":"human-readable label","payload":{"title":"...","startsAt":"ISO string","to":"/path"},"requiresConfirmation":true}]}
Available action types: create_task, create_calendar_event, open_content_scheduler, navigate (/dashboard /releases /calendar /tasks /goals /analytics /content /coach /strategy /network).
If nothing actionable, set actions to []. Always respond with valid JSON only — no markdown, no extra text.`;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: systemPrompt, responseMimeType: 'application/json', temperature: 0.3 },
      contents: [{ role: 'user', parts: [{ text: String(message).slice(0, 4000) }] }],
    });

    const raw = result.text?.trim() ?? '{}';
    let parsed: { reply?: string; actions?: unknown[] } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw }; }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ reply: parsed.reply ?? 'Done.', actions: parsed.actions ?? [] }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[assistant-chat] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AI service error. Please try again.' }) };
  }
};
