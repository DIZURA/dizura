-- provider_costs is server-only (service role bypasses RLS). Make "no client access" explicit.
create policy "no client access" on public.provider_costs
  for select to authenticated, anon using (false);
