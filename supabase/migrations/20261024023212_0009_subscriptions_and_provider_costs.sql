-- ADR 51: monthly subscriptions (Tap saved card + merchant-initiated renewals) and the live
-- provider-cost table behind automatic 60%-margin pricing. Server-only writes (service role).

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  plan                  text not null check (plan in ('starter','pro','agency')),
  currency              text not null check (currency in ('SAR','USD')),
  status                text not null default 'pending' check (status in ('pending','active','past_due','canceled')),
  tap_customer_id       text,
  tap_card_id           text,
  tap_agreement_id      text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  renewal_claim         text,
  claimed_at            timestamptz,
  failed_attempts       integer not null default 0 check (failed_attempts >= 0),
  next_retry_at         timestamptz,
  last_charge_id        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
-- At most one live plan per user.
create unique index if not exists subscriptions_one_live_per_user on public.subscriptions (user_id) where status in ('active','past_due');
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id, created_at desc);
create index if not exists subscriptions_due_idx on public.subscriptions (current_period_end) where status in ('active','past_due');
alter table public.subscriptions enable row level security;
create policy "own subscriptions" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.subscriptions from anon, authenticated;
grant select, insert, update on table public.subscriptions to service_role;

create table if not exists public.provider_costs (
  key         text primary key check (key ~ '^[A-Za-z0-9_]{1,40}$'),
  usd         numeric(12,6) not null check (usd > 0),
  source      text not null check (source in ('estimate','usage','manual')),
  samples     integer not null default 0 check (samples >= 0),
  updated_at  timestamptz not null default now()
);
alter table public.provider_costs enable row level security;
-- No client policies: read and written only by the server (service role).
revoke all on table public.provider_costs from anon, authenticated;
grant select, insert, update on table public.provider_costs to service_role;
