# Artist OS: Deep Technical Architecture & Inter-Module Specification

This document provides an exhaustive technical breakdown of the Artist OS application, designed for a high-level AI agent to understand, maintain, and extend the system.

---

## 1. Core System Architecture

### 1.1. The "Single Source of Truth" Pattern
Artist OS is built on a **Decentralized Write / Centralized Read** architecture. 
- **Decentralized Write**: Each module (Releases, Content, Goals) writes to its own specific Supabase table.
- **Centralized Read**: The **Calendar** and **Hub** modules perform "Aggregation Reads," fetching data from 5+ tables simultaneously to create a unified view of the artist's life.

### 1.2. State Management & Data Fetching (`src/hooks/useArtistData.ts`)
The app uses a custom `useArtistData<T>` hook for all CRUD operations.
- **Generic Type Safety**: Uses TypeScript generics to ensure type safety across different tables (`Release`, `ContentItem`, `Goal`, etc.).
- **Real-time Sync**: Implements Supabase `onSnapshot` listeners to ensure that if a release date is changed in the **Calendar**, the **Release Tracker** updates instantly without a page refresh.
- **Optimistic UI**: Most operations update local state before the server responds to ensure a "zero-latency" feel.

---

## 2. Page-by-Page Deep Dive

### 2.1. The Hub (Command Center) - `src/pages/Analytics.tsx` (Note: Acts as the Dashboard)
The Hub is the entry point and the "Brain" of the OS.
- **Reminders Engine (`src/hooks/useReminders.ts`)**: A background service that scans the `releases` and `content_items` tables. It generates "Actionable Alerts" if:
    - A release is missing cover art.
    - A social post is due in < 24 hours.
    - A goal deadline is approaching.
- **Quick Actions**: Direct shortcuts to the `CalendarEventModal`, allowing the artist to "capture" ideas without leaving the dashboard.
- **Metric Aggregation**: Displays "At-a-Glance" stats pulled from the `AnalyticsDashboard` component.

### 2.2. Release Tracker - `src/pages/ReleaseTracker.tsx`
The core discography management tool.
- **Kanban Logic**: Tracks music through a lifecycle: `idea` -> `production` -> `mixing` -> `mastering` -> `scheduled` -> `released`.
- **Asset Checklist**: Each release has a nested `assets` object (boolean flags for Cover Art, Stems, Teasers, etc.). This data is used by the Hub's reminder system.
- **SoundCloud Scraper Integration**: Calls a Node.js backend proxy (`/api/soundcloud/scrape-tracks`) which uses `cheerio` to scrape the artist's public profile and populate the `releases` table automatically.
- **Wipe Utility**: A bulk-delete operation that clears the `releases` table for the current `user_id`.

### 2.3. Content Planner - `src/pages/ContentPlanner.tsx`
A specialized CRM for social media marketing.
- **Platform-Specific UI**: Tailors fields for `TikTok`, `Instagram`, and `YouTube`.
- **The "Hook-Caption-CTA" Framework**: Enforces a professional marketing structure for every post.
- **Release Linking**: Allows the artist to tag a post with a specific `release_id`. This creates a logical link so the artist can see which social posts drove the most engagement for a specific song.

### 2.4. Unified Calendar - `src/pages/Calendar.tsx`
The most complex module in the OS.
- **Multi-Table Aggregation**: Fetches from `releases`, `content_items`, `meetings`, `todos`, and `goals`.
- **Event Normalization**: Maps diverse data structures into a common `CalendarEvent` interface for rendering.
- **The `CalendarEventModal`**: A "Universal Writer." Depending on the "Event Type" selected by the user, it dynamically switches its target Supabase table. 
    - *Example*: Selecting "Post" writes to `content_items`; selecting "Release" writes to `releases`.
- **Time-of-Day Support**: Supports chronological sorting in the "Day View" using the `release_time` or `scheduled_time` fields.

### 2.5. Analytics Dashboard - `src/components/AnalyticsDashboard.tsx`
A real-time data visualization suite.
- **Spotify Web API**: Uses a Client Credentials flow (or User Auth via `SpotifyCallback.tsx`) to fetch:
    - `popularity`: A 0-100 score of the artist's current "heat."
    - `followers`: Real-time follower count.
- **Recharts Integration**: Renders "Growth Curves" for streams and followers.
- **SoundCloud Sync**: Displays scraped listener counts alongside Spotify data for a "Cross-Platform" view.

### 2.6. Goal Tracker - `src/pages/GoalTracker.tsx`
A strategic planning tool.
- **Category-Based Tracking**: Goals are split into `Streaming`, `Social`, `Live`, and `Revenue`.
- **Progress Visualization**: Uses SVG progress rings and linear bars to show "Distance to Target."
- **Term Logic**: Supports `short`, `medium`, and `long` term goals, each with different UI treatments.

---

## 3. Inter-Module Workflows (How they work together)

### 3.1. The "Release-to-Content" Pipeline
1. Artist creates a new song in **Release Tracker** (Status: `idea`).
2. Song appears in the **Calendar** on its `release_date`.
3. Artist goes to **Content Planner** to create a TikTok. They link the TikTok to the song.
4. The **Hub** sees the link and reminds the artist: *"You have a TikTok due tomorrow for your upcoming single!"*

### 3.2. The "Goal-to-Analytics" Loop
1. Artist sets a **Goal** to reach 10,000 Spotify followers.
2. The **Analytics Dashboard** fetches the real-time follower count from the Spotify API.
3. The **Goal Tracker** compares the API data to the goal target and updates the progress bar automatically.

---

## 4. Technical Implementation Details

### 4.1. Security & Access Control
- **PasskeyGate (`src/components/PasskeyGate.tsx`)**: A higher-order component (HOC) that wraps the entire `App.tsx`. It blocks all rendering until a valid `passkey` is entered.
- **Supabase RLS**: Every table has `auth.uid() = user_id` policies. Even if the frontend is bypassed, the database remains secure.

### 4.2. UI/UX Patterns
- **Glassmorphism**: Uses `backdrop-blur-md` and semi-transparent backgrounds (`bg-white/10`) for a modern, high-end feel.
- **Density**: Designed for "Power Users." Information is packed tightly using small fonts (`text-xs`), tight tracking (`tracking-tight`), and icon-heavy interfaces.
- **Responsive Design**: Uses a "Sidebar-to-Bottom-Nav" pattern. On mobile, the sidebar disappears, and a touch-friendly bottom navigation bar appears.

### 4.3. Error Handling
- **FirestoreErrorInfo Pattern**: All database operations are wrapped in a `handleFirestoreError` (or Supabase equivalent) utility that logs the `operationType`, `path`, and `authInfo` to the console for rapid debugging.

---

## 5. Deployment & Maintenance
- **Build System**: Vite-based production build (`npm run build`).
- **Environment**: Runs in a Cloud Run container behind an Nginx proxy.
- **Port**: Strictly bound to `3000`.
