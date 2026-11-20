-- Independent online record demo: Supabase SQL setup
-- Run once in Supabase Dashboard -> SQL Editor.
-- Public visitors can read ONE record by its unguessable ID through an RPC function.
-- Only explicitly registered admin users can list, add, edit, or delete records.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.marriage_records (
  id text primary key,
  app text not null,
  groom text not null,
  bride text not null,
  venue text not null default '',
  district text not null default '',
  tehsil text not null default '',
  subreg text not null default '',
  event_date text not null default '',
  regno text not null default '',
  regdate text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marriage_records_id_format check (length(id) between 20 and 100)
);

alter table public.app_admins enable row level security;
alter table public.marriage_records enable row level security;

-- Remove broad/default access. RLS policies alone do not remove SQL grants.
revoke all on table public.app_admins from public, anon, authenticated;
revoke all on table public.marriage_records from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- An authenticated user may read only their own admin membership row.
grant select on table public.app_admins to authenticated;
drop policy if exists "admins can read own membership" on public.app_admins;
create policy "admins can read own membership"
  on public.app_admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Admin CRUD. A user must first be added to app_admins by the project owner.
grant select, insert, update, delete on table public.marriage_records to authenticated;
drop policy if exists "approved admins manage marriage records" on public.marriage_records;
create policy "approved admins manage marriage records"
  on public.marriage_records
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_admins a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.app_admins a
      where a.user_id = (select auth.uid())
    )
  );

-- Narrow public read: return only the single row matching the supplied ID.
-- The random ID acts like a share-token. Anyone with that URL can view that record.
create or replace function public.get_marriage_record_by_id(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'id', r.id,
    'app', r.app,
    'groom', r.groom,
    'bride', r.bride,
    'venue', r.venue,
    'district', r.district,
    'tehsil', r.tehsil,
    'subreg', r.subreg,
    'event_date', r.event_date,
    'regno', r.regno,
    'regdate', r.regdate,
    'created_at', r.created_at
  )
  from public.marriage_records as r
  where r.id = p_id
  limit 1;
$function$;

revoke all on function public.get_marriage_record_by_id(text) from public;
grant execute on function public.get_marriage_record_by_id(text) to anon, authenticated;

-- Check the SQL completed, then create a Supabase Auth user in the Dashboard.
-- Copy that user's UUID and run this separately in SQL Editor:
-- insert into public.app_admins (user_id) values ('PASTE-AUTH-USER-UUID-HERE')
-- on conflict (user_id) do nothing;
