import { Handler } from '@netlify/functions';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_CONTEXT_CHARS = 3000;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function trimContext(ctx: string): string {
  if (ctx.length <= MAX_CONTEXT_CHARS) return ctx;
  return ctx.slice(0, MAX_CONTEXT_CHARS) + '\n[context trimmed for brevity]';
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!GEMINI_API_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'AI service not configured on server.' }) };
  }

  let body: { messages?: unknown; contextText?: string; summary?: string | null };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { messages, contextText, summary } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'messages array is required' }) };
  }

  const cleanMessages = (messages as Array<{ role: unknown; content: unknown }>).map((m) => ({
    role: String(m.role),
    content: String(m.content).slice(0, 8000),
  }));

  const summaryBlock = summary ? `CONVERSATION CONTEXT (prior summary):\n${summary}\n\n` : '';
  const systemInstruction =
    `You are the "Artist OS Coach" — a strategic AI mentor for independent music artists. ` +
    `Use the USER DATA CONTEXT to personalise your advice. Be concise, cite data when relevant, use Markdown for structure.\n\n` +
    `USER DATA:\n${trimContext(contextText ?? '')}\n${summaryBlock}`;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: cleanMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      config: { systemInstruction, temperature: 0.7 },
    });

    const text = response.text ?? "I couldn't process that — please try again.";
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ text }) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[coach-chat] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AI service error. Please try again.' }) };
  }
};
