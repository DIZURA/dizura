-- Agency suite (ADR 50): strategy blueprints, done-for-you service orders, private voiceover storage.
-- Same model as characters (0005/0006): written only by the server (service role); users may read
-- their own rows via RLS, but table privileges are revoked from anon/authenticated.
-- Blueprint sections are separate columns so the four parallel section writes never overwrite each other.

create table if not exists public.blueprints (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 120),
  goal             text not null check (goal in ('single_product','landing_page','pod','shopify','ugc','real_estate','travel')),
  locale           text not null default 'ar' check (locale in ('ar','en')),
  inputs           jsonb not null default '{}'::jsonb,
  strategy         jsonb,
  plan             jsonb,
  scripts          jsonb,
  prompts          jsonb,
  tags             text[] not null default '{}',
  credits_charged  integer not null default 0 check (credits_charged >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists blueprints_user_id_idx on public.blueprints (user_id, created_at desc);
alter table public.blueprints enable row level security;
create policy "own blueprints" on public.blueprints
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.blueprints from anon, authenticated;
grant select, insert, update, delete on table public.blueprints to service_role;

create table if not exists public.service_orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  service     text not null check (service in ('single_product','landing_page','pod','shopify')),
  amount      numeric(12,3) not null check (amount > 0),
  currency    text not null check (currency in ('SAR','KWD','AED','BHD','QAR','OMR','USD')),
  brief       jsonb not null default '{}'::jsonb,
  status      text not null default 'pending' check (status in ('pending','paid','cancelled','in_progress','delivered')),
  charge_id   text unique,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists service_orders_user_id_idx on public.service_orders (user_id, created_at desc);
alter table public.service_orders enable row level security;
create policy "own service orders" on public.service_orders
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.service_orders from anon, authenticated;
grant select, insert, update, delete on table public.service_orders to service_role;

-- Private voiceover bucket: the server uploads with the service role and streams files back through
-- our own API; no storage.objects policies for anon/authenticated.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voiceovers', 'voiceovers', false, 10485760, array['audio/mpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
