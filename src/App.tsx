import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandCenter } from './pages/CommandCenter';
import { ReleaseTracker } from './pages/ReleaseTracker';
import { Ideas } from './pages/Ideas';
import { ContentEngine } from './pages/ContentEngine';
import { Analytics } from './pages/Analytics';
import { Calendar } from './pages/Calendar';
import { GoalTracker } from './pages/GoalTracker';
import { SpotifyCallback } from './pages/SpotifyCallback';
import { SoundCloudCallback } from './pages/SoundCloudCallback';
import { BrandVault } from './pages/BrandVault';
import { ArtistCoach } from './pages/ArtistCoach';
import { CollabPortal } from './pages/CollabPortal';
import { Opportunities } from './pages/Opportunities';
import { CareerMap } from './pages/CareerMap';
import { useReminders } from './hooks/useReminders';
import { Zap, Lock } from 'lucide-react';

function PasskeyGate({ children }: { children: React.ReactNode }) {
  useReminders();
  const [passkey, setPasskey] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('artist_os_authorized') === 'true';
  });
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey === 'wesmusic123') {
      setIsAuthorized(true);
      localStorage.setItem('artist_os_authorized', 'true');
      setError(false);
    } else {
      setError(true);
      setPasskey('');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <Zap className="w-8 h-8 text-white fill-current" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ARTIST OS</h1>
            <p className="text-slate-500 mt-2">Enter passkey to access your command center</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Passkey</label>
                <div className="relative">
                  <input
                    type="password"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="••••••••"
                    autoFocus
                  />
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                {error && (
                  <p className="text-red-500 text-xs mt-2 font-medium">Invalid passkey. Please try again.</p>
                )}
              </div>
              <button type="submit" className="btn-primary w-full py-3">
                Unlock Dashboard
              </button>
            </div>
          </form>
          
          <p className="text-center text-slate-400 text-xs mt-8">
            Artist OS v1.0 • Secure Access
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/collab" element={<CollabPortal />} />
      
      {/* Protected Routes via Passkey */}
      <Route
        path="*"
        element={
          <PasskeyGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<ErrorBoundary><CommandCenter /></ErrorBoundary>} />
                <Route path="/ideas" element={<ErrorBoundary><Ideas /></ErrorBoundary>} />
                <Route path="/releases" element={<ErrorBoundary><ReleaseTracker /></ErrorBoundary>} />
                <Route path="/content" element={<ErrorBoundary><ContentEngine /></ErrorBoundary>} />
                <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                <Route path="/calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
                <Route path="/goals" element={<ErrorBoundary><GoalTracker /></ErrorBoundary>} />
                <Route path="/strategy" element={<ErrorBoundary><CareerMap /></ErrorBoundary>} />
                <Route path="/network" element={<ErrorBoundary><Opportunities /></ErrorBoundary>} />
                <Route path="/resources" element={<ErrorBoundary><BrandVault /></ErrorBoundary>} />
                <Route path="/coach" element={<ErrorBoundary><ArtistCoach /></ErrorBoundary>} />
                <Route path="/spotify-callback" element={<SpotifyCallback />} />
                <Route path="/soundcloud-callback" element={<SoundCloudCallback />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </PasskeyGate>
        }
      />
    </Routes>
  );
}
