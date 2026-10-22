-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-22.
-- Welcome bonus: 10 credits when a user's email becomes confirmed (or on insert if already
-- confirmed, e.g. OAuth). Not on unconfirmed signups, so throwaway accounts can't farm credits.
-- Idempotent via the ledger's unique (user_id, reason, reference_id) — granted at most once per user.
-- Keep the amount in sync with WELCOME_CREDITS in lib/credits/pricing.ts.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.grant_welcome_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null)
     and not coalesce(new.is_anonymous, false) then
    begin
      perform public.apply_credit_delta(new.id, 10, 'promo', 'welcome_bonus');
    exception when others then
      -- Never block sign-up/confirmation because of a ledger problem.
      raise warning 'welcome credits failed for user %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke all on function private.grant_welcome_credits() from public, anon, authenticated;

create trigger on_auth_user_confirmed_grant_welcome
after insert or update of email_confirmed_at on auth.users
for each row execute function private.grant_welcome_credits();
