-- =============================================================================
-- Profile consent flag + in-app account deletion
-- =============================================================================
-- NOTE ON PRIVACY: public.profiles is deliberately NOT opened up to other users.
-- That table holds email, age, height_cm and start_weight_kg, which is health
-- data. Row-level security cannot hide individual columns, so widening the
-- SELECT policy to show an author's name would expose their body stats too.
-- Author names are instead returned only by the SECURITY DEFINER search RPC,
-- which selects the name column and nothing else.
-- =============================================================================

-- Apple Guideline 1.2 requires agreement to an objectionable-content policy
-- BEFORE a user can post. Publishing is gated on this being set.
alter table public.profiles
  add column if not exists ugc_terms_accepted_at timestamptz;

-- -----------------------------------------------------------------------------
-- In-app account deletion (App Store Guideline 5.1.1(v)).
-- Any app that lets a user CREATE an account must let them DELETE it from
-- inside the app. Not an email request: an in-app action. Missing this is one
-- of the most common review rejections for apps that add accounts.
--
-- Exposed as an RPC the signed-in user calls on themselves, so no service-role
-- key ever ships in the app. SECURITY DEFINER lets it reach auth.users; the
-- auth.uid() check makes deleting anyone else impossible.
-- -----------------------------------------------------------------------------
create or replace function public.delete_own_account() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  -- Shared foods OUTLIVE the account on purpose: other people may log them
  -- daily, and deleting them would break those users' searches. The rows are
  -- unshared and anonymised instead, and the revision bump tells every device
  -- to drop the author attribution on its cached copy.
  perform set_config('app.moderation_bypass', 'on', true);
  update public.foods
     set owner_user_id = null,
         is_shared = false,
         moderation_state = 'removed'::public.moderation_state
   where owner_user_id = uid;
  perform set_config('app.moderation_bypass', 'off', true);

  -- Everything genuinely personal cascades from auth.users: profiles,
  -- user_preferences, user_goals, food_logs, weight_logs, hydration_logs,
  -- food_reports, blocked_users.
  -- On-device data (the local SQLite database) never leaves the phone and is
  -- cleared by the app after this call returns.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
