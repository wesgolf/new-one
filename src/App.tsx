import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './pages/NotFound';
import { Unauthorized } from './pages/Unauthorized';
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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/collab" element={<CollabPortal />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes with Auth */}
        <Route
          path="/*"
          element={
            <ProtectedRoute fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
              <ErrorBoundary>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<CommandCenter />} />
                    <Route path="/ideas" element={<ErrorBoundary><Ideas /></ErrorBoundary>} />
                    <Route path="/releases" element={<ErrorBoundary><ReleaseTracker /></ErrorBoundary>} />
                    <Route path="/content" element={<ContentEngine />} />
                    <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                    <Route path="/calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
                    <Route path="/goals" element={<ErrorBoundary><GoalTracker /></ErrorBoundary>} />
                    <Route path="/strategy" element={<CareerMap />} />
                    <Route path="/network" element={<Opportunities />} />
                    <Route path="/resources" element={<BrandVault />} />
                    <Route path="/coach" element={<ArtistCoach />} />
                    <Route path="/spotify-callback" element={<SpotifyCallback />} />
                    <Route path="/soundcloud-callback" element={<SoundCloudCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
