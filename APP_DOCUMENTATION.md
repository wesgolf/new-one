# Artist OS - Comprehensive Technical & Functional Specification

## 1. Executive Summary
Artist OS is a high-performance, full-stack "Operating System" for independent music artists. It transitions the artist from a fragmented workflow (spread across spreadsheets, notes, and folders) into a unified, AI-enhanced Command Center. The platform is built on a "Data-First" philosophy, where every track idea, social post, and financial transaction feeds into a central intelligence layer (the Artist Coach).

---

## 2. Technical Architecture

### 2.1 The Frontend Stack
- **Framework**: React 18 with Vite.
- **Language**: TypeScript (Strict mode) for robust data modeling.
- **Styling**: Tailwind CSS using a custom "Glassmorphism" theme. 
  - *Intricacy*: The UI uses a consistent `bg-white/80 backdrop-blur-xl border-slate-200/50` pattern to create a premium, modern feel.
- **Animations**: `motion/react` (Framer Motion).
  - *Intricacy*: Layout transitions use `AnimatePresence` for smooth page swaps, and list items use staggered entrance animations (`variants`) to reduce perceived loading times.
- **Icons**: Lucide React, aliased for semantic clarity (e.g., `Link as LinkIcon`).

### 2.2 The Backend Stack (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS) enabled.
- **Real-time**: Leverages Supabase Realtime for instant UI updates when data changes in the cloud.
- **Storage**: A dedicated `bot_resources` bucket for binary assets (Images, PDFs).
- **Auth**: Integrated Supabase Auth, though the prototype uses a custom `PasskeyGate` for simplified access control.

### 2.3 AI Intelligence Layer
- **Model**: Google Gemini 1.5 Flash.
- **SDK**: `@google/genai`.
- **Pattern**: Retrieval-Augmented Generation (RAG).
  - *Intricacy*: Before every message, the app runs `getContext()`, which performs a parallel `Promise.all` fetch across 7 different database tables to build a comprehensive "Current State" snapshot for the AI.

---

## 3. Module-by-Module Intricacies

### 3.1 The Hub (Command Center)
The Hub is not just a summary; it's a dynamic priority engine.
- **Global Search (⌘K)**: A unified indexing system that searches across `releases`, `content`, `opportunities`, `goals`, `shows`, and `bot_resources`. It uses `ilike` queries in parallel to provide instant results.
- **Quick Capture (Inbox)**: A "dump" engine for ideas, tasks, and contacts. It writes to the `inbox` table, allowing the artist to clear their mental load instantly.
- **Urgent Actions**: A logic-driven panel that surfaces:
  - **Overdue Tasks**: Todos where `due_date < now`.
  - **Stale Contacts**: Opportunities with no `last_contact` in 30 days.
  - **Off-Track Goals**: Goals with a `status_indicator` of `off-track`.
- **Finance Widget**: A daily visibility tool that calculates Net Profit, Income, and Expenses for the last 30 days from the `finance` table.

### 3.2 Ideas & Pipeline (`/ideas`)
This is the "Creative Incubator."
- **Urgency Indicators**: 
  - Tracks in `production` for >14 days are flagged as "Stale."
  - Tracks marked as `ready` but not promoted are flagged as "Urgent: Promote Now."
- **State Machine**: Tracks move through `idea` -> `production` -> `mastered` -> `ready`.
- **Next Stage Logic**: The UI dynamically changes the primary action button. For example, if status is `production`, the button becomes "Mark as Mastered."

### 3.3 Strategy & Career Map (`/strategy`)
The "Strategic Brain" of the app.
- **Milestone Timeline**: A chronological visualization of all `releases`, `shows`, and `goals`. It uses a staggered vertical timeline layout.
- **Goal Breakdown Engine**: 
  - *Intricacy*: It doesn't just show a progress bar. It calculates the "Gap" between `current` and `target` and suggests specific actions (e.g., "Requires 12x Content Posts") based on heuristic multipliers.
- **AI Career Projection**: A strategic insight card that uses current growth velocity to project future milestones (e.g., "500K Monthly Listeners by Oct 2026").

### 3.4 Network & Relationships (`/network`)
Makes contacts "Alive" rather than just a list.
- **Relationship Strength**: A 1-5 star rating system stored in the `opportunities` table.
- **Networking Reminders**: Integrated into the Hub's "Urgent Actions" to prevent relationship decay.
- **Global Tagging**: Contacts can be tagged (e.g., "Label", "A&R", "Warm") for fast filtering and AI context.

### 3.5 Release Tracker (`/releases`)
The most data-dense part of the app. It manages the lifecycle of a "Product."
- **Tabbed Architecture**:
  - **Production**: Stores technical metadata (BPM, Key) in the `production` JSONB field.
  - **Assets**: A checklist system. Checking "Cover Art" updates the `assets` JSONB field.
  - **Distribution**: Stores ISRC and store links.
  - **Marketing**: Stores "Content Angles" and "Hooks" which are later fed to the AI Coach for content generation.
  - **Performance**: Uses `Recharts` to visualize the `performance` JSONB data.
- **Deep Analysis**: A feature that simulates calling the Spotify API to get "Audio Features" like Danceability and Energy, helping the artist understand their "Sonic Brand."

### 3.4 Brand Vault (`/resources`)
A professional asset manager designed to replace messy Google Drive folders.
- **Dropbox Mirroring**: The app doesn't just link to Dropbox; it mirrors the structure. The `ARTIST_INFO.dropbox_folders` constant defines the exact paths for Logo Kits, EPKs, and Contracts.
- **View Modes**:
  - **Grid**: Optimized for visual assets (Photos, Logos).
  - **List**: Optimized for documents (Contracts, Bio).
- **Vault Health**: A logic that calculates "Asset Density" based on the number of records in the vault vs. the artist's goals.

### 3.5 Artist Coach (`/coach`)
The "Brain" of the application.
- **Knowledge Base (RAG)**:
  - **Drag-and-Drop**: A custom `onDrop` handler in `ArtistCoach.tsx` detects file types.
  - **Storage**: Files are uploaded to Supabase Storage. The public URL is then saved to the `bot_resources` table.
  - **Web Scraping (Future)**: The "Webpage" type is designed to eventually trigger a server-side scrape to feed the AI.
- **AI Context Injection**: The system instruction is a 500+ word prompt that defines the AI as a "Strategic Music Business Consultant." It is told to never hallucinate and to always refer to the `USER DATA CONTEXT` provided in the message.

### 3.6 Collab Portal (`/collab`)
The "External Interface."
- **Public Access**: This route is excluded from the `PasskeyGate` in `App.tsx`.
- **Filtering**: It only shows tracks where `is_public: true`. This allows the artist to keep "Private" ideas hidden while sharing "Public" ones with producers.
- **Lead Gen**: Every track has a "Request Collaboration" flow that pre-fills an email with the track title.

---

## 4. Data Modeling & Intricacies

### 4.1 JSONB Flexibility
The app uses PostgreSQL `JSONB` fields extensively to avoid "Schema Rigidity."
- **`releases.assets`**: Allows adding new asset types (e.g., "TikTok Teaser") without a database migration.
- **`content_items.metrics`**: Can store different metrics for different platforms (e.g., "Retweets" for Twitter vs. "Shares" for TikTok).

### 4.2 Real-time Synchronization
The `useArtistData` hook is the heartbeat of the app.
- *Intricacy*: It uses a "Local-First" update pattern. When an item is added, it updates the local state *immediately* for zero-latency UI, then syncs with Supabase in the background.

---

## 5. Security & Access Control

### 5.1 The Passkey Gate
A simple but effective security layer.
- **Implementation**: A higher-order component that checks `localStorage.getItem('artist_os_authorized')`.
- **Bypass**: The `/collab` route is the only exception, defined in the `App.tsx` router logic.

### 5.2 Row Level Security (RLS)
- **Policy**: `auth.uid() = user_id`.
- **Effect**: Even if an attacker gets an API key, they can only see data belonging to their own authenticated user ID.

---

## 6. UI/UX Design Principles
- **Density vs. Clarity**: The app uses "Bento Grid" layouts to show a lot of data without overwhelming the user.
- **Feedback Loops**: Every action (saving, uploading, promoting) has a visual feedback state (Loaders, Checkmarks, Toasts).
- **Mobile-First**: While designed for a "Command Center" desktop view, the Tailwind classes use `flex-col md:flex-row` patterns to ensure the artist can check their stats on the go.

---

## 7. Future Roadmap & Integration Points
- **SoundCloud/YouTube Write Access**: The `PromoteModal` is a placeholder for `npx` scripts that will handle the actual OAuth and upload flow.
- **Spotify Real-time Stats**: Integration with the Spotify for Artists API to replace simulated performance data.
- **Dropbox Webhooks**: To automatically update the Brand Vault when the artist drops a file into their actual Dropbox folder on their computer.
