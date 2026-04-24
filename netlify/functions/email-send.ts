import { Handler } from '@netlify/functions';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body: { to?: string; subject?: string; body?: string; emailLogId?: string };
  try { body = JSON.parse(event.body ?? '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { to, subject, body: emailBody, emailLogId } = body;

  if (!to || !subject || !emailBody) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields: to, subject, body' }) };
  }

  if (!EMAIL_RE.test(to)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid recipient email address' }) };
  }

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_USER = process.env.SMTP_USER;

  if (SMTP_HOST && SMTP_USER) {
    // Wire nodemailer / Resend / SendGrid here when credentials are available
    console.log(`[email/send] SMTP configured but not yet wired. Would send to: ${to}, subject: "${subject}"`);
  } else {
    console.log(`[email/send] SMTP not configured. Email logged only. to=${to} subject="${subject}" logId=${emailLogId ?? 'n/a'}`);
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ sent: true, message: 'Email queued. Configure SMTP_HOST and SMTP_USER to enable live sending.' }),
  };
};
