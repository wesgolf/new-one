import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CommandCenter } from './pages/CommandCenter';
import { ReleaseTracker } from './pages/ReleaseTracker';
import { ReleaseDetail } from './pages/ReleaseDetail';
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
import { Tasks } from './pages/Tasks';
import { Unauthorized } from './pages/Unauthorized';
import { NotFound } from './pages/NotFound';
import { PublicHub } from './pages/PublicHub';
import { useReminders } from './hooks/useReminders';

function AppShell() {
  useReminders();
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* OAuth callbacks — must be reachable without auth */}
      <Route path="/spotify-callback" element={<SpotifyCallback />} />
      <Route path="/soundcloud-callback" element={<SoundCloudCallback />} />

      {/* Public routes */}
      <Route path="/collab" element={<CollabPortal />} />
      <Route path="/collab/:ideaId" element={<CollabPortal />} />
      <Route path="/hub" element={<PublicHub />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Authenticated app — all children inherit the Layout shell */}
      <Route element={<AppShell />}>
        <Route path="/" element={<ErrorBoundary><CommandCenter /></ErrorBoundary>} />
        <Route path="/ideas" element={<ErrorBoundary><Ideas /></ErrorBoundary>} />
        <Route path="/releases" element={<ErrorBoundary><ReleaseTracker /></ErrorBoundary>} />
        <Route path="/releases/:releaseId" element={<ErrorBoundary><ReleaseDetail /></ErrorBoundary>} />
        <Route path="/content" element={<ErrorBoundary><ContentEngine /></ErrorBoundary>} />
        <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
        <Route path="/calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
        <Route path="/goals" element={<ErrorBoundary><GoalTracker /></ErrorBoundary>} />
        <Route path="/strategy" element={<ErrorBoundary><CareerMap /></ErrorBoundary>} />
        <Route path="/network" element={<ErrorBoundary><Opportunities /></ErrorBoundary>} />
        <Route path="/resources" element={<ErrorBoundary><BrandVault /></ErrorBoundary>} />
        <Route path="/coach" element={<ErrorBoundary><ArtistCoach /></ErrorBoundary>} />
        <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
