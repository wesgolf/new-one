import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
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

  // Zernio API Config
  const ZERNIO_API_KEY = process.env.VITE_ZERNIO_KEY || process.env.VITE_ZERNIO_API_KEY || process.env.ZERNIO_API_KEY;
  const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

  // Zernio Proxy Routes
  app.get('/api/zernio/config-check', (req, res) => {
    res.json({
      hasKey: !!ZERNIO_API_KEY,
      keyPrefix: ZERNIO_API_KEY ? ZERNIO_API_KEY.substring(0, 3) : null,
      baseUrl: ZERNIO_API_BASE
    });
  });

  app.get('/api/zernio/accounts', async (req, res) => {
    if (!ZERNIO_API_KEY) {
      return res.status(401).json({ error: 'ZERNIO_API_KEY is not configured in environment variables.' });
    }
    try {
      const response = await axios.get(`${ZERNIO_API_BASE}/accounts`, {
        headers: { 
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      res.status(status).json({ error: 'Failed to fetch Zernio accounts', details: data });
    }
  });

  app.get('/api/zernio/posts', async (req, res) => {
    if (!ZERNIO_API_KEY) {
      return res.status(401).json({ error: 'ZERNIO_API_KEY is not configured in environment variables.' });
    }
    try {
      const response = await axios.get(`${ZERNIO_API_BASE}/posts`, {
        headers: { 
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      res.status(status).json({ error: 'Failed to fetch Zernio posts', details: data });
    }
  });

  app.get('/api/zernio/analytics', async (req, res) => {
    if (!ZERNIO_API_KEY) {
      return res.status(401).json({ error: 'ZERNIO_API_KEY is not configured in environment variables.' });
    }
    try {
      const response = await axios.get(`${ZERNIO_API_BASE}/analytics`, {
        headers: { 
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { message: err.message };
      res.status(status).json({ error: 'Failed to fetch Zernio analytics', details: data });
    }
  });

  app.post('/api/zernio/posts', async (req, res) => {
    try {
      const response = await axios.post(`${ZERNIO_API_BASE}/posts`, req.body, {
        headers: { 
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      console.error('Zernio create post failed:', err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: 'Failed to create Zernio post' });
    }
  });

  app.post('/api/zernio/schedule', async (req, res) => {
    try {
      const response = await axios.post(`${ZERNIO_API_BASE}/schedule`, req.body, {
        headers: { 
          'Authorization': `Bearer ${ZERNIO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      res.json(response.data);
    } catch (err: any) {
      console.error('Zernio schedule post failed:', err.response?.data || err.message);
      res.status(err.response?.status || 500).json({ error: 'Failed to schedule Zernio post' });
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        root: process.cwd(),
        envDir: process.cwd(),
        server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
