-- ============================================================
-- Artist OS — user_settings table
-- Flexible EAV-style key/value store per user, grouped by
-- category. Run this in the Supabase SQL editor.
-- ============================================================

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.user_settings (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references auth.users(id) on delete cascade,
  category     text         not null,
  key          text         not null,
  value_json   jsonb        not null default 'null'::jsonb,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),

  -- One row per (user, category, key)
  constraint user_settings_unique unique (user_id, category, key)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists user_settings_user_id_idx  on public.user_settings(user_id);
create index if not exists user_settings_category_idx on public.user_settings(user_id, category);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function public.set_user_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_user_settings_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.user_settings enable row level security;

-- Users can only read their own settings
create policy "user_settings_select"
  on public.user_settings for select
  using (auth.uid() = user_id);

-- Users can only insert their own settings
create policy "user_settings_insert"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- Users can only update their own settings
create policy "user_settings_update"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Users can only delete their own settings
create policy "user_settings_delete"
  on public.user_settings for delete
  using (auth.uid() = user_id);

-- ─── Default / seed settings (insert if not present) ─────────────────────────
-- These are inserted per-user via the application layer on first login.
-- See: src/services/settingsService.ts → ensureDefaultSettings()
--
-- The defaults below are provided here as documentation / manual seed reference.
-- Replace <your-user-uuid> with a real user id for manual testing.
--
-- INSERT INTO public.user_settings (user_id, category, key, value_json)
-- VALUES
--   -- general
--   ('<your-user-uuid>', 'general', 'theme',              '"system"'),
--   ('<your-user-uuid>', 'general', 'language',           '"en"'),
--   ('<your-user-uuid>', 'general', 'timezone',           '"auto"'),
--   ('<your-user-uuid>', 'general', 'notifications',      '{"email": true, "push": false, "inApp": true}'),
--   ('<your-user-uuid>', 'general', 'dashboard_layout',   '"default"'),
--
--   -- unauthorized_page
--   ('<your-user-uuid>', 'unauthorized_page', 'heading',  '"Access Restricted"'),
--   ('<your-user-uuid>', 'unauthorized_page', 'subtext',  '"You do not have permission to view this page."'),
--   ('<your-user-uuid>', 'unauthorized_page', 'show_contact_link', 'true'),
--
--   -- integrations
--   ('<your-user-uuid>', 'integrations', 'auto_sync',     'true'),
--   ('<your-user-uuid>', 'integrations', 'sync_interval', '3600'),
--   ('<your-user-uuid>', 'integrations', 'enabled_platforms', '["spotify", "soundcloud"]')
-- ON CONFLICT (user_id, category, key) DO NOTHING;
