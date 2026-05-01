import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CommandCenter } from './pages/CommandCenter';
import { Ideas } from './pages/Ideas';
import { Calendar } from './pages/Calendar';
import { GoalTracker } from './pages/GoalTracker';
import { SpotifyCallback } from './pages/SpotifyCallback';
import { SoundCloudCallback } from './pages/SoundCloudCallback';
import { ArtistCoach } from './pages/ArtistCoach';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Unauthorized } from './pages/Unauthorized';
import { NotFound } from './pages/NotFound';
import { useReminders } from './hooks/useReminders';
import { SchemaPlaceholder } from './components/SchemaPlaceholder';
import { Reports } from './pages/Reports';

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
      <Route path="/collab" element={<SchemaPlaceholder title="Collab portal paused" description="The public collab workflow depended on fields that were intentionally removed from the new schema." />} />
      <Route path="/collab/:ideaId" element={<SchemaPlaceholder title="Collab portal paused" description="The public collab workflow will be rebuilt against the new schema in a later phase." />} />
      <Route path="/collab-lab" element={<SchemaPlaceholder title="Collab lab paused" description="The old collab lab UI depended on dropped idea sharing fields." />} />
      <Route path="/collab-lab/:ideaId" element={<SchemaPlaceholder title="Collab lab paused" description="The old collab lab UI depended on dropped idea sharing fields." />} />
      <Route path="/" element={<Unauthorized />} />
      <Route path="/hub" element={<Unauthorized />} />
      <Route path="/login" element={<Unauthorized />} />

      {/* Authenticated app — all children inherit the Layout shell */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<ErrorBoundary><CommandCenter /></ErrorBoundary>} />
        <Route path="/ideas" element={<ErrorBoundary><Ideas /></ErrorBoundary>} />
        <Route path="/releases" element={<SchemaPlaceholder title="Releases not in this schema phase" description="The database was reset around profiles, integrations, coach sessions, goals, tasks, bot resources, reports, calendar events, and ideas. Release and analytics tables will come back in a later phase." />} />
        <Route path="/releases/:releaseId" element={<SchemaPlaceholder title="Release detail unavailable" description="Release tables are not part of the current schema phase yet." />} />
        <Route path="/content" element={<SchemaPlaceholder title="Content engine not in this schema phase" description="Content tables are not part of the current baseline schema yet." />} />
        <Route path="/analytics" element={<SchemaPlaceholder title="Analytics not in this schema phase" description="Analytics persistence tables have not been introduced yet, so the analytics UI is intentionally paused." />} />
        <Route path="/calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
        <Route path="/goals" element={<ErrorBoundary><GoalTracker /></ErrorBoundary>} />
        <Route path="/strategy" element={<SchemaPlaceholder title="Strategy not in this schema phase" description="Strategy pages depended on tables that were intentionally removed in the reset." />} />
        <Route path="/network" element={<SchemaPlaceholder title="Network not in this schema phase" description="Opportunity and outreach tables are not part of the current baseline schema." />} />
        <Route path="/resources" element={<SchemaPlaceholder title="Resources page not in this schema phase" description="The old resource vault depended on dropped tables. Bot resources remain available inside Coach." />} />
        <Route path="/coach" element={<ErrorBoundary><ArtistCoach /></ErrorBoundary>} />
        <Route path="/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
        <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
