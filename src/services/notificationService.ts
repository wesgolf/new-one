export async function sendTestSms(params: { to: string; body?: string }): Promise<{ sent: boolean; sid?: string; message: string }> {
  const res = await fetch('/api/notifications/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<{ sent: boolean; sid?: string; message: string }>;
}

