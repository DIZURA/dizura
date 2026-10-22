-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-22.
-- The server talks to Postgres as service_role. 0001 revoked EXECUTE from PUBLIC (to keep
-- anon/authenticated out), which also removed service_role's inherited access, and this project
-- does not auto-grant table privileges. Grant service_role exactly what the server uses.
-- Verified (rolled back): welcome 30 -> spend 5 -> 25, replayed spend is a no-op, character insert OK,
-- authenticated still gets "permission denied" on public.characters.
grant execute on function public.apply_credit_delta(uuid, integer, text, text) to service_role;
grant execute on function public.get_credit_balance(uuid) to service_role;
grant select, insert, update, delete on table public.characters to service_role;
