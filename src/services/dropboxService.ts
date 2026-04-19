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

  // ── 1. Upload file ─────────────────────────────────────────────────────────
  const uploadRes = await fetch(`${DROPBOX_CONTENT_API}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true, // avoids conflicts if file already exists
        mute: false,
      }),
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(
      err?.error_summary ?? `Dropbox upload failed (${uploadRes.status}): ${uploadRes.statusText}`,
    );
  }

  const uploadData = await uploadRes.json();
  const uploadedPath: string = uploadData.path_display as string;

  // ── 2. Create shared link ──────────────────────────────────────────────────
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

  // 409 = shared link already exists — extract existing URL from error body
  if (linkRes.status === 409) {
    const conflict = await linkRes.json().catch(() => ({}));
    const existingUrl: string =
      conflict?.error?.shared_link_already_exists?.metadata?.url ?? '';
    return {
      url: toRawUrl(existingUrl),
      path: uploadedPath,
      sharedLink: existingUrl,
    };
  }

  if (!linkRes.ok) {
    const err = await linkRes.json().catch(() => ({}));
    throw new Error(
      err?.error_summary ?? `Failed to create Dropbox shared link: ${linkRes.statusText}`,
    );
  }

  const linkData = await linkRes.json();
  const sharedLink: string = linkData.url as string;

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
