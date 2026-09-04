# Migrations

## The two migrations that are ALREADY APPLIED are not in this folder

The live Trackk project (`fxqurlhvtbpmydwmfpzc`, ap-southeast-1) has these applied,
verified by querying `supabase_migrations.schema_migrations` on 2026-09-04:

| version | name |
| --- | --- |
| 20260510153412 | trackk_core_mvp_schema |
| 20260510154124 | trackk_schema_hardening_and_rls_perf |

They were applied directly (dashboard or MCP), so their SQL lives in the database
and not in git. Recover them into this folder with the Supabase CLI, which needs
Docker running and the database password:

```bash
supabase link --project-ref fxqurlhvtbpmydwmfpzc
supabase db pull            # writes the applied schema into supabase/migrations/
```

Do this before applying anything new, so the local folder and the remote history
match. They were deliberately NOT hand-transcribed: retyping a live schema by hand
is how silent drift gets introduced.

### What those two already created

Tables (all with row-level security, all owner-scoped): `profiles`,
`user_preferences`, `user_goals`, `foods`, `food_logs`, `weight_logs`,
`hydration_logs`. Enums: `activity_level`, `food_source`, `goal_type`,
`meal_type`, `theme_mode`, `unit_system`. Functions: `handle_new_user`
(already wired to an `on_auth_user_created` trigger on `auth.users`),
`set_updated_at`.

## Applied 2026-09-04 (this folder)

| file | what it does |
| --- | --- |
| `20260904120000_food_sharing_and_moderation.sql` | Makes a user's food findable by other users. Adds the missing nutrition columns (fiber, sugar, sodium, serving_grams), sharing + moderation columns, trigram search index, `blocked_users`, `food_reports`, guard/rate-limit/report triggers, and replaces the `foods` SELECT policy. |
| `20260904120100_profiles_and_account_deletion.sql` | UGC terms consent column + `delete_own_account()` (App Store 5.1.1(v)). |
| `20260904120200_food_sharing_rpcs.sql` | `search_shared_foods()` and `shared_foods_since()` read surface. |
| `20260904120300_harden_function_grants.sql` | Advisor catch: Supabase default privileges grant EXECUTE to `anon` on every new function, so even trigger functions were callable at `/rest/v1/rpc/`. Revokes them. |
| `20260904120400_fix_guard_null_role_logic.sql` | Real bug found by testing: `auth.role()` is NULL on direct connections and `NULL = 'service_role'` is NULL, not false, so the guard silently let a caller set `is_verified` and `usage_count` themselves. |
| `20260904130000_drop_full_name_and_avatar_bucket.sql` | Drops `profiles.full_name` (identity is the email now) and creates the public `avatars` storage bucket with per-user write policies. Replaces `handle_new_user` and `search_shared_foods` FIRST, since both referenced the column and dropping it first would have broken every signup. |
| `DEFERRED_community_recipes.sql.draft` | Multi-ingredient community RECIPES. A separate, later feature. Reviewed but deliberately parked, and renamed out of the numbered sequence so it is never applied by accident. |

**All five are APPLIED to the live Trackk project as of 2026-09-04**, in the order
listed, and verified afterwards: the security advisor was re-run, a hostile insert
was rejected correctly, and `search_shared_foods('adob')` returned matches. Two of
them exist only because that verification found real problems (see below).

## Critical ordering note

`20260904120000` must run before `...120200`: the RPCs reference `blocked_users`
and the columns the first migration adds.


## Storage

| bucket | public | limit | mime types |
| --- | --- | --- | --- |
| `avatars` | yes | 2 MB | image/jpeg, image/png, image/webp |

Public on purpose: `profiles.avatar_url` holds a plain durable URL. A private bucket
would need signed URLs that expire, so any stored URL would rot. Files are keyed
`<user_id>/avatar.<ext>`, and the four `avatars_*` policies on `storage.objects` use
that first path segment so nobody can overwrite someone else's avatar.

## Actual data in the project (checked 2026-09-04, not estimates)

`list_tables` reports row counts from Postgres statistics, which read 0 until
ANALYZE runs. Real `count(*)` values:

| table | rows |
| --- | --- |
| foods | 329 (all `source = 'seed'`, 0 user foods) |
| auth.users | 1 |
| profiles | 1 |
| food_logs | 1 |

So there is already one real account and a seeded cloud catalog. Note the cloud has
**329** seed foods while the on-device SQLite seed list has **557**: the two were
seeded at different times and are NOT in sync. Reconciling them is a separate task,
and is why the sync design mirrors the cloud into a dedicated local table rather
than merging blindly into the existing local `foods` table.
