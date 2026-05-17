-- soluXYZon World Clock — initial schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → RUN
--
-- Creates a `cities` table scoped to authenticated users, with Row Level
-- Security enforcing that each user can only read/write their own rows.

create table if not exists public.cities (
  -- Composite key: each user owns rows keyed by client-side city id
  user_id      uuid        not null references auth.users(id) on delete cascade,
  id           text        not null,
  name         text        not null,
  country      text        not null default '',
  lat          double precision not null,
  lng          double precision not null,
  timezone     text        not null,
  label        text        not null check (label in ('Client','Family','Friend','Professor','Team','Other')),
  custom_label text,
  enabled      boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

-- Keep updated_at fresh on every modification
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists cities_touch_updated_at on public.cities;
create trigger cities_touch_updated_at
  before update on public.cities
  for each row execute function public.touch_updated_at();

-- Row Level Security: a user can only see and mutate their own rows
alter table public.cities enable row level security;

drop policy if exists "cities_select_own" on public.cities;
create policy "cities_select_own"
  on public.cities for select
  using (auth.uid() = user_id);

drop policy if exists "cities_insert_own" on public.cities;
create policy "cities_insert_own"
  on public.cities for insert
  with check (auth.uid() = user_id);

drop policy if exists "cities_update_own" on public.cities;
create policy "cities_update_own"
  on public.cities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cities_delete_own" on public.cities;
create policy "cities_delete_own"
  on public.cities for delete
  using (auth.uid() = user_id);

-- Helpful index for ordering by recency
create index if not exists cities_user_updated_idx
  on public.cities (user_id, updated_at desc);

-- Grant table-level access to the authenticated role.
-- RLS policies above scope each user to their own rows; these grants
-- let PostgREST forward authenticated requests to RLS in the first place.
-- (Tables created via the Supabase Table Editor get these automatically;
-- tables created via raw SQL do not.)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.cities to authenticated;

-- Belt-and-suspenders: ensure future tables in this schema also get
-- granted automatically (so we don't hit this again on the next table).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
