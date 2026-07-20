-- =============================================================================
-- deficit-ph backend foundation — DESIGN / DOCUMENTATION ONLY. DO NOT APPLY YET.
-- =============================================================================
-- This migration is written but INTENTIONALLY NOT APPLIED. Provisioning it requires
-- a live Supabase project + business decisions the user has not made in this session
-- (project region for PH data residency, auth providers, RevenueCat, App Store Connect).
-- It is checked in as the reviewed design so the future backend pass can apply it as-is.
--
-- It encodes every relevant Critical/High red-team fix:
--   * separate catalog_foods (never widen the local foods.source CHECK).
--   * recipe_ingredients SNAPSHOT macros + catalog link is ON DELETE SET NULL (no CASCADE
--     to catalog) so a catalog refresh can never delete a user's recipe ingredients.
--   * recipes UPDATE WITH CHECK re-pins moderation_state='pending' on any content edit
--     (blocks self-approve and edit-after-approval abuse).
--   * recipe_reports UNIQUE(reporter_id, recipe_id) (anti-sybil) + never auto-hide on raw
--     counts alone.
--   * blocked feed filtering uses NOT EXISTS (never NOT IN — the NULL trap zeroes results).
--   * entitlements is populated by a RevenueCat webhook / edge function and RLS reads THAT,
--     never a client-supplied "paid" flag (server backstop for the recipe cap).
--   * offline-first caveat: catalog_foods is readable by anon; recipes require an
--     authenticated session, so the community tab must degrade gracefully offline.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- catalog_foods — centrally managed, verified food catalog (remote source of truth).
-- The app mirrors this into a SEPARATE local SQLite `catalog_foods` table via a sync job.
-- -----------------------------------------------------------------------------
create table if not exists public.catalog_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kcal_per_100g numeric not null default 0 check (kcal_per_100g >= 0),
  protein_per_100g numeric not null default 0 check (protein_per_100g >= 0),
  carbs_per_100g numeric not null default 0 check (carbs_per_100g >= 0),
  fat_per_100g numeric not null default 0 check (fat_per_100g >= 0),
  fiber_per_100g numeric not null default 0 check (fiber_per_100g >= 0),
  sugar_per_100g numeric not null default 0 check (sugar_per_100g >= 0),
  sodium_mg_per_100g numeric not null default 0 check (sodium_mg_per_100g >= 0),
  serving_size_label text,
  provenance text,                       -- 'fnri' | 'usda' | 'staff' | ...
  verified boolean not null default false,
  revision integer not null default 0,   -- bumped on every server edit; drives incremental sync
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                 -- soft delete; clients keep logging history via snapshot
);
create index if not exists catalog_foods_name_idx on public.catalog_foods (lower(name));
create index if not exists catalog_foods_revision_idx on public.catalog_foods (revision);

alter table public.catalog_foods enable row level security;

-- Public read (anon + authenticated) so the catalog works before/without sign-in and offline
-- caching is populated on first launch. Writes are service_role only (central management).
create policy catalog_foods_public_read on public.catalog_foods
  for select using (deleted_at is null);
-- (no insert/update/delete policy => only service_role, which bypasses RLS, may write.)

-- NOTE FOR THE CLIENT SYNC JOB: upsert with
--   INSERT ... ON CONFLICT (id) DO UPDATE SET <server-owned columns>, never INSERT OR REPLACE,
-- pull incrementally by `revision`, and chunk off the launch critical path.

-- -----------------------------------------------------------------------------
-- entitlements — server-authoritative one-time-unlock ("Unli Mode") + recipe cap backstop.
-- Populated ONLY by a RevenueCat webhook (or App Store Server Notifications / Play RTDN)
-- via an edge function running as service_role. The client NEVER writes here; a rooted user
-- editing local SQLite cannot grant themselves entitlement because RLS reads THIS table.
-- -----------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unlocked boolean not null default false,     -- one-time purchase active
  product_id text,
  store text,                                  -- 'app_store' | 'play_store'
  recipe_publish_limit integer not null default 5,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- A user may READ their own entitlement (to reconcile the local cache). No client writes.
create policy entitlements_read_own on public.entitlements
  for select using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- recipes — community-published recipes (UGC). Apple 1.2 compliant moderation.
-- -----------------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 2000),
  servings numeric not null default 1 check (servings > 0),
  -- Macros are PRE-COMPUTED and stored (sum-exact-then-round-once at write time), so the
  -- feed never recomputes from ingredients (avoids compounding FP drift + the ethanol
  -- kcal≠4P+4C+9F case). Carry stated totals verbatim.
  total_kcal numeric not null default 0 check (total_kcal >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carbs_g numeric not null default 0 check (carbs_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  moderation_state text not null default 'pending'
    check (moderation_state in ('pending', 'approved', 'rejected', 'hidden')),
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists recipes_public_feed_idx
  on public.recipes (created_at desc)
  where visibility = 'public' and moderation_state = 'approved' and deleted_at is null;
create index if not exists recipes_author_idx on public.recipes (author_id);

alter table public.recipes enable row level security;

-- Read: an approved public recipe OR your own (any state, so the author always sees their own
-- post immediately — optimistic, with a "Nasa review pa" badge rendered client-side).
create policy recipes_select_approved_or_own on public.recipes
  for select using (
    author_id = auth.uid()
    or (visibility = 'public' and moderation_state = 'approved' and deleted_at is null)
  );

-- Insert: only as yourself. A BEFORE trigger (below) force-pins moderation_state='pending'
-- and recomputes report_count=0 regardless of client input.
create policy recipes_insert_own on public.recipes
  for insert with check (author_id = auth.uid());

-- Update: only your own row. moderation_state is intentionally NOT restricted here — an
-- author must be able to soft-delete or unpublish an already-APPROVED recipe (e.g. flip
-- visibility to private, set deleted_at) without the check rejecting the row for still being
-- 'approved'. Self-approval is instead blocked inside the trigger below, where OLD vs NEW
-- can actually be compared, so an unrelated update never gets locked out.
create policy recipes_update_own on public.recipes
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Delete: soft-delete via update in practice; hard-delete restricted to own row.
create policy recipes_delete_own on public.recipes
  for delete using (author_id = auth.uid());

-- Force moderation state + reset counters server-side. Runs for INSERT and for any UPDATE.
-- Two independent rules, both re-evaluated every UPDATE (not just when the "obvious" trigger
-- would fire), so an approved row can be freely soft-deleted/unpublished without losing its
-- state, while an author can never newly introduce 'approved' themselves and any content edit
-- always drops back to 'pending' for re-review:
--   1) Only a service_role caller (an admin/moderation edge function) may transition a row
--      INTO 'approved'. An authenticated author's own request cannot, regardless of whether
--      moderation_state was explicitly included in their UPDATE payload.
--   2) Any edit to a content column re-pins 'pending', even if the row was already approved.
create or replace function public.recipes_pin_moderation() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    new.moderation_state := 'pending';
    new.report_count := 0;
  elsif tg_op = 'UPDATE' then
    if new.moderation_state = 'approved'
       and old.moderation_state is distinct from 'approved'
       and auth.role() is distinct from 'service_role' then
      new.moderation_state := old.moderation_state;
    end if;
    if new.title is distinct from old.title
       or new.notes is distinct from old.notes
       or new.total_kcal is distinct from old.total_kcal
       or new.protein_g is distinct from old.protein_g
       or new.carbs_g is distinct from old.carbs_g
       or new.fat_g is distinct from old.fat_g then
      new.moderation_state := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists recipes_pin_moderation_trg on public.recipes;
create trigger recipes_pin_moderation_trg
  before insert or update on public.recipes
  for each row execute function public.recipes_pin_moderation();

-- Server-backstopped publish cap: block a NEW public recipe once the author is at their
-- limit unless they hold the one-time unlock. Checked against the AUTHORITATIVE server
-- count, never a stale client cache. (Runs as a constraint trigger so it also fires when a
-- private recipe is flipped to public.)
--
-- Concurrency note: a plain "count then compare" in a BEFORE trigger is NOT atomic — two
-- simultaneous publish requests from the same author can each read count=cap-1 and both
-- pass, landing one over the limit. Postgres has no cheap unique/partial index that can
-- express "at most N rows per author" (unlike "at most 1"), so this takes a per-author
-- advisory transaction lock before counting: the first concurrent request holds the lock
-- for the rest of its transaction, so the second one blocks until the first commits (or
-- rolls back) and only then sees the up-to-date count. Different authors never contend.
create or replace function public.recipes_enforce_publish_cap() returns trigger as $$
declare
  published_count integer;
  is_unlocked boolean;
  cap integer;
begin
  if new.visibility <> 'public' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));
  select coalesce(bool_or(unlocked), false), coalesce(max(recipe_publish_limit), 5)
    into is_unlocked, cap
    from public.entitlements where user_id = new.author_id;
  if is_unlocked then
    return new;
  end if;
  select count(*) into published_count
    from public.recipes
    where author_id = new.author_id
      and visibility = 'public'
      and deleted_at is null
      and id <> new.id;
  if published_count >= cap then
    raise exception 'recipe publish limit reached (% of %). Unlock Unli Mode to publish more.',
      published_count, cap using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_enforce_publish_cap_trg on public.recipes;
create trigger recipes_enforce_publish_cap_trg
  before insert or update of visibility on public.recipes
  for each row execute function public.recipes_enforce_publish_cap();

-- -----------------------------------------------------------------------------
-- recipe_ingredients — SNAPSHOT nutrition per ingredient (mirrors food_logs' immutability).
-- catalog_food_id is a NULLABLE link that is ON DELETE SET NULL — NEVER cascade — so a
-- catalog delete/refresh can never delete a recipe's ingredients.
-- -----------------------------------------------------------------------------
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  catalog_food_id uuid references public.catalog_foods (id) on delete set null,
  name_snapshot text not null,
  grams numeric not null default 0 check (grams >= 0),
  kcal_per_100g_snapshot numeric not null default 0,
  protein_per_100g_snapshot numeric not null default 0,
  carbs_per_100g_snapshot numeric not null default 0,
  fat_per_100g_snapshot numeric not null default 0,
  position integer not null default 0
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

alter table public.recipe_ingredients enable row level security;

-- Visible whenever the parent recipe is visible; writable only by the recipe's author.
create policy recipe_ingredients_select on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (
          r.author_id = auth.uid()
          or (r.visibility = 'public' and r.moderation_state = 'approved' and r.deleted_at is null)
        )
    )
  );
create policy recipe_ingredients_write on public.recipe_ingredients
  for all
  using (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.author_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id and r.author_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- recipe_reports — UGC reporting. UNIQUE(reporter, recipe) stops sybil/duplicate spam.
-- Auto-hide is deliberately NOT triggered on raw counts alone (would let coordinated
-- reporters censor a rival). A moderator/edge-function reviews; this table only records.
-- -----------------------------------------------------------------------------
create table if not exists public.recipe_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'inappropriate', 'dangerous', 'wrong_nutrition', 'other')),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, recipe_id)
);
create index if not exists recipe_reports_recipe_idx on public.recipe_reports (recipe_id);

alter table public.recipe_reports enable row level security;

create policy recipe_reports_insert_own on public.recipe_reports
  for insert with check (reporter_id = auth.uid());
create policy recipe_reports_select_own on public.recipe_reports
  for select using (reporter_id = auth.uid());

-- -----------------------------------------------------------------------------
-- blocked_users — client-side + server-assisted blocklist for UGC (Apple 1.2).
-- -----------------------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create index if not exists blocked_users_blocker_idx on public.blocked_users (blocker_id);

alter table public.blocked_users enable row level security;

create policy blocked_users_manage_own on public.blocked_users
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Reference feed query — filter blocked authors with NOT EXISTS (NOT IN would return ZERO
-- rows the moment the subquery yields a NULL — the classic NOT IN NULL trap):
--
--   select r.* from public.recipes r
--   where r.visibility = 'public' and r.moderation_state = 'approved' and r.deleted_at is null
--     and not exists (
--       select 1 from public.blocked_users b
--       where b.blocker_id = auth.uid() and b.blocked_id = r.author_id
--     )
--   order by r.created_at desc;

commit;

-- =============================================================================
-- APP-CONFIG / OPS TASKS that must ship in the SAME release as this backend
-- (store-rejection red-team) — these are NOT SQL and are tracked here as a checklist:
--   * account deletion (5.1.1(v)): expose an in-app "Delete Account" that calls an edge
--     function running auth.admin.deleteUser(uid) + cascades (FKs above already cascade).
--   * PrivacyInfo.xcprivacy + App Store privacy label + Play Data Safety: flip from
--     "Data Not Collected" to the real collected types (account, UGC, purchase) in the
--     SAME submission, or automated scanners flag undeclared transmission.
--   * Info.plist: set ITSAppUsesNonExemptEncryption=false (TLS-only) to skip the export prompt.
--   * Guideline 4.8: if any THIRD-PARTY/social login (e.g. Google) is offered, Sign in with
--     Apple must be offered too (entitlement already present). Email/OTP alone does not force it.
--   * EULA/terms with a zero-tolerance objectionable-content clause shown BEFORE first post,
--     plus a committed ~24h takedown SLA and a published contact (reuse privacy@deficitph.com).
--   * @supabase/supabase-js + react-native-purchases must lazy-init (not at cold start) and
--     ship valid privacy manifests, or the upload bounces (ITMS-91053/91061).
-- =============================================================================
