import { useState, useEffect, useCallback } from 'react';
import { spotifyFetch, getSpotifyToken, fetchArtistTracks, redirectToSpotifyAuth } from '../lib/spotify';

export function useSpotify() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = await getSpotifyToken();
    if (token) {
      try {
        const userData = await spotifyFetch('/me');
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err: any) {
        console.error('Spotify checkAuth failed:', err);
        // If it's a 403, the token is valid but the user isn't registered in the Spotify Developer Dashboard.
        // We shouldn't clear the token, but we should probably show a specific error.
        // For now, we'll mark as authenticated if we have a token, but user data might be incomplete.
        if (err.message && err.message.includes('403')) {
           setIsAuthenticated(true); // Token is technically valid, just missing permissions
           setUser({ display_name: 'Unregistered User', id: 'unknown' });
        } else {
           setIsAuthenticated(false);
        }
      }
    } else {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Re-check auth when storage changes (e.g. from popup)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spotify_access_token') {
        checkAuth();
      }
    };
    
    // Re-check auth when window is focused
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkAuth]);

  const login = () => {
    redirectToSpotifyAuth();
  };

  const fetchTracks = useCallback(async (artistId: string) => {
    return fetchArtistTracks(artistId);
  }, []);

  const testSpotifyAlbum = useCallback(async () => {
    console.log('--- Starting Spotify Test ---');
    console.log('Initiating fetch to /albums/4aawyAB9vmqN3uQ7FjRGTy');
    try {
      const data = await spotifyFetch('/albums/4aawyAB9vmqN3uQ7FjRGTy');
      console.log('--- Spotify Test Response ---');
      console.log('Data received:', data);
      console.log('-----------------------------');
      alert('Spotify call successful! Check console for data.');
    } catch (err: any) {
      console.error('--- Spotify Test Error ---');
      console.error(err);
      console.error('--------------------------');
      alert('Spotify call failed: ' + (err.message || err));
    }
  }, []);

  return { isAuthenticated, user, loading, login, fetchTracks, checkAuth, testSpotifyAlbum };
}
