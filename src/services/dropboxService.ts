/**
 * dropboxService — Upload audio files to Dropbox and return public raw URLs.
 *
 * Requires VITE_DROPBOX_ACCESS_TOKEN in .env.
 * Get one from: https://www.dropbox.com/developers/apps
 *   → Create app → Permissions: files.content.write + sharing.write → Generate access token
 *
 * NOTE: This token is bundled into the client build (VITE_ prefix).
 * Suitable for a single-artist personal app. For multi-tenant, proxy
 * the upload through a server-side function to protect the token.
 */

const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';

/** True when VITE_DROPBOX_ACCESS_TOKEN is present. */
export const dropboxConfigured = () =>
  !!(import.meta.env.VITE_DROPBOX_ACCESS_TOKEN as string | undefined);

function getToken(): string {
  return (import.meta.env.VITE_DROPBOX_ACCESS_TOKEN as string) ?? '';
}

/** Convert a Dropbox shared link (dl=0) to a direct-playback URL (raw=1). */
function toRawUrl(sharedUrl: string): string {
  return sharedUrl
    .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    .replace('?dl=0', '?raw=1')
    .replace('?dl=1', '?raw=1');
}

export interface DropboxUploadResult {
  /** Direct URL suitable for <audio src> and Supabase idea_assets.file_url */
  url: string;
  /** Full Dropbox path, e.g. /Artist OS/Ideas/abc123/vocal.wav */
  path: string;
  /** Dropbox shared link (human-friendly) */
  sharedLink: string;
}

/**
 * Upload an audio file to /Artist OS/Ideas/{ideaId}/{filename} in Dropbox,
 * create a shared link, and return a direct playback URL.
 */
export async function uploadAudioToDropbox(
  file: File,
  ideaId: string,
): Promise<DropboxUploadResult> {
  if (!dropboxConfigured()) {
    throw new Error(
      'Dropbox is not configured. Add VITE_DROPBOX_ACCESS_TOKEN to your .env file.\n' +
        'Get a token at: https://www.dropbox.com/developers/apps',
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `/Artist OS/Ideas/${ideaId}/${safeName}`;
  const apiArg = { path, mode: 'add', autorename: true, mute: false };

  console.group('[Dropbox] uploadAudioToDropbox');
  console.log('File name:', file.name);
  console.log('File size (bytes):', file.size);
  console.log('File type:', file.type);
  console.log('Target path:', path);
  console.log('Token present:', !!getToken(), '| first 8 chars:', getToken().slice(0, 8));
  console.log('Dropbox-API-Arg:', JSON.stringify(apiArg));

  // ── 1. Upload file ─────────────────────────────────────────────────────────
  const uploadRes = await fetch(`${DROPBOX_CONTENT_API}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify(apiArg),
    },
    body: file,
  });

  console.log('[Dropbox] Upload response status:', uploadRes.status, uploadRes.statusText);

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '(could not read body)');
    console.error('[Dropbox] Upload error body:', errText);
    console.groupEnd();
    let errSummary = `Dropbox upload failed (${uploadRes.status}): ${uploadRes.statusText}`;
    try { errSummary = JSON.parse(errText)?.error_summary ?? errSummary; } catch {}
    throw new Error(errSummary);
  }

  const uploadData = await uploadRes.json();
  console.log('[Dropbox] Upload success:', uploadData);
  const uploadedPath: string = uploadData.path_display as string;

  // ── 2. Create shared link ──────────────────────────────────────────────────
  console.log('[Dropbox] Creating shared link for path:', uploadedPath);
  const linkRes = await fetch(`${DROPBOX_API}/sharing/create_shared_link_with_settings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: uploadedPath,
      settings: { requested_visibility: { '.tag': 'public' } },
    }),
  });

  console.log('[Dropbox] Shared link response status:', linkRes.status, linkRes.statusText);

  // 409 = shared link already exists — extract existing URL from error body
  if (linkRes.status === 409) {
    const conflict = await linkRes.json().catch(() => ({}));
    console.log('[Dropbox] Shared link conflict (already exists):', conflict);
    const existingUrl: string =
      conflict?.error?.shared_link_already_exists?.metadata?.url ?? '';
    console.log('[Dropbox] Existing shared link URL:', existingUrl);
    console.log('[Dropbox] Raw playback URL:', toRawUrl(existingUrl));
    console.groupEnd();
    return {
      url: toRawUrl(existingUrl),
      path: uploadedPath,
      sharedLink: existingUrl,
    };
  }

  if (!linkRes.ok) {
    const errText = await linkRes.text().catch(() => '(could not read body)');
    console.error('[Dropbox] Shared link error body:', errText);
    console.groupEnd();
    let errSummary = `Failed to create Dropbox shared link: ${linkRes.statusText}`;
    try { errSummary = JSON.parse(errText)?.error_summary ?? errSummary; } catch {}
    throw new Error(errSummary);
  }

  const linkData = await linkRes.json();
  const sharedLink: string = linkData.url as string;
  console.log('[Dropbox] Shared link created:', sharedLink);
  console.log('[Dropbox] Raw playback URL:', toRawUrl(sharedLink));
  console.groupEnd();

  return {
    url: toRawUrl(sharedLink),
    path: uploadedPath,
    sharedLink,
  };
}

/**
 * Delete a file at the given Dropbox path (used when an idea is deleted).
 * Silently ignores 409 (path not found) errors.
 */
export async function deleteDropboxFile(path: string): Promise<void> {
  if (!dropboxConfigured()) return;
  await fetch(`${DROPBOX_API}/files/delete_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });
}
