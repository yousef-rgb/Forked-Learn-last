-- Forked Learn — database setup (profiles + game_states, Row Level Security, signup trigger)
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
-- SAFE TO RE-RUN: it only creates what is missing and re-creates policies/trigger. It never drops
-- tables, columns or rows, so existing users and their progress are preserved.

-- ───────────── profiles ─────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default 'Adventurer',
  username      text not null default 'adventurer',
  goal          text,
  level         text,
  track         text,
  daily_minutes integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Bring a pre-existing table up to the shape the app expects (no-ops when the column already exists).
alter table public.profiles add column if not exists name          text;
alter table public.profiles add column if not exists username      text;
alter table public.profiles add column if not exists goal          text;
alter table public.profiles add column if not exists level         text;
alter table public.profiles add column if not exists track         text;
alter table public.profiles add column if not exists daily_minutes integer;
alter table public.profiles add column if not exists created_at    timestamptz default now();
alter table public.profiles add column if not exists updated_at    timestamptz default now();

-- ───────────── game_states (one JSON progress document per user) ─────────────
create table if not exists public.game_states (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.game_states add column if not exists state      jsonb default '{}'::jsonb;
alter table public.game_states add column if not exists updated_at timestamptz default now();

-- Keep a single row from growing without bound (1 MB is far above real usage).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'game_states_state_size') then
    alter table public.game_states add constraint game_states_state_size check (pg_column_size(state) < 1000000);
  end if;
end $$;

-- ───────────── Row Level Security: every user can only touch their own rows ─────────────
alter table public.profiles    enable row level security;
alter table public.game_states enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using      ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using      ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "game_states_select_own" on public.game_states;
drop policy if exists "game_states_insert_own" on public.game_states;
drop policy if exists "game_states_update_own" on public.game_states;
create policy "game_states_select_own" on public.game_states for select to authenticated using      ((select auth.uid()) = user_id);
create policy "game_states_insert_own" on public.game_states for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "game_states_update_own" on public.game_states for update to authenticated using      ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Signed-out visitors (anon) get no access at all; signed-in users get no DELETE (rows go with the account).
revoke all on public.profiles    from anon;
revoke all on public.game_states from anon;
grant select, insert, update on public.profiles    to authenticated;
grant select, insert, update on public.game_states to authenticated;

-- ───────────── create the profile automatically at signup ─────────────
-- Runs inside the database when auth.users gets a row, so the name typed on the signup form
-- (stored in raw_user_meta_data) is kept even when email confirmation is required, and OAuth users
-- (Google: full_name, GitHub: user_name) get a profile too. ON CONFLICT DO NOTHING => never duplicates.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text;
  nm    text;
begin
  uname := lower(regexp_replace(
             split_part(coalesce(nullif(meta->>'username', ''), nullif(meta->>'user_name', ''),
                                 nullif(meta->>'preferred_username', ''), new.email, ''), '@', 1),
             '[^a-zA-Z0-9_]', '', 'g'));
  uname := left(coalesce(nullif(uname, ''), 'adventurer'), 16);
  nm    := coalesce(nullif(trim(meta->>'name'), ''), nullif(trim(meta->>'full_name'), ''), initcap(uname));

  insert into public.profiles (id, name, username)
  values (new.id, left(nm, 60), uname)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── optional check: list every policy on these tables ─────────────
-- Run this separately and make sure no extra permissive policy (for example "using (true)") exists:
--   select tablename, policyname, cmd, roles, qual from pg_policies
--   where schemaname = 'public' and tablename in ('profiles', 'game_states');
