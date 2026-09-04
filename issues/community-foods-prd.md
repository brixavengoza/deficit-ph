# PRD — Community Foods (shared user-created foods)

**Status:** Draft — written 2026-08-13 in response to user feedback. Open decisions that
only Brix can make are listed in §8; everything else is buildable.

**Brix's direction (2026-08-13, same day):** keep it simple — "just save user's food to
the food db so anyone can access it." That amends §3: sharing should be the low-friction
default (publish on save rather than a buried opt-in toggle), and moderation should be
the lightest compliant shape — **post-moderation** (visible immediately; report → hide →
review) instead of the pre-moderation queue drafted below. Apple 1.2 still requires the
report/block/takedown machinery either way, so the tables and RLS design are unchanged;
only `moderation_state`'s default flips (new rows start `approved`, reports flip them to
`hidden` pending review). §3/§8 below should be read with this amendment.

## 1. Problem

User report (verbatim): *"yung log food if pwede makita din ng ibang users para pwede din
nila magamit"* — when one user creates a food (e.g. their homemade adobo or a sari-sari
snack that isn't in the seed database), other users should be able to find and log it too.

Today every custom food lives only in the creator's on-device SQLite. Two users in the
same barangay both have to build "Lucky Me Pancit Canton Sweet & Spicy cooked with egg"
from scratch. The 557-entry seed list can never cover the long tail of Filipino
home-cooked and merienda foods; the users themselves can.

**Interpretation note:** the request is read as sharing *foods* (reusable nutrition
entries), not sharing *food logs* (a user's daily diary stays private, always).

## 2. What exists already (verified in-repo, 2026-08-13)

- `supabase/migrations/0001_backend_recipes_catalog_entitlements.sql` — a reviewed
  Postgres/RLS design with `catalog_foods` (centrally-managed, anon-readable),
  `recipes` (UGC + moderation pipeline), `recipe_reports`, `blocked_users`. The
  entitlements table and publish-cap trigger were removed 2026-08-13 per the paid-upfront
  decision. **UPDATE 2026-09-04: superseded and applied.** Food sharing did NOT need a
  new table: `public.foods` already had `owner_user_id` and a source enum, so the live
  schema was extended instead. The recipes half stays deferred.
- A Supabase project named **Trackk** exists in Brix's account
  (`fxqurlhvtbpmydwmfpzc`, region `ap-southeast-1` Singapore). **CORRECTION 2026-09-04:
  the "confirmed empty" claim above was WRONG** (read while the project was still
  restoring from pause). It always held the full May 2026 cloud schema, and on 2026-09-04
  contained 329 seed foods, 1 auth user, 1 profile and 1 food log. Sharing, auth profiles
  and account deletion are now applied on top. Region is already the sensible choice for
  PH latency; PH data-residency disclosure still needed (§7).
- Local SQLite already has a `catalog_foods` mirror table and `recipe_drafts` table
  (`lib/local-data.ts`), built as sync targets. `foods.serving_grams` and
  `catalog_foods.serving_grams` added 2026-08-13 (SCHEMA_VERSION 4).
- The APP still has **zero network code and zero auth** as of 2026-09-04: the server side
  is live but nothing in `app/` or `lib/` talks to it yet, and `app/auth/` is an empty
  folder. This remains the first networked surface, so it is a whole-release effort.

## 3. Product shape (v1)

**Share a food, find a food, log a food.** Nothing else.

1. **Publish:** *(SUPERSEDED 2026-09-04.)* Sharing is ON by default (`foods.is_shared`
   defaults true) with a per-food opt-out, and there is no anonymous session: Brix chose
   a real login required at app start, with Google and Apple sign-in.
2. **Moderate:** *(SUPERSEDED 2026-09-04.)* POST-moderation as applied: a shared food is
   `visible` immediately, and 3 distinct reporters auto-hide it (staff-verified entries
   exempt). Users can report (`wrong_nutrition`, `spam`, `inappropriate`, `duplicate`,
   `other`) and block authors, via the live `food_reports` and `blocked_users` tables.
3. **Browse/log:** a "Community" section in `log-food-search` results (below Saved /
   Recent / Common). Tapping one logs it through the existing `add-food` flow — the log
   row snapshots all nutrition per the existing snapshot pattern, so a later edit,
   takedown, or offline state never corrupts history.
4. **Offline:** community results come from a local cache table synced incrementally by
   `revision` (the `catalog_foods` sync pattern already documented in migration 0001).
   Offline users simply see their last-synced community foods; publishing while offline
   parks the food in a local outbox (the `recipe_drafts` status pattern) and retries.

**Data model:** reuse the reviewed `recipes` machinery but for flat foods — a
`community_foods` table with per-100g nutrition columns + `serving_size_label` +
`serving_grams` + the moderation/report/block columns and RLS policies carried over
verbatim from the `recipes` design (title-length checks, pin-moderation trigger,
author-only writes, approved-or-own reads). Multi-ingredient shared *recipes* stay a
future feature; a simple food is what users asked for and it's the same table shape the
local `foods` table already has.

## 4. Non-goals (v1)

- No likes, comments, follower counts, profiles, or feeds.
- No photos (media moderation is a step-change in risk/effort).
- No editing someone else's food; no forking UI (logging already snapshots).
- No shared food *logs* / diary visibility, ever, without a separate explicit feature.
- No monetization hooks of any kind (paid-upfront decision is final).

## 5. Module boundaries

| Module | Responsibility | Location |
| --- | --- | --- |
| `lib/community-sync.ts` (new) | pull approved community foods by `revision` into local cache; push pending publishes from outbox; all network I/O isolated here | client |
| `lib/local-data.ts` | new cache table `community_foods_cache` + outbox statuses; search unions it into `searchFoodsByName` results with a `source` discriminator | client |
| `add-custom-food.tsx` | share toggle + Taglish consent copy | client |
| `log-food-search.tsx` | "Community" result section + report/block affordances on long-press | client |
| Supabase migration 0002 | `community_foods` table + RLS + pin-moderation trigger (adapted from `recipes`), keep 0001's `catalog_foods`, `recipe_reports`→generalized `content_reports`, `blocked_users` | server |
| Edge function `delete-account` | Apple 5.1.1(v) account deletion | server |

Hard rule carried forward: reads/writes on-device stay behind `lib/local-data.ts`; the
sync module is the only file that imports `@supabase/supabase-js`, lazy-initialized off
the cold-start path (ITMS-91053 note in migration 0001).

## 6. Sequencing

1. **Apply the foundation** to the Trackk project: cleaned 0001 + new 0002 (test on a
   Supabase branch first; the pin-moderation trigger has never run against live Postgres).
2. **Read path** (browse/log community foods) ships before the write path — value with
   moderation queue still empty of risk.
3. **Write path** (publish + report + block) plus the compliance items in §7 ship
   together in one release.

## 7. Store/compliance gate (blocks the publish-path release, not the read path)

From the red-teamed checklist in migration 0001, all still true:
- In-app **account deletion** (Apple 5.1.1(v)) — edge function + settings row.
- Privacy labels flip from "Data Not Collected" (App Store + Play Data Safety) in the
  same submission that ships networking.
- UGC EULA with zero-tolerance clause before first publish + ~24h takedown SLA +
  published contact.
- PH Data Privacy Act (RA 10173) cross-border disclosure (data hosted in Singapore).
- Licensed-dietitian disclaimer on community nutrition values ("user-submitted, not
  verified") — distinct from `catalog_foods.verified`.

## 8. Open decisions — need Brix (not buildable by an agent)

1. **Moderation ops:** who approves pending foods, and where? (Options: a simple
   Supabase-dashboard workflow Brix's wife runs; a lightweight internal web page; or
   launch read-path-only until an answer exists.)
2. **Attribution:** show an author display name (needs a username claim flow + name
   moderation) or fully anonymous ("Shared ng isang Trackk user")? Anonymous is v1-safe.
3. **Teen UGC policy (13–17):** allowed to publish, or 18+ to publish / everyone can
   browse? (Flagged open since the 2026-07-21 handoff.)
4. **Seed the community?** Optionally bulk-load the 557 seed foods into `catalog_foods`
   so the community tab is never empty on day one (the ~45% `// VERIFY` entries would
   ship `verified = false`).

## 9. Acceptance criteria (v1)

- A food published on device A appears on device B in the Community section after
  approval and a sync, and logs correctly with serving-aware quantities.
- Rejected/pending foods are never visible to anyone but their author.
- Airplane-mode: search, logging, and app start behave exactly as today (no spinners
  tied to network); a queued publish survives force-quit and retries.
- Reporting a food and blocking an author both work and hide content locally
  immediately, regardless of server round-trip.
- `npm run release:check` stays green; no nutrition math path changes.
