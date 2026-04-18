-- Supabase Schema for Artist OS

-- Profiles Table
-- id is a FK to auth.users(id) — NOT a separate auto-generated UUID
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'artist' CHECK (role IN ('artist', 'manager')),
  full_name TEXT,
  email TEXT,
  artist_name TEXT,
  bio TEXT,
  soundcloud_url TEXT,
  spotify_id TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_channel TEXT,
  email_contact TEXT,
  website TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Releases Table
CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('idea', 'production', 'mastered', 'ready', 'scheduled', 'released', 'WIP', 'mixing', 'mastering', 'pitched')),
  type TEXT,
  release_date DATE,
  release_time TEXT,
  is_full_day BOOLEAN DEFAULT TRUE,
  production JSONB DEFAULT '{}'::JSONB,
  assets JSONB DEFAULT '{"coverArt": false, "teaserClips": false, "liveTest": false, "preSave": false, "soundcloud": false, "pitchEmail": false, "stems": false}'::JSONB,
  distribution JSONB DEFAULT '{}'::JSONB,
  marketing JSONB DEFAULT '{}'::JSONB,
  soundcloud_url TEXT,
  cover_art_url TEXT,
  stems_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  notes TEXT,
  rationale TEXT,
  performance JSONB DEFAULT '{"streams": 0, "saves": 0}'::JSONB,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Items Table
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Instagram', 'TikTok', 'YouTube', 'Twitter')),
  type TEXT NOT NULL CHECK (type IN ('Reel', 'TikTok', 'Story', 'Post')),
  status TEXT NOT NULL CHECK (status IN ('idea', 'filming', 'editing', 'ready', 'scheduled', 'posted')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  scheduled_time TEXT,
  is_full_day BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  hook TEXT,
  caption TEXT,
  cta TEXT,
  linked_release_id UUID REFERENCES releases(id),
  metrics JSONB DEFAULT '{"views": 0, "follows": 0, "shares": 0}'::JSONB,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shows Table
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  is_full_day BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'completed')),
  prep_checklist TEXT[] DEFAULT '{}',
  crowd_reaction TEXT,
  tested_tracks TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  is_full_day BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities Table
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Venue', 'Label', 'Promoter', 'Collaborator', 'Playlist')),
  contact TEXT,
  last_contact DATE,
  next_follow_up DATE,
  status TEXT NOT NULL CHECK (status IN ('cold', 'warm', 'active', 'closed')),
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals Table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  target NUMERIC NOT NULL,
  current NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  deadline DATE,
  deadline_time TEXT,
  start_date DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  manual_progress BOOLEAN DEFAULT FALSE,
  category TEXT NOT NULL CHECK (category IN ('Streaming', 'Social', 'Live', 'Revenue')),
  term TEXT NOT NULL CHECK (term IN ('short', 'medium', 'long')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todos Table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  due_time TEXT,
  is_full_day BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Resources Table (Knowledge Base for AI Coach)
CREATE TABLE IF NOT EXISTS bot_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'webpage', 'pdf')),
  url TEXT,
  category TEXT DEFAULT 'General' CHECK (category IN ('Strategy', 'Technical', 'Inspiration', 'General', 'Marketing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finance Table
CREATE TABLE IF NOT EXISTS finance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL CHECK (category IN ('Streaming', 'Merch', 'Live', 'Royalties', 'Production', 'Marketing', 'Equipment', 'Software', 'Other')),
  linked_release_id UUID REFERENCES releases(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbox Table for Quick Capture
CREATE TABLE IF NOT EXISTS inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  category TEXT DEFAULT 'Idea' CHECK (category IN ('Idea', 'Task', 'Note', 'Contact')),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities Table Updates
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS relationship_strength INTEGER DEFAULT 3 CHECK (relationship_strength >= 1 AND relationship_strength <= 5);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_interaction_notes TEXT;

-- Goals Table Updates
ALTER TABLE goals ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '[]'::JSONB;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status_indicator TEXT DEFAULT 'on-track' CHECK (status_indicator IN ('on-track', 'off-track', 'at-risk'));

-- Todos Table Updates
ALTER TABLE todos ADD COLUMN IF NOT EXISTS linked_entity_id UUID;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS linked_entity_type TEXT;

-- Content Items Table Updates for Social Media Scheduling
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'scheduled', 'published', 'failed', 'cancelled'));
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS platform_settings JSONB DEFAULT '{}'::JSONB;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS zernio_post_id TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS publish_error TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS post_type TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS angle TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Publish Logs Table for tracking publish attempts and errors
CREATE TABLE IF NOT EXISTS publish_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('schedule', 'publish', 'cancel', 'reschedule', 'fail')),
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  zernio_response JSONB DEFAULT '{}'::JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Assets Table (uploaded media files)
CREATE TABLE IF NOT EXISTS content_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'video' CHECK (asset_type IN ('video', 'image', 'audio')),
  file_size_bytes BIGINT,
  duration_seconds NUMERIC,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Posts Table (per-platform child posts of a content item)
CREATE TABLE IF NOT EXISTS platform_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('Instagram', 'TikTok', 'YouTube')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  caption TEXT,
  title TEXT,
  description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  platform_settings_json JSONB DEFAULT '{}'::JSONB,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  external_post_id TEXT,
  external_post_url TEXT,
  zernio_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update content_items with campaign and notes columns
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable Row Level Security (Optional for prototype)
-- ALTER TABLE inbox ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY; -- Disabled for prototype testing

-- Create Policies
-- CREATE POLICY "Users can manage their own releases" ON releases FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can manage their own content items" ON content_items FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can manage their own opportunities" ON opportunities FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can manage their own shows" ON shows FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- ── Goals: Extended tracking model (2025-04) ─────────────────────────────────
-- New columns support manual, automatic, hybrid tracking modes and
-- ratio / timeless / milestone goal types.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'count'
  CHECK (goal_type IN ('count', 'ratio', 'milestone', 'custom'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS tracking_mode TEXT DEFAULT 'manual'
  CHECK (tracking_mode IN ('manual', 'automatic', 'hybrid'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS source_metric TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS formula JSONB;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_timeless BOOLEAN DEFAULT FALSE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Goal entry history: one row per logged progress update
CREATE TABLE IF NOT EXISTS goal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Outreach Emails: email draft & send log per contact ─────────────────────
-- Tracks all outbound emails drafted or sent from contact records.
-- status: draft (saved, not sent) | sent (dispatched) | failed
CREATE TABLE IF NOT EXISTS outreach_emails (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id   UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'sent', 'failed')),
  sent_at      TIMESTAMP WITH TIME ZONE,
  opened_at    TIMESTAMP WITH TIME ZONE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Tasks Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  linked_entity_id UUID,
  linked_entity_type TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Ideas Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'developing', 'ready', 'archived')),
  category TEXT DEFAULT 'track' CHECK (category IN ('track', 'content', 'release', 'campaign', 'other')),
  tags TEXT[] DEFAULT '{}',
  is_collab BOOLEAN DEFAULT FALSE,
  collab_token UUID DEFAULT gen_random_uuid(),
  collab_expires_at TIMESTAMP WITH TIME ZONE,
  voice_memo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Idea Assets ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('audio', 'image', 'video', 'document')),
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Idea Comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idea_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Integrations ─────────────────────────────────────────────────────────────
-- Stores OAuth tokens and connection state for third-party platforms.
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('spotify', 'soundcloud', 'instagram', 'tiktok', 'youtube', 'apple_music')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  platform_username TEXT,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

-- ── Sync Jobs ────────────────────────────────────────────────────────────────
-- Tracks background analytics sync operations.
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('analytics', 'catalog', 'audience')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  rows_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Report Snapshots ─────────────────────────────────────────────────────────
-- Weekly/monthly roll-up snapshots for trend comparison.
CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  platform TEXT,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, period_type, period_start, platform)
);
