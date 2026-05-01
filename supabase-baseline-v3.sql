create extension if not exists pgcrypto;

create schema if not exists private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'artist' check (role in ('artist', 'manager')),
  phone_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz,
  settings jsonb not null default '{}'::jsonb
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  last_processed_at timestamptz,
  is_scheduled boolean not null default false,
  status text not null default 'pending' check (status in ('healthy', 'error', 'pending', 'disabled')),
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, platform)
);

create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  conversation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  model_used text,
  total_tokens_used integer not null default 0
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  due_by timestamptz,
  category text,
  is_recurring boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  target numeric,
  current numeric not null default 0,
  term text check (term in ('short', 'medium', 'long')),
  recurrence_pattern text,
  recurrence_interval integer,
  status_indicator text,
  description text,
  goal_type text,
  tracking_mode text not null default 'manual' check (tracking_mode in ('manual', 'derived', 'hybrid')),
  metric_source text,
  metric_key text,
  formula jsonb,
  is_timeless boolean not null default false,
  ai_analysis text,
  ai_analysis_run timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id_assigned_by uuid not null references auth.users(id) on delete cascade,
  user_id_assigned_to uuid references auth.users(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  title text not null,
  description text,
  completed text not null default 'pending' check (completed in ('pending', 'completed', 'cancelled')),
  due_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.bot_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  category text,
  content text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  title text,
  source_url text,
  storage_path text,
  mime_type text,
  parse_status text,
  parse_error text,
  content_excerpt text,
  fts_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(type, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(content, '') || ' ' ||
      coalesce(content_excerpt, '') || ' ' ||
      coalesce(source_url, '')
    )
  ) stored
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_date timestamptz not null default timezone('utc', now()),
  start_date date,
  end_date date,
  sessions_included text[] not null default '{}'::text[],
  linked_report_pdf text,
  report_content text,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_recurring boolean not null default false,
  recurrence_rule jsonb,
  recurrence_interval integer,
  linked_track uuid,
  source_table text,
  source_id uuid,
  source_field text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text,
  bpm integer,
  key text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  version_numbers integer not null default 1,
  collaborators text[] not null default '{}'::text[],
  idea_comments jsonb not null default '[]'::jsonb,
  is_collab boolean not null default false,
  file_urls jsonb not null default '[]'::jsonb
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_last_seen_at_idx on public.profiles (last_seen_at desc);

create index if not exists integrations_user_id_idx on public.integrations (user_id);
create index if not exists integrations_status_idx on public.integrations (status);
create index if not exists integrations_last_processed_at_idx on public.integrations (last_processed_at desc);

create index if not exists coach_sessions_user_id_idx on public.coach_sessions (user_id);
create index if not exists coach_sessions_updated_at_idx on public.coach_sessions (updated_at desc);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_due_by_idx on public.goals (due_by);
create index if not exists goals_status_indicator_idx on public.goals (status_indicator);

create index if not exists tasks_assigned_by_idx on public.tasks (user_id_assigned_by);
create index if not exists tasks_assigned_to_idx on public.tasks (user_id_assigned_to);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_completed_idx on public.tasks (completed);

create index if not exists bot_resources_user_id_idx on public.bot_resources (user_id);
create index if not exists bot_resources_fts_idx on public.bot_resources using gin (fts_vector);

create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists reports_report_date_idx on public.reports (report_date desc);

create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);
create index if not exists calendar_events_starts_at_idx on public.calendar_events (starts_at);
create index if not exists calendar_events_event_type_idx on public.calendar_events (event_type);
create index if not exists calendar_events_source_idx on public.calendar_events (source_table, source_id);

create index if not exists ideas_user_id_idx on public.ideas (user_id);
create index if not exists ideas_status_idx on public.ideas (status);
create index if not exists ideas_updated_at_idx on public.ideas (updated_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

drop trigger if exists coach_sessions_set_updated_at on public.coach_sessions;
create trigger coach_sessions_set_updated_at
before update on public.coach_sessions
for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists bot_resources_set_updated_at on public.bot_resources;
create trigger bot_resources_set_updated_at
before update on public.bot_resources
for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at
before update on public.ideas
for each row execute function public.set_updated_at();

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, timezone('utc', now()), timezone('utc', now()))
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user_profile();

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.integrations enable row level security;
alter table public.coach_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.bot_resources enable row level security;
alter table public.reports enable row level security;
alter table public.calendar_events enable row level security;
alter table public.ideas enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "integrations_all_own" on public.integrations;
drop policy if exists "coach_sessions_all_own" on public.coach_sessions;
drop policy if exists "goals_all_own" on public.goals;
drop policy if exists "tasks_select_related" on public.tasks;
drop policy if exists "tasks_insert_creator" on public.tasks;
drop policy if exists "tasks_update_related" on public.tasks;
drop policy if exists "tasks_delete_creator" on public.tasks;
drop policy if exists "bot_resources_all_own" on public.bot_resources;
drop policy if exists "reports_all_own" on public.reports;
drop policy if exists "calendar_events_all_own" on public.calendar_events;
drop policy if exists "ideas_all_own" on public.ideas;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "integrations_all_own"
on public.integrations
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "coach_sessions_all_own"
on public.coach_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "goals_all_own"
on public.goals
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks_select_related"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id_assigned_by or auth.uid() = user_id_assigned_to);

create policy "tasks_insert_creator"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id_assigned_by);

create policy "tasks_update_related"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id_assigned_by or auth.uid() = user_id_assigned_to)
with check (auth.uid() = user_id_assigned_by or auth.uid() = user_id_assigned_to);

create policy "tasks_delete_creator"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id_assigned_by);

create policy "bot_resources_all_own"
on public.bot_resources
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reports_all_own"
on public.reports
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "calendar_events_all_own"
on public.calendar_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ideas_all_own"
on public.ideas
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
