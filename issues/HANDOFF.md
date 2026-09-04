# Handoff — deficit-ph "finish line" push

**Last updated:** 2026-08-13 (user-feedback fix session — see §0)

**Read this file first** if you're picking this up in a new session/context. It tells you
what happened, what's true right now, and what's genuinely still open. The code changes
described in §2 were committed and pushed to `main` on 2026-07-21 (commit `970da84`,
"Fix silent nutrition data corruption, expand Filipino food coverage"). This handoff file
itself, and the local `entitlements` table removal called for in §1, were NOT part of that
commit — check `git status` when you resume.

---

## 0. 2026-08-13 session — five user-reported issues (uncommitted, check `git status`)

Brix relayed five user reports; root causes were traced with three parallel explorers and
fixed (all local code, `npm run release:check` green; no visual verification — same
no-display environment caveat as §3):

1. **"No macros showing after logging food"** — root cause: `add-custom-food.tsx` had NO
   protein/carbs/fat inputs, so every user-created food stored 0 macros; nothing displayed
   per-entry macros anywhere; whole-gram rounding zeroed small portions; the manual
   recipe-ingredient save wiped same-named foods' macros to 0 via the name-keyed upsert.
   Fixed: optional macro inputs (scan-prefilled) + recipe-calculator macro totals; per-entry
   P/C/F lines on dashboard/history/cart rows; 1-decimal macro rounding at write; new
   `saveUserFoodIfMissing` for ingredients (never overwrites existing foods).
2. **"TDEE calculator not accurate"** — Mifflin-St Jeor core was correct; the modal was
   unit-blind (Imperial numbers computed as metric, ~+11%), showed the 1200-floored
   maintain target as "TDEE", had no range validation, and weight logs never recomputed
   the stored target. Fixed: `calculateTdee` (raw TDEE) exported and displayed; modal is
   unit-aware + range-validated (onboarding bounds) + prefilled from the profile; floor
   situations now get explanatory Taglish notes; the "three different numbers" bug was
   fixed by making the READ paths (`fetchMacroTargets`, `fetchHomeDashboardSnapshot`)
   display the stored goal as-is instead of re-inflating it to 1200 (a lose target must
   never exceed maintenance — enforced by a 14k-combination invariant sweep in
   `scripts/test-calorie-targets.mjs`); `addWeightLog` now validates 30–300 kg and calls
   `refreshCalorieTargets`; `WeightLogModal` defaults its kg/lbs toggle from the Units
   preference; profile stats row converts kg→lb.
3. **"Add servings sa log food"** — `foods.serving_grams` + `catalog_foods.serving_grams`
   (SCHEMA_VERSION 4, additive), parsed from labels like "1 can (155g)" when the column is
   null (volume-only labels deliberately return null — no density guessing);
   serving label + grams forwarded through search/saved-foods params into `add-food`,
   which defaults to `1 serving` when a real weight exists, shows "1 serving = Xg", and
   has 0.5/1/2/3 quick chips. Logs need no schema change (`quantity`+`grams_equivalent`).
4. **"Log food visible to other users"** — needs the backend; wrote
   `issues/community-foods-prd.md` (v1 = share custom foods with pre-moderation, reusing
   the reviewed recipes RLS machinery). The Supabase **Trackk** project
   (`fxqurlhvtbpmydwmfpzc`, ap-southeast-1) was found paused, **restored, and confirmed
   empty**. Also executed §4 step 2: entitlements table + publish-cap trigger deleted from
   migration 0001 (the local SQLite `entitlements` table was already gone). §8 of the PRD
   lists the decisions only Brix can make (moderation ops, attribution, teen UGC policy).
5. **"Log done (after logging all food)"** — logging no longer dumps you on the dashboard
   per item: `add-food` now `router.dismissTo`'s back to the search screen, which gained a
   persistent day-summary bar ("N na-log today • X kcal"), a review bottom-sheet (the
   previously-unwired `LoggedFoodsCartModal`, now with local-time day keys + per-row
   macros), and a **Done** button that returns to the dashboard.

Also fixed on the way: editing an entry before the logs query resolved created a bogus
"Selected Food" duplicate (submit now waits, and a settled-but-missing entry shows
"Entry not found" instead of loading forever); new `scripts/test-calorie-targets.mjs`
(39 checks: TDEE/floor math + lose≤maintenance invariant sweep, Imperial conversion,
serving-label parsing, serving scaling) wired into `npm test` and `release:check`.

An adversarial red-team pass then ran over the whole diff; its confirmed findings were
fixed in the same session: the first version of the ≥1200 clamp (which could label a
surplus as a cut) reverted in favor of the read-path fix above; unit switching in
add-food now converts the current amount instead of keeping the raw number (the
"1 serving → grams = 1 g" trap); one-entry weight capped at 10 kg gramsEquivalent;
`upsertUserFoodByName` now COALESCEs serving label/grams so re-saving a scanned food
can't silently shrink its serving; `updateFoodLog` preserves the entry's original DAY
(editing yesterday's meal was moving it to today); `log.tsx` groups by local day (was
UTC); recipe-calculator macros only auto-fill when every weighed ingredient has real
macro data; scan-label forwards serving info; profile zustand bundle refreshes after a
weigh-in. Accepted-as-documented (low severity): serving weight not recovered when
editing an entry logged in grams then switched to servings (fallback hint shows); tiny
rounding drift when re-logging fractional servings from Recents.

**Still needs a human on a real device:** none of this has been visually verified (same
no-display environment as §3) — priority taps: create a custom food with macros and see
the dashboard rings move; log "2 servings" of a "(155g)"-labelled food; the log →
land-on-search → Done loop from every entry point (search, saved, custom, scan);
Imperial TDEE calculator; Imperial weigh-in.

**Next-build queue lives in `issues/TODO.md`** (added same day): community foods per
Brix's simplified direction, making the label scanner work on all devices, and replacing
the fake-camera → real-camera double flow with one live auto-detecting scanner screen.

**Scanner overhaul SHIPPED same day (2026-08-13, later session; uncommitted):** the
universal OCR tier is implemented — Android gets ML Kit via
`@infinitered/react-native-mlkit-text-recognition` (excluded from the iOS build through
`expo.autolinking.apple.exclude`; iOS keeps zero-cost Apple Vision), `lib/ocr.ts` is the
unified OCR surface, `resolveScanDraft` merges the optional Apple-Intelligence draft
over the deterministic parser per field (the Swift bridge now resolves with `rawText`
instead of rejecting when Apple Intelligence is unavailable — previously most iPhones
threw away good OCR text), and `scan-label.tsx` is ONE real camera with a silent 1.4 s
auto-detect loop gated by `isPlausibleNutritionDraft` plus a manual capture fallback.
The old `DataScannerViewController` double-camera modal is out of the flow. All gates
green (`release:check`; parser suite +13 checks, capability jest suite rewritten, 10
tests). **A new EAS custom dev build is REQUIRED** for the native pieces (new Swift
method + Android module); the changes are OTA-safe against old builds (they degrade to
the previous behavior, nothing worse). Nothing camera-related is visually verified —
device checklist in `issues/TODO.md` §3.

---

## 1. Monetization model — DECIDED 2026-07-21: paid-upfront

**Brix's final call: paid-upfront.** The app is a one-time purchase made *before* download
(the store's own paywall — App Store/Play Store charge the user at install time), not a free
download with an in-app unlock. This was decided after weighing the alternative (free
download + one-time IAP via RevenueCat, which is what §2's architecture pass originally built
toward) — Claude's recommendation had been free-download/no-monetization-in-v1 for
reach/growth reasons, but Brix chose paid-upfront specifically to avoid the IAP/entitlement
system entirely. This is final; don't re-litigate it or re-suggest free-with-IAP unless Brix
raises it again himself.

**What this means concretely, now settled:**
- **No RevenueCat, no IAP code, no entitlement/paywall UI at all.** Anyone who has the app
  already paid — there's nothing to verify or gate in-app.
- **`supabase/migrations/0001_backend_recipes_catalog_entitlements.sql` needs the
  `entitlements` table and the `recipes_enforce_publish_cap` trigger (+ its call site) removed
  before this migration is ever applied.** Everything else in that file (catalog_foods,
  recipes, recipe_ingredients, recipe_reports, blocked_users, and their RLS policies) still
  applies as designed — recipes are still shared/visible-to-everyone and still need
  moderation/anti-spam protections regardless of payment model, none of that changes.
- **No "5 free recipes" cap** — with no free tier to protect, there's no reason to limit
  recipe creation at all. Drop that concept from any future recipe-create UX.
- **Auth can likely be even lighter than originally planned.** The architect's original
  anonymous-first auth design (silent, automatic identity, upgraded only when publishing a
  recipe) was already not about payment — it was for recipe authorship + moderation
  accountability. That reasoning is unchanged and still applies; there's just one less reason
  (protecting a paywall) to ever prompt for a "real" identity at all. The app may never need a
  visible sign-in screen.
- **Still open, needs Brix specifically (not buildable by an agent):** the actual price point,
  and App Store Connect / Play Console configuration to set the app as paid-upfront rather
  than free (this is store-side config, not app code).

---

## 2. What actually shipped this session (verified, safe, already in the working tree)

Ran the full `/orchestrate` pipeline (4 specialists → 4-angle red-team → synthesis →
independent confidence audit) on "reintroduce a backend for community recipes + a
centrally-managed food catalog, one-time-purchase monetization, on-device AI capability
layer." Full specialist/red-team/audit transcripts are NOT saved anywhere — only the
conclusions below survived into code/docs. Re-running `/orchestrate` from scratch would be
needed to get that level of detail again if you need it.

### Live bug fixes (all verified: `npm run release:check` clean, an independent
confidence-auditor traced the actual edge cases, and a full native iOS Xcode build compiled
with 0 errors — see "Verification status" below for what's *not* verified)

- **Three food-logging paths were silently corrupting macros.** Editing a logged entry,
  logging from Saved Foods, and logging a "Recent" food all either fabricated a 35/40/25
  protein/carb/fat split or zeroed the real macros. Fixed in `app/dashboard/add-food.tsx`,
  `app/dashboard/saved-foods.tsx`, `app/dashboard/log-food-search.tsx`.
- **Imperial unit inputs were stored unconverted.** Entering weight in lb / height in inches
  in Profile → Body Measurements stored the raw number as if it were kg/cm, corrupting BMI
  and calorie-target math for any Imperial user. Fixed via new `utils/units.ts` +
  `lib/local-data.ts` (`updateBodyMeasurements`) + `stores/use-profile-bundle-store.ts` +
  `components/profile/details-section/BodyMeasurementsCollapsibleRow.tsx`.
- **The safety guardrail (`evaluateGoalSafety` — blocks unsafe cuts for minors/underweight
  users) only ever ran once, at onboarding.** `lib/local-data.ts`'s `refreshCalorieTargets`
  never called it, so editing your weight later never re-checked safety. Now it's a
  precondition every time the daily target is recalculated.
- **A hidden, ungated "Deficit Calculator" in Profile Settings** (`TdeeCalculatorRow.tsx`)
  bypassed all the real calorie-math utils and accepted any age including children. Now
  routes through `utils/calorie-targets.ts` and applies the minor gate.
- **`app/index.tsx` (the app's root route) skipped the branded welcome screen entirely** for
  first-time users, going straight to a bare onboarding form. Fixed — first-time users now
  see `/welcome`; returning users still skip straight to `/dashboard`.
- **The nutrition-label scanner (`app/dashboard/scan-label.tsx`) had zero navigation entry
  points anywhere in the app** and showed a working-looking camera UI on unsupported
  platforms before failing on tap. New `lib/ai-capability.ts` gives it a proactive,
  synchronous-where-possible capability check; a real entry point now exists next to
  "Create Food" in `app/dashboard/log-food-search.tsx`.
- Cleanup: removed dead fake-profile mock data (`lib/profile-settings-mock.ts` →
  `lib/profile-settings-options.ts`, kept only the real option lists), removed a leftover
  debug `console.log`, removed an artificial 220ms fake-loading delay, fixed a
  silently-swallowed "no email app" error, restored 7 coding-standard skills that had been
  deleted uncommitted by a prior (abandoned) session, archived a conflicting draft PRD to
  `issues/archive/`.

### Food database: 360 → 557 entries

`lib/local-seed-foods.ts` grew from ~360 to 557 entries (three parallel research agents,
split by category: Filipino ulam/rice/noodle dishes, PH fast food/street food, packaged
groceries/produce). Real gaps closed — there was **no Adobo entry at all** before this,
plus sinigang, tinola, kare-kare, sisig, lechon, all pancit variants, -silog combo plates,
Jollibee/McDonald's PH/Chowking/Mang Inasal/KFC/Greenwich/Goldilocks, street food, and
branded pantry staples (Lucky Me, canned goods, condiments, milk tea). **About 45% of the
new entries carry an inline `// VERIFY:` comment** flagging where sources disagreed or a
value is a recipe-based estimate rather than lab data — worth a human/dietitian spot-check
pass before calling this "certified," but it's a large step up from the prior generic list.
Zero duplicate names confirmed (was 2 pre-existing exact dupes — "Sugar, White" and "Brown
Sugar" — also fixed).

### Architecture foundations (local, additive, no new npm deps)

- `PRAGMA user_version` / schema versioning introduced in `lib/local-data.ts` (didn't exist
  before — real data-loss risk for any future non-additive migration, closed now).
- New **separate** local tables: `catalog_foods` (future sync target for the backend food
  catalog — deliberately NOT merged into the existing `foods` table, since SQLite can't
  `ALTER` a `CHECK` constraint without a destructive rebuild), `recipe_drafts` (so a future
  offline/failed recipe publish doesn't lose typed input). A local `entitlements` cache table
  was also added this session for the free+IAP model then under consideration — per §1's
  paid-upfront decision this is now dead weight and should just be deleted from
  `lib/local-data.ts`, not migrated or reused for anything.
- `lib/ai-capability.ts` — a typed capability contract (`isNutritionScannerLinked()`,
  `getNutritionScanCapability()`, `getPlannerCapability()`) meant to be reused by the future
  meal/workout planner screens, not just the scanner.
- `supabase/migrations/0001_backend_recipes_catalog_entitlements.sql` — a full, reviewed
  Postgres/RLS schema (catalog_foods, recipes, recipe_ingredients, recipe_reports,
  blocked_users, entitlements) with moderation-abuse and anti-spam protections baked in.
  **STATUS CHANGED 2026-09-04: a Supabase project WAS always connected, and the
  schema is now applied.** This paragraph's original claim ("not applied, no project
  connected") was wrong: project `fxqurlhvtbpmydwmfpzc` already held the full May 2026
  cloud schema plus 329 seed foods and 1 real account. The recipes design in this file
  remains DEFERRED and unapplied (parked at
  `supabase/migrations/DEFERRED_community_recipes.sql.draft`), but food sharing, auth
  profiles and account deletion are live. See `supabase/migrations/README.md`.
  recipe getting locked out of soft-delete; a race condition in the publish-cap trigger under
  concurrent requests) were fixed in the file directly after the audit. Per §1's paid-upfront
  decision, the `entitlements` table and the `recipes_enforce_publish_cap` trigger (+ its
  trigger registration) in this file are now dead weight and MUST be removed before this
  migration is ever applied — everything else in the file still stands.

### Confirmed, not touched this session

`ios/trackk/FoodLabelScanner.swift` + `FoodLabelScannerBridge.m` **already exist and already
work** — a real native bridge to Apple's on-device Foundation Models framework
(`SystemLanguageModel`, `@Generable`/`@Guide` structured output), registered in the Xcode
project. It requires iOS 26+ and Apple-Intelligence-eligible hardware (iPhone 15 Pro+), so on
every other device it currently throws — this is exactly why any future AI feature must
never be placed behind a paywall (an App Reviewer testing on a normal device would see a paid
feature error out → rejection risk) and must always hard-hide rather than show-then-fail.

---

## 3. Verification status — be precise about what "done" means here

- `npm run release:check` (typecheck + nutrition-parser fixtures): **passes, verified
  multiple times independently.**
- A full **native iOS Xcode build succeeded with 0 errors** against everything changed this
  session (confirmed via `npx expo run:ios`) — stronger than `tsc` alone, since it compiles
  the whole native + JS bundle together.
- **No visual/interactive verification happened.** This sandboxed environment has no real
  display — the iOS Simulator reports `Shutdown` even after a boot attempt and fails with a
  Mach IPC error when asked to open the app. Nobody has actually tapped a button on a screen
  and looked at it since these changes landed. **If you're a future session with access to a
  real device/display, do this before trusting the UI is right** — especially the edited-log
  macro fix, the Imperial unit round-trip, and the scanner's hidden-vs-shown states.
- The Postgres/RLS migration has only been statically reviewed (read for logical soundness).
  **It has never run against a real Postgres instance.** The confidence-auditor explicitly
  flagged this — the publish-cap trigger's concurrency behavior in particular needs a live
  test, not just a read-through, even after the advisory-lock fix.
- Nutrition/BMI/calorie thresholds and the ~45%-flagged new food entries: **no model can
  vouch for clinical/nutritional accuracy** — this needs a licensed dietitian, as CLAUDE.md
  itself already says.

---

## 4. What's next, in order (paid-upfront path — §1 is decided, build against this)

1. **Visually verify today's already-shipped changes on a real device or a machine with an
   actual display** — this was the one verification step this environment couldn't do.
   Priority checks: edit a logged food and confirm macros don't change; switch to Imperial
   units and round-trip a body-measurement edit; confirm the TDEE calculator hides the
   deficit row for an under-18 profile; confirm "Scan Label" only appears on a build where
   the native module is linked.
2. **Strip the now-dead entitlement pieces** per §1/§2: delete the `entitlements`
   table + `recipes_enforce_publish_cap` function/trigger from
   `supabase/migrations/0001_backend_recipes_catalog_entitlements.sql`, and delete the local
   `entitlements` SQLite table added to `lib/local-data.ts` this session. Neither was ever
   wired to any network code, so both are clean deletions, not migrations.
3. **Provision a real Supabase project** (region choice matters for PH data residency — needs
   Brix's own account, not buildable by an agent), then apply the cleaned-up migration.
4. **Build the recipe browse/create/detail screens**, now with no free-tier limit or paywall
   UI anywhere in the flow. The implementer's draft recommended reusing
   `app/dashboard/add-custom-food.tsx`'s ingredient-builder as the base rather than a new form
   from scratch.
5. **Wire `lib/ai-capability.ts` into a free rule-based "Smart Planner"** — deterministic,
   template-based meal/workout suggestions using `utils/calorie-targets.ts` + the food
   catalog. Works on every device, needs no network/AI, and can genuinely ship *before* any
   backend work since it's pure local logic — good candidate to build first or in parallel
   with the Supabase provisioning above.
6. **Brix needs to: pick the actual price, and configure App Store Connect / Play Console as
   a paid app** (not free-with-IAP) — pure store-side config, not something buildable here.
7. **Other still-open product decisions** (none blocking, but needed before the
   recipes/backend feature actually ships): auth provider set (email/OTP only vs. +
   Google/Apple — note: adding Google forces offering Sign-in-with-Apple too per store
   policy; also note per §1 that auth may never need a visible screen at all now); recipes
   nav placement (a segment inside the existing Log tab was recommended over a 5th tab-bar
   icon, since the tab bar's FAB has no spare slot without breaking its current one-tap
   logging shortcut); a real teen (13–17) UGC posting policy (the "13+ self-attestation" idea
   turned out to be meaningless — onboarding already requires 13+ to even reach the
   dashboard, so re-checking it at publish time blocks nobody; needs an actual answer, not
   reused onboarding data); whether the free "Smart Planner" and the future generative
   "AI Planner" get visually/copy-wise distinguished everywhere (recommended: always, since
   most of the audience is on Android/older iPhones and will only ever see the Smart Planner —
   never market "AI" in a way that overpromises what most users will actually get).

---

## 5. Requires human/external action (not something any future session can close alone)

- **Licensed dietitian review** of all calorie/BMI/macro formulas and thresholds, and of the
  ~45% `// VERIFY`-flagged new food entries.
- **Legal / App Store / Play Store compliance review** once accounts + UGC + a backend exist
  — account deletion (Apple 5.1.1(v), doesn't exist in-app yet), privacy label / Play Data
  Safety updates (app currently declares "Data Not Collected" everywhere — that becomes false
  the moment a backend ships), a UGC EULA with a zero-tolerance clause + takedown SLA (Apple
  1.2), and (if Supabase infra isn't PH-hosted) a PH Data Privacy Act (RA 10173) cross-border
  disclosure.
- **Supabase project creation + region choice** and **App Store Connect / Play Console setup
  as a paid app** — both need Brix's own accounts/credentials, not something buildable
  in-session. No RevenueCat account needed given the §1 paid-upfront decision.

---

## 6. Where else to look

- `CLAUDE.md` — project rules, non-negotiables, the publish-readiness gate. Still accurate
  except non-negotiable rule #1, which was REWRITTEN on 2026-09-04 (Supabase is now used
  for auth + shared foods; SQLite still owns everything a user logs). Note it was
  monetization/backend question is settled and any backend work actually starts.
- `.claude/skills/orchestrate/SKILL.md` — the pipeline used to produce this session's
  architecture work; re-run it for any future whole-feature/high-stakes push.
- Claude Code memory (if you have access to it in this session) has entries from this work:
  `project_handoff_pointer.md` (points back here), `project_monetization_and_architecture_v2.md`
  (updated same day to reflect the §1 paid-upfront decision), `project_prd_conflict_2026_07.md`,
  `user_context_brix.md` — all should already be current as of this file's last-updated date.
