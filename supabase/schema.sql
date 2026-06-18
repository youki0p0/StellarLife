-- Stellar Life — Supabase schema.
-- Run this in the SQL editor of your Supabase project (Project Settings -> API
-- gives you the URL + publishable key for .env.local).
--
-- The whole room (lobby seats + live game) is stored as a single jsonb blob on
-- the `rooms` row, synced via Realtime with optimistic concurrency on `version`.
-- This mirrors the StellarBurst room model so the same project can host both.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby',      -- 'lobby' | 'playing' | 'finished'
  host_client_id text,
  seed text,
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_code on public.rooms (code);

-- Keep updated_at fresh on every write.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.touch_updated_at();

-- Realtime: clients subscribe to UPDATEs on rooms.
alter publication supabase_realtime add table public.rooms;

-- Row-level security. These are permissive development policies (no auth, a
-- stable client_id lives in localStorage). Tighten before any public launch.
alter table public.rooms enable row level security;

drop policy if exists "rooms_all" on public.rooms;
create policy "rooms_all" on public.rooms
  for all using (true) with check (true);

-- Table privileges for the API roles. Without these, the publishable (anon)
-- key is authenticated but PostgREST returns 401 "permission denied for table
-- rooms" — which is the most common cause of a 401 on /rest/v1/rooms even when
-- RLS allows the row. Supabase usually grants these automatically, but granting
-- explicitly makes the schema self-contained when run via the SQL editor.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.rooms to anon, authenticated;
