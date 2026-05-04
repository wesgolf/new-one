/**
 * Dropbox uploads are proxied through the local server so the browser does not
 * need to hold a long-lived access token. The server can refresh Dropbox
 * credentials when a refresh token is configured.
 */

export interface DropboxUploadResult {
  url: string;
  path: string;
  sharedLink: string;
}

type DropboxServiceError = Error & { status?: number };

function dropboxError(message: string, status?: number): DropboxServiceError {
  return Object.assign(new Error(message), status ? { status } : {});
}

function isConfiguredFlag(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** True when the app has enough Dropbox config to attempt the server-side flow. */
export const dropboxConfigured = () =>
  isConfiguredFlag(import.meta.env.VITE_DROPBOX_API_KEY) ||
  isConfiguredFlag(import.meta.env.VITE_DROPBOX_ACCESS_TOKEN) ||
  isConfiguredFlag(import.meta.env.VITE_DROPBOX_REFRESH_TOKEN);

async function parseDropboxError(response: Response, fallback: string): Promise<DropboxServiceError> {
  const text = await response.text().catch(() => '');

  try {
    const payload = JSON.parse(text) as {
      error?: string;
      message?: string;
      error_summary?: string;
    };
    const message = payload.message || payload.error || payload.error_summary || fallback;
    return dropboxError(message, response.status);
  } catch {
    return dropboxError(text || fallback, response.status);
  }
}

export async function uploadAudioToDropbox(
  file: File,
  ideaId: string,
): Promise<DropboxUploadResult> {
  if (!dropboxConfigured()) {
    throw dropboxError(
      'Dropbox is not configured. Add Dropbox app credentials and a refresh token or valid access token.',
    );
  }

  const response = await fetch(`/api/dropbox/upload?ideaId=${encodeURIComponent(ideaId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  });

  if (!response.ok) {
    throw await parseDropboxError(response, `Dropbox upload failed (${response.status})`);
  }

  return response.json() as Promise<DropboxUploadResult>;
}

export async function deleteDropboxFile(path: string): Promise<void> {
  if (!dropboxConfigured()) return;

  const response = await fetch('/api/dropbox/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    throw await parseDropboxError(response, `Dropbox delete failed (${response.status})`);
  }
}

export function shouldFallbackFromDropbox(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401 || status === 403 || status === 429) return false;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? '').toLowerCase();
  if (message.includes('expired_access_token')) return false;
  if (message.includes('refresh token')) return false;
  if (message.includes('dropbox is not configured')) return false;

  return false;
}
