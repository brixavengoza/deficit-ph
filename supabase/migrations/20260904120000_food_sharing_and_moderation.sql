-- =============================================================================
-- Food sharing: let a food one user creates be findable by everyone
-- =============================================================================
-- Builds on the EXISTING schema applied on 2026-05-10 (trackk_core_mvp_schema +
-- trackk_schema_hardening_and_rls_perf). It does NOT create a parallel
-- "community_foods" table: public.foods already has owner_user_id, a
-- food_source enum and per-100g nutrition, so sharing is a change to that table.
--
-- Before: foods_select_owner_or_global = you see YOUR foods plus global ones
--         (owner_user_id IS NULL). Another user's food was invisible.
-- After:  you also see other users' SHARED, visible, non-deleted foods.
--
-- Moderation model is POST-moderation per Brix's direction: a shared food is
-- live immediately, reports can hide it. Apple Guideline 1.2 still requires the
-- reporting and blocking paths, which is why they ship in this same migration.
--
-- Also closes the cloud/local column gap: the on-device SQLite `foods` table
-- already carries fiber, sugar, sodium and serving_grams; the cloud did not.
-- =============================================================================

-- Fuzzy name search: "adob" should find "Chicken Adobo".
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. Close the nutrition column gap with the on-device schema.
-- -----------------------------------------------------------------------------
alter table public.foods
  add column if not exists fiber_per_100g numeric not null default 0
    check (fiber_per_100g >= 0 and fiber_per_100g <= 100),
  add column if not exists sugar_per_100g numeric not null default 0
    check (sugar_per_100g >= 0 and sugar_per_100g <= 100),
  add column if not exists sodium_mg_per_100g numeric not null default 0
    check (sodium_mg_per_100g >= 0 and sodium_mg_per_100g <= 100000),
  -- Grams in ONE serving, so "2 servings" scales by the food's real weight
  -- instead of a flat 100 g (mirrors SQLite schema version 4).
  add column if not exists serving_grams numeric
    check (serving_grams is null or (serving_grams > 0 and serving_grams <= 5000)),
  add column if not exists brand text
    check (brand is null or char_length(trim(brand)) <= 60);

-- -----------------------------------------------------------------------------
-- 2. Sharing + moderation columns.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'moderation_state' and n.nspname = 'public') then
    create type public.moderation_state as enum ('visible', 'hidden', 'removed');
  end if;
end
$$;

alter table public.foods
  -- Shared by default, per Brix's direction, with a per-food opt-out.
  add column if not exists is_shared boolean not null default true,
  add column if not exists moderation_state public.moderation_state not null default 'visible',
  add column if not exists report_count integer not null default 0,
  -- How many times this food has been logged; ranks the real Adobo above duplicates.
  add column if not exists usage_count integer not null default 0,
  -- Staff-checked entries rank first and are exempt from report auto-hide.
  add column if not exists is_verified boolean not null default false;

-- Monotonic counter driving incremental sync into the local SQLite mirror.
-- A sequence, not updated_at: timestamps are not reliably ordered across
-- concurrent transactions, so a clock-based cursor can skip rows.
create sequence if not exists public.foods_revision_seq;
alter table public.foods
  add column if not exists revision bigint not null default nextval('public.foods_revision_seq');

-- -----------------------------------------------------------------------------
-- 3. Indexes for search, ranking and sync.
-- -----------------------------------------------------------------------------
create index if not exists foods_name_trgm_idx
  on public.foods using gin (name gin_trgm_ops);
create index if not exists foods_revision_idx
  on public.foods (revision);
create index if not exists foods_shared_ranking_idx
  on public.foods (is_verified desc, usage_count desc)
  where is_shared and moderation_state = 'visible' and deleted_at is null;

-- Anti-spam: one author cannot publish the same food name twice.
create unique index if not exists foods_owner_name_uidx
  on public.foods (owner_user_id, lower(trim(name)))
  where deleted_at is null and owner_user_id is not null;

-- -----------------------------------------------------------------------------
-- 4. blocked_users - Apple 1.2 requires a way to block an author outright.
-- -----------------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);

alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_manage_own on public.blocked_users;
create policy blocked_users_manage_own on public.blocked_users
  for all
  to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. The actual sharing change: widen SELECT, keep writes owner-only.
-- -----------------------------------------------------------------------------
drop policy if exists foods_select_owner_or_global on public.foods;

create policy foods_select_own_global_or_shared on public.foods
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())          -- my own, any state
    or owner_user_id is null                      -- seed / staff catalog
    or (                                          -- someone else's, shared and clean
      is_shared
      and moderation_state = 'visible'
      and deleted_at is null
      and not exists (                            -- unless I blocked that author
        select 1 from public.blocked_users b
         where b.blocker_id = (select auth.uid())
           and b.blocked_id = foods.owner_user_id
      )
    )
  );

-- INSERT/UPDATE/DELETE policies are unchanged: still owner-only.

-- -----------------------------------------------------------------------------
-- 6. food_reports - the reporting path.
-- UNIQUE(reporter, food) stops one account inflating a report count.
-- -----------------------------------------------------------------------------
create table if not exists public.food_reports (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null
    check (reason in ('wrong_nutrition', 'spam', 'inappropriate', 'duplicate', 'other')),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, food_id)
);

create index if not exists food_reports_food_idx on public.food_reports (food_id);

alter table public.food_reports enable row level security;

drop policy if exists food_reports_insert_own on public.food_reports;
create policy food_reports_insert_own on public.food_reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists food_reports_select_own on public.food_reports;
create policy food_reports_select_own on public.food_reports
  for select
  to authenticated
  using (reporter_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 7. Guard trigger: the client may never set its own moderation state,
-- verification badge, counters or sync revision.
--
-- `app.moderation_bypass` is a transaction-local flag set only by the trusted
-- functions below. Without it their own UPDATEs would be reverted by this very
-- trigger, because they run in the calling user's role, not service_role.
-- -----------------------------------------------------------------------------
create or replace function public.foods_guard() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bypass boolean := coalesce(current_setting('app.moderation_bypass', true), 'off') = 'on';
  privileged boolean := bypass or auth.role() = 'service_role';
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

drop trigger if exists foods_guard_trg on public.foods;
create trigger foods_guard_trg
  before insert or update on public.foods
  for each row execute function public.foods_guard();

-- -----------------------------------------------------------------------------
-- 8. Rate limit: a compromised account cannot flood the shared table.
-- 50 new foods per rolling 24h is far above real use.
-- -----------------------------------------------------------------------------
create or replace function public.foods_rate_limit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if auth.role() = 'service_role' or new.owner_user_id is null then
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

drop trigger if exists foods_rate_limit_trg on public.foods;
create trigger foods_rate_limit_trg
  before insert on public.foods
  for each row execute function public.foods_rate_limit();

-- -----------------------------------------------------------------------------
-- 9. Apply a report: refresh the count, auto-hide at 3 DISTINCT reporters.
--
-- TRADE-OFF, stated plainly: three coordinated accounts can hide a legitimate
-- food. The alternative (nothing hides until a human looks) leaves objectionable
-- content live for hours, which is the Apple 1.2 rejection risk. Hiding is
-- reversible by staff, the author still sees their own entry, and verified
-- entries are exempt. Revisit the threshold once real report volume exists.
-- -----------------------------------------------------------------------------
create or replace function public.food_reports_apply() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  distinct_reports integer;
begin
  select count(*) into distinct_reports
    from public.food_reports
   where food_id = new.food_id;

  perform set_config('app.moderation_bypass', 'on', true);

  update public.foods
     set report_count = distinct_reports,
         moderation_state = case
           when distinct_reports >= 3 and not is_verified and moderation_state = 'visible'
             then 'hidden'::public.moderation_state
           else moderation_state
         end
   where id = new.food_id;

  perform set_config('app.moderation_bypass', 'off', true);

  return new;
end;
$$;

drop trigger if exists food_reports_apply_trg on public.food_reports;
create trigger food_reports_apply_trg
  after insert on public.food_reports
  for each row execute function public.food_reports_apply();

-- -----------------------------------------------------------------------------
-- 10. Usage ranking. An RPC, not a client UPDATE, so it cannot be gamed.
-- -----------------------------------------------------------------------------
create or replace function public.bump_food_usage(target_food_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.moderation_bypass', 'on', true);
  update public.foods
     set usage_count = usage_count + 1
   where id = target_food_id
     and deleted_at is null;
  perform set_config('app.moderation_bypass', 'off', true);
end;
$$;

revoke all on function public.bump_food_usage(uuid) from public;
grant execute on function public.bump_food_usage(uuid) to authenticated;
