-- =============================================================================
-- Read surface for shared foods: search + incremental sync
-- =============================================================================
-- Both are SECURITY DEFINER so ranking and visibility rules live in one place
-- and the client cannot ask for hidden rows or for columns it should not see.
-- Neither ever returns owner_user_id, email, or any body stat.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- search_shared_foods - fuzzy name search across the shared catalog.
-- Ranking: staff-verified first, then closeness to what was typed, then how
-- many people actually log it (so the real Adobo beats a duplicate).
-- -----------------------------------------------------------------------------
create or replace function public.search_shared_foods(
  search_query text,
  max_results integer default 30
)
returns table (
  id uuid,
  name text,
  brand text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  sodium_mg_per_100g numeric,
  serving_size_label text,
  serving_grams numeric,
  is_verified boolean,
  usage_count integer,
  author_name text,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.name,
    f.brand,
    f.kcal_per_100g,
    f.protein_per_100g,
    f.carbs_per_100g,
    f.fat_per_100g,
    f.fiber_per_100g,
    f.sugar_per_100g,
    f.sodium_mg_per_100g,
    f.serving_size_label,
    f.serving_grams,
    f.is_verified,
    f.usage_count,
    -- Only the display name crosses the boundary, never the rest of the profile.
    coalesce(nullif(trim(p.username), ''), nullif(trim(p.full_name), '')) as author_name,
    (f.owner_user_id = auth.uid()) as is_mine
  from public.foods f
  left join public.profiles p on p.user_id = f.owner_user_id
  where f.deleted_at is null
    and (
      f.owner_user_id = auth.uid()
      or f.owner_user_id is null
      or (f.is_shared and f.moderation_state = 'visible')
    )
    and (
      trim(coalesce(search_query, '')) = ''
      or f.name ilike '%' || trim(search_query) || '%'
      or f.name % trim(search_query)
    )
    -- Blocked authors disappear. NOT EXISTS, never NOT IN: a NULL in the
    -- subquery would make NOT IN return zero rows for everybody.
    and not exists (
      select 1 from public.blocked_users b
       where b.blocker_id = auth.uid()
         and b.blocked_id = f.owner_user_id
    )
  order by
    f.is_verified desc,
    similarity(f.name, trim(coalesce(search_query, ''))) desc,
    f.usage_count desc,
    f.name asc
  limit greatest(1, least(coalesce(max_results, 30), 100));
$$;

grant execute on function public.search_shared_foods(text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- shared_foods_since - incremental sync feed for the on-device SQLite mirror.
-- The client remembers the highest `revision` it has seen and asks for the next
-- page, so a sync costs one small request instead of the whole catalog.
--
-- Tombstones are CONTENT-FREE: for hidden, removed or deleted rows only the id,
-- state and revision come back, with every text and nutrition column nulled. If
-- the objectionable content was the food NAME itself, that name must stop being
-- broadcast to every device the moment it is taken down.
-- -----------------------------------------------------------------------------
create or replace function public.shared_foods_since(
  since_revision bigint default 0,
  max_results integer default 500
)
returns table (
  id uuid,
  name text,
  brand text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  fiber_per_100g numeric,
  sugar_per_100g numeric,
  sodium_mg_per_100g numeric,
  serving_size_label text,
  serving_grams numeric,
  is_verified boolean,
  usage_count integer,
  is_available boolean,
  revision bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    case when live.ok then f.name end,
    case when live.ok then f.brand end,
    case when live.ok then f.kcal_per_100g end,
    case when live.ok then f.protein_per_100g end,
    case when live.ok then f.carbs_per_100g end,
    case when live.ok then f.fat_per_100g end,
    case when live.ok then f.fiber_per_100g end,
    case when live.ok then f.sugar_per_100g end,
    case when live.ok then f.sodium_mg_per_100g end,
    case when live.ok then f.serving_size_label end,
    case when live.ok then f.serving_grams end,
    case when live.ok then f.is_verified end,
    case when live.ok then f.usage_count end,
    live.ok as is_available,
    f.revision
  from public.foods f
  cross join lateral (
    select (
      f.deleted_at is null
      and f.moderation_state = 'visible'
      and (f.is_shared or f.owner_user_id is null)
    ) as ok
  ) live
  where f.revision > coalesce(since_revision, 0)
    -- Never stream another user's PRIVATE food to a device, not even as a tombstone.
    and (f.owner_user_id is null or f.is_shared or f.owner_user_id = auth.uid())
  order by f.revision asc
  limit greatest(1, least(coalesce(max_results, 500), 1000));
$$;

grant execute on function public.shared_foods_since(bigint, integer) to authenticated;
