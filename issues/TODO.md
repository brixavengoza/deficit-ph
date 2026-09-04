# TODO — next build items (do not lose these)

**Created:** 2026-08-13, from Brix's direction after the five-issue fix session.
Read `issues/HANDOFF.md` §0 for what already shipped that day. Items here are ordered
by Brix's priority. Check items off in this file as they land.

**State as of 2026-08-13 end of session (read this first in a fresh context):**
- The ENTIRE 2026-08-13 changeset is UNCOMMITTED in the working tree (two work streams:
  the five-issue fix set + the scanner overhaul). `npm run release:check` is green
  (typecheck, nutrition-parser 6+13, macro-targets 31, calorie-targets 39, jest 10).
  First order of business: review + commit (Brix hasn't asked for a commit yet).
- Scanner native changes (new Swift method + Android ML Kit module) need a **new EAS
  custom dev build** before anything scanner-related works on a device. JS is OTA-safe
  against old builds.
- **CORRECTION (2026-09-04): the Supabase project is NOT empty.** The earlier "empty"
  reading was taken while the project was still restoring from pause. Project **Trackk**
  (`fxqurlhvtbpmydwmfpzc`, ap-southeast-1) is ACTIVE and already has a complete
  cloud schema from the original pre-SQLite version of the app, with 2 migrations
  applied (`20260510153412_trackk_core_mvp_schema`,
  `20260510154124_trackk_schema_hardening_and_rls_perf`). NOTE: it is NOT empty of
  data either - real counts on 2026-09-04 are 329 seed foods, 1 auth user, 1 profile,
  1 food log (the "0 rows" shown by tooling is a Postgres statistics estimate). Tables:
  `profiles`, `user_preferences`, `user_goals`, `foods`, `food_logs`, `weight_logs`,
  `hydration_logs` - all with row-level security and owner-scoped policies, plus a
  working `handle_new_user` trigger on signup. **Those 2 applied migrations are NOT in
  the repo**; see `supabase/migrations/README.md` for how to pull them down.
  Free-tier projects auto-pause after ~1 week idle; restore via MCP if needed.
- Key docs: `issues/HANDOFF.md` (what shipped + verification status),
  `issues/community-foods-prd.md` (feature spec, amended with Brix's simple-share
  direction), this file (the queue).

---

## 1. Community foods — share user foods via the shared food DB

**Brix's direction (2026-08-13):** keep it simple — when a user saves a custom food,
save it to the shared food database so anyone can access it. No heavy ceremony.

- [x] Record the direction in `issues/community-foods-prd.md` — DONE 2026-08-13, as the
      amendment note at the top of the PRD (publish-on-save default, post-moderation).
      Optional later: rewrite §3/§8 bodies instead of reading them through the amendment.
- [ ] Even in the simple version, Apple 1.2 (UGC) still requires: a report option, a way
      to hide/block content, a takedown path, and privacy-label/data-safety updates the
      moment networking ships. Post-moderation (publish immediately, remove on report)
      is the lightest compliant shape — confirm with Brix that this is the intent, since
      the current PRD draft assumed pre-moderation.
- [x] **Migrations written against the REAL schema - 2026-09-04.** The earlier drafts
      (`0002_auth_profiles`, `0003_community_foods`) were WRONG and have been deleted:
      they would have silently no-op'd on the existing `profiles` table (it keys on
      `user_id`, not `id`) and then replaced the working `handle_new_user` trigger with
      one writing to columns that do not exist, breaking every signup. The replacements
      EXTEND the live schema instead of duplicating it - no `community_foods` table,
      because `public.foods` already has `owner_user_id` and a `food_source` enum:
      `20260904120000_food_sharing_and_moderation.sql`,
      `20260904120100_profiles_and_account_deletion.sql`,
      `20260904120200_food_sharing_rpcs.sql`, plus `supabase/migrations/README.md`.
- [x] **APPLIED to Trackk, 2026-09-04, and verified.** Five migrations now live (the
      three planned, plus two that only exist because verification found real bugs):
      grants hardening (`...120300`) after the security advisor showed even trigger
      functions were callable at `/rest/v1/rpc/`, and a guard bugfix (`...120400`)
      after a hostile insert with `is_verified=true, usage_count=999999` was ACCEPTED.
      Cause was Postgres three-valued logic: `auth.role()` is NULL on direct
      connections and `NULL = 'service_role'` is NULL, not false, so the guard's
      `if not privileged` never fired. Re-tested after the fix: hostile insert is now
      fully scrubbed. `search_shared_foods('adob')` returns fuzzy matches.
- [ ] **Remaining advisor warning:** `pg_trgm` is installed in the `public` schema
      (Supabase convention is a separate `extensions` schema). Left alone deliberately:
      moving it would break the trigram index and the `similarity()` calls unless every
      function's `search_path` is updated in the same change. Low risk, worth doing in a
      quiet moment, not mid-feature.
- [ ] **Enable leaked-password protection** in Supabase Auth settings (advisor warning).
      Relevant now that email/password signup is being added. Dashboard setting, not SQL.
- [ ] **Pull the 2 already-applied migrations into the repo** (`supabase db pull`, needs
      Docker + the DB password) so a clone can reproduce the database. See the README.
- [x] ~~Silent anonymous auth on first publish~~ - SUPERSEDED 2026-09-04 by Brix:
      "if it needs db then it needs to have authentication layer, lets add login/signup
      screen that supports oauth as well which is google or apple login."
- [ ] **Auth screens (`app/auth/` is currently EMPTY): login + signup, email/password,
      Sign in with Google, Sign in with Apple.** Notes gathered 2026-09-04:
      Brix already has the Supabase URL, publishable key, Apple auth service ID and
      redirect URL in `.env` (gitignored). App scheme is `trackk`; bundle id
      `com.trackk.minimal` on both platforms. No auth packages installed yet
      (`expo-auth-session`, `expo-web-browser`, `expo-apple-authentication`,
      `expo-secure-store`, `@supabase/supabase-js` all missing).
      Apple Guideline 4.8: offering Google login REQUIRES offering Sign in with Apple
      too, so both ship together (already Brix's intent).
      DECISION NEEDED from Brix: is login mandatory at app start, or optional/skippable?
      Recommendation is optional, because the app works fully offline today and forcing
      a signup wall in front of a paid-upfront app costs activation. Sharing a food is
      the natural point to require an account.
- [ ] `lib/community-sync.ts` - the ONLY file importing `@supabase/supabase-js`,
      lazy-initialized off the cold-start path; pull by `revision`, push via outbox.
- [ ] "Community" section in `log-food-search` results; log path snapshots nutrition
      exactly like today (offline-safe, takedown-safe).
- [ ] Compliance batch in the SAME release: account deletion (Apple 5.1.1(v)), privacy
      labels flip from "Data Not Collected", UGC EULA + contact, RA 10173 disclosure.
- [ ] Still Brix-only decisions: who handles reports (likely his wife via a simple
      dashboard), anonymous vs named authorship, teen (13–17) posting policy.

## 1b. Authentication screens - NEXT UP (nothing exists yet)

Confirmed 2026-09-04: `app/auth/` is an EMPTY folder. There is no login, no signup, no
password reset, no Supabase client, and none of the auth packages are installed. The
server side is ready and waiting.

**Brix's decision: login is REQUIRED at app start.**

Consequence to handle, not ignore: the app currently opens straight into a fully offline
experience, and existing on-device data is stored under the placeholder owner
`'local-user'`. A mandatory login wall means (a) the app cannot open without a network on
first run, and (b) that existing local data must be ADOPTED into the account at first
sign-in or the user appears to have lost their history. Both need building, not just the
screens.

### BUILT 2026-09-04 (uncommitted, typecheck + 19 tests green)
- [x] Packages installed via `npx expo install`: `@supabase/supabase-js`,
      `expo-secure-store`, `expo-auth-session`, `expo-web-browser`,
      `expo-apple-authentication`, `expo-crypto`. Config plugins auto-added;
      `expo-apple-authentication` plugin and `ios.usesAppleSignIn: true` added to app.json.
- [x] `lib/supabase.ts` - lazy client, PKCE flow, `detectSessionInUrl: false`.
      Session tokens live in the KEYCHAIN via a chunked adapter: expo-secure-store caps a
      value at 2048 bytes and a Supabase session is routinely bigger, so it splits across
      numbered chunks and clears old ones on write (a shrinking value cannot leave a stale
      tail). Web falls back to localStorage. Accepts several env-var aliases.
- [x] `lib/oauth-callback.ts` + `lib/oauth-callback.test.ts` - the callback URL parser,
      pulled into its own dependency-free module so it is testable. 9 tests, including a
      duplicated-`code` case so a crafted URL cannot override the real one. Written by
      hand because `expo-auth-session` does not re-export `getQueryParams` from its index.
- [x] `lib/auth.ts` - email sign-in/sign-up, Google (browser + PKCE exchange), Apple
      (NATIVE sheet on iOS via identity token, browser flow on Android so iPhone-created
      accounts still work on Android), password reset send + update, recovery-code
      exchange, sign out, `getLinkedProviders`, `deleteAccount`, and Taglish error mapping.
      Apple's full name is captured on first authorization only, so it is saved immediately.
- [x] `stores/use-auth-store.ts` - status machine (loading / signed-in / signed-out /
      unconfigured), `onAuthStateChange` subscription, PASSWORD_RECOVERY handling.
- [x] `app/auth/`: `_layout`, `login`, `sign-up`, `forgot-password`, `reset-password`.
      Reset screen exchanges the deep-link `code` itself (required because
      `detectSessionInUrl` is off) and distinguishes "still checking" from "expired link".
      Forgot-password always shows the same confirmation regardless of whether the email
      exists, so the screen cannot be used to enumerate accounts.
- [x] Route guard in `app/_layout.tsx` covering EVERY route (not just the index, which a
      deep link would walk straight past), plus an `app/index.tsx` fix so it no longer
      races the guard on a signed-out launch.

### STILL TO DO before this ships
- [ ] **Account deletion screen (App Store 5.1.1(v)).** The `delete_own_account()` RPC and
      `lib/auth.ts:deleteAccount()` both exist, but nothing in Profile calls them. This is
      MANDATORY now that accounts exist and is a very common rejection reason.
- [ ] **Adopt existing local data at first sign-in.** On-device rows are owned by the
      placeholder `'local-user'`. Without this an existing user appears to lose all history
      the moment login becomes mandatory.
- [ ] **Offline launch.** A cached session should let a returning user in with no network;
      only a genuine first run should require one. Currently unverified.
- [ ] **Confirm the .env variable names.** The code reads `EXPO_PUBLIC_SUPABASE_URL` and
      `EXPO_PUBLIC_SUPABASE_ANON_KEY` (plus aliases `..._PROJECT_URL`,
      `..._PUBLISHABLE_KEY`, `..._KEY`). `.env` could not be read from this session, so if
      Brix used different names the app will show the "not configured" message. Env vars
      are inlined at build time: restart with `npx expo start -c`, not a plain reload.
- [ ] **New EAS dev build required** before any of this runs on a device: three new native
      modules (secure-store, apple-authentication, web-browser) were added.
- [ ] UGC terms consent write to `profiles.ugc_terms_accepted_at` (the copy is on the
      sign-up screen; the column write is not wired yet).

### Store settings for Brix
- [x] Google provider is ALREADY configured and working: the one existing account
      (`brixbimboavengoza@gmail.com`, created 2026-05-10) signed up with it and has
      `has_password = false`.
- [ ] Enable the APPLE provider in Supabase Auth, and add `trackk://auth/callback` plus
      `trackk://auth/reset-password` to the redirect allow-list, or OAuth and the reset
      email will both dead-end.
- [ ] Turn on leaked-password protection (advisor warning).
- [ ] Apple Guideline 4.8: offering Google REQUIRES offering Apple. Both are planned, so
      this is satisfied, but do not ship Google alone.

## 2. AI label scanner — make it work on (almost) every phone

**Report:** "AI image scanner doesn't work on most devices." Confirmed root causes in
code, in order of impact:

- [x] **Android has NO scanner at all.** DONE 2026-08-13: added
      `@infinitered/react-native-mlkit-text-recognition@^5` (ML Kit v2 Latin, bundled,
      offline, Expo SDK 54 line), excluded from the iOS build via
      `expo.autolinking.apple.exclude` in package.json; `lib/ocr.ts` is the unified
      OCR surface and `getNutritionScanCapability()` now reports the `ocr` tier on
      Android builds that include the module. NEEDS a new EAS custom dev build.
- [x] **The deterministic parser is never called.** DONE 2026-08-13:
      `resolveScanDraft(rawText, nativeDraft?)` in `lib/nutrition-label-parser.ts` does
      a field-level merge (generative wins per finite field, parser fills the rest) and
      the Swift bridge now RESOLVES with `rawText` when Apple Intelligence fails instead
      of rejecting — so every iPhone with working OCR scans successfully. Covered by 13
      new checks in `scripts/test-nutrition-label-parser.mjs`.
- [x] **iOS tiering.** DONE 2026-08-13: the `DataScannerViewController` modal is no
      longer part of the flow (its native method remains but nothing calls it); the fast
      Vision-only `recognizeText` method was added to `FoodLabelScanner.swift` for the
      live loop; generative parse runs only on the full-read path and silently degrades.
      Still open (small): the native `checkAvailability()` probe so the UI could label
      the generative tier upfront instead of discovering it per call.
- [ ] **Generative tier on low-end devices: NOT possible in 2026 — confirmed by research.**
      Android on-device LLM (Gemini Nano/AICore) is flagship-only (Pixel 10 / Galaxy S26
      class, 12 GB RAM for the newest tier) — the PH low-end market (3-6 GB Infinix/
      Tecno/realme/Redmi/A0x) will never see it this generation. Apple Foundation Models
      stay iPhone 15 Pro+ / iOS 26. So: OCR + the deterministic parser IS the universal
      tier; the generative draft stays an opportunistic upgrade on eligible iPhones.
      Never market "AI scan" as universal (same honesty rule as the Smart Planner in
      HANDOFF §4.7).

### 2a. Implementation stack (researched AND implemented 2026-08-13)

**The bet held: expo-camera (already installed), zero new camera stack in v1.**
Everything below except the last two items is BUILT and in the uncommitted working tree.

- [x] **iOS OCR:** `recognizeText` method (Apple Vision, Vision-only, fast) added to
      `ios/trackk/FoodLabelScanner.swift` + exported in `FoodLabelScannerBridge.m`.
      Zero dependencies, zero app-size cost. NOT compiled here — the next EAS/Xcode
      build is the compile check.
- [x] **Android OCR:** `@infinitered/react-native-mlkit-text-recognition@^5` installed;
      excluded from the iOS build via `expo.autolinking.apple.exclude` (both the module
      and `@infinitered/react-native-mlkit-core`) so the ~38 MB GoogleMLKit pods never
      touch iOS. Fallback options if it disappoints on low-end QA:
      `@react-native-ml-kit/text-recognition@2` (bigger, all scripts) or `expo-mlkit-ocr`
      (right architecture, too young — created May 2026).
- [x] **Unified JS surface:** `lib/ocr.ts` (`recognizeTextFromImage`, `isOcrLinked`;
      lazy `require` of the ML Kit package because it throws at import time in builds
      without the native module) feeding `lib/nutrition-label-parser.ts` unchanged.
- [x] **Live auto-detect v1:** silent timed-capture loop in `scan-label.tsx` (1.4 s,
      `quality: 0.5`, `skipProcessing`, `shutterSound: false`, `animateShutter={false}`),
      in-flight guard shared with the manual capture, plausibility-gated auto-fill +
      success haptic. Shutter sound is suppressible in PH (only JP/KR firmware force it).
- [ ] **Run the new EAS custom dev build** (blocker for all of the above on devices),
      then the device QA list in §3.
- [ ] **Native `checkAvailability()` probe** (small): let `lib/ai-capability.ts` know
      upfront whether the generative tier is truly eligible (iOS 26 + Apple
      Intelligence) instead of discovering per call. Cosmetic — the flow already
      degrades correctly without it.
- [ ] **True 1-3 fps live OCR (v2 upgrade path, optional):** VisionCamera v5 (5.2.2) +
      `react-native-worklets` + `react-native-vision-camera-ocr-plus@2` (updated Aug
      2026, VC5/Nitro compatible, scan-region cropping). Gotchas recorded: go straight
      to v5 (NEVER v4 + worklets-core next to Reanimated 4 — duplicate WorkletsPackage
      crash on Android); ocr-plus v2 needs Android minSdk 26 (default is 24, excludes
      Android 7); V5 ecosystem is only ~4 months old. +3-4 dev days.

SDK 54 build notes (still apply to any future native work): New Arch is default (SDK 54
is the last legacy-arch release); Kotlin 2.1.20 / AGP-Gradle 8.14 / compileSdk 36; keep
minSdk 24; do NOT bump the iOS deployment target (the ML Kit iOS pods that would force
15.5 are excluded).

## 3. Scanner camera flow — one real camera, auto-detect

**Report:** "clicking scan should directly open the camera, not just mimicking the
camera UI… I still have to click the capture just to open the real camera. And it should
auto detect while on camera, not just on capture."

Confirmed in code: `app/dashboard/scan-label.tsx` mounts an `expo-camera` `CameraView`
as a DECORATIVE preview (nothing reads its frames) with a viewfinder overlay + capture
button; tapping capture then calls the native module, which presents Apple's
`DataScannerViewController` — a SECOND, modal camera. Two cameras, one fake.

- [x] Kill the double-camera. DONE 2026-08-13: the expo-camera preview IS the scanner
      now — the capture button photographs from it directly; no second native camera UI.
- [x] Live auto-detect. DONE 2026-08-13: a silent sampling loop (every 1.4 s,
      `shutterSound: false`, `animateShutter={false}`) OCRs frames through
      `readNutritionLabelQuick` and auto-fills (with a success haptic) only when
      `isPlausibleNutritionDraft` passes — physical bounds (≤900 kcal/100g, macros
      ≤100 g/100g) so receipts/menus never auto-accept. Manual capture button kept and
      runs the FULL pipeline (generative upgrade where eligible). "Scan Again" resets.
- [x] Draft-review card + Edit/Save flow kept (plus a Try Again action on errors).
- [x] Permission prompt, gallery upload, and "Recent" shortcuts kept (gallery now also
      degrades gracefully instead of failing without Apple Intelligence).
- [ ] **Verify on real devices after the next EAS custom dev build** (this environment
      cannot run cameras): auto-detect latency on a low-end Android, iOS Vision path on
      a non-Apple-Intelligence iPhone, shutter silence, and the plausibility gate not
      auto-accepting non-label text in the wild.

## 4. Carry-over (from HANDOFF §0/§3 — still open)

- [ ] Visual verification on a real device of the 2026-08-13 fixes (list in HANDOFF §0).
- [ ] Licensed-dietitian review of calorie/macro thresholds + `// VERIFY`-flagged foods.
- [ ] Brix: App Store Connect / Play Console paid-upfront config + price point.
- [ ] Smart Planner (rule-based, works everywhere) — buildable anytime, no backend needed.
