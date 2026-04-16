-- ============================================================
-- Artist OS — tasks table
-- Run this in the Supabase SQL editor.
-- ============================================================

create table if not exists public.tasks (
  id            uuid         primary key default gen_random_uuid(),
  title         text         not null,
  description   text,
  status        text         not null default 'todo'
                             check (status in ('todo', 'in_progress', 'done', 'blocked')),
  priority      text         not null default 'medium'
                             check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to   uuid         references public.profiles(id) on delete set null,
  created_by    uuid         references public.profiles(id) on delete set null,
  due_date      timestamptz,
  completed_at  timestamptz,
  related_type  text,
  related_id    uuid,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

-- Indexes for common query patterns
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx       on public.tasks(status);
create index if not exists tasks_due_date_idx     on public.tasks(due_date);
create index if not exists tasks_created_by_idx   on public.tasks(created_by);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.tasks enable row level security;

-- Any authenticated user can read all tasks (collaboration visibility)
create policy "tasks_select"
  on public.tasks for select
  using (auth.uid() is not null);

-- Users can only insert tasks where they are the creator
create policy "tasks_insert"
  on public.tasks for insert
  with check (auth.uid() = created_by);

-- Users can update tasks they are assigned to or created
create policy "tasks_update"
  on public.tasks for update
  using (
    auth.uid() = assigned_to
    or auth.uid() = created_by
  );

-- Users can delete only tasks they created
create policy "tasks_delete"
  on public.tasks for delete
  using (auth.uid() = created_by);

-- ─── updated_at trigger ──────────────────────────────────────────────────────

create or replace function public.set_task_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_updated_at on public.tasks;
create trigger task_updated_at
  before update on public.tasks
  for each row execute function public.set_task_updated_at();
