-- DIZURA credit ledger. Applied to project mxzeeyqektwdncsryhyk on 2026-10-22.
-- Balance is derived from an append-only ledger; uniqueness gives idempotency.

create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  delta         integer not null check (delta <> 0),
  reason        text not null check (reason in ('purchase','generation','refund','promo','admin_adjustment')),
  reference_id  text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, reason, reference_id)
);

create table if not exists public.credit_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    integer not null default 0, -- non-negativity enforced in apply_credit_delta
  updated_at timestamptz not null default now()
);

alter table public.credit_ledger   enable row level security;
alter table public.credit_balances enable row level security;

-- Users may read their own rows; all writes go through the service role RPC below.
create policy "own ledger"  on public.credit_ledger   for select using (auth.uid() = user_id);
create policy "own balance" on public.credit_balances for select using (auth.uid() = user_id);

create or replace function public.get_credit_balance(p_user_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.credit_balances where user_id = p_user_id), 0);
$$;

-- Atomic, idempotent. Returns false if the (user, reason, reference) was already applied.
create or replace function public.apply_credit_delta(
  p_user_id uuid, p_delta integer, p_reason text, p_reference_id text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  insert into public.credit_ledger (user_id, delta, reason, reference_id)
  values (p_user_id, p_delta, p_reason, p_reference_id)
  on conflict (user_id, reason, reference_id) do nothing;
  if not found then
    return false;
  end if;

  insert into public.credit_balances (user_id, balance) values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.credit_balances
     set balance = balance + p_delta, updated_at = now()
   where user_id = p_user_id
  returning balance into v_balance;

  if v_balance < 0 then
    raise exception 'insufficient_credits';
  end if;
  return true;
end;
$$;

revoke all on function public.apply_credit_delta(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.get_credit_balance(uuid) from public, anon, authenticated;
