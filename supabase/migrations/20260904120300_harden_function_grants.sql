-- =============================================================================
-- Lock down function execution over the REST API
-- =============================================================================
-- Caught by the Supabase security advisor after applying the sharing migration.
--
-- Supabase sets DEFAULT PRIVILEGES that grant EXECUTE on every newly created
-- function to anon, authenticated and service_role. So `revoke ... from public`
-- inside a migration is NOT enough: anon keeps its own explicit grant, and every
-- function becomes callable at /rest/v1/rpc/<name>.
--
-- Trigger functions were exposed this way too. Revoking EXECUTE does not affect
-- triggers, which fire as the table owner rather than as the calling role.
-- =============================================================================

revoke all on function public.foods_guard() from public, anon, authenticated;
revoke all on function public.foods_rate_limit() from public, anon, authenticated;
revoke all on function public.food_reports_apply() from public, anon, authenticated;
-- Pre-existing trigger function from the May 2026 schema, same exposure, same fix.
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Signed-in users only (login is mandatory, so anon has no business reading the
-- shared catalog or touching counters).
revoke all on function public.bump_food_usage(uuid) from public, anon;
grant execute on function public.bump_food_usage(uuid) to authenticated;

revoke all on function public.search_shared_foods(text, integer) from public, anon;
grant execute on function public.search_shared_foods(text, integer) to authenticated;

revoke all on function public.shared_foods_since(bigint, integer) from public, anon;
grant execute on function public.shared_foods_since(bigint, integer) to authenticated;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
