import express, { type Request, type Response } from "express";
import http from "http";
import path from "path";
import axios from "axios";
import postgres from "postgres";
import { applyPreferredEnvToProcessEnv, buildViteDefineEnv } from "./env/loadPreferredEnv";

applyPreferredEnvToProcessEnv(process.env.NODE_ENV, process.cwd());

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
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  
  // Cloud Run provides PORT env var. Default to 8080 for production, 3000 for dev.
  const PORT = Number(process.env.PORT) || 3000;

  console.log(`Configuring server to listen on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Current directory: ${process.cwd()}`);

  // Middleware
  app.use(express.json({ limit: '1mb' }));

  function readDatabaseUrlFromEnv(): string | null {
    const raw =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_POSTGRES_URL ||
      process.env.VITE_SUPABASE_POSTGRES_URL ||
      process.env.VITE_SUPABASE_DB_URL ||
      '';
    const cleaned = String(raw || '').trim();
    if (!cleaned) return null;
    // People often paste "DATABASE_URL=postgresql://..." into env var values.
    return cleaned.replace(/^(DATABASE_URL=)+/i, '');
  }

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  type RateBucket = { count: number; resetAt: number };
  const rateBuckets = new Map<string, RateBucket>();

  function createRateLimiter(namespace: string, max: number, windowMs: number) {
    return (req: Request, res: Response, next: () => void) => {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
      const ip = forwarded || req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${namespace}:${ip}`;
      const now = Date.now();
      const current = rateBuckets.get(key);

      if (!current || now >= current.resetAt) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }

      if (current.count >= max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests to ${namespace}. Try again in ${retryAfterSeconds}s.`,
        });
      }

      current.count += 1;
      next();
    };
  }

  app.use('/api/coach', createRateLimiter('coach', 30, 60_000));
  app.use('/api/assistant', createRateLimiter('assistant', 30, 60_000));
  app.use('/api/ai', createRateLimiter('ai', 20, 60_000));
  app.use('/api/goals/analyze', createRateLimiter('goals-analyze', 20, 60_000));
  app.use('/api/report/summary', createRateLimiter('report-summary', 12, 60_000));
  app.use('/api/email/send', createRateLimiter('email-send', 10, 15 * 60_000));
  app.use('/api/notifications/sms/send', createRateLimiter('sms-send', 10, 15 * 60_000));
  app.use('/api/soundcloud/public-tracks', createRateLimiter('soundcloud-public', 40, 60_000));
  app.use('/api/soundcloud/scrape-tracks', createRateLimiter('soundcloud-scrape', 10, 15 * 60_000));
  app.use('/api/ideas/audio-analysis', createRateLimiter('idea-audio-analysis', 10, 60_000));
  app.use('/api/dropbox', createRateLimiter('dropbox', 20, 60_000));

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

  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/usage', (_req, res) => {
      const rows = Object.entries(apiStats)
        .map(([key, s]) => ({ endpoint: key, calls: s.count, avgMs: Math.round(s.totalMs / s.count), lastAt: s.lastAt }))
        .sort((a, b) => b.calls - a.calls);
      res.json(rows);
    });
  }

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

  const DROPBOX_API = 'https://api.dropboxapi.com/2';
  const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';
  const DROPBOX_OAUTH_API = 'https://api.dropboxapi.com/oauth2/token';
  const DROPBOX_APP_KEY =
    process.env.DROPBOX_APP_KEY ??
    process.env.VITE_DROPBOX_API_KEY ??
    '';
  const DROPBOX_APP_SECRET =
    process.env.DROPBOX_APP_SECRET ??
    process.env.VITE_DROPBOX_APP_SECRET ??
    '';
  const DROPBOX_REFRESH_TOKEN =
    process.env.DROPBOX_REFRESH_TOKEN ??
    process.env.VITE_DROPBOX_REFRESH_TOKEN ??
    '';
  const DROPBOX_ACCESS_TOKEN =
    process.env.DROPBOX_ACCESS_TOKEN ??
    process.env.VITE_DROPBOX_ACCESS_TOKEN ??
    '';

  type DropboxTokenCache = {
    accessToken: string;
    expiresAt: number;
  };

  let dropboxTokenCache: DropboxTokenCache | null = null;

  function sanitizeDropboxFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  function toDropboxRawUrl(sharedUrl: string): string {
    try {
      const url = new URL(sharedUrl);
      if (url.hostname === 'www.dropbox.com' || url.hostname === 'dropbox.com') {
        url.hostname = 'dl.dropboxusercontent.com';
      }
      url.searchParams.delete('dl');
      url.searchParams.set('raw', '1');
      return url.toString();
    } catch {
      return sharedUrl;
    }
  }

  function getDropboxErrorMessage(status: number, fallback: string, payload: any): string {
    const summary =
      payload?.message ||
      payload?.error_summary ||
      payload?.error?.error_summary ||
      payload?.error?.['.tag'] ||
      (typeof payload?.error === 'string' ? payload.error : '') ||
      fallback;

    if (status === 401 && String(summary).includes('expired_access_token')) {
      return 'Dropbox access token expired. Add DROPBOX_REFRESH_TOKEN (preferred) or replace the current access token.';
    }

    return String(summary || fallback);
  }

  async function refreshDropboxAccessToken(): Promise<string> {
    if (!DROPBOX_REFRESH_TOKEN || !DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      throw new Error(
        'Dropbox is missing refresh credentials. Set DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, and DROPBOX_APP_SECRET.',
      );
    }

    const response = await fetch(DROPBOX_OAUTH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: DROPBOX_REFRESH_TOKEN,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getDropboxErrorMessage(response.status, 'Failed to refresh Dropbox token.', payload));
    }

    const accessToken = String(payload?.access_token ?? '').trim();
    const expiresIn = Number(payload?.expires_in ?? 14400);
    if (!accessToken) throw new Error('Dropbox token refresh succeeded without an access token.');

    dropboxTokenCache = {
      accessToken,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    };

    return accessToken;
  }

  async function getDropboxAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && dropboxTokenCache && Date.now() < dropboxTokenCache.expiresAt) {
      return dropboxTokenCache.accessToken;
    }

    if (DROPBOX_REFRESH_TOKEN) {
      return refreshDropboxAccessToken();
    }

    const token = DROPBOX_ACCESS_TOKEN.trim();
    if (!token) {
      throw new Error(
        'Dropbox is not configured. Add DROPBOX_REFRESH_TOKEN with app credentials, or a valid DROPBOX_ACCESS_TOKEN.',
      );
    }

    return token;
  }

  async function dropboxRequest(
    input: string,
    init: RequestInit,
    allowRetry = true,
  ): Promise<Response> {
    const token = await getDropboxAccessToken();
    const response = await fetch(input, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 && DROPBOX_REFRESH_TOKEN && allowRetry) {
      await getDropboxAccessToken(true);
      return dropboxRequest(input, init, false);
    }

    return response;
  }

  app.post(
    '/api/dropbox/upload',
    express.raw({ type: '*/*', limit: '100mb' }),
    async (req: Request, res: Response) => {
      const ideaId = String(req.query.ideaId ?? '').trim();
      const rawFilename = String(req.headers['x-filename'] ?? '').trim();
      const body = req.body;

      if (!ideaId) {
        return res.status(400).json({ error: 'Missing ideaId query parameter.' });
      }

      if (!rawFilename) {
        return res.status(400).json({ error: 'Missing X-Filename header.' });
      }

      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: 'Missing file body.' });
      }

      const filename = sanitizeDropboxFilename(decodeURIComponent(rawFilename));
      const dropboxPath = `/Artist OS/Ideas/${ideaId}/${filename}`;

      try {
        const uploadResponse = await dropboxRequest(`${DROPBOX_CONTENT_API}/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: dropboxPath,
              mode: 'add',
              autorename: true,
              mute: false,
            }),
          },
          body,
        });

        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          return res.status(uploadResponse.status).json({
            error: getDropboxErrorMessage(uploadResponse.status, 'Dropbox upload failed.', uploadPayload),
          });
        }

        const uploadedPath = String(uploadPayload?.path_display ?? dropboxPath);
        const sharedLinkResponse = await dropboxRequest(`${DROPBOX_API}/sharing/create_shared_link_with_settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: uploadedPath,
            settings: { requested_visibility: { '.tag': 'public' } },
          }),
        });

        if (sharedLinkResponse.status === 409) {
          const conflict = await sharedLinkResponse.json().catch(() => ({}));
          const existingUrl = String(
            conflict?.error?.shared_link_already_exists?.metadata?.url ?? '',
          );

          return res.json({
            url: toDropboxRawUrl(existingUrl),
            path: uploadedPath,
            sharedLink: existingUrl,
          });
        }

        const linkPayload = await sharedLinkResponse.json().catch(() => ({}));
        if (!sharedLinkResponse.ok) {
          return res.status(sharedLinkResponse.status).json({
            error: getDropboxErrorMessage(
              sharedLinkResponse.status,
              'Failed to create Dropbox shared link.',
              linkPayload,
            ),
          });
        }

        const sharedLink = String(linkPayload?.url ?? '');
        return res.json({
          url: toDropboxRawUrl(sharedLink),
          path: uploadedPath,
          sharedLink,
        });
      } catch (error: any) {
        console.error('[dropbox] upload failed:', error?.message ?? error);
        return res.status(500).json({
          error: error?.message ?? 'Dropbox upload failed.',
        });
      }
    },
  );

  app.post('/api/dropbox/delete', async (req: Request, res: Response) => {
    const filePath = String(req.body?.path ?? '').trim();
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path.' });
    }

    try {
      const response = await dropboxRequest(`${DROPBOX_API}/files/delete_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      });

      if (response.status === 409) {
        return res.json({ deleted: false });
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          error: getDropboxErrorMessage(response.status, 'Dropbox delete failed.', payload),
        });
      }

      return res.json({ deleted: true });
    } catch (error: any) {
      console.error('[dropbox] delete failed:', error?.message ?? error);
      return res.status(500).json({
        error: error?.message ?? 'Dropbox delete failed.',
      });
    }
  });

  // SoundCloud API Config
  const SOUNDCLOUD_CLIENT_ID =
    process.env.SOUNDCLOUD_CLIENT_ID ??
    process.env.VITE_SOUNDCLOUD_CLIENT_ID;
  const SOUNDCLOUD_CLIENT_SECRET =
    process.env.SOUNDCLOUD_CLIENT_SECRET ??
    process.env.VITE_SOUNDCLOUD_CLIENT_SECRET;
  const SOUNDCLOUD_REDIRECT_URI =
    process.env.SOUNDCLOUD_REDIRECT_URI ??
    process.env.VITE_SOUNDCLOUD_REDIRECT_URI;

  function stripHtml(value: string) {
    return value.replace(/<[^>]+>/g, '');
  }

  function decodeHtmlEntities(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  async function fetchPublicSoundCloudTracks(profileUrl: string, limit = 200) {
    const response = await axios.get(profileUrl, {
      timeout: 15000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Artist-OS/1.0',
      },
    });
    const html = String(response.data || '');
    const hydrationMatch = html.match(/window\.__sc_hydration = (.*?);<\/script>/s);
    const hydration = hydrationMatch ? JSON.parse(hydrationMatch[1]) : [];
    const clientId = hydration.find((entry: any) => entry?.hydratable === 'apiClient')?.data?.id;

    if (clientId) {
      const resolveResponse = await axios.get('https://api-v2.soundcloud.com/resolve', {
        timeout: 15000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Artist-OS/1.0',
        },
        params: {
          url: profileUrl,
          client_id: clientId,
        },
      });

      const userId = resolveResponse.data?.id;
      if (userId) {
        const tracksResponse = await axios.get(`https://api-v2.soundcloud.com/users/${userId}/tracks`, {
          timeout: 15000,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Artist-OS/1.0',
          },
          params: {
            client_id: clientId,
            limit,
          },
        });

        const collection = Array.isArray(tracksResponse.data?.collection) ? tracksResponse.data.collection : [];
        return collection.map((track: any) => ({
          title: String(track?.title ?? '').trim(),
          permalink_url: String(track?.permalink_url ?? '').trim(),
          created_at: track?.created_at ?? null,
          playback_count: Number(track?.playback_count ?? 0),
          likes_count: Number(track?.likes_count ?? track?.favoritings_count ?? 0),
          reposts_count: Number(track?.reposts_count ?? 0),
          comment_count: Number(track?.comment_count ?? 0),
        })).filter((track: any) => track.title && track.permalink_url);
      }
    }

    return Array.from(
      html.matchAll(
        /<article[^>]*itemtype="http:\/\/schema\.org\/MusicRecording"[^>]*>[\s\S]*?<a itemprop="url" href="([^"]+)">([\s\S]*?)<\/a>[\s\S]*?<time pubdate>([^<]+)<\/time>/gi,
      ),
    )
      .map((match) => {
        const href = match[1]?.trim();
        const title = decodeHtmlEntities(stripHtml(match[2] ?? '').trim());
        const publishedAt = match[3]?.trim() || null;
        if (!href || !title) return null;
        return {
          title,
          permalink_url: new URL(href, profileUrl).toString(),
          created_at: publishedAt,
          playback_count: 0,
          likes_count: 0,
          reposts_count: 0,
          comment_count: 0,
        };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  function getSoundCloudRedirectUri(req: Request) {
    if (SOUNDCLOUD_REDIRECT_URI) {
      return SOUNDCLOUD_REDIRECT_URI;
    }
    const appUrl =
      process.env.APP_URL ||
      `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    return `${appUrl.replace(/\/$/, '')}/soundcloud-callback`;
  }

  // SoundCloud Auth Routes
  app.get('/api/soundcloud/login', (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID) {
      return res.status(503).json({
        error: 'SoundCloud is not configured. Add SOUNDCLOUD_CLIENT_ID or VITE_SOUNDCLOUD_CLIENT_ID to your env.',
      });
    }
    const { code_challenge, state } = req.query;
    const redirectUri = getSoundCloudRedirectUri(req);
    
    const authUrl = `https://secure.soundcloud.com/authorize?client_id=${SOUNDCLOUD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&state=${state}`;
    res.json({ url: authUrl });
  });

  app.post('/api/soundcloud/token', async (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
      return res.status(503).json({
        error: 'SoundCloud is not configured. Add SOUNDCLOUD_CLIENT_ID/VITE_SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET/VITE_SOUNDCLOUD_CLIENT_SECRET to your env.',
      });
    }
    const { code, code_verifier } = req.body;
    const redirectUri = getSoundCloudRedirectUri(req);
    
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

  app.post('/api/integrations/soundcloud/sync-releases', async (req: Request, res: Response) => {
    const authHeader = String(req.headers['authorization'] ?? '');
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.slice(7);

    const databaseUrl = readDatabaseUrlFromEnv();
    if (!databaseUrl) {
      return res.status(503).json({ error: 'DATABASE_URL is not configured on the server.' });
    }

    const SUPABASE_URL_SERVER  = process.env.SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL  ?? '';
    const SUPABASE_ANON_SERVER = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PK ?? '';
    if (!SUPABASE_URL_SERVER || !SUPABASE_ANON_SERVER) {
      return res.status(500).json({ error: 'Supabase server client is not configured.' });
    }

    const tracks = (req.body as any)?.tracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return res.status(400).json({ error: 'Body must include tracks: []' });
    }

    const { createClient: createSbClient } = await import('@supabase/supabase-js');
    const sb = createSbClient(SUPABASE_URL_SERVER, SUPABASE_ANON_SERVER, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ title: string | null; permalink_url: string | null; error: string }> = [];

    function toDateString(value: unknown): string | null {
      if (!value) return null;
      const raw = String(value);
      const idx = raw.indexOf('T');
      const day = idx >= 0 ? raw.slice(0, idx) : raw;
      return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
    }

    try {
      for (const t of tracks.slice(0, 250)) {
        const title = (t?.title != null ? String(t.title) : '').trim();
        const permalinkUrl = (t?.permalink_url != null ? String(t.permalink_url) : '').trim();
        if (!title || !permalinkUrl) {
          skipped += 1;
          continue;
        }

        const releaseDate = toDateString(t?.created_at) ?? null;
        const distribution = sql.json({ soundcloud_url: permalinkUrl });
        const performance = sql.json({ streams: { soundcloud: Number(t?.playback_count ?? 0) || 0 } });
        const soundcloudStats = sql.json({
          plays:    Number(t?.playback_count ?? 0) || 0,
          likes:    Number(t?.likes_count ?? t?.favoritings_count ?? 0) || 0,
          reposts:  Number(t?.reposts_count ?? 0) || 0,
          comments: Number(t?.comment_count ?? 0) || 0,
        });

        try {
          const existing = await sql`
            SELECT id
            FROM releases
            WHERE user_id = ${user.id}::uuid
              AND (
                (soundcloud_track_id IS NOT NULL AND soundcloud_track_id = ${permalinkUrl})
                OR (distribution->>'soundcloud_url' = ${permalinkUrl})
                OR (title = ${title})
              )
            LIMIT 1
          `;

          if (existing.length > 0) {
            const id = existing[0].id as string;
            await sql`
              UPDATE releases
              SET
                soundcloud_track_id = ${permalinkUrl},
                distribution    = COALESCE(distribution, '{}'::jsonb) || ${distribution},
                performance     = COALESCE(performance,  '{}'::jsonb) || ${performance},
                soundcloud_stats = ${soundcloudStats},
                release_date    = COALESCE(release_date, ${releaseDate}::date),
                status          = COALESCE(status, 'released'),
                updated_at      = NOW()
              WHERE id = ${id}::uuid
            `;
            updated += 1;
          } else {
            await sql`
              INSERT INTO releases (user_id, title, status, release_date, soundcloud_track_id, distribution, performance, soundcloud_stats, created_at, updated_at)
              VALUES (
                ${user.id}::uuid,
                ${title},
                'released',
                ${releaseDate}::date,
                ${permalinkUrl},
                ${distribution},
                ${performance},
                ${soundcloudStats},
                NOW(),
                NOW()
              )
            `;
            created += 1;
          }
        } catch (e: any) {
          skipped += 1;
          errors.push({
            title,
            permalink_url: permalinkUrl,
            error: String(e?.message ?? e),
          });
        }
      }
    } finally {
      await sql.end();
    }

    console.log(`[soundcloud/sync] uid=${user.id.slice(0, 8)}… created=${created} updated=${updated} skipped=${skipped} errors=${errors.length}`);
    res.json({ created, updated, skipped, errors: errors.slice(0, 20) });
  });

  app.get('/api/soundcloud/public-tracks', async (req, res) => {
    const url = String(req.query.url || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'Missing SoundCloud profile URL.' });
    }

    try {
      const tracks = await fetchPublicSoundCloudTracks(url, Number(req.query.limit || 200));
      if (!tracks.length) {
        return res.status(404).json({ error: 'No public SoundCloud tracks found on the profile page.' });
      }

      res.json({ tracks });
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { error: err.message };
      console.error('[soundcloud/public-tracks] failed:', data);
      res.status(status).json({ error: 'Failed to fetch public SoundCloud tracks', details: data });
    }
  });

  // SoundCloud OAuth Callback for Popups
  app.get(
    [
      '/soundcloud-callback',
      '/soundcloud-callback/',
      '/api/auth/soundcloud/callback',
      '/api/auth/soundcloud/callback/',
    ],
    (req, res) => {
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
    },
  );

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

  type IntegrationApiProvider = 'zernio' | 'songstats' | 'soundcloud';
  type IntegrationTrigger = 'startup' | 'poll';
  type IntegrationSettingsRecord = {
    userId: string;
    autoSync: boolean;
    syncInterval: number;
    enabledPlatforms: IntegrationApiProvider[];
  };
  type ProviderRunResult = {
    provider: IntegrationApiProvider;
    success: boolean;
    message: string;
    created?: number;
    updated?: number;
    skipped?: number;
  };
  type SyncTableShape = {
    hasSyncJobs: boolean;
    providerColumn: 'provider' | 'platform';
    errorColumn: 'error_message' | 'error';
    hasJobType: boolean;
    hasMetadata: boolean;
    hasIntegrationAccounts: boolean;
  };

  const DATABASE_URL = readDatabaseUrlFromEnv();
  const SONGSTATS_ARTIST_ID = process.env.SONGSTATS_ARTIST_ID || process.env.VITE_SONGSTATS_ARTIST_ID;
  const SOUNDCLOUD_ARTIST_URL =
    process.env.SOUNDCLOUD_ARTIST_URL ||
    process.env.VITE_SOUNDCLOUD_ARTIST_URL ||
    process.env.VITE_SOUNDCLOUD_URL ||
    process.env.SOUNDCLOUD_URL;
  const INTEGRATION_API_RUNS_KEY = 'integration_api_runs';
  const INTEGRATION_PROVIDERS: IntegrationApiProvider[] = ['zernio', 'songstats', 'soundcloud'];
  const INTEGRATION_SYNC_INTERVALS = new Set([900, 1800, 3600, 21600, 86400]);
  let integrationPullRunning = false;

  function normalizeReleaseTitle(value: string | null | undefined) {
    return String(value || '')
      .toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function soundCloudSlug(value: string | null | undefined) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.pathname.split('/').filter(Boolean).slice(1).join('/').toLowerCase();
    } catch {
      return String(value).trim().replace(/^\/+/, '').toLowerCase();
    }
  }

  function songstatsSourceValue(stats: Array<{ source: string; data: Record<string, number> }>, source: string, key: string) {
    return Number(stats.find((entry) => entry.source === source)?.data?.[key] ?? 0);
  }

  function sanitizeEnabledPlatforms(value: unknown): IntegrationApiProvider[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is IntegrationApiProvider =>
      typeof entry === 'string' && INTEGRATION_PROVIDERS.includes(entry as IntegrationApiProvider),
    );
  }

  async function persistIntegrationRun(provider: IntegrationApiProvider, ranAt: string) {
    if (!DATABASE_URL) {
      console.warn(`[integration scheduler] DATABASE_URL missing; cannot persist ${provider} run time.`);
      return;
    }

    const sql = postgres(DATABASE_URL, {
      ssl: 'require',
      max: 1,
    });

    try {
      await sql`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES (${INTEGRATION_API_RUNS_KEY}, ${sql.json({ [provider]: ranAt })}, NOW())
          ON CONFLICT (key) DO UPDATE
          SET value = COALESCE(app_settings.value, '{}'::jsonb) || EXCLUDED.value,
              updated_at = NOW()
      `;
    } catch (error: any) {
      console.warn(`[integration scheduler] failed to persist ${provider} run time: ${error?.message ?? 'unknown error'}`);
    } finally {
      await sql.end();
    }
  }

  async function fetchIntegrationSettings(sql: postgres.Sql<any>): Promise<IntegrationSettingsRecord[]> {
    const rows = await sql`
      SELECT
        id AS user_id,
        settings -> 'integrations' AS integrations
      FROM profiles
    `;

    const grouped = new Map<string, Partial<IntegrationSettingsRecord>>();
    for (const row of rows) {
      const userId = String(row.user_id);
      const raw = row.integrations && typeof row.integrations === 'object' ? row.integrations as Record<string, unknown> : {};
      grouped.set(userId, {
        userId,
        autoSync: raw.auto_sync == null ? true : Boolean(raw.auto_sync),
        syncInterval: INTEGRATION_SYNC_INTERVALS.has(Number(raw.sync_interval)) ? Number(raw.sync_interval) : 3600,
        enabledPlatforms: sanitizeEnabledPlatforms(raw.enabled_platforms),
      });
    }

    return [...grouped.values()]
      .map((entry) => ({
        userId: entry.userId!,
        autoSync: entry.autoSync ?? true,
        syncInterval: entry.syncInterval ?? 3600,
        enabledPlatforms: entry.enabledPlatforms?.length ? entry.enabledPlatforms : INTEGRATION_PROVIDERS,
      }))
      .filter((entry) => entry.autoSync && entry.enabledPlatforms.length > 0);
  }

  async function detectSyncTableShape(sql: postgres.Sql<any>): Promise<SyncTableShape> {
    const syncJobColumns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sync_jobs'
    `;
    const integrationAccountRows = await sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'integration_accounts'
      ) AS exists
    `;

    const columnSet = new Set(syncJobColumns.map((row) => String(row.column_name)));
    return {
      hasSyncJobs: syncJobColumns.length > 0,
      providerColumn: columnSet.has('provider') ? 'provider' : 'platform',
      errorColumn: columnSet.has('error_message') ? 'error_message' : 'error',
      hasJobType: columnSet.has('job_type'),
      hasMetadata: columnSet.has('metadata'),
      hasIntegrationAccounts: Boolean(integrationAccountRows[0]?.exists),
    };
  }

  async function getLastSuccessfulRunAt(
    sql: postgres.Sql<any>,
    shape: SyncTableShape,
    userId: string,
    provider: IntegrationApiProvider,
  ) {
    const rows = await sql.unsafe(
      `
        SELECT completed_at, created_at
        FROM sync_jobs
        WHERE user_id = $1::uuid
          AND ${shape.providerColumn} = $2
          AND status = 'success'
        ORDER BY COALESCE(completed_at, created_at) DESC
        LIMIT 1
      `,
      [userId, provider],
    );
    if (!rows.length) return null;
    const raw = rows[0].completed_at ?? rows[0].created_at ?? null;
    return raw ? new Date(String(raw)) : null;
  }

  async function createSyncJob(
    sql: postgres.Sql<any>,
    shape: SyncTableShape,
    userId: string,
    provider: IntegrationApiProvider,
  ) {
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    const pushParam = (column: string, value: any, cast?: string) => {
      columns.push(column);
      values.push(value);
      const index = values.length;
      placeholders.push(cast ? `$${index}::${cast}` : `$${index}`);
    };

    pushParam('user_id', userId, 'uuid');
    pushParam(shape.providerColumn, provider);
    pushParam('status', 'running');

    columns.push('started_at');
    placeholders.push('NOW()');

    if (shape.hasJobType) {
      pushParam('job_type', 'auto_sync');
    }

    if (shape.hasMetadata) {
      pushParam('metadata', {}, 'jsonb');
    }

    const rows = await sql.unsafe(
      `
        INSERT INTO sync_jobs (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
      `,
      values,
    );
    return String(rows[0].id);
  }

  async function finishSyncJob(
    sql: postgres.Sql<any>,
    shape: SyncTableShape,
    jobId: string,
    provider: IntegrationApiProvider,
    result: ProviderRunResult,
  ) {
    const metadata = {
      provider,
      success: result.success,
      message: result.message,
      created: result.created ?? 0,
      updated: result.updated ?? 0,
      skipped: result.skipped ?? 0,
    };

    const setParts = [
      `status = $2`,
      `completed_at = NOW()`,
      `${shape.errorColumn} = $3`,
    ];
    const values: any[] = [jobId, result.success ? 'success' : 'failed', result.success ? null : result.message];

    if (shape.hasMetadata) {
      setParts.push(`metadata = $4::jsonb`);
      values.push(metadata);
    }

    await sql.unsafe(
      `
        UPDATE sync_jobs
        SET ${setParts.join(', ')}
        WHERE id = $1::uuid
      `,
      values,
    );

    if (!shape.hasIntegrationAccounts) {
      return;
    }

    await sql`
      INSERT INTO integration_accounts (
        user_id,
        provider,
        connection_status,
        last_synced_at,
        last_sync_status,
        last_error,
        metadata,
        created_at,
        updated_at
      )
      SELECT
        user_id,
        ${provider},
        ${result.success ? 'connected' : 'error'},
        NOW(),
        ${result.success ? 'success' : 'failed'},
        ${result.success ? null : result.message},
        ${sql.json(metadata)},
        NOW(),
        NOW()
      FROM sync_jobs
      WHERE id = ${jobId}::uuid
      ON CONFLICT (user_id, provider) DO UPDATE
      SET
        connection_status = EXCLUDED.connection_status,
        last_synced_at = EXCLUDED.last_synced_at,
        last_sync_status = EXCLUDED.last_sync_status,
        last_error = EXCLUDED.last_error,
        metadata = COALESCE(integration_accounts.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = NOW()
    `;
  }

  async function runZernioProviderPull(): Promise<ProviderRunResult> {
    if (!ZERNIO_API_KEY) {
      console.log('[integration scheduler] zernio skipped: missing API key');
      return { provider: 'zernio', success: false, message: 'Zernio API key missing.' };
    }
    const response = await axios.get(`${ZERNIO_API_BASE}/accounts`, {
      headers: {
        Authorization: `Bearer ${ZERNIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const count = Array.isArray(response.data)
      ? response.data.length
      : Array.isArray(response.data?.accounts)
      ? response.data.accounts.length
      : 0;
    console.log(`[integration scheduler] zernio pulled ${count} account${count === 1 ? '' : 's'}`);
    return {
      provider: 'zernio',
      success: true,
      message: `Fetched ${count} Zernio account${count === 1 ? '' : 's'}.`,
      updated: count,
      skipped: 0,
    };
  }

  async function runSongstatsProviderPullForUser(sql: postgres.Sql<any>, userId: string): Promise<ProviderRunResult> {
    if (!SONGSTATS_API_KEY || !SONGSTATS_ARTIST_ID) {
      console.log('[integration scheduler] songstats skipped: missing API key or artist id');
      return { provider: 'songstats', success: false, message: 'Songstats API key or artist id missing.' };
    }

    const fetchSongstats = async <T>(path: string, params: Record<string, string>) => {
      const response = await axios.get(`${SONGSTATS_API_BASE}${path}`, {
        headers: {
          Accept: 'application/json',
          apikey: SONGSTATS_API_KEY,
        },
        params,
        timeout: 15000,
      });
      return response.data as T;
    };

    const releases = await sql`
      SELECT id, title, isrc, spotify_track_id, distribution, performance
      FROM releases
      WHERE user_id = ${userId}::uuid
      ORDER BY updated_at DESC
    `;

    const catalogResponse = await fetchSongstats<{
      catalog?: Array<{ songstats_track_id: string; title: string; isrcs?: string[] }>;
    }>('/artists/catalog', {
      songstats_artist_id: SONGSTATS_ARTIST_ID,
      source_ids: 'all',
      limit: '100',
    });

    const catalog = Array.isArray(catalogResponse.catalog) ? catalogResponse.catalog : [];
    const catalogByTitle = new Map(catalog.map((track) => [normalizeReleaseTitle(track.title), track]));
    const catalogByIsrc = new Map(
      catalog.flatMap((track) => (track.isrcs ?? []).map((isrc) => [String(isrc).trim(), track] as const)),
    );

    let updated = 0;
    let skipped = 0;

    for (const release of releases) {
      const matched =
        (release.isrc ? catalogByIsrc.get(String(release.isrc).trim()) : null) ??
        catalogByTitle.get(normalizeReleaseTitle(release.title));
      if (!matched) {
        skipped += 1;
        continue;
      }

      const [trackStats, trackInfo] = await Promise.all([
        fetchSongstats<{ stats?: Array<{ source: string; data: Record<string, number> }> }>(
          '/tracks/stats',
          { songstats_track_id: matched.songstats_track_id, source_ids: 'all' },
        ).catch(() => null),
        fetchSongstats<{ track_info?: { links?: Array<{ source: string; external_id: string; url: string }> } }>(
          '/tracks/info',
          { songstats_track_id: matched.songstats_track_id },
        ).catch(() => null),
      ]);

      if (!trackStats && !trackInfo) {
        skipped += 1;
        continue;
      }

      const releaseDistribution = (release.distribution ?? {}) as Record<string, unknown>;
      const releasePerformance = (release.performance ?? {}) as Record<string, any>;
      const existingStreams = (releasePerformance.streams ?? {}) as Record<string, number>;
      const links = trackInfo?.track_info?.links ?? [];
      const distribution = {
        spotify_url: links.find((link) => link.source === 'spotify')?.url ?? releaseDistribution.spotify_url ?? null,
        apple_music_url: links.find((link) => link.source === 'apple_music')?.url ?? releaseDistribution.apple_music_url ?? null,
        soundcloud_url: releaseDistribution.soundcloud_url ?? null,
        youtube_url: releaseDistribution.youtube_url ?? null,
      };
      const stats = trackStats?.stats ?? [];
      const performance = {
        streams: {
          spotify: songstatsSourceValue(stats, 'spotify', 'streams_total') || Number(existingStreams.spotify ?? 0),
          apple: songstatsSourceValue(stats, 'apple_music', 'streams_total') || Number(existingStreams.apple ?? 0),
          soundcloud: Number(existingStreams.soundcloud ?? 0),
          youtube: Number(existingStreams.youtube ?? 0),
        },
      };
      const spotifyTrackId =
        release.spotify_track_id ??
        links.find((link) => link.source === 'spotify')?.external_id ??
        null;

      await sql`
        UPDATE releases
        SET
          distribution = ${sql.json(distribution)},
          performance = ${sql.json(performance)},
          spotify_track_id = COALESCE(spotify_track_id, ${spotifyTrackId}),
          updated_at = NOW()
        WHERE id = ${release.id}::uuid
      `;
      updated += 1;
    }

    console.log(`[integration scheduler] songstats synced user=${userId.slice(0, 8)}… updated=${updated} skipped=${skipped}`);
    return {
      provider: 'songstats',
      success: true,
      message: `Updated ${updated} release${updated === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`,
      updated,
      skipped,
    };
  }

  async function runSoundCloudProviderPullForUser(sql: postgres.Sql<any>, userId: string): Promise<ProviderRunResult> {
    if (!SOUNDCLOUD_ARTIST_URL) {
      console.log('[integration scheduler] soundcloud skipped: missing artist url');
      return { provider: 'soundcloud', success: false, message: 'SoundCloud artist URL missing.' };
    }

    const tracks = await fetchPublicSoundCloudTracks(SOUNDCLOUD_ARTIST_URL, 200);
    const releases = await sql`
      SELECT id, title, release_date, soundcloud_track_id, distribution, performance
      FROM releases
      WHERE user_id = ${userId}::uuid
      ORDER BY updated_at DESC
    `;

    const byTitle = new Map(releases.map((release) => [normalizeReleaseTitle(release.title), release]));
    const bySlug = new Map(
      releases
        .map((release) => {
          const distribution = (release.distribution ?? {}) as Record<string, unknown>;
          const slug = soundCloudSlug((distribution.soundcloud_url as string | undefined) || release.soundcloud_track_id);
          return slug ? [slug, release] as const : null;
        })
        .filter(Boolean) as ReadonlyArray<readonly [string, (typeof releases)[number]]>,
    );

    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const track of tracks) {
      const title = String(track?.title ?? '').trim();
      const permalinkUrl = String(track?.permalink_url ?? '').trim();
      if (!title || !permalinkUrl) {
        skipped += 1;
        continue;
      }

      const titleKey = normalizeReleaseTitle(title);
      const slug = soundCloudSlug(permalinkUrl);
      const existing = (slug ? bySlug.get(slug) : null) ?? byTitle.get(titleKey) ?? null;
      const existingDistribution = (existing?.distribution ?? {}) as Record<string, unknown>;
      const existingStreams = (existing?.performance?.streams ?? {}) as Record<string, number>;
      const distribution = {
        spotify_url: typeof existingDistribution.spotify_url === 'string' ? existingDistribution.spotify_url : null,
        apple_music_url: typeof existingDistribution.apple_music_url === 'string' ? existingDistribution.apple_music_url : null,
        soundcloud_url: permalinkUrl,
        youtube_url: typeof existingDistribution.youtube_url === 'string' ? existingDistribution.youtube_url : null,
      };
      const performance = {
        streams: {
          spotify: Number(existingStreams.spotify ?? 0),
          apple: Number(existingStreams.apple ?? 0),
          soundcloud: Number(track?.playback_count ?? 0),
          youtube: Number(existingStreams.youtube ?? 0),
        },
      };
      const soundcloudStats = sql.json({
        plays: Number(track?.playback_count ?? 0),
        likes: Number(track?.likes_count ?? track?.favoritings_count ?? 0),
        reposts: Number(track?.reposts_count ?? 0),
        comments: Number(track?.comment_count ?? 0),
      });
      const releaseDate = String(track?.created_at ?? '').split('T')[0] || new Date().toISOString().split('T')[0];

      if (existing) {
        await sql`
          UPDATE releases
          SET
            soundcloud_track_id = ${permalinkUrl},
            distribution = ${sql.json(distribution)},
            performance = ${sql.json(performance)},
            soundcloud_stats = ${soundcloudStats},
            release_date = COALESCE(release_date, ${releaseDate}::date),
            status = COALESCE(status, 'released'),
            updated_at = NOW()
          WHERE id = ${existing.id}::uuid
        `;
        updated += 1;
      } else {
        await sql`
          INSERT INTO releases (
            user_id, title, status, release_date, soundcloud_track_id, distribution, performance, soundcloud_stats, created_at, updated_at
          )
          VALUES (
            ${userId}::uuid, ${title}, 'released', ${releaseDate}::date, ${permalinkUrl},
            ${sql.json(distribution)}, ${sql.json(performance)}, ${soundcloudStats}, NOW(), NOW()
          )
        `;
        created += 1;
      }
    }

    console.log(`[integration scheduler] soundcloud synced user=${userId.slice(0, 8)}… created=${created} updated=${updated} skipped=${skipped}`);
    return {
      provider: 'soundcloud',
      success: true,
      message: `${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}.`,
      created,
      updated,
      skipped,
    };
  }

  async function runIntegrationProviderPulls(trigger: IntegrationTrigger) {
    if (integrationPullRunning) {
      console.log(`[integration scheduler] skipped ${trigger} run; previous run still active`);
      return;
    }
    if (!DATABASE_URL) {
      console.warn('[integration scheduler] DATABASE_URL missing; auto-sync disabled.');
      return;
    }

    integrationPullRunning = true;
    const startedAt = new Date().toISOString();
    console.log(`[integration scheduler] starting ${trigger} provider run at ${startedAt}`);

    const sql = postgres(DATABASE_URL, { ssl: 'require', max: 1 });
    try {
      const shape = await detectSyncTableShape(sql);
      console.log('[integration scheduler] detected sync schema:', shape);
      if (!shape.hasSyncJobs) {
        console.warn('[integration scheduler] sync_jobs table missing; auto-sync disabled until migrations are applied.');
        return;
      }
      const releasesTableRows = await sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'releases'
        ) AS exists
      `;
      const hasReleasesTable = Boolean(releasesTableRows[0]?.exists);
      const users = await fetchIntegrationSettings(sql);
      console.log(`[integration scheduler] loaded ${users.length} user integration setting set(s)`);

      for (const user of users) {
        for (const provider of user.enabledPlatforms) {
          if (provider === 'spotify') {
            console.log('[integration scheduler] skipping spotify auto-sync; Spotify is client-authenticated and currently supports manual sync only.');
            continue;
          }
          if (!hasReleasesTable && (provider === 'soundcloud' || provider === 'songstats')) {
            console.log(`[integration scheduler] skipping ${provider} auto-sync; releases table is not part of the current schema phase.`);
            continue;
          }
          const lastSuccess = await getLastSuccessfulRunAt(sql, shape, user.userId, provider);
          const due = !lastSuccess || (Date.now() - lastSuccess.getTime()) >= user.syncInterval * 1000;
          if (!due) continue;

          const jobId = await createSyncJob(sql, shape, user.userId, provider);
          let result: ProviderRunResult;
          try {
            if (provider === 'soundcloud') {
              result = await runSoundCloudProviderPullForUser(sql, user.userId);
            } else if (provider === 'songstats') {
              result = await runSongstatsProviderPullForUser(sql, user.userId);
            } else {
              result = await runZernioProviderPull();
            }
          } catch (err: any) {
            result = {
              provider,
              success: false,
              message: err?.message ?? `Failed to run ${provider} sync.`,
            };
          }

          await finishSyncJob(sql, shape, jobId, provider, result);
          if (result.success) {
            await persistIntegrationRun(provider, new Date().toISOString());
          }
        }
      }
    } finally {
      integrationPullRunning = false;
      await sql.end();
    }
  }

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

  const STEMSPLIT_API_KEY = process.env.STEMSPLIT_API_KEY || process.env.VITE_STEMSPLIT_API_KEY;
  const STEMSPLIT_API_BASE = 'https://stemsplit.io/api/v1';

  app.post('/api/ideas/audio-analysis', async (req: Request, res: Response) => {
    if (!STEMSPLIT_API_KEY) {
      return res.status(503).json({ error: 'STEMSPLIT_API_KEY is not configured on the server.' });
    }

    const sourceUrl = String((req.body as any)?.sourceUrl ?? '').trim();
    if (!sourceUrl) {
      return res.status(400).json({ error: 'sourceUrl is required' });
    }

    try {
      const response = await axios.post(
        `${STEMSPLIT_API_BASE}/jobs`,
        {
          sourceUrl,
          outputType: 'VOCALS',
          quality: 'FAST',
          outputFormat: 'MP3',
        },
        {
          headers: {
            Authorization: `Bearer ${STEMSPLIT_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 30000,
        },
      );

      const payload = response.data as any;
      return res.status(200).json({
        jobId: payload.id ?? null,
        status: payload.status ?? null,
        progress: payload.progress ?? null,
        audioMetadata: payload.audioMetadata ?? null,
      });
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'StemSplit job creation failed.';
      return res.status(status).json({ error: 'StemSplit job creation failed', message });
    }
  });

  app.get('/api/ideas/audio-analysis/:jobId', async (req: Request, res: Response) => {
    if (!STEMSPLIT_API_KEY) {
      return res.status(503).json({ error: 'STEMSPLIT_API_KEY is not configured on the server.' });
    }

    const jobId = String(req.params.jobId || '').trim();
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    try {
      const response = await axios.get(`${STEMSPLIT_API_BASE}/jobs/${encodeURIComponent(jobId)}`, {
        headers: {
          Authorization: `Bearer ${STEMSPLIT_API_KEY}`,
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      const payload = response.data as any;
      const audioMetadata =
        payload.audioMetadata ??
        payload.analysis ??
        payload.input?.audioMetadata ??
        null;

      return res.status(200).json({
        jobId: payload.id ?? jobId,
        status: payload.status ?? null,
        progress: payload.progress ?? null,
        audioMetadata: audioMetadata
          ? {
              bpm: Number(audioMetadata.bpm ?? audioMetadata.tempo ?? 0) || null,
              key: String(audioMetadata.key ?? audioMetadata.musicalKey ?? '').trim() || null,
            }
          : null,
        message: payload.errorMessage ?? null,
      });
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'StemSplit job lookup failed.';
      return res.status(status).json({ error: 'StemSplit job lookup failed', message });
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
    const queryParams = req.query as Record<string, string>;
    // Ensure source_ids is always set — Songstats returns HTTP 300 without it on catalog/stats endpoints
    if (!queryParams.source_ids) queryParams.source_ids = 'all';
    const query = new URLSearchParams(queryParams).toString();
    const url = `${SONGSTATS_API_BASE}${upstreamPath}${query ? '?' + query : ''}`;
    try {
      const response = await axios.get(url, {
        headers: {
          Accept: 'application/json',
          apikey: SONGSTATS_API_KEY,
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });
      // Always respond 200 — Songstats sometimes returns 300 as a redirect hint
      // but the body contains valid JSON data. The client treats non-2xx as errors.
      res.status(200).json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      console.error(`[songstats proxy] ${url} → ${status}`, data);
      res.status(status).json({ error: 'Songstats proxy error', details: data });
    }
  });

  app.post('/api/integrations/songstats/sync-releases', async (req: Request, res: Response) => {
    const authHeader = String(req.headers['authorization'] ?? '');
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    if (!SONGSTATS_API_KEY) {
      return res.status(503).json({ error: 'Songstats API key not configured on server.' });
    }

    const databaseUrl = readDatabaseUrlFromEnv();
    if (!databaseUrl) {
      return res.status(503).json({ error: 'DATABASE_URL is not configured on the server.' });
    }

    const SUPABASE_URL_SERVER = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
    const SUPABASE_ANON_SERVER = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PK ?? '';
    if (!SUPABASE_URL_SERVER || !SUPABASE_ANON_SERVER) {
      return res.status(500).json({ error: 'Supabase server client is not configured.' });
    }

    const songstatsArtistId = String((req.body as any)?.songstatsArtistId ?? process.env.SONGSTATS_ARTIST_ID ?? process.env.VITE_SONGSTATS_ARTIST_ID ?? '').trim();
    if (!songstatsArtistId) {
      return res.status(400).json({ error: 'songstatsArtistId is required' });
    }

    const { createClient: createSbClient } = await import('@supabase/supabase-js');
    const token = authHeader.slice(7);
    const sb = createSbClient(SUPABASE_URL_SERVER, SUPABASE_ANON_SERVER, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const normalizeReleaseTitleLocal = (value: string | null | undefined) =>
      String(value || '')
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, '')
        .replace(/[-–—]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const songstatsSourceValueLocal = (
      stats: Array<{ source: string; data: Record<string, number> }>,
      source: string,
      key: string,
    ) => Number(stats.find((entry) => entry.source === source)?.data?.[key] ?? 0);

    const fetchSongstats = async <T>(path: string, params: Record<string, string>) => {
      const response = await axios.get(`${SONGSTATS_API_BASE}${path}`, {
        headers: {
          Accept: 'application/json',
          apikey: SONGSTATS_API_KEY,
        },
        params,
        timeout: 15000,
      });
      return response.data as T;
    };

    const sql = postgres(databaseUrl, { ssl: 'require', max: 1 });
    let updated = 0;
    let skipped = 0;
    const failures: Array<{ releaseId: string; title: string; error: string }> = [];

    try {
      const releases = await sql`
        SELECT id, title, isrc, spotify_track_id, distribution, performance
        FROM releases
        WHERE user_id = ${user.id}::uuid
        ORDER BY updated_at DESC
      `;

      const catalogResponse = await fetchSongstats<{
        catalog?: Array<{ songstats_track_id: string; title: string; isrcs?: string[] }>;
      }>('/artists/catalog', {
        songstats_artist_id: songstatsArtistId,
        source_ids: 'all',
        limit: '100',
      });
      const catalog = Array.isArray(catalogResponse.catalog) ? catalogResponse.catalog : [];
      const catalogByTitle = new Map(catalog.map((track) => [normalizeReleaseTitleLocal(track.title), track]));
      const catalogByIsrc = new Map(
        catalog.flatMap((track) => (track.isrcs ?? []).map((isrc) => [String(isrc).trim(), track] as const)),
      );

      for (const release of releases) {
        const matched =
          (release.isrc ? catalogByIsrc.get(String(release.isrc).trim()) : null) ??
          catalogByTitle.get(normalizeReleaseTitleLocal(release.title));
        if (!matched) {
          skipped += 1;
          continue;
        }

        try {
          const [trackStats, trackInfo] = await Promise.all([
            fetchSongstats<{ stats?: Array<{ source: string; data: Record<string, number> }> }>(
              '/tracks/stats',
              { songstats_track_id: matched.songstats_track_id, source_ids: 'all' },
            ).catch(() => null),
            fetchSongstats<{ track_info?: { links?: Array<{ source: string; external_id: string; url: string }> } }>(
              '/tracks/info',
              { songstats_track_id: matched.songstats_track_id },
            ).catch(() => null),
          ]);

          if (!trackStats && !trackInfo) {
            skipped += 1;
            continue;
          }

          const releaseDistribution = (release.distribution ?? {}) as Record<string, unknown>;
          const releasePerformance = (release.performance ?? {}) as Record<string, any>;
          const existingStreams = (releasePerformance.streams ?? {}) as Record<string, number>;
          const links = trackInfo?.track_info?.links ?? [];
          const distribution = {
            spotify_url: links.find((link) => link.source === 'spotify')?.url ?? releaseDistribution.spotify_url ?? null,
            apple_music_url: links.find((link) => link.source === 'apple_music')?.url ?? releaseDistribution.apple_music_url ?? null,
            soundcloud_url: releaseDistribution.soundcloud_url ?? null,
            youtube_url: releaseDistribution.youtube_url ?? null,
          };
          const stats = trackStats?.stats ?? [];
          const performance = {
            streams: {
              spotify: songstatsSourceValueLocal(stats, 'spotify', 'streams_total') || Number(existingStreams.spotify ?? 0),
              apple: songstatsSourceValueLocal(stats, 'apple_music', 'streams_total') || Number(existingStreams.apple ?? 0),
              soundcloud: Number(existingStreams.soundcloud ?? 0),
              youtube: Number(existingStreams.youtube ?? 0),
            },
          };
          const spotifyTrackId =
            release.spotify_track_id ??
            links.find((link) => link.source === 'spotify')?.external_id ??
            null;

          await sql`
            UPDATE releases
            SET
              distribution = ${sql.json(distribution)},
              performance = ${sql.json(performance)},
              spotify_track_id = COALESCE(spotify_track_id, ${spotifyTrackId}),
              updated_at = NOW()
            WHERE id = ${release.id}::uuid
          `;
          updated += 1;
        } catch (error: any) {
          skipped += 1;
          failures.push({
            releaseId: String(release.id),
            title: String(release.title),
            error: error?.message ?? String(error),
          });
        }
      }

      return res.status(200).json({ updated, skipped, failures });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Songstats release sync failed',
        message: error?.message ?? String(error),
      });
    } finally {
      await sql.end({ timeout: 2 });
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
    '/analytics/youtube/daily-views',
    '/analytics/youtube/demographics',
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

  // ── SMS notification endpoint ─────────────────────────────────────────────
  // Twilio credentials are server-side only. Set:
  //   TWILIO_ACCOUNT_SID
  //   TWILIO_AUTH_TOKEN
  //   TWILIO_FROM_NUMBER
  app.post('/api/notifications/sms/send', async (req, res) => {
    const { to, body } = req.body as { to?: string; body?: string };

    if (!to) {
      return res.status(400).json({ error: 'Missing required field: to' });
    }

    const messageBody = String(body || 'Artist OS notification').trim();
    if (!messageBody) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    const E164_RE = /^\+[1-9]\d{7,14}$/;
    if (!E164_RE.test(to)) {
      return res.status(400).json({ error: 'Phone number must be in E.164 format, for example +15551234567' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(503).json({
        error: 'Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to your server env.',
      });
    }

    try {
      const twilioModule = await import('twilio');
      const createTwilioClient = (twilioModule.default ?? twilioModule) as unknown as (sid: string, token: string) => {
        messages: {
          create: (params: { body: string; from: string; to: string }) => Promise<{ sid: string }>;
        };
      };

      const client = createTwilioClient(accountSid, authToken);
      const message = await client.messages.create({
        body: messageBody,
        from: fromNumber,
        to,
      });

      res.json({ sent: true, sid: message.sid, message: 'Text notification sent.' });
    } catch (err: any) {
      console.error('[sms/send] Twilio send failed:', err?.message || err);
      res.status(500).json({ error: err?.message ?? 'Failed to send text notification' });
    }
  });

  // ── Coach AI Proxy ────────────────────────────────────────────────────────
  // OpenAI is called server-side only. The API key is never sent to the browser.
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_CHATGPT_API_KEY;

  // Hard cap on context payload to control token spend
  const MAX_CONTEXT_CHARS = 3000;

  function trimContext(ctx: string): string {
    if (ctx.length <= MAX_CONTEXT_CHARS) return ctx;
    return ctx.slice(0, MAX_CONTEXT_CHARS) + '\n[context trimmed for brevity]';
  }

  // ── Coach context retrieval ───────────────────────────────────────────────
  // Server-side context gathering using Postgres FTS + targeted queries.
  // Mirrors netlify/functions/coach-context.ts for local dev (server.ts env).
  //
  // Token budget: 3 000 chars total.
  //   FTS results:   up to 1 500 chars   (10 results × 150 chars)
  //   Analytics:     up to   500 chars
  //   Calendar:      up to   400 chars
  //
  // Future upgrade: replace the FTS block with a fetch() to Meilisearch /
  // Typesense / OpenSearch / Elasticsearch. Response shape stays the same.
  const SUPABASE_URL_SERVER  = process.env.SUPABASE_URL  ?? process.env.VITE_SUPABASE_URL  ?? '';
  const SUPABASE_ANON_SERVER = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON ?? process.env.VITE_SUPABASE_PK ?? '';

  app.post('/api/coach/context', async (req: Request, res: Response) => {
    const authHeader = (req.headers['authorization'] ?? '') as string;
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.slice(7);

    const { question, page = '', entityIds = [] } = req.body as {
      question?: string;
      page?: string;
      entityIds?: string[];
    };

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return res.status(400).json({ error: 'question is required (min 2 chars)' });
    }
    if (!SUPABASE_URL_SERVER || !SUPABASE_ANON_SERVER) {
      return res.status(500).json({ error: 'Context service not configured' });
    }

    const { createClient: createSbClient } = await import('@supabase/supabase-js');
    const sb = createSbClient(SUPABASE_URL_SERVER, SUPABASE_ANON_SERVER, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    // ── Shared budget constants ──────────────────────────────────────────────
    const BUDGET_PROFILE   = 800;
    const BUDGET_SNIPPET   = 150;
    const BUDGET_ANALYTICS = 500;
    const BUDGET_CALENDAR  = 400;
    const BUDGET_TOTAL     = 4_000;

    const sections: string[] = [];
    const sources:  string[] = [];
    let charBudget = BUDGET_TOTAL;
    const t0 = Date.now();
    const normalizedQuestion = question.toLowerCase();
    const questionTerms = normalizedQuestion.split(/\s+/).filter(Boolean).slice(0, 6);

    const compactText = (value: unknown, maxLength = BUDGET_SNIPPET) => {
      const text = String(value ?? '').replace(/\s+/g, ' ').trim();
      return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
    };

    const matchesQuestion = (...values: unknown[]) => {
      const haystack = values.map((value) => String(value ?? '').toLowerCase()).join(' ');
      if (!haystack) return false;
      if (haystack.includes(normalizedQuestion)) return true;
      return questionTerms.some((term) => haystack.includes(term));
    };

    // 0. Artist profile + recent ideas, goals, tasks, reports (always included first)
    try {
      const [profileRes, ideasRes, goalsRes, tasksRes, reportsRes] = await Promise.all([
        sb.from('profiles').select('full_name, email, role').eq('id', user.id).single(),
        sb.from('ideas').select('title, status, next_action, bpm, key, notes, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(6),
        sb.from('goals').select('title, description, status_indicator, due_by, current, target').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        sb.from('tasks').select('title, description, completed, due_date').or(`user_id_assigned_by.eq.${user.id},user_id_assigned_to.eq.${user.id}`).order('updated_at', { ascending: false }).limit(5),
        sb.from('reports').select('title, report_date, report_content').eq('user_id', user.id).order('report_date', { ascending: false }).limit(3),
      ]);

      const profile = profileRes.data;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        profile?.full_name ||
        (meta.full_name as string | undefined) ||
        (meta.name as string | undefined) ||
        user.email?.split('@')[0] ||
        'the artist';

      let block = `ARTIST PROFILE:\n- Name: ${name}\n- Email: ${user.email ?? ''}\n- Role: ${profile?.role ?? 'artist'}\n`;

      const ideas = ideasRes.data ?? [];
      if (ideas.length > 0) {
        block += `\nRECENT IDEAS:\n`;
        for (const idea of ideas) {
          const ideaMeta = [idea.status, idea.next_action, idea.bpm ? `${idea.bpm} BPM` : null, idea.key].filter(Boolean).join(', ');
          block += `- ${idea.title}${ideaMeta ? ` (${ideaMeta})` : ''}${idea.notes ? `: ${compactText(idea.notes, 80)}` : ''}\n`;
        }
      }

      const goals = goalsRes.data ?? [];
      if (goals.length > 0) {
        block += `\nACTIVE GOALS:\n`;
        for (const g of goals) {
          const goalMeta = [g.status_indicator, g.due_by ? `due ${g.due_by}` : null, g.target ? `${g.current ?? 0}/${g.target}` : null].filter(Boolean).join(', ');
          block += `- ${g.title}${g.description ? `: ${compactText(g.description, 80)}` : ''}${goalMeta ? ` (${goalMeta})` : ''}\n`;
        }
      }

      const tasks = tasksRes.data ?? [];
      if (tasks.length > 0) {
        block += `\nRECENT TASKS:\n`;
        for (const t of tasks) {
          block += `- ${t.title} (${t.completed ?? 'pending'}${t.due_date ? `, due ${t.due_date}` : ''})${t.description ? `: ${compactText(t.description, 80)}` : ''}\n`;
        }
      }

      const reports = reportsRes.data ?? [];
      if (reports.length > 0) {
        block += `\nLATEST REPORTS:\n`;
        for (const report of reports) {
          block += `- ${report.title}${report.report_date ? ` (${report.report_date})` : ''}${report.report_content ? `: ${compactText(report.report_content, 80)}` : ''}\n`;
        }
      }

      block += '\n';
      sections.unshift(block.slice(0, BUDGET_PROFILE));
      charBudget -= Math.min(block.length, BUDGET_PROFILE);
      sources.unshift('profile');
    } catch (e) { console.warn('[coach/context] profile skipped:', (e as Error).message); }

    // 1. Current-schema relevance scan across ideas, goals, tasks, and knowledge
    try {
      const [ideaMatchesRes, goalMatchesRes, taskMatchesRes, resourceMatchesRes] = await Promise.all([
        sb.from('ideas').select('title, status, next_action, notes').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12),
        sb.from('goals').select('title, description, status_indicator, due_by').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(10),
        sb.from('tasks').select('title, description, completed, due_date').or(`user_id_assigned_by.eq.${user.id},user_id_assigned_to.eq.${user.id}`).order('updated_at', { ascending: false }).limit(12),
        sb.from('bot_resources').select('title, category, content_excerpt, content').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(8),
      ]);

      const grouped: Record<string, string[]> = {};
      const appendMatch = (type: string, title: unknown, snippet: unknown) => {
        const safeTitle = String(title ?? '').trim();
        if (!safeTitle) return;
        grouped[type] = grouped[type] ?? [];
        grouped[type].push(compactText(snippet) ? `- ${safeTitle}: ${compactText(snippet)}` : `- ${safeTitle}`);
      };

      for (const idea of ideaMatchesRes.data ?? []) {
        if (matchesQuestion(idea.title, idea.notes, idea.status, idea.next_action)) {
          appendMatch('idea', idea.title, [idea.status, idea.next_action, idea.notes].filter(Boolean).join(' · '));
        }
      }

      for (const goal of goalMatchesRes.data ?? []) {
        if (matchesQuestion(goal.title, goal.description, goal.status_indicator, goal.due_by)) {
          appendMatch('goal', goal.title, [goal.status_indicator, goal.due_by, goal.description].filter(Boolean).join(' · '));
        }
      }

      for (const task of taskMatchesRes.data ?? []) {
        if (matchesQuestion(task.title, task.description, task.completed, task.due_date)) {
          appendMatch('task', task.title, [task.completed, task.due_date, task.description].filter(Boolean).join(' · '));
        }
      }

      for (const resource of resourceMatchesRes.data ?? []) {
        if (matchesQuestion(resource.title, resource.category, resource.content_excerpt, resource.content)) {
          appendMatch('resource', resource.title ?? resource.category ?? 'Knowledge resource', [resource.category, resource.content_excerpt ?? resource.content].filter(Boolean).join(' · '));
        }
      }

      if (Object.keys(grouped).length > 0) {
        let block = '';
        for (const [type, items] of Object.entries(grouped)) {
          block += `${type.toUpperCase()}S:\n${items.slice(0, 3).join('\n')}\n\n`;
          sources.push(type);
        }
        const allowed = Math.max(0, charBudget - BUDGET_ANALYTICS - BUDGET_CALENDAR);
        sections.push(block.slice(0, allowed));
        charBudget -= Math.min(block.length, allowed);
      }
    } catch (e) {
      console.warn('[coach/context] relevance scan skipped:', (e as Error).message);
    }

    // 2. Recent reports
    if (charBudget > 100) {
      try {
        const { data: reports } = await sb
          .from('reports')
          .select('title, report_date, report_content')
          .eq('user_id', user.id)
          .order('report_date', { ascending: false })
          .limit(2);
        if (reports && reports.length > 0) {
          const lines = reports.map((report) => `- ${report.title}${report.report_date ? ` (${report.report_date})` : ''}${report.report_content ? `: ${compactText(report.report_content, 120)}` : ''}`);
          const block = `REPORT SUMMARIES:\n${lines.join('\n')}\n\n`;
          sections.push(block.slice(0, BUDGET_ANALYTICS));
          charBudget -= Math.min(block.length, BUDGET_ANALYTICS);
          sources.push('reports');
        }
      } catch (e) { console.warn('[coach/context] reports skipped:', (e as Error).message); }
    }

    // 3. Upcoming calendar
    if (charBudget > 100) {
      const nowIso = new Date().toISOString();
      try {
        const { data: upcoming } = await sb
          .from('calendar_events')
          .select('title, event_type, starts_at, ends_at, description')
          .eq('user_id', user.id)
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(5);
        const calLines: string[] = [];
        for (const event of upcoming ?? []) {
          calLines.push(`- ${event.title} (${event.event_type}, ${event.starts_at})${event.description ? `: ${compactText(event.description, 60)}` : ''}`);
        }
        if (calLines.length > 0) {
          const block = `UPCOMING CALENDAR:\n${calLines.join('\n')}\n\n`;
          sections.push(block.slice(0, BUDGET_CALENDAR));
          charBudget -= Math.min(block.length, BUDGET_CALENDAR);
          sources.push('calendar');
        }
      } catch (e) { console.warn('[coach/context] calendar skipped:', (e as Error).message); }
    }

    // 4. Entity-pinned lookups
    const safeIds = Array.isArray(entityIds) ? (entityIds as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 3) : [];
    if (safeIds.length > 0 && charBudget > 100) {
      try {
        const [pinnedIdeasRes, pinnedGoalsRes, pinnedTasksRes] = await Promise.all([
          sb.from('ideas').select('title, status, next_action, notes').eq('user_id', user.id).in('id', safeIds),
          sb.from('goals').select('title, status_indicator, due_by, description').eq('user_id', user.id).in('id', safeIds),
          sb.from('tasks').select('id, title, completed, due_date, description').or(`user_id_assigned_by.eq.${user.id},user_id_assigned_to.eq.${user.id}`).in('id', safeIds),
        ]);
        const lines = [
          ...(pinnedIdeasRes.data ?? []).map((idea) => `- Idea: ${idea.title}${idea.status ? ` (${idea.status})` : ''}${idea.next_action ? ` · ${idea.next_action}` : ''}${idea.notes ? `: ${compactText(idea.notes, 80)}` : ''}`),
          ...(pinnedGoalsRes.data ?? []).map((goal) => `- Goal: ${goal.title}${goal.status_indicator ? ` (${goal.status_indicator})` : ''}${goal.due_by ? ` · due ${goal.due_by}` : ''}${goal.description ? `: ${compactText(goal.description, 80)}` : ''}`),
          ...(pinnedTasksRes.data ?? []).map((task) => `- Task: ${task.title}${task.completed ? ` (${task.completed})` : ''}${task.due_date ? ` · due ${task.due_date}` : ''}${task.description ? `: ${compactText(task.description, 80)}` : ''}`),
        ];
        if (lines.length > 0) {
          sections.unshift(`PINNED RECORDS:\n${lines.join('\n')}\n\n`);
          sources.unshift('pinned_records');
        }
      } catch (e) { console.warn('[coach/context] entity pinning skipped:', (e as Error).message); }
    }

    let context = sections.join('');
    if (context.length > BUDGET_TOTAL) {
      context = context.slice(0, BUDGET_TOTAL) + '\n[context trimmed — token budget reached]';
    }

    // Log types used — never log content
    console.log(`[coach/context] uid=${user.id.slice(0, 8)}… page="${page}" sources=[${[...new Set(sources)].join(',')}] chars=${context.length} ms=${Date.now() - t0}`);

    return res.json({ context, sources: [...new Set(sources)] });
  });

  app.post('/api/coach/chat', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
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
      `The USER DATA section below contains the artist's name, releases, goals, tasks, and other personal data. ` +
      `Always address them by their first name. Use their actual releases, goals, and tasks to give specific, personalised advice. ` +
      `Be concise, cite their data when relevant, use Markdown for structure.\n\n` +
      `USER DATA:\n${trimContext(contextText ?? '')}\n${summaryBlock}`;

    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });

      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          ...cleanMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
        temperature: 0.7,
      });

      const text = response.choices[0]?.message?.content ?? "I couldn't process that — please try again.";
      console.log(`[coach/chat] ok — ${cleanMessages.length} messages, ~${systemInstruction.length} sys chars`);
      res.json({ text });
    } catch (err: any) {
      console.error('[coach/chat] OpenAI error:', err.message);
      res.status(500).json({ error: 'AI service error. Please try again.' });
    }
  });

  app.post('/api/coach/summarize', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }

    const { transcript } = req.body as { transcript?: string };
    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });

      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Summarize this coaching conversation in 3–4 sentences. Capture: the main topics discussed, any key decisions or action items, and the artist's current focus. Be concise and write in third-person. Do not use bullet points.\n\n${transcript.slice(0, 12000)}`,
        }],
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content?.trim() ?? null;
      res.json({ summary });
    } catch (err: any) {
      console.error('[coach/summarize] OpenAI error:', err.message);
      res.status(500).json({ error: 'Summarization failed' });
    }
  });

  // ── Global Assistant chat ──────────────────────────────────────────────────
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { message, pageContext } = req.body as { message?: string; pageContext?: string };
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const systemPrompt = `You are an AI assistant embedded in an artist management app called Artist OS.
The user is currently on the "${String(pageContext ?? 'dashboard')}" page.
Today is ${new Date().toDateString()}.
Parse the user's message and respond with a JSON object:
{"reply":"a short natural-language confirmation (1-2 sentences)","actions":[{"type":"create_task|create_calendar_event|open_content_scheduler|navigate","label":"human-readable label","payload":{"title":"...","startsAt":"ISO string","to":"/path"},"requiresConfirmation":true}]}
Available action types: create_task, create_calendar_event, open_content_scheduler, navigate (/dashboard /releases /calendar /tasks /goals /analytics /content /coach /strategy /network).
If nothing actionable, set actions to []. Always respond with valid JSON only — no markdown, no extra text.`;
      const result = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(message).slice(0, 4000) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      const raw = result.choices[0]?.message?.content?.trim() ?? '{}';
      let parsed: { reply?: string; actions?: unknown[] } = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw }; }
      res.json({ reply: parsed.reply ?? 'Done.', actions: parsed.actions ?? [] });
    } catch (err: any) {
      console.error('[assistant/chat] OpenAI error:', err.message);
      res.status(500).json({ error: 'AI service error. Please try again.' });
    }
  });

  // ── AI engine — artist state analysis ─────────────────────────────────────
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
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
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const prompt = `Analyze the current state of an independent artist and generate a strategic game plan.
Releases: ${JSON.stringify(safeReleases)}
Content: ${JSON.stringify(safeContent)}
Goals: ${JSON.stringify(safeGoals)}
Todos: ${JSON.stringify(safeTodos)}
Current Date: ${new Date().toISOString()}
Tasks: 1) Select the Focus Track needing most attention. 2) Rationale. 3) Generate momentum/warning/opportunity/insight Signals. 4) Generate 3-5 Daily Tasks. Be specific and data-driven.
Respond with valid JSON matching exactly: {"focusTrackId":"string","focusRationale":"string","signals":[{"type":"momentum|warning|opportunity|insight","title":"string","description":"string","action":"string","impact":"string","category":"string"}],"dailyTasks":[{"task":"string","reason":"string","priority":"high|medium|low","category":"string"}]}`;
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      const result = JSON.parse(response.choices[0]?.message?.content ?? '{}');
      cacheSet(cacheKey, result, 5 * 60_000); // cache 5 min
      res.json(result);
    } catch (err: any) {
      console.error('[ai/analyze] OpenAI error:', err.message);
      res.status(500).json({ error: 'AI analysis failed.' });
    }
  });

  // ── Email draft generation ─────────────────────────────────────────────────
  app.post('/api/email/draft', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
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
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });
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
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const raw = response.choices[0]?.message?.content ?? '{}';
      res.json(JSON.parse(raw));
    } catch (err: any) {
      console.error('[email/draft] OpenAI error:', err.message);
      res.status(500).json({ error: 'Email draft generation failed.' });
    }
  });

  // ── Weekly report executive summary ───────────────────────────────────────
  app.post('/api/report/summary', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured on server.' });
    }
    const { sections, artistName, start, end } = req.body as {
      sections?: unknown[]; artistName?: string; start?: string; end?: string;
    };
    if (!sections?.length) return res.json({ summary: null });
    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const digest = (sections as any[]).map((s) => ({
        section: s.title,
        stats: s.stats,
        items: (s.items ?? []).slice(0, 3).map((i: any) => `${i.status === 'positive' ? '✓' : i.status === 'negative' ? '✗' : '·'} ${i.text}`),
      }));
      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `You are writing a 2-3 sentence executive summary for ${String(artistName ?? 'the artist')}'s weekly artist report.\nPeriod: ${start ?? ''} – ${end ?? ''}\nData: ${JSON.stringify(digest)}\nBe direct, specific, and action-oriented. Avoid fluff. Focus on the most impactful insight.` }],
      });
      res.json({ summary: response.choices[0]?.message?.content?.trim() ?? null });
    } catch (err: any) {
      console.error('[report/summary] OpenAI error:', err.message);
      res.status(500).json({ error: 'Summary generation failed.' });
    }
  });

  // ── Goals AI analysis ──────────────────────────────────────────────────────
  // Single Gemini call returns both per-goal statuses and a strategic insight.
  // (Previously two sequential calls — halves token round-trips and latency.)
  app.post('/api/goals/analyze', async (req: Request, res: Response) => {
    if (!OPENAI_API_KEY) {
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
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: OPENAI_API_KEY });
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

      const response = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      let result: { statuses?: Record<string, unknown>; analysis?: string } = {};
      try { result = JSON.parse(response.choices[0]?.message?.content ?? '{}'); } catch { /* ignore */ }

      const payload = {
        statuses: result.statuses ?? {},
        analysis: result.analysis ?? 'Keep pushing towards your targets!',
      };
      cacheSet(cacheKey, payload, 10 * 60_000); // cache 10 min
      res.json(payload);
    } catch (err: any) {
      console.error('[goals/analyze] OpenAI error:', err.message);
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

  // Start the integration scheduler lazily
  setTimeout(async () => {
    try {
      const { default: cron } = await import('node-cron');
      await runIntegrationProviderPulls('startup');
      cron.schedule('*/15 * * * *', () => {
        void runIntegrationProviderPulls('poll');
      });
      console.log('Integration API scheduler initialized.');
    } catch (err) {
      console.error('Failed to initialize integration API scheduler:', err);
    }
  }, 7000);

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
        envFile: false,
        server: { middlewareMode: true, hmr: { server: httpServer } },
        appType: "custom",
        define: buildViteDefineEnv(process.env.NODE_ENV, process.cwd()),
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
