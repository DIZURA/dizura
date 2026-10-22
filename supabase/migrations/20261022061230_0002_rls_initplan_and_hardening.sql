-- Applied to project mxzeeyqektwdncsryhyk on 2026-10-22. Fixes Supabase advisor findings:
-- 1. auth_rls_initplan: wrap auth.uid() in a sub-select so it's evaluated once per query, and scope policies to `authenticated`.
-- 2. anon/authenticated could execute SECURITY DEFINER rls_auto_enable() (the project's built-in RLS event trigger)
--    via /rest/v1/rpc. Event triggers fire without EXECUTE grants, so revoking is safe.
alter policy "own ledger"  on public.credit_ledger   to authenticated using ((select auth.uid()) = user_id);
alter policy "own balance" on public.credit_balances to authenticated using ((select auth.uid()) = user_id);
-- Guarded: rls_auto_enable() is project-level and may not exist on fresh preview branches.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
