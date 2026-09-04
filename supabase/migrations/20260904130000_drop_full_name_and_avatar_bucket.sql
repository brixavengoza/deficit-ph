-- =============================================================================
-- Remove profiles.full_name, and add the avatars storage bucket
-- =============================================================================
-- Identity in the app is now the email address; the Personal Info editor was
-- removed from the Profile screen, so nothing sets a full name any more.
--
-- ORDER MATTERS. Two functions read/write this column, and dropping it first
-- would leave handle_new_user broken, which would make EVERY SIGNUP FAIL.
-- Both are replaced before the column goes.
--
-- APPLIED to Trackk 2026-09-04 and verified: profiles no longer has the column,
-- no function references it, the bucket is public with a 2 MB cap, and all four
-- storage policies exist.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  derived_username text;
begin
  derived_username := nullif(trim(new.raw_user_meta_data->>'user_name'), '');
  if derived_username is null then
    derived_username := nullif(trim(new.raw_user_meta_data->>'username'), '');
  end if;
  if derived_username is null then
    derived_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if derived_username is null then
    derived_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 8);
  end if;

  insert into public.profiles (user_id, username, email, avatar_url)
  values (
    new.id,
    derived_username,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_goals (user_id) values (new.id) on conflict (user_id) do nothing;

  return new;
end;
$function$;

-- Shared-food search: author_name now comes from username alone.
create or replace function public.search_shared_foods(
  search_query text,
  max_results integer default 30
)
returns table (
  id uuid, name text, brand text, kcal_per_100g numeric, protein_per_100g numeric,
  carbs_per_100g numeric, fat_per_100g numeric, fiber_per_100g numeric,
  sugar_per_100g numeric, sodium_mg_per_100g numeric, serving_size_label text,
  serving_grams numeric, is_verified boolean, usage_count integer,
  author_name text, is_mine boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    f.id, f.name, f.brand, f.kcal_per_100g, f.protein_per_100g, f.carbs_per_100g,
    f.fat_per_100g, f.fiber_per_100g, f.sugar_per_100g, f.sodium_mg_per_100g,
    f.serving_size_label, f.serving_grams, f.is_verified, f.usage_count,
    nullif(trim(p.username), '') as author_name,
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
    and not exists (
      select 1 from public.blocked_users b
       where b.blocker_id = auth.uid() and b.blocked_id = f.owner_user_id
    )
  order by
    f.is_verified desc,
    similarity(f.name, trim(coalesce(search_query, ''))) desc,
    f.usage_count desc,
    f.name asc
  limit greatest(1, least(coalesce(max_results, 30), 100));
$function$;

revoke all on function public.search_shared_foods(text, integer) from public, anon;
grant execute on function public.search_shared_foods(text, integer) to authenticated;

alter table public.profiles drop column if exists full_name;

-- avatars bucket. PUBLIC on purpose: profiles.avatar_url stores a plain durable
-- URL. A private bucket would need signed URLs that expire, so any stored URL
-- would rot. An avatar is low-sensitivity and exposes nothing else.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored as `<user_id>/avatar.<ext>`, so the first path segment is the
-- owner. These policies check it, which stops one user overwriting another's avatar.
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
