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

  let body: {
    contact?: Record<string, unknown>;
    intent?: string;
    artistContext?: Record<string, string | undefined>;
    intentContext?: string;
  };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { contact, intent, artistContext, intentContext } = body;
  if (!contact || !intent) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'contact and intent are required' }) };
  }

  const artistLine  = artistContext?.artistName   ? `Artist name: ${artistContext.artistName}`           : 'Artist name: (your name)';
  const releaseLine = artistContext?.recentRelease ? `Most recent release: "${artistContext.recentRelease}"` : '';
  const genreLine   = artistContext?.genre         ? `Genre / style: ${artistContext.genre}`               : '';
  const notesLine   = contact.notes               ? `Notes about contact: ${String(contact.notes)}`       : '';
  const tagsLine    = Array.isArray(contact.tags) && contact.tags.length
    ? `Contact tags: ${(contact.tags as string[]).join(', ')}`
    : '';

  const prompt = `You are an email copywriter for an independent music artist.
Write a concise, genuine, professional outreach email.
Recipient: ${String(contact.name ?? '')} (${String(contact.category ?? '')})
Email purpose: ${intentContext ?? String(intent)}
Context:\n${artistLine}\n${releaseLine}\n${genreLine}\n${notesLine}\n${tagsLine}
Rules: Under 180 words in the body. Warm but professional tone. No markdown — plain text paragraphs. Subject line: concise, no clickbait.
Return valid JSON exactly like this: {"subject":"...","body":"..."}`.trim();

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    const raw = (response.text ?? '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(raw);
    return { statusCode: 200, headers: CORS, body: JSON.stringify(parsed) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email-draft] Gemini error:', msg);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Email draft generation failed.' }) };
  }
};
