import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { consumeSpotifyReturnPath, handleSpotifyCallback } from '../lib/spotify';

export function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    const complete = () => {
      const returnPath = consumeSpotifyReturnPath();
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: 'spotify-auth-success', returnPath }, window.location.origin);
        } catch (error) {
          console.warn('Failed to notify opener about Spotify auth success:', error);
        }
        window.close();
        return;
      }
      navigate(returnPath || '/settings', { replace: true });
    };

    if (code) {
      handleSpotifyCallback(code)
        .then(complete)
        .catch((err) => {
          console.error('Spotify auth failed', err);
          complete();
        });
    } else {
      complete();
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 font-medium">Connecting to Spotify...</p>
      </div>
    </div>
  );
}
