import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

// Helper to generate PKCE challenge and verifier
async function generatePKCE() {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available. This feature requires a secure context (HTTPS).');
  }
  
  try {
    const verifier = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    
    // Base64Url encode the digest
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
      
    return { verifier, challenge };
  } catch (e) {
    console.error('PKCE generation failed:', e);
    throw new Error('Secure context (HTTPS) required for SoundCloud login');
  }
}

export function useSoundCloud() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('soundcloud_token') : null;
    } catch (e) {
      return null;
    }
  });

  const exchangeToken = useCallback(async (code: string, state: string) => {
    try {
      const storedState = localStorage.getItem('soundcloud_state');
      const verifier = localStorage.getItem('soundcloud_verifier');
      
      if (state !== storedState) {
        console.warn('State mismatch in SoundCloud callback');
      }

      const response = await axios.post('/api/soundcloud/token', {
        code,
        code_verifier: verifier
      });

      const newToken = response.data.access_token;
      setToken(newToken);
      try {
        localStorage.setItem('soundcloud_token', newToken);
      } catch (e) {
        console.warn('Failed to save token to localStorage');
      }
      return newToken;
    } catch (err: any) {
      console.error('Token exchange failed:', err);
      throw err;
    }
  }, []);

  const login = useCallback(async () => {
    try {
      const { verifier, challenge } = await generatePKCE();
      
      const state = Math.random().toString(36).substring(7);
      
      try {
        localStorage.setItem('soundcloud_verifier', verifier);
        localStorage.setItem('soundcloud_state', state);
      } catch (e) {
        // Silently fail if localStorage is not available
      }

      const response = await axios.get(`/api/soundcloud/login?code_challenge=${challenge}&state=${state}`);
      
      if (response.data && response.data.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          response.data.url,
          'soundcloud_login',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          alert('Popup blocked! Please allow popups for this site.');
        }
      } else {
        throw new Error('No login URL returned from server');
      }
    } catch (err: any) {
      console.error('SoundCloud login initiation failed:', err);
      alert('Failed to start SoundCloud login: ' + (err.message || 'Unknown error'));
    }
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'SOUNDCLOUD_AUTH_CODE') {
        const { code, state } = event.data;
        try {
          await exchangeToken(code, state);
        } catch (err) {
          console.error('SoundCloud authentication failed:', err);
          alert('SoundCloud authentication failed. Please try again.');
        }
      } else if (event.data?.type === 'SOUNDCLOUD_AUTH_ERROR') {
        console.error('SoundCloud auth error from popup:', event.data.error, event.data.description);
        alert(`SoundCloud login failed: ${event.data.description || event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [exchangeToken]);

  const fetchMe = useCallback(async () => {
    if (!token) return null;
    try {
      const response = await axios.get('/api/soundcloud/me', {
        headers: { Authorization: `OAuth ${token}` }
      });
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        setToken(null);
        try {
          localStorage.removeItem('soundcloud_token');
        } catch (e) {}
      }
      throw err;
    }
  }, [token]);

  const fetchTracks = useCallback(async () => {
    if (!token) return [];
    try {
      const response = await axios.get('/api/soundcloud/me/tracks?limit=200&linked_partitioning=1', {
        headers: { Authorization: `OAuth ${token}` }
      });
      // If linked_partitioning is used, tracks are in response.data.collection
      return response.data.collection || response.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        setToken(null);
        try {
          localStorage.removeItem('soundcloud_token');
        } catch (e) {}
      }
      throw err;
    }
  }, [token]);

  return { login, exchangeToken, token, fetchMe, fetchTracks };
}
