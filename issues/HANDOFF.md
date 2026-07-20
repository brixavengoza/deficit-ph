# Handoff — deficit-ph "finish line" push

**Last updated:** 2026-07-21 (end of the session that did the food-database rebuild,
app audit, bug fixes, and backend/monetization/AI architecture pass)

**Read this file first** if you're picking this up in a new session/context. It tells you
what happened, what's true right now, and what's genuinely still open. Everything below is
**uncommitted** — nothing from this session has been `git commit`ed yet (see "Repo state").

---

## 1. The single most important open question — ASK THE USER BEFORE BUILDING MORE

We designed and partly built a **free-download + one-time in-app-purchase unlock** model
(RevenueCat, an `entitlements` table, a 5-free-recipes cap). Then the user pushed back:
should we instead go **fully paid-upfront** (pay before download, so there's no
entitlement/paywall system needed at all — everyone with the app already paid), or **ship v1
with no monetization at all** (recipes/catalog/AI all free, decide payment later once there's
real usage)?

My recommendation (given to the user, not yet confirmed): **free-to-download, no
monetization in v1.** Reasoning: the distribution channel is the founder's wife's Facebook
following (price-sensitive, non-technical, "lacks nutrition knowledge") — paid-upfront apps
get dramatically fewer installs, which fights the whole point of that channel. Dropping
RevenueCat via "no monetization yet" gets the same simplicity paid-upfront would give
(no entitlement table, no webhook, no paywall UX) without sacrificing the free-download
growth advantage. The alternative — free download but still gate recipes without RevenueCat —
is actually *more* work, not less, since you'd need your own receipt-verification server to
make the cap a real backstop instead of just client-side (spoofable) trust.

**The user has not confirmed which way to go.** This blocks: whether to keep or strip the
`entitlements` table / publish-cap trigger from `supabase/migrations/0001_...sql`, whether to
build any paywall UI at all, and whether recipe creation needs a "5 free" limit in the first
place. Everything else in this document is written to be valid regardless of the answer —
but don't build recipe-limit/paywall UI until this is settled.

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
  `ALTER` a `CHECK` constraint without a destructive rebuild), `entitlements` (cache-only,
  no network code wired yet), `recipe_drafts` (so a future offline/failed recipe publish
  doesn't lose typed input).
- `lib/ai-capability.ts` — a typed capability contract (`isNutritionScannerLinked()`,
  `getNutritionScanCapability()`, `getPlannerCapability()`) meant to be reused by the future
  meal/workout planner screens, not just the scanner.
- `supabase/migrations/0001_backend_recipes_catalog_entitlements.sql` — a full, reviewed
  Postgres/RLS schema (catalog_foods, recipes, recipe_ingredients, recipe_reports,
  blocked_users, entitlements) with moderation-abuse and anti-spam protections baked in.
  **Written but NOT applied to any live database** — there is no Supabase project connected
  to this app right now. Two real bugs the confidence-auditor found in it (an approved
  recipe getting locked out of soft-delete; a race condition in the publish-cap trigger under
  concurrent requests) were fixed in the file directly after the audit. If the "no
  monetization in v1" direction is confirmed, the `entitlements` table and the
  `recipes_enforce_publish_cap` trigger in this file should probably be stripped out before
  it's ever applied.

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

## 4. What's next, in order

1. **Get the monetization-model answer from the user** (§1). This gates everything else
   about recipes/paywall — don't build recipe-limit UI or wire up the SQL migration until
   it's settled.
2. **Visually verify today's changes on a real device or a machine with an actual display**
   — this was the one verification step this environment couldn't do. Priority checks: edit
   a logged food and confirm macros don't change; switch to Imperial units and round-trip a
   body-measurement edit; confirm the TDEE calculator hides the deficit row for an under-18
   profile; confirm "Scan Label" only appears on a build where the native module is linked.
3. **Decide whether to commit today's work.** Nothing is committed yet — it's all sitting in
   the working tree (`git status` shows 19 modified files, several new files, one deletion).
   Consider committing in logical chunks (food-db expansion / bug fixes / architecture
   scaffolding) rather than one giant commit, but that's a style call, not a correctness one.
4. **Once the monetization question is settled**, the actual next build phase is whichever
   of these the answer points to:
   - **If free + no monetization in v1:** provision a real Supabase project, apply a
     (possibly entitlement-stripped) version of `supabase/migrations/0001_...sql`, build the
     recipe browse/create/detail screens (implementer's draft recommended reusing
     `app/dashboard/add-custom-food.tsx`'s ingredient-builder as the base), wire
     `lib/ai-capability.ts` into the free rule-based "Smart Planner" (deterministic,
     template-based meal/workout suggestions using `utils/calorie-targets.ts` + the food
     catalog — works on every device, no AI/network required, and can genuinely ship before
     any backend work since it's pure local logic).
   - **If paid-upfront:** same as above but delete the `entitlements` table and publish-cap
     trigger from the migration first; decide App Store/Play pricing; no IAP code needed at
     all since the store's own paywall-before-download is the only gate.
   - **If free + IAP without RevenueCat:** hardest path — needs a custom receipt-verification
     server (Apple App Store Server API / Google Play Developer API) to make the recipe cap a
     real backstop instead of client-trust; not recommended unless there's a specific reason
     to avoid RevenueCat's SDK itself (bundle size, one privacy-manifest entry) that outweighs
     building your own validation service.
5. **Other still-open product decisions** (from the synthesis pass, none blocking, but needed
   before the recipes/backend feature actually ships): auth provider set (email/OTP only vs.
   + Google/Apple — note: adding Google forces offering Sign-in-with-Apple too per store
   policy); recipes nav placement (a segment inside the existing Log tab was recommended over
   a 5th tab-bar icon, since the tab bar's FAB has no spare slot without breaking its current
   one-tap logging shortcut); a real teen (13–17) UGC posting policy (the "13+
   self-attestation" idea turned out to be meaningless — onboarding already requires 13+ to
   even reach the dashboard, so re-checking it at publish time blocks nobody; needs an actual
   answer, not reused onboarding data); whether the free "Smart Planner" and the future paid
   "AI Planner" get visually/copy-wise distinguished everywhere (recommended: always, since
   most of the audience is on Android/older iPhones and will only ever see the free tier —
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
- **Supabase project creation + region choice**, **App Store Connect / Play Console setup**,
  and (if the free+IAP path is chosen) **a RevenueCat account** — all need the user's own
  accounts/credentials, not something buildable in-session.

---

## 6. Where else to look

- `CLAUDE.md` — project rules, non-negotiables, the publish-readiness gate. Still accurate
  except non-negotiable rule #1 ("no Supabase, fully offline") will need updating once the
  monetization/backend question is settled and any backend work actually starts.
- `.claude/skills/orchestrate/SKILL.md` — the pipeline used to produce this session's
  architecture work; re-run it for any future whole-feature/high-stakes push.
- Claude Code memory (if you have access to it in this session) has three entries from this
  work: `project_monetization_and_architecture_v2.md`, `project_prd_conflict_2026_07.md`,
  `user_context_brix.md` — the first one needs a mental update, since it currently states
  "one-time purchase only" as settled when it's actually back under discussion (see §1).
