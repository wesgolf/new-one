/**
 * Spotify Web API integration using PKCE flow (no backend required)
 */

const CLIENT_ID = (import.meta.env.VITE_SPOTIFY_REAL_CLIENT || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim();

// The Redirect URI must match what is configured in the Spotify Developer Dashboard.
// We support multiple URIs for different environments (Dev vs Pre).
export function getRedirectUri() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
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

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSafeRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  
  // Use window.open for better compatibility with iframes and popups
  window.open(authUrl, 'spotify-auth', 'width=800,height=600');
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

export async function getSpotifyToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (!token || !expiry) return null;

  if (Date.now() > parseInt(expiry)) {
    // Token expired, would need refresh logic here
    // For now, just return null to force re-auth
    return null;
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
    return data;
  } catch (err) {
    console.error(`[Spotify API] Network/Parse error for ${endpoint}:`, err);
    throw err;
  }
}

export async function fetchArtistTracks(artistId: string) {
  // 1. Get all albums/singles for the artist
  const albumsData = await spotifyFetch(`/artists/${artistId}/albums?include_groups=album,single&limit=50`);
  const albums = albumsData.items;

  const allTracks: any[] = [];

  // 2. For each album, get tracks
  for (const album of albums) {
    const tracksData = await spotifyFetch(`/albums/${album.id}/tracks?limit=50`);
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

  // 3. Fetch audio features in bulk (max 100 per request)
  const trackIds = allTracks.map(t => t.id);
  const audioFeatures: any[] = [];
  
  for (let i = 0; i < trackIds.length; i += 100) {
    const ids = trackIds.slice(i, i + 100).join(',');
    const featuresData = await spotifyFetch(`/audio-features?ids=${ids}`);
    audioFeatures.push(...featuresData.audio_features);
  }

  // 4. Combine data
  const enrichedTracks = allTracks.map(track => {
    const features = audioFeatures.find(f => f && f.id === track.id);
    return {
      ...track,
      audio_features: features
    };
  });

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
