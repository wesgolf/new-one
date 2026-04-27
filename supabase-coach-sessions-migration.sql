-- ============================================================
-- Artist OS — coach_sessions table
-- Stores per-user coach chat sessions with a human summary and
-- the full conversation payload as JSONB.
-- ============================================================

create table if not exists public.coach_sessions (
  id                uuid         primary key,
  user_id           uuid         not null references auth.users(id) on delete cascade,
  title             text         not null default 'New chat',
  summary           text,
  conversation_json jsonb        not null default '{}'::jsonb,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create index if not exists coach_sessions_user_id_idx
  on public.coach_sessions(user_id);

create index if not exists coach_sessions_updated_at_idx
  on public.coach_sessions(user_id, updated_at desc);

create or replace function public.set_coach_sessions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_sessions_updated_at on public.coach_sessions;
create trigger coach_sessions_updated_at
  before update on public.coach_sessions
  for each row execute function public.set_coach_sessions_updated_at();

alter table public.coach_sessions enable row level security;

grant select, insert, update, delete on public.coach_sessions to authenticated;

drop policy if exists coach_sessions_select on public.coach_sessions;
create policy coach_sessions_select
  on public.coach_sessions for select
  using (auth.uid() = user_id);

drop policy if exists coach_sessions_insert on public.coach_sessions;
create policy coach_sessions_insert
  on public.coach_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists coach_sessions_update on public.coach_sessions;
create policy coach_sessions_update
  on public.coach_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists coach_sessions_delete on public.coach_sessions;
create policy coach_sessions_delete
  on public.coach_sessions for delete
  using (auth.uid() = user_id);
