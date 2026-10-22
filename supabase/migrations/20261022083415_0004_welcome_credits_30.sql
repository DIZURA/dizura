-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-22.
-- Raise the welcome bonus from 10 to 30 credits so new users can try a short video.
-- Same trigger/guards as 0003; only the amount changes. Keep in sync with WELCOME_CREDITS.
-- (Grants survive CREATE OR REPLACE; the REVOKE is repeated for clarity.)
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
      perform public.apply_credit_delta(new.id, 30, 'promo', 'welcome_bonus');
    exception when others then
      raise warning 'welcome credits failed for user %: %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke all on function private.grant_welcome_credits() from public, anon, authenticated;
