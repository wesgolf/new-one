import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleSpotifyCallback } from '../lib/spotify';

export function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      handleSpotifyCallback(code)
        .then(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/');
          }
        })
        .catch((err) => {
          console.error('Spotify auth failed', err);
          if (window.opener) {
            window.close();
          } else {
            navigate('/');
          }
        });
    } else {
      navigate('/');
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
