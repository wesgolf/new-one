import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import path from 'path';
import axios from 'axios';
import cron from 'node-cron';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

type SyncStatus = 'queued' | 'running' | 'success' | 'failed';
type ProviderName = 'zernio' | 'spotify' | 'soundcloud' | 'youtube';

interface SyncJobRecord {
  id: string;
  provider: ProviderName | string;
  job_type: string;
  status: SyncStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

const inMemoryJobs: SyncJobRecord[] = [];
const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

function getServerSupabase(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_ANON ||
    process.env.VITE_SUPABASE_PK;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function jobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createSyncJob(
  supabaseAdmin: SupabaseClient | null,
  provider: ProviderName,
  jobType: string,
  metadata: Record<string, any> = {}
): Promise<SyncJobRecord> {
  const startedAt = new Date().toISOString();
  const payload: SyncJobRecord = {
    id: jobId(),
    provider,
    job_type: jobType,
    status: 'running',
    started_at: startedAt,
    metadata,
    created_at: startedAt,
  };

  if (!supabaseAdmin) {
    inMemoryJobs.unshift(payload);
    return payload;
  }

  const { data, error } = await supabaseAdmin
    .from('sync_jobs')
    .insert([
      {
        provider,
        job_type: jobType,
        status: 'running',
        started_at: startedAt,
        metadata,
      },
    ])
    .select()
    .single();

  if (error) {
    console.warn('Failed to persist sync job, using memory fallback:', error.message);
    inMemoryJobs.unshift(payload);
    return payload;
  }

  return {
    ...(data as any),
    metadata: (data as any).metadata || metadata,
  } as SyncJobRecord;
}

async function finishSyncJob(
  supabaseAdmin: SupabaseClient | null,
  job: SyncJobRecord,
  status: Exclude<SyncStatus, 'queued' | 'running'>,
  errorMessage?: string | null,
  metadata?: Record<string, any>
) {
  const completedAt = new Date().toISOString();

  if (!supabaseAdmin) {
    const index = inMemoryJobs.findIndex((item) => item.id === job.id);
    const next = {
      ...job,
      status,
      completed_at: completedAt,
      error_message: errorMessage || null,
      metadata: metadata || job.metadata,
    };
    if (index >= 0) inMemoryJobs[index] = next;
    return next;
  }

  const { data, error } = await supabaseAdmin
    .from('sync_jobs')
    .update({
      status,
      completed_at: completedAt,
      error_message: errorMessage || null,
      metadata: metadata || job.metadata || {},
    })
    .eq('id', job.id)
    .select()
    .single();

  if (error) {
    console.warn('Failed to finalize sync job:', error.message);
    return {
      ...job,
      status,
      completed_at: completedAt,
      error_message: errorMessage || null,
      metadata: metadata || job.metadata,
    };
  }

  return data as SyncJobRecord;
}

async function upsertIntegrationStatus(
  supabaseAdmin: SupabaseClient | null,
  provider: ProviderName,
  patch: Record<string, any>
) {
  if (!supabaseAdmin) return null;

  const { data: existing } = await supabaseAdmin
    .from('integration_accounts')
    .select('*')
    .eq('provider', provider)
    .limit(1)
    .maybeSingle();

  const payload = {
    ...(existing || {}),
    provider,
    updated_at: new Date().toISOString(),
    ...patch,
  };

  const { error } = await supabaseAdmin
    .from('integration_accounts')
    .upsert([payload], { onConflict: 'provider,user_id' });

  if (error) {
    console.warn(`Failed to upsert integration account for ${provider}:`, error.message);
  }
}

async function refreshProviderToken(provider: ProviderName, account: any) {
  if (!account?.refresh_token) return account;

  if (provider === 'soundcloud') {
    const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
    const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return account;

    try {
      const response = await axios.post(
        'https://secure.soundcloud.com/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return {
        ...account,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || account.refresh_token,
        token_expires_at: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000).toISOString()
          : account.token_expires_at,
      };
    } catch (error) {
      console.warn('SoundCloud refresh token flow failed');
      return account;
    }
  }

  return account;
}

async function runProviderSync(
  supabaseAdmin: SupabaseClient | null,
  provider: ProviderName,
  jobType: string,
  metadata: Record<string, any> = {}
) {
  const job = await createSyncJob(supabaseAdmin, provider, jobType, metadata);

  try {
    if (provider === 'zernio') {
      const apiKey =
        process.env.ZERNIO_API_KEY ||
        process.env.VITE_ZERNIO_API_KEY ||
        process.env.VITE_ZERNIO_KEY;

      if (!apiKey) {
        throw new Error('Zernio is not configured');
      }

      const [accounts, posts, analytics] = await Promise.all([
        axios.get(`${ZERNIO_API_BASE}/accounts`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        }),
        axios.get(`${ZERNIO_API_BASE}/posts`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        }),
        axios.get(`${ZERNIO_API_BASE}/analytics`, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        }),
      ]);

      const syncMetadata = {
        accountCount: Array.isArray(accounts.data) ? accounts.data.length : (accounts.data?.accounts || []).length,
        postCount: Array.isArray(posts.data) ? posts.data.length : (posts.data?.posts || []).length,
        analyticsKeys: Object.keys(analytics.data || {}),
      };

      await upsertIntegrationStatus(supabaseAdmin, provider, {
        connection_status: 'connected',
        last_synced_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_error: null,
        metadata: syncMetadata,
      });

      return await finishSyncJob(supabaseAdmin, job, 'success', null, {
        ...metadata,
        ...syncMetadata,
      });
    }

    const { data: account } = supabaseAdmin
      ? await supabaseAdmin.from('integration_accounts').select('*').eq('provider', provider).limit(1).maybeSingle()
      : ({ data: null } as any);

    const hydratedAccount = await refreshProviderToken(provider, account);
    const connected = Boolean(hydratedAccount?.access_token || hydratedAccount?.refresh_token);

    await upsertIntegrationStatus(supabaseAdmin, provider, {
      connection_status: connected ? 'connected' : 'pending',
      access_token: hydratedAccount?.access_token ?? null,
      refresh_token: hydratedAccount?.refresh_token ?? null,
      token_expires_at: hydratedAccount?.token_expires_at ?? null,
      last_synced_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_error: null,
      metadata: {
        cadence: provider === 'spotify' ? 'daily' : 'daily',
      },
    });

    return await finishSyncJob(supabaseAdmin, job, 'success', null, {
      ...metadata,
      connected,
      cadence: provider === 'spotify' ? 'daily' : 'daily',
    });
  } catch (error: any) {
    await upsertIntegrationStatus(supabaseAdmin, provider, {
      connection_status: 'error',
      last_sync_status: 'failed',
      last_error: error.message,
      updated_at: new Date().toISOString(),
    });

    return await finishSyncJob(supabaseAdmin, job, 'failed', error.message, metadata);
  }
}

function registerScheduledSyncs(supabaseAdmin: SupabaseClient | null) {
  cron.schedule('0 * * * *', () => {
    runProviderSync(supabaseAdmin, 'zernio', 'scheduled', { cadence: 'hourly' }).catch(() => null);
  });

  cron.schedule('15 3 * * *', () => {
    runProviderSync(supabaseAdmin, 'spotify', 'scheduled', { cadence: 'daily' }).catch(() => null);
    runProviderSync(supabaseAdmin, 'soundcloud', 'scheduled', { cadence: 'daily' }).catch(() => null);
    runProviderSync(supabaseAdmin, 'youtube', 'scheduled', { cadence: 'daily' }).catch(() => null);
  });
}

function buildAppUrl(req: express.Request) {
  return (
    process.env.APP_URL ||
    `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`
  );
}

function buildDraftFallback(intent: string, contactName: string, context?: string) {
  const subjectMap: Record<string, string> = {
    'venue pitch': `Booking Inquiry for ${contactName}`,
    'follow-up': `Following up with ${contactName}`,
    'playlist pitch': `Playlist Consideration for New Release`,
    'general outreach': `Connecting with ${contactName}`,
  };

  return {
    subject: subjectMap[intent] || `Message for ${contactName}`,
    body: [
      `Hi ${contactName},`,
      '',
      `I’m reaching out regarding ${intent}.`,
      context ? `${context}` : 'I’d love to share what I am working on and see whether there is a fit to collaborate.',
      '',
      'Best,',
      'WES',
    ].join('\n'),
  };
}

async function startServer() {
  const supabaseAdmin = getServerSupabase();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
  const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/sync/status', async (_req, res) => {
    if (!supabaseAdmin) {
      return res.json({
        integrations: [],
        recentJobs: inMemoryJobs.slice(0, 10),
      });
    }

    const [integrationsRes, jobsRes] = await Promise.all([
      supabaseAdmin.from('integration_accounts').select('*').order('updated_at', { ascending: false }),
      supabaseAdmin.from('sync_jobs').select('*').order('created_at', { ascending: false }).limit(12),
    ]);

    res.json({
      integrations: integrationsRes.data || [],
      recentJobs: jobsRes.data || [],
    });
  });

  app.get('/api/sync/jobs', async (req, res) => {
    const limit = Number(req.query.limit || 20);
    if (!supabaseAdmin) {
      return res.json(inMemoryJobs.slice(0, limit));
    }

    const { data, error } = await supabaseAdmin
      .from('sync_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  });

  app.post('/api/sync/run', async (req, res) => {
    const requestedProvider = req.body?.provider as ProviderName | undefined;
    const providerList: ProviderName[] = requestedProvider
      ? [requestedProvider]
      : ['zernio', 'spotify', 'soundcloud', 'youtube'];

    const results = await Promise.all(
      providerList.map((provider) => runProviderSync(supabaseAdmin, provider, 'manual', { source: 'dashboard' }))
    );

    res.json({ success: true, results });
  });

  app.post('/api/outreach/draft', async (req, res) => {
    const { intent, contactName, context } = req.body || {};
    if (!intent || !contactName) {
      return res.status(400).json({ error: 'intent and contactName are required' });
    }

    const fallbackDraft = buildDraftFallback(intent, contactName, context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackDraft);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a concise ${intent} email draft for ${contactName}. Context: ${context || 'No additional context.'} Return plain text with a subject line prefixed by "Subject:".`,
      });

      const text = response.text || '';
      const subjectMatch = text.match(/Subject:\s*(.+)/i);
      const subject = subjectMatch?.[1]?.trim() || fallbackDraft.subject;
      const body = text.replace(/Subject:\s*.+/i, '').trim() || fallbackDraft.body;
      return res.json({ subject, body });
    } catch (error) {
      return res.json(fallbackDraft);
    }
  });

  app.post('/api/outreach/send', async (req, res) => {
    const { contactId, subject, body, createdBy } = req.body || {};
    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }

    if (supabaseAdmin) {
      await supabaseAdmin.from('outreach_emails').insert([
        {
          contact_id: contactId || null,
          subject,
          body,
          status: 'queued',
          created_by: createdBy || null,
        },
      ]);
    }

    res.json({
      success: true,
      message: 'Email logged for backend delivery. Provider send integration is intentionally server-side only.',
    });
  });

  app.get('/api/soundcloud/login', (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID) {
      return res.status(503).json({ error: 'SoundCloud is not configured.' });
    }

    const { code_challenge, state } = req.query;
    const redirectUri = `${buildAppUrl(req).replace(/\/$/, '')}/soundcloud-callback`;
    const authUrl = `https://secure.soundcloud.com/authorize?client_id=${SOUNDCLOUD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&code_challenge=${code_challenge}&code_challenge_method=S256&state=${state}`;
    res.json({ url: authUrl });
  });

  app.post('/api/soundcloud/token', async (req, res) => {
    if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
      return res.status(503).json({ error: 'SoundCloud is not configured.' });
    }

    const { code, code_verifier } = req.body;
    const redirectUri = `${buildAppUrl(req).replace(/\/$/, '')}/soundcloud-callback`;

    try {
      const response = await axios.post(
        'https://secure.soundcloud.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: SOUNDCLOUD_CLIENT_ID,
          client_secret: SOUNDCLOUD_CLIENT_SECRET,
          redirect_uri: redirectUri,
          code_verifier,
          code,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            accept: 'application/json; charset=utf-8',
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error('SoundCloud token exchange failed:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to exchange token' });
    }
  });

  const soundcloudProxy = async (req: express.Request, res: express.Response, endpoint: string) => {
    const authHeader = req.headers.authorization;
    const params = { ...req.query } as Record<string, any>;

    if (!params.client_id && SOUNDCLOUD_CLIENT_ID) {
      params.client_id = SOUNDCLOUD_CLIENT_ID;
    }

    const query = new URLSearchParams(params).toString();
    const fullPath = query ? `${endpoint}?${query}` : endpoint;

    try {
      const response = await axios.get(`https://api.soundcloud.com${fullPath}`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json; charset=utf-8',
          'User-Agent': 'Artist-OS/1.0',
        },
      });

      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      res.status(status).json({
        error: `Failed to fetch ${fullPath}`,
        details: error.response?.data || error.message,
        status,
      });
    }
  };

  app.get('/api/soundcloud/me', (req, res) => soundcloudProxy(req, res, '/me'));
  app.get('/api/soundcloud/me/tracks', (req, res) => soundcloudProxy(req, res, '/me/tracks'));
  app.get('/api/soundcloud/tracks', (req, res) => soundcloudProxy(req, res, '/tracks'));

  app.get(['/soundcloud-callback', '/soundcloud-callback/'], (req, res) => {
    const { code, state, error, error_description } = req.query;
    if (error) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'SOUNDCLOUD_AUTH_ERROR',
                error: ${JSON.stringify(String(error))},
                description: ${JSON.stringify(String(error_description || ''))}
              }, '*');
              window.close();
            </script>
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
              code: ${JSON.stringify(String(code || ''))},
              state: ${JSON.stringify(String(state || ''))}
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  });

  app.get('/api/analytics/latest', async (_req, res) => {
    try {
      const { analyticsStorage } = await import('./src/analytics-collector/storage/db.ts');
      res.json(analyticsStorage.getLatestMetrics());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/analytics/trigger', async (_req, res) => {
    try {
      const { analyticsEngine } = await import('./src/analytics-collector/core/engine.ts');
      await analyticsEngine.runAll();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/zernio/config-check', (_req, res) => {
    const apiKey =
      process.env.ZERNIO_API_KEY ||
      process.env.VITE_ZERNIO_API_KEY ||
      process.env.VITE_ZERNIO_KEY;
    res.json({
      hasKey: Boolean(apiKey),
      keyPrefix: apiKey ? apiKey.slice(0, 3) : null,
      baseUrl: ZERNIO_API_BASE,
    });
  });

  app.get('/api/zernio/accounts', async (_req, res) => {
    const apiKey =
      process.env.ZERNIO_API_KEY ||
      process.env.VITE_ZERNIO_API_KEY ||
      process.env.VITE_ZERNIO_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: 'Zernio is not configured.' });
    }

    try {
      const response = await axios.get(`${ZERNIO_API_BASE}/accounts`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch Zernio accounts',
        details: error.response?.data || error.message,
      });
    }
  });

  registerScheduledSyncs(supabaseAdmin);

  setTimeout(async () => {
    try {
      const { analyticsEngine } = await import('./src/analytics-collector/core/engine.ts');
      analyticsEngine.startScheduler();
      console.log('Analytics scheduler initialized.');
    } catch (error) {
      console.error('Failed to initialize analytics scheduler:', error);
    }
  }, 3000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: process.cwd(),
      envDir: process.cwd(),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
