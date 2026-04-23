import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express, { type Request, type Response } from "express";
import http from "http";
import path from "path";
import axios from "axios";

// Global error handlers for better production logging
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

async function startServer() {
  console.log('Initializing server...');
  const app = express();
  
  // Cloud Run provides PORT env var. Default to 8080 for production, 3000 for dev.
  const PORT = Number(process.env.PORT) || 3000;

  console.log(`Configuring server to listen on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Current directory: ${process.cwd()}`);

  // Middleware
  app.use(express.json());

  // ── API usage logger ───────────────────────────────────────────────────────
  // Logs every /api/* request with endpoint + response time. Helps track which
  // endpoints fire most often so you can spot cost hot-spots quickly.
  const apiStats: Record<string, { count: number; totalMs: number; lastAt: string }> = {};
  app.use('/api', (req, _res, next) => {
    const key = `${req.method} ${req.path}`;
    const start = Date.now();
    _res.on('finish', () => {
      const ms = Date.now() - start;
      if (!apiStats[key]) apiStats[key] = { count: 0, totalMs: 0, lastAt: '' };
      apiStats[key].count++;
      apiStats[key].totalMs += ms;
      apiStats[key].lastAt = new Date().toISOString();
      // Only log AI endpoints to keep noise low
      if (req.path.startsWith('/coach') || req.path.startsWith('/assistant') || req.path.startsWith('/ai') || req.path.startsWith('/goals/analyze') || req.path.startsWith('/email') || req.path.startsWith('/report')) {
        console.log(`[api] ${key} — ${ms}ms (total calls: ${apiStats[key].count})`);
      }
    });
    next();
  });

  // Expose stats at /api/usage (dev only — remove or auth-gate in production)
  app.get('/api/usage', (_req, res) => {
    const rows = Object.entries(apiStats)
      .map(([key, s]) => ({ endpoint: key, calls: s.count, avgMs: Math.round(s.totalMs / s.count), lastAt: s.lastAt }))
      .sort((a, b) => b.calls - a.calls);
    res.json(rows);
  });

  // ── Server-side response cache (in-memory, TTL-based) ─────────────────────
  // Caches AI responses keyed on a hash of the input payload. Identical
  // payloads within the TTL window return instantly without a Gemini call.
  interface CacheEntry { value: unknown; expiresAt: number; }
  const serverCache = new Map<string, CacheEntry>();

  function cacheGet(key: string): unknown | undefined {
    const e = serverCache.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) { serverCache.delete(key); return undefined; }
    return e.value;
  }

  function cacheSet(key: string, value: unknown, ttlMs: number): void {
    serverCache.set(key, { value, expiresAt: Date.now() + ttlMs });
    // Evict expired entries lazily (avoid memory leak on long-running process)
    if (serverCache.size > 200) {
      const now = Date.now();
      for (const [k, v] of serverCache.entries()) { if (now > v.expiresAt) serverCache.delete(k); }
    }
  }

  function hashPayload(obj: unknown): string {
    const str = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
    return h.toString(36);
  }

  // Health check endpoint for Cloud Run
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Audio Proxy ──────────────────────────────────────────────────────────────
  // Fetches audio bytes server-side to work around ERR_CERT_AUTHORITY_INVALID
  // and CORS restrictions on Supabase storage / external URLs.
  // SSRF protection: only http/https protocols; private/loopback IPs blocked.
  const SSRF_BLOCK_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
  const { default: httpsModule } = await import('https');

  app.get('/api/audio-proxy', async (req: any, res: any) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).json({ error: 'Missing url param' });

    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs are allowed' });
    }
    if (SSRF_BLOCK_RE.test(parsed.hostname) || parsed.hostname === '::1') {
      return res.status(403).json({ error: 'Access to local addresses is not allowed' });
    }

    try {
      // Allow self-signed certs (dev/staging Supabase instances)
      const agent = new httpsModule.Agent({ rejectUnauthorized: false });
      const response = await axios.get(rawUrl, {
        responseType: 'arraybuffer',
        httpsAgent: agent,
        timeout: 30_000,
        maxContentLength: 100 * 1024 * 1024, // 100 MB
        headers: { 'User-Agent': 'ArtistOS-AudioProxy/1.0' },
      });
      const ct = (response.headers['content-type'] as string) ?? 'audio/mpeg';
      res.set('Content-Type', ct);
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(response.data as ArrayBuffer));
    } catch (err: any) {
      console.error('[audio-proxy] failed:', rawUrl, err.message);
      res.status(502).json({ error: 'Audio proxy error', message: err.message });
    }
  });

  // SoundCloud API Config
  const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
  const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;
  const SOUNDCLOUD_REDIRECT_URI = 'https://ais-dev-cvasv4enruoz3oi4xjg4rs-486722240196.us-east1.run.app/soundcloud-callback';

  // SoundCloud Auth Routes
  app.get('/api/soundcloud/login', (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID) {
      return res.status(503).json({ error: 'SoundCloud is not configured. Please add SOUNDCLOUD_CLIENT_ID to your secrets.' });
    }
    const { code_challenge, state } = req.query;
    const appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/soundcloud-callback`;
    
    const authUrl = `https://secure.soundcloud.com/authorize?client_id=${SOUNDCLOUD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&state=${state}`;
    res.json({ url: authUrl });
  });

  app.post('/api/soundcloud/token', async (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
      return res.status(503).json({ error: 'SoundCloud is not configured. Please add SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET to your secrets.' });
    }
    const { code, code_verifier } = req.body;
    const appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const redirectUri = `${appUrl.replace(/\/$/, '')}/soundcloud-callback`;
    
    try {
      const response = await axios.post('https://secure.soundcloud.com/oauth/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: SOUNDCLOUD_CLIENT_ID!,
          client_secret: SOUNDCLOUD_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          code_verifier,
          code
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'accept': 'application/json; charset=utf-8'
          }
        }
      );
      
      res.json(response.data);
    } catch (err: any) {
      console.error('SoundCloud token exchange failed:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to exchange token' });
    }
  });

  // SoundCloud Proxy Endpoints
  const soundcloudProxy = async (req: any, res: any, path: string) => {
    const authHeader = req.headers.authorization;
    
    // Merge query params and add client_id if missing
    const params = { ...req.query };
    if (!params.client_id && SOUNDCLOUD_CLIENT_ID) {
      params.client_id = SOUNDCLOUD_CLIENT_ID;
    }
    
    const query = new URLSearchParams(params as any).toString();
    const fullPath = query ? `${path}?${query}` : path;
    
    try {
      const response = await axios.get(`https://api.soundcloud.com${fullPath}`, {
        headers: { 
          'Authorization': authHeader,
          'Accept': 'application/json; charset=utf-8',
          'User-Agent': 'Artist-OS/1.0'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      const errorData = err.response?.data;
      const status = err.response?.status || 500;
      
      console.error(`SoundCloud ${fullPath} fetch failed (Status ${status}):`, JSON.stringify(errorData, null, 2) || err.message);
      
      // If it's the weird empty error { errors: [], error: null }, provide a more helpful message
      if (errorData && typeof errorData === 'object' && !errorData.error && (!errorData.errors || errorData.errors.length === 0)) {
         res.status(status).json({ 
           error: 'SoundCloud API returned an empty error. This usually means the token is invalid, expired, or the client_id is missing.',
           details: errorData,
           status: status
         });
      } else {
         res.status(status).json({ 
           error: `Failed to fetch ${fullPath}`, 
           details: errorData || err.message,
           status: status
         });
      }
    }
  };

  app.get('/api/soundcloud/me', (req, res) => soundcloudProxy(req, res, '/me'));
  app.get('/api/soundcloud/me/tracks', (req, res) => soundcloudProxy(req, res, '/me/tracks'));
  app.get('/api/soundcloud/tracks', (req, res) => soundcloudProxy(req, res, '/tracks'));

  // SoundCloud OAuth Callback for Popups
  app.get(['/soundcloud-callback', '/soundcloud-callback/'], (req, res) => {
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'SOUNDCLOUD_AUTH_ERROR', 
                error: "${error}", 
                description: "${error_description || ''}" 
              }, '*');
              window.close();
            </script>
            <p>Authentication failed: ${error_description || error}. Closing window...</p>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'SOUNDCLOUD_AUTH_CODE', 
              code: "${code}", 
              state: "${state}" 
            }, '*');
            window.close();
          </script>
          <p>Authentication successful! Closing window...</p>
        </body>
      </html>
    `);
  });

  // SoundCloud Scraper API
  app.post("/api/soundcloud/scrape-tracks", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "SoundCloud profile URL is required" });
    }

    try {
      const { browserLauncher } = await import("./src/analytics-collector/browser/launcher.ts");
      const page = await browserLauncher.newPage();
      
      // Navigate to the profile page
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for tracks to load
      await page.waitForSelector('.soundTitle__title', { timeout: 10000 }).catch(() => {});

      // Scrape track titles
      const trackTitles = await page.evaluate(() => {
        // Try multiple selectors common on SoundCloud profile pages
        const selectors = [
          '.soundTitle__title span',
          '.soundTitle__title',
          '.trackItem__trackTitle'
        ];
        
        let titles: string[] = [];
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            titles = elements.map(el => el.textContent?.trim()).filter(Boolean) as string[];
            break; 
          }
        }
        
        // Deduplicate and clean up
        return Array.from(new Set(titles));
      });

      await page.close();
      res.json({ trackTitles });
    } catch (error: any) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics API
  app.get("/api/analytics/latest", async (req, res) => {
    try {
      const { analyticsStorage } = await import("./src/analytics-collector/storage/db.ts");
      const metrics = analyticsStorage.getLatestMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analytics/trigger", async (req, res) => {
    try {
      const { analyticsEngine } = await import("./src/analytics-collector/core/engine.ts");
      // Trigger a manual scrape run
      await analyticsEngine.runAll();
      res.json({ status: "Scrape run triggered" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Songstats Proxy ─────────────────────────────────────────────────────
  // The Songstats API only allows calls originating from their own domain,
  // so all requests must be proxied server-side to avoid CORS errors.
  const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY || process.env.VITE_SONGSTATS_API_KEY;
  const SONGSTATS_API_BASE = 'https://api.songstats.com/enterprise/v1';

  app.get('/api/songstats/*', async (req: any, res: any) => {
    if (!SONGSTATS_API_KEY) {
      return res.status(401).json({ error: 'SONGSTATS_API_KEY (or VITE_SONGSTATS_API_KEY) is not configured.' });
    }
    // Strip the /api/songstats prefix to get the upstream path
    const upstreamPath = req.path.replace(/^\/api\/songstats/, '');
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${SONGSTATS_API_BASE}${upstreamPath}${query ? '?' + query : ''}`;
    try {
      const response = await axios.get(url, {
        headers: {
          Accept: 'application/json',
          apikey: SONGSTATS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      console.error(`[songstats proxy] ${url} → ${status}`, data);
      res.status(status).json({ error: 'Songstats proxy error', details: data });
    }
  });

  // Zernio API Config
  const ZERNIO_API_KEY = process.env.VITE_ZERNIO_KEY || process.env.VITE_ZERNIO_API_KEY || process.env.ZERNIO_API_KEY;
  const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

  // ── Zernio Proxy ───────────────────────────────────────────────────────────
  // All GET endpoints registered EXPLICITLY — no wildcards, no Router() — because
  // Express 4 wildcards and router.use() both fail to match multi-segment paths
  // (/accounts/follower-stats, /analytics/daily-metrics, etc.) when Vite middleware
  // is also in the stack. Explicit app.get strings are matched literally and reliably.

  app.get('/api/zernio/config-check', (req: any, res: any) => {
    res.json({ hasKey: !!ZERNIO_API_KEY, keyPrefix: ZERNIO_API_KEY?.substring(0, 3) ?? null, baseUrl: ZERNIO_API_BASE });
  });

  const zernioAllowedGetPaths = new Set([
    '/accounts',
    '/accounts/follower-stats',
    '/analytics',
    '/analytics/best-time',
    '/analytics/content-decay',
    '/analytics/daily-metrics',
    '/analytics/overview',
    '/analytics/posting-frequency',
    '/calendar',
    '/settings',
    '/user',
    '/posts',
  ]);

  const zernioAllowedPostPaths = new Set([
    '/posts',
    '/posts/schedule',
  ]);

  const isDynamicZernioGetPath = (requestPath: string) => (
    /^\/posts\/[^/]+$/.test(requestPath) ||
    /^\/posts\/[^/]+\/analytics$/.test(requestPath) ||
    /^\/calendar\/[^/]+$/.test(requestPath)
  );

  const buildZernioUrl = (requestPath: string, query: Request['query']) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item != null) search.append(key, String(item));
        }
      } else if (value != null) {
        search.append(key, String(value));
      }
    }
    const qs = search.toString();
    return `${ZERNIO_API_BASE}${requestPath}${qs ? `?${qs}` : ''}`;
  };

  app.use('/api/zernio', async (req: Request, res: Response, next) => {
    if (req.path === '/config-check') {
      return next();
    }

    const zernioApiKey = ZERNIO_API_KEY;
    if (!zernioApiKey) {
      return res.status(401).json({ error: 'Zernio API key not configured on server' });
    }

    const requestPath = req.path;
    const isAllowedGet = req.method === 'GET' && (zernioAllowedGetPaths.has(requestPath) || isDynamicZernioGetPath(requestPath));
    const isAllowedPost = req.method === 'POST' && zernioAllowedPostPaths.has(requestPath);

    if (!isAllowedGet && !isAllowedPost) {
      return next();
    }

    const targetUrl = buildZernioUrl(requestPath, req.query);
    console.log(`[zernio proxy] ${req.method} ${req.originalUrl} -> ${targetUrl}`);

    try {
      if (req.method === 'GET') {
        const response = await axios.get(targetUrl, {
          headers: {
            Authorization: `Bearer ${zernioApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });
        return res.status(response.status).json(response.data);
      }

      const response = await axios.post(targetUrl, req.body, {
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const data = error.response?.data || { error: 'Proxy error' };
      console.error(`[zernio proxy] ${req.method} ${targetUrl} -> ${status}`, data);
      return res.status(status).json(data);
    }
  });

  // ── Email send endpoint ───────────────────────────────────────────────────
  // SMTP credentials are kept server-side only (never sent to the client).
  // Currently stubbed: logs the outbound email and returns success.
  // Wire up nodemailer / Resend / SendGrid by setting SMTP_* env vars.
  app.post('/api/email/send', async (req, res) => {
    const { to, subject, body, emailLogId } = req.body as {
      to?: string;
      subject?: string;
      body?: string;
      emailLogId?: string;
    };

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // Input validation — basic email format check to prevent abuse
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'Invalid recipient email address' });
    }

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_USER = process.env.SMTP_USER;

    if (SMTP_HOST && SMTP_USER) {
      // ── Live SMTP path (wire nodemailer here when credentials are available)
      // Example:
      //   const transporter = nodemailer.createTransport({ host: SMTP_HOST, ... });
      //   await transporter.sendMail({ from: SMTP_USER, to, subject, text: body });
      console.log(`[email/send] SMTP configured but not yet wired. Would send to: ${to}, subject: "${subject}"`);
    } else {
      // ── Stub path: logs intent, marks email as logically sent in DB via the client
      console.log(`[email/send] SMTP not configured. Email logged only. to=${to} subject="${subject}" logId=${emailLogId ?? 'n/a'}`);
    }

    res.json({ sent: true, message: 'Email queued. Configure SMTP_HOST and SMTP_USER to enable live sending.' });
  });

  // ── Coach AI Proxy ────────────────────────────────────────────────────────
  // Gemini is called server-side only. The API key is never sent to the browser.
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Hard cap on context payload to control token spend
  const MAX_CONTEXT_CHARS = 3000;

  function trimContext(ctx: string): string {
    if (ctx.length <= MAX_CONTEXT_CHARS) return ctx;
    return ctx.slice(0, MAX_CONTEXT_CHARS) + '\n[context trimmed for brevity]';
  }

  app.post('/api/coach/chat', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }

    const { messages, contextText, summary } = req.body as {
      messages?: Array<{ role: string; content: string }>;
      contextText?: string;
      summary?: string | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Validate message shape — prevent prompt injection via unexpected fields
    const cleanMessages = messages.map((m) => ({
      role: String(m.role),
      content: String(m.content).slice(0, 8000), // per-message cap
    }));

    const summaryBlock = summary
      ? `CONVERSATION CONTEXT (prior summary):\n${summary}\n\n`
      : '';

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
      console.log(`[coach/chat] ok — ${cleanMessages.length} messages, ~${systemInstruction.length} sys chars`);
      res.json({ text });
    } catch (err: any) {
      console.error('[coach/chat] Gemini error:', err.message);
      res.status(500).json({ error: 'AI service error. Please try again.' });
    }
  });

  app.post('/api/coach/summarize', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }

    const { transcript } = req.body as { transcript?: string };
    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
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
      res.json({ summary });
    } catch (err: any) {
      console.error('[coach/summarize] Gemini error:', err.message);
      res.status(500).json({ error: 'Summarization failed' });
    }
  });

  // ── Global Assistant chat ──────────────────────────────────────────────────
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { message, pageContext } = req.body as { message?: string; pageContext?: string };
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const systemPrompt = `You are an AI assistant embedded in an artist management app called Artist OS.
The user is currently on the "${String(pageContext ?? 'dashboard')}" page.
Today is ${new Date().toDateString()}.
Parse the user's message and respond with a JSON object:
{"reply":"a short natural-language confirmation (1-2 sentences)","actions":[{"type":"create_task|create_calendar_event|open_content_scheduler|navigate","label":"human-readable label","payload":{"title":"...","startsAt":"ISO string","to":"/path"},"requiresConfirmation":true}]}
Available action types: create_task, create_calendar_event, open_content_scheduler, navigate (/dashboard /releases /calendar /tasks /goals /analytics /content /coach /strategy /network).
If nothing actionable, set actions to []. Always respond with valid JSON only — no markdown, no extra text.`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: systemPrompt, responseMimeType: 'application/json', temperature: 0.3 },
        contents: [{ role: 'user', parts: [{ text: String(message).slice(0, 4000) }] }],
      });
      const raw = result.text?.trim() ?? '{}';
      let parsed: { reply?: string; actions?: unknown[] } = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw }; }
      res.json({ reply: parsed.reply ?? 'Done.', actions: parsed.actions ?? [] });
    } catch (err: any) {
      console.error('[assistant/chat] Gemini error:', err.message);
      res.status(500).json({ error: 'AI service error. Please try again.' });
    }
  });

  // ── AI engine — artist state analysis ─────────────────────────────────────
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { releases, content, goals, todos } = req.body;

    // Server-side payload caps (defence-in-depth; client already trims before sending)
    const safeReleases = Array.isArray(releases) ? releases.slice(0, 10) : [];
    const safeContent  = Array.isArray(content)  ? content.slice(0, 12)  : [];
    const safeGoals    = Array.isArray(goals)     ? goals.slice(0, 8)     : [];
    const safeTodos    = Array.isArray(todos)     ? todos.slice(0, 10)    : [];

    // Cache identical payloads for 5 minutes (same data = same analysis)
    const cacheKey = `ai:analyze:${hashPayload({ safeReleases, safeContent, safeGoals, safeTodos })}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      console.log('[ai/analyze] cache hit');
      return res.json(cached);
    }

    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const prompt = `Analyze the current state of an independent artist and generate a strategic game plan.
Releases: ${JSON.stringify(safeReleases)}
Content: ${JSON.stringify(safeContent)}
Goals: ${JSON.stringify(safeGoals)}
Todos: ${JSON.stringify(safeTodos)}
Current Date: ${new Date().toISOString()}
Tasks: 1) Select the Focus Track needing most attention. 2) Rationale. 3) Generate momentum/warning/opportunity/insight Signals. 4) Generate 3-5 Daily Tasks. Be specific and data-driven.`;
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
                items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, action: { type: Type.STRING }, impact: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['type','title','description','action','impact','category'] },
              },
              dailyTasks: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, reason: { type: Type.STRING }, priority: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['task','reason','priority','category'] },
              },
            },
            required: ['focusTrackId','focusRationale','signals','dailyTasks'],
          },
        },
      });
      const result = JSON.parse(response.text ?? '{}');
      cacheSet(cacheKey, result, 5 * 60_000); // cache 5 min
      res.json(result);
    } catch (err: any) {
      console.error('[ai/analyze] Gemini error:', err.message);
      res.status(500).json({ error: 'AI analysis failed.' });
    }
  });

  // ── Email draft generation ─────────────────────────────────────────────────
  app.post('/api/email/draft', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { contact, intent, artistContext, intentContext } = req.body as {
      contact?: Record<string, unknown>;
      intent?: string;
      artistContext?: Record<string, string | undefined>;
      intentContext?: string;
    };
    if (!contact || !intent) {
      return res.status(400).json({ error: 'contact and intent are required' });
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const artistLine  = artistContext?.artistName   ? `Artist name: ${artistContext.artistName}`          : 'Artist name: (your name)';
      const releaseLine = artistContext?.recentRelease ? `Most recent release: "${artistContext.recentRelease}"` : '';
      const genreLine   = artistContext?.genre         ? `Genre / style: ${artistContext.genre}`              : '';
      const notesLine   = contact.notes               ? `Notes about contact: ${String(contact.notes)}`      : '';
      const tagsLine    = Array.isArray(contact.tags) && contact.tags.length ? `Contact tags: ${(contact.tags as string[]).join(', ')}` : '';
      const prompt = `You are an email copywriter for an independent music artist.
Write a concise, genuine, professional outreach email.
Recipient: ${String(contact.name ?? '')} (${String(contact.category ?? '')})
Email purpose: ${intentContext ?? String(intent)}
Context:\n${artistLine}\n${releaseLine}\n${genreLine}\n${notesLine}\n${tagsLine}
Rules: Under 180 words in the body. Warm but professional tone. No markdown — plain text paragraphs. Subject line: concise, no clickbait.
Return valid JSON exactly like this: {"subject":"...","body":"..."}`.trim();
      const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
      const raw = (response.text ?? '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      res.json(JSON.parse(raw));
    } catch (err: any) {
      console.error('[email/draft] Gemini error:', err.message);
      res.status(500).json({ error: 'Email draft generation failed.' });
    }
  });

  // ── Weekly report executive summary ───────────────────────────────────────
  app.post('/api/report/summary', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { sections, artistName, start, end } = req.body as {
      sections?: unknown[]; artistName?: string; start?: string; end?: string;
    };
    if (!sections?.length) return res.json({ summary: null });
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const digest = (sections as any[]).map((s) => ({
        section: s.title,
        stats: s.stats,
        items: (s.items ?? []).slice(0, 3).map((i: any) => `${i.status === 'positive' ? '✓' : i.status === 'negative' ? '✗' : '·'} ${i.text}`),
      }));
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are writing a 2-3 sentence executive summary for ${String(artistName ?? 'the artist')}'s weekly artist report.\nPeriod: ${start ?? ''} – ${end ?? ''}\nData: ${JSON.stringify(digest)}\nBe direct, specific, and action-oriented. Avoid fluff. Focus on the most impactful insight.`,
      });
      res.json({ summary: response.text?.trim() ?? null });
    } catch (err: any) {
      console.error('[report/summary] Gemini error:', err.message);
      res.status(500).json({ error: 'Summary generation failed.' });
    }
  });

  // ── Goals AI analysis ──────────────────────────────────────────────────────
  // Single Gemini call returns both per-goal statuses and a strategic insight.
  // (Previously two sequential calls — halves token round-trips and latency.)
  app.post('/api/goals/analyze', async (req: Request, res: Response) => {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { goals, shows, currentDate } = req.body as {
      goals?: unknown[]; shows?: unknown[]; currentDate?: string;
    };
    if (!goals?.length) return res.status(400).json({ error: 'goals is required' });

    const safeGoals = (goals as any[]).slice(0, 20);
    const safeShows = ((shows ?? []) as any[]).slice(0, 5);

    // Cache per payload — goal state changes infrequently
    const cacheKey = `goals:analyze:${hashPayload({ safeGoals, safeShows, currentDate })}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      console.log('[goals/analyze] cache hit');
      return res.json(cached);
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const today = String(currentDate ?? new Date().toISOString().split('T')[0]);

      const goalSummary = safeGoals.map((g: any) => ({
        id:       g.id,
        title:    g.title,
        progress: g.target > 0 ? `${Math.round((g.current / g.target) * 100)}%` : 'timeless',
        deadline: g.deadline ?? null,
      }));

      const prompt = `Today: ${today}.
Upcoming shows: ${JSON.stringify(safeShows)}.
Artist goals: ${JSON.stringify(goalSummary)}.

Return a JSON object with exactly two keys:
1. "statuses": an object keyed by goal id, each value being { "status": "on-track"|"at-risk"|"behind", "reasoning": "<10 words>" }
2. "analysis": a 2-sentence strategic insight string (no bullet points)

Respond with valid JSON only.`;

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
      cacheSet(cacheKey, payload, 10 * 60_000); // cache 10 min
      res.json(payload);
    } catch (err: any) {
      console.error('[goals/analyze] Gemini error:', err.message);
      res.status(500).json({ error: 'Goals analysis failed.' });
    }
  });

  // Start the daily scheduler lazily
  setTimeout(async () => {
    try {
      const { analyticsEngine } = await import("./src/analytics-collector/core/engine.ts");
      analyticsEngine.startScheduler();
      console.log('Analytics scheduler initialized.');
    } catch (err) {
      console.error('Failed to initialize analytics scheduler:', err);
    }
  }, 5000);

  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const { readFileSync } = await import("fs");
      // appType:'custom' tells Vite NOT to add its own SPA fallback middleware.
      // With 'spa', Vite's internal connect-history-api-fallback serves index.html
      // for EVERY unmatched path (including /api/zernio/accounts/follower-stats)
      // before Express ever sees the request — bypassing all our route handlers.
      // With 'custom', Vite only handles HMR + module transforms; Express owns routing.
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server: httpServer } },
        appType: "custom",
      });
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        return vite.middlewares(req, res, next);
      });
      // SPA fallback: transform and serve index.html for all non-API GET requests.
      // This replaces what appType:'spa' did, but only for real browser navigation.
      app.get('*', async (req: any, res: any, next: any) => {
        if (req.path.startsWith('/api/')) return next();
        try {
          const template = readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.error('Failed to initialize Vite middleware:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
