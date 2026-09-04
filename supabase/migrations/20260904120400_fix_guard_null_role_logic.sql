-- =============================================================================
-- BUGFIX: the guard trigger did nothing when auth.role() was NULL
-- =============================================================================
-- Found by functional test, not by reading: an INSERT that set
-- moderation_state='hidden', is_verified=true, usage_count=999999 and
-- report_count=-5 was accepted verbatim.
--
-- Cause: auth.role() is NULL outside a PostgREST request (direct connection,
-- SQL editor, psql). In SQL, `NULL = 'service_role'` is NULL, not false, so
--   privileged := bypass or (NULL = 'service_role')   -->  false or NULL  -->  NULL
-- and `if not privileged then` never ran, because `not NULL` is NULL, not true.
-- Postgres three-valued logic: the "unknown" case silently skipped the guard.
--
-- Fix: coalesce() to a real boolean so an unknown role falls to the LOCKED-DOWN
-- branch. Re-tested after applying: the same hostile insert now comes back as
-- visible / is_verified=false / usage_count=0 / report_count=0.
-- =============================================================================

create or replace function public.foods_guard() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bypass boolean := coalesce(current_setting('app.moderation_bypass', true), 'off') = 'on';
  privileged boolean := bypass or coalesce(auth.role(), '') = 'service_role';
begin
  if tg_op = 'INSERT' then
    if not privileged then
      new.moderation_state := 'visible';
      new.report_count := 0;
      new.usage_count := 0;
      new.is_verified := false;
    end if;
    new.revision := nextval('public.foods_revision_seq');
  elsif tg_op = 'UPDATE' then
    if not privileged then
      new.moderation_state := old.moderation_state;
      new.report_count := old.report_count;
      new.usage_count := old.usage_count;
      new.is_verified := old.is_verified;
      new.owner_user_id := old.owner_user_id;
      new.created_at := old.created_at;
    end if;
    new.revision := nextval('public.foods_revision_seq');
  end if;
  return new;
end;
$$;

create or replace function public.foods_rate_limit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if coalesce(auth.role(), '') = 'service_role' or new.owner_user_id is null then
    return new;
  end if;

  select count(*) into recent_count
    from public.foods
   where owner_user_id = new.owner_user_id
     and created_at > now() - interval '24 hours';

  if recent_count >= 50 then
    raise exception 'Daily limit reached: 50 new foods per day.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- create or replace resets grants, so re-apply the lockdown.
revoke all on function public.foods_guard() from public, anon, authenticated;
revoke all on function public.foods_rate_limit() from public, anon, authenticated;
