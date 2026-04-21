import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
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

  // Health check endpoint for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  // ── Zernio Router ──────────────────────────────────────────────────────────
  // Mounted at /api/zernio so req.path inside is already relative (no prefix).
  // Specific routes are registered first; the catch-all GET proxy handles everything else.
  // Using express.Router() guarantees all sub-paths are handled — unlike app.get('/*')
  // which does not match multi-segment paths reliably in Express 4.
  const zernioRouter = express.Router();

  zernioRouter.get('/config-check', (req, res) => {
    res.json({
      hasKey: !!ZERNIO_API_KEY,
      keyPrefix: ZERNIO_API_KEY ? ZERNIO_API_KEY.substring(0, 3) : null,
      baseUrl: ZERNIO_API_BASE,
    });
  });

  zernioRouter.post('/posts', async (req, res) => {
    try {
      const response = await axios.post(`${ZERNIO_API_BASE}/posts`, req.body, {
        headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, 'Content-Type': 'application/json' },
      });
      res.json(response.data);
    } catch (err: any) {
      console.error('Zernio create post failed:', err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: 'Failed to create Zernio post' });
    }
  });

  zernioRouter.post('/schedule', async (req, res) => {
    try {
      const response = await axios.post(`${ZERNIO_API_BASE}/schedule`, req.body, {
        headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, 'Content-Type': 'application/json' },
      });
      res.json(response.data);
    } catch (err: any) {
      console.error('Zernio schedule post failed:', err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: 'Failed to schedule Zernio post' });
    }
  });

  // Catch-all GET proxy — no path argument so router.use matches EVERY remaining path
  // including multi-segment ones (/accounts/follower-stats, /analytics/daily-metrics, etc.)
  zernioRouter.use(async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    if (!ZERNIO_API_KEY) {
      return res.status(401).json({ error: 'ZERNIO_API_KEY is not configured.' });
    }
    const upstreamPath = req.path; // already stripped of /api/zernio prefix by router mount
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${ZERNIO_API_BASE}${upstreamPath}${query ? '?' + query : ''}`;
    console.log(`[zernio proxy] GET ${url}`);
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, Accept: 'application/json' },
      });
      res.json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      console.error(`[zernio proxy] ${url} → ${status}`, data);
      res.status(status).json({ error: 'Zernio proxy error', details: data });
    }
  });

  app.use('/api/zernio', zernioRouter);

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
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server: httpServer } },
        appType: "spa",
      });
      app.use(vite.middlewares);
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
