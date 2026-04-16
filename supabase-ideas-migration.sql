-- ============================================================
-- Artist OS — ideas + idea_assets + idea_comments tables
-- Run in Supabase SQL editor.
-- ============================================================

-- ─── ideas ───────────────────────────────────────────────────────────────────

create table if not exists public.ideas (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  status      text        not null default 'demo'
              check (status in ('demo', 'in_progress', 'review', 'done')),
  is_collab   boolean     not null default false,
  created_by  uuid        references public.profiles(id) on delete set null,
  share_slug  text        unique default gen_random_uuid()::text,
  is_public   boolean     not null default false,
  artist_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ideas_created_by_idx  on public.ideas(created_by);
create index if not exists ideas_share_slug_idx  on public.ideas(share_slug);
create index if not exists ideas_status_idx      on public.ideas(status);

-- ─── idea_assets ─────────────────────────────────────────────────────────────

create table if not exists public.idea_assets (
  id         uuid        primary key default gen_random_uuid(),
  idea_id    uuid        not null references public.ideas(id) on delete cascade,
  file_url   text        not null,
  file_path  text,
  asset_type text        not null default 'audio'
             check (asset_type in ('audio', 'link', 'cover', 'project_link')),
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idea_assets_idea_id_idx on public.idea_assets(idea_id);

-- ─── idea_comments ───────────────────────────────────────────────────────────

create table if not exists public.idea_comments (
  id                uuid         primary key default gen_random_uuid(),
  idea_id           uuid         not null references public.ideas(id) on delete cascade,
  author_id         uuid         references public.profiles(id) on delete set null,
  body              text         not null,
  timestamp_seconds numeric,
  created_at        timestamptz  not null default now()
);

create index if not exists idea_comments_idea_id_idx on public.idea_comments(idea_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.ideas         enable row level security;
alter table public.idea_assets   enable row level security;
alter table public.idea_comments enable row level security;

-- ideas: authenticated users see all; anonymous users see only public ideas
drop policy if exists "ideas_select"  on public.ideas;
drop policy if exists "ideas_insert"  on public.ideas;
drop policy if exists "ideas_update"  on public.ideas;
drop policy if exists "ideas_delete"  on public.ideas;

create policy "ideas_select" on public.ideas for select
  using (auth.uid() is not null or is_public = true);

create policy "ideas_insert" on public.ideas for insert
  with check (auth.uid() = created_by);

create policy "ideas_update" on public.ideas for update
  using (auth.uid() = created_by);

create policy "ideas_delete" on public.ideas for delete
  using (auth.uid() = created_by);

-- idea_assets: visible when parent idea is accessible
drop policy if exists "idea_assets_select" on public.idea_assets;
drop policy if exists "idea_assets_insert" on public.idea_assets;
drop policy if exists "idea_assets_delete" on public.idea_assets;

create policy "idea_assets_select" on public.idea_assets for select
  using (
    auth.uid() is not null
    or (select is_public from public.ideas where id = idea_id)
  );

create policy "idea_assets_insert" on public.idea_assets for insert
  with check (auth.uid() is not null);

create policy "idea_assets_delete" on public.idea_assets for delete
  using (auth.uid() is not null);

-- idea_comments: same visibility as assets; anyone authenticated can comment,
-- anonymous can comment on public ideas
drop policy if exists "idea_comments_select" on public.idea_comments;
drop policy if exists "idea_comments_insert" on public.idea_comments;

create policy "idea_comments_select" on public.idea_comments for select
  using (
    auth.uid() is not null
    or (select is_public from public.ideas where id = idea_id)
  );

create policy "idea_comments_insert" on public.idea_comments for insert
  with check (
    auth.uid() is not null
    or (select is_public from public.ideas where id = idea_id)
  );

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function public.set_idea_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists idea_updated_at on public.ideas;
create trigger idea_updated_at
  before update on public.ideas
  for each row execute function public.set_idea_updated_at();

-- ─── Storage bucket (run once, or create via Supabase dashboard) ──────────────
-- The idea-assets bucket stores MP3/audio uploads. Create via:
--   Supabase Dashboard → Storage → New bucket → name: idea-assets → Public: on
-- Or use the management API / CLI if preferred.
