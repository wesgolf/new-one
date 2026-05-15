/**
 * Spotify Web API integration using PKCE flow (no backend required)
 */

const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_REAL_CLIENT || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim();
const SPOTIFY_RETURN_PATH_KEY = 'spotify_return_path';

// The Redirect URI must match what is configured in the Spotify Developer Dashboard.
// We support multiple URIs for different environments (Dev vs Pre).
export function getRedirectUri() {
  const location = typeof window !== 'undefined' ? window.location : null;
  const origin = location?.origin ?? '';
  const uri1 = import.meta.env.VITE_SPOTIFY_URI_1;
  const uri2 = import.meta.env.VITE_SPOTIFY_URI_2;
  const uri3 = import.meta.env.VITE_SPOTIFY_URI_3;
  const uriDefault = import.meta.env.VITE_SPOTIFY_URI;

  // If we are in a browser, try to match the current origin to one of the provided URIs
  if (origin) {
    if (uri1 && uri1.includes(origin)) return uri1.trim();
    if (uri2 && uri2.includes(origin)) return uri2.trim();
    if (uri3 && uri3.includes(origin)) return uri3.trim();
  }

  if (uriDefault) return uriDefault.trim();
  if (uri1) return uri1.trim(); // Fallback to first one if no match
  
  if (location) {
    // Spotify rejects localhost redirect URIs. In local dev, force a loopback IP literal
    // while preserving the active port so the callback route still resolves.
    if (location.hostname === 'localhost') {
      return `http://127.0.0.1:${location.port}/spotify-callback`;
    }
    if (location.hostname === '127.0.0.1' || location.hostname === '[::1]') {
      return `${location.protocol}//${location.host}/spotify-callback`;
    }
  }

  if (origin) {
    return `${origin}/spotify-callback`;
  }
  return '/spotify-callback'; // Fallback
}

// Use a getter or call it inside functions to be safe
const getSafeRedirectUri = () => getRedirectUri();

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-follow-read',
  'playlist-read-private'
].join(' ');

export async function redirectToSpotifyAuth() {
  console.log('--- Spotify Auth Debug ---');
  console.log('CLIENT_ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 5)}...` : 'MISSING');
  console.log('Redirect URI:', getSafeRedirectUri());
  console.log('--------------------------');

  if (!CLIENT_ID) {
    alert(`Spotify Client ID is missing. Please set VITE_SPOTIFY_CLIENT_ID in your environment variables. 
    Your Redirect URI is: ${getSafeRedirectUri()}`);
    return;
  }

  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem('spotify_code_verifier', verifier);
  if (typeof window !== 'undefined') {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    localStorage.setItem(SPOTIFY_RETURN_PATH_KEY, currentPath || '/settings');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSafeRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

export function consumeSpotifyReturnPath() {
  if (typeof window === 'undefined') return '/settings';
  const stored = localStorage.getItem(SPOTIFY_RETURN_PATH_KEY);
  localStorage.removeItem(SPOTIFY_RETURN_PATH_KEY);
  return stored || '/settings';
}

export async function handleSpotifyCallback(code: string) {
  console.log('--- Spotify Callback Debug ---');
  console.log('Received auth code:', code ? `${code.substring(0, 10)}...` : 'MISSING');
  
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  console.log('Code verifier from storage:', codeVerifier ? 'FOUND' : 'MISSING');
  console.log('Using Redirect URI:', getSafeRedirectUri());

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSafeRedirectUri(),
        code_verifier: codeVerifier!,
      }),
    });

    const data = await response.json();
    console.log('Token exchange response status:', response.status);
    
    if (!response.ok) {
      console.error('Token exchange failed:', data);
    }

    if (data.access_token) {
      console.log('Access token received successfully!');
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
    }
    console.log('------------------------------');
    return data;
  } catch (err) {
    console.error('Network error during token exchange:', err);
    console.log('------------------------------');
    throw err;
  }
}

async function refreshSpotifyToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken || !CLIENT_ID) return null;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    if (!response.ok) {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      localStorage.removeItem('spotify_token_expiry');
      return null;
    }

    const data = await response.json();
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getSpotifyToken(): Promise<string | null> {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (!token || !expiry) return null;

  // Refresh 60s before expiry so we never serve a stale token
  if (Date.now() > parseInt(expiry) - 60_000) {
    return refreshSpotifyToken();
  }

  return token;
}

export async function spotifyFetch(endpoint: string) {
  console.log(`[Spotify API] Fetching: ${endpoint}`);
  const token = await getSpotifyToken();
  
  if (!token) {
    console.error('[Spotify API] No valid token found in storage.');
    throw new Error('Not authenticated with Spotify');
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`[Spotify API] Response status for ${endpoint}:`, response.status);

    if (response.status === 401) {
      console.error('[Spotify API] Token expired or invalid (401). Clearing storage.');
      localStorage.removeItem('spotify_access_token');
      throw new Error('Session expired');
    }

    if (!response.ok) {
      let errorMessage = 'Spotify API error';
      try {
        const errorText = await response.text();
        console.error(`[Spotify API] Error response body for ${endpoint}:`, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        console.error('Failed to read error response');
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[Spotify API] Parsed response for ${endpoint}:`, data);
    return data;
  } catch (err) {
    console.error(`[Spotify API] Network/Parse error for ${endpoint}:`, err);
    throw err;
  }
}

export async function fetchArtistTracks(artistId: string) {
  console.group('[Spotify API] fetchArtistTracks');
  console.log('[Spotify API] Artist ID:', artistId);
  // Spotify's current /artists/{id}/albums docs cap limit at 10.
  // Page through results instead of requesting 50 in one call.
  const albums: any[] = [];
  let total = 0;
  let offset = 0;
  const albumPageLimit = 10;

  while (true) {
    const albumsData = await spotifyFetch(
      `/artists/${artistId}/albums?include_groups=album,single&limit=${albumPageLimit}&offset=${offset}`,
    );
    const pageItems = Array.isArray(albumsData?.items) ? albumsData.items : [];
    total = Number(albumsData?.total ?? total);
    console.log('[Spotify API] Albums page payload summary:', {
      offset,
      pageLimit: albumPageLimit,
      total,
      returned: pageItems.length,
      sample: pageItems.slice(0, 5).map((album: any) => ({
        id: album?.id ?? null,
        name: album?.name ?? null,
        release_date: album?.release_date ?? null,
        total_tracks: album?.total_tracks ?? null,
      })),
    });
    albums.push(...pageItems);
    if (!albumsData?.next || pageItems.length === 0) break;
    offset += albumPageLimit;
  }

  console.log('[Spotify API] Final albums summary:', {
    total,
    fetched: albums.length,
  });

  const allTracks: any[] = [];

  // 2. For each album, get tracks
  for (const album of albums) {
    const tracksData = await spotifyFetch(`/albums/${album.id}/tracks?limit=50`);
    console.log('[Spotify API] Album tracks payload summary:', {
      albumId: album?.id ?? null,
      albumName: album?.name ?? null,
      returned: Array.isArray(tracksData?.items) ? tracksData.items.length : 0,
      sample: Array.isArray(tracksData?.items)
        ? tracksData.items.slice(0, 5).map((track: any) => ({
            id: track?.id ?? null,
            name: track?.name ?? null,
            duration_ms: track?.duration_ms ?? null,
            disc_number: track?.disc_number ?? null,
            track_number: track?.track_number ?? null,
          }))
        : [],
    });
    // Add album info to each track
    const tracksWithAlbum = tracksData.items.map((t: any) => ({
      ...t,
      album: {
        id: album.id,
        name: album.name,
        images: album.images,
        release_date: album.release_date
      }
    }));
    allTracks.push(...tracksWithAlbum);
  }

  // Enrich with full track objects to get popularity, ISRC, preview_url, explicit
  const fullTrackMap: Record<string, any> = {};
  const trackIds = allTracks.map((t: any) => t.id);
  for (let i = 0; i < trackIds.length; i += 50) {
    const ids = trackIds.slice(i, i + 50).join(',');
    try {
      const data = await spotifyFetch(`/tracks?ids=${ids}`);
      const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
      for (const t of tracks) {
        if (t?.id) fullTrackMap[t.id] = t;
      }
    } catch (error: any) {
      console.warn('[Spotify API] Full track batch failed.', error?.message ?? null);
    }
  }

  const enrichedTracks = allTracks.map((track: any) => {
    const full = fullTrackMap[track.id] ?? {};
    return {
      ...track,
      popularity:   full.popularity  ?? null,
      preview_url:  full.preview_url ?? track.preview_url ?? null,
      explicit:     full.explicit    ?? track.explicit    ?? false,
      duration_ms:  full.duration_ms ?? track.duration_ms ?? null,
      isrc:         full.external_ids?.isrc ?? null,
    };
  });

  console.log('[Spotify API] Final enriched track summary:', {
    totalTracks: enrichedTracks.length,
    sample: enrichedTracks.slice(0, 3).map((track: any) => ({
      id: track?.id,
      name: track?.name,
      popularity: track?.popularity,
      explicit: track?.explicit,
      isrc: track?.isrc,
      duration_ms: track?.duration_ms,
      preview_url: track?.preview_url ? 'yes' : null,
    })),
  });
  console.groupEnd();
  return enrichedTracks;
}

export async function fetchTrackAudioAnalysis(trackId: string) {
  return spotifyFetch(`/audio-analysis/${trackId}`);
}

// PKCE Helpers
function generateCodeVerifier(length: number) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
