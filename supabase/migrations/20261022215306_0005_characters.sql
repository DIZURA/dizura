-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-22.
-- Soul ID characters (Higgsfield custom references) owned by a user.
-- Written only by the server (service role); users may read their own rows via RLS,
-- but table privileges are revoked from anon/authenticated (no direct client access today).
create table if not exists public.characters (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  name                   text not null check (char_length(name) between 1 and 60),
  provider_reference_id  text unique,
  status                 text not null default 'queued'
                         check (status in ('uploading','not_ready','queued','in_progress','completed','failed')),
  model_version          text not null default 'v2',
  thumbnail_url          text,
  fail_reason            text,
  photo_count            integer not null check (photo_count between 1 and 100),
  credits_charged        integer not null default 0,
  consent_at             timestamptz not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists characters_user_id_idx on public.characters (user_id, created_at desc);

alter table public.characters enable row level security;

create policy "own characters" on public.characters
  for select to authenticated using ((select auth.uid()) = user_id);

-- No direct client access; the server uses the service role.
revoke all on table public.characters from anon, authenticated;
