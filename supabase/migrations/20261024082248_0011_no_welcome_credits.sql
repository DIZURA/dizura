-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-24.
-- Owner (2026-10-24): no free credits — credits come only from paid plans.
-- The trigger stays (ALTER over DROP); the function now grants nothing. Restore 0004's body to re-enable.
create or replace function private.grant_welcome_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

revoke all on function private.grant_welcome_credits() from public, anon, authenticated;
