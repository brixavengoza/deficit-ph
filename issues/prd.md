# PRD — On-device AI food-photo capture ("Snap to Log")

**Status:** Draft for implementation · **Author:** interview-driven (write-a-prd) · **Date:** 2026-07-25
**Owner decisions:** captured in the interview and listed under *Implementation Decisions*.

## problem statement

Logging food in Deficit PH today means searching a local database, adding a custom food, or
scanning a packaged nutrition label (iOS-only, via a native bridge). For a Filipino Gen Z
audience eating home-cooked *ulam* and restaurant plates, manual entry is slow and the
nutrition-label scanner only helps with packaged goods — and only on a subset of iPhones.

Users want to point their camera at a plate of food and get an instant, editable breakdown of
what's on it (rice + adobo + egg) with calorie and macro estimates, and to keep using the same
camera to read packaged back-labels. They also expect the app not to embarrass itself: if the
picture isn't food, it should say so instead of inventing numbers.

The hard constraint: the app is **paid-upfront (one-time purchase), offline-first, with no
backend**, and most of the audience is on **budget Android phones and older iPhones**. True
"photo → dish → macros" is a multimodal-vision problem that on-device generative models only
solve on a small number of flagship devices, and a cloud model would add recurring per-scan
cost with no recurring revenue. The feature must therefore deliver real value on *every* device
while reserving the highest-quality experience for the phones that can run it.

## solution

A single **"Snap to Log"** capture experience, reachable in about one tap, that runs entirely
on-device and offline:

- The user opens the camera (prominent on the food-search screen, with a camera affordance on
  the Home dashboard) or picks an existing photo.
- The app decides on-device what it's looking at: a **packaged label**, a **cooked dish**, or
  **not food**.
- **Packaged label (every device):** the app reads the label text on-device and pre-fills an
  editable nutrition draft the user reviews, corrects, saves, and logs.
- **Cooked dish, capable device (Phase 2):** the app auto-generates a list of component items
  with estimated portions and macros. The user reviews an **editable multi-item list** — adding
  missed items, removing wrong ones, and fixing grams/macros — then each item logs as its own
  entry under a chosen meal.
- **Cooked dish, other devices (the majority):** the capture still "works" — the app attaches
  the photo, confirms it looks like food, and drops the user into the fast search/quick-log flow.
  No "unavailable" wall, no fabricated numbers.
- **Not food:** a friendly Taglish heads-up with *Retake* or *Log manually anyway* — informative
  but never blocking, because on-device classifiers misread real Filipino dishes.

Auto-generated values are always presented as **editable estimates to verify before saving**, so
users never blindly trust an inaccurate number. Everything happens on the device; photos never
leave the phone, so the app stays offline and its "Data Not Collected" privacy stance holds.

## user stories

1. as a user, i want a prominent "Scan" action on the food-search screen and a camera affordance on the Home dashboard, so that i can start a capture in about one tap without hunting through menus.
2. as a user, i want to capture a photo with the camera or choose one from my gallery, so that i can log food from a fresh shot or an existing picture.
3. as a user, i want the app to request camera and photo-library permission with a clear reason and keep working if i decline, so that i stay in control and can still log manually.
4. as a user, i want the app to detect on-device whether my photo is a packaged label, a cooked dish, or not food, so that it routes me to the right flow automatically.
5. as a user scanning a packaged nutrition label on any phone (iOS or Android), i want the label text read on-device and a nutrition draft pre-filled (calories, protein, carbs, fat, fiber, sugar, sodium, serving), so that i don't have to type the numbers.
6. as a user, i want the label draft to open in an editable review before saving, so that i can correct any misread values.
7. as a user, i want to save a scanned label as a reusable food and log it, so that logging the same product later is instant.
8. as a user on a capable device (Phase 2), i want a cooked-dish photo auto-analyzed into a list of component items with estimated grams and macros, so that i get a fast starting point for a whole meal.
9. as a user, i want an auto-generated dish result shown as an editable multi-item list before anything is saved, so that i stay in control of what enters my log.
10. as a user, i want to remove an item the model added by mistake, so that my log isn't padded with food i didn't eat.
11. as a user, i want to add an item the model missed — from my local food database or entered manually — so that my meal is complete.
12. as a user, i want to edit any item's quantity, unit, and macros, so that i can fix inaccurate gram or macro estimates.
13. as a user, i want each reviewed item to log as its own entry under a chosen meal, so that i can later edit or delete a single component without redoing the whole meal.
14. as a user, i want the meal (breakfast/lunch/dinner/snack) and time pre-filled from the current time and editable, so that logging is fast but still correctable.
15. as a user on a non-flagship phone photographing a cooked dish, i want the app to attach my photo, confirm it looks like food, and drop me into quick search/log, so that i still get help logging without ever seeing an "unavailable" message.
16. as a user, i want auto-generated values clearly marked as estimates i should verify, so that i don't trust an inaccurate number blindly.
17. as a user who photographed something that isn't food, i want a friendly heads-up offering *Retake* or *Log manually anyway*, so that i'm informed but never blocked when my real dish was misread.
18. as a user, i want the whole capture-and-estimate flow to run fully on-device and offline, so that it works with no internet and my photos never leave my phone.
19. as a user whose device can't run any AI capability, i want the manual create/log path always available from the same screen, so that the feature never dead-ends.
20. as a user, i want scanning to show clear progress and fail gracefully into the manual fallback if OCR/analysis errors, so that a bad scan doesn't waste my effort.
21. as a user, i want a captured dish's items to reuse my existing food-database matches where possible, so that macros stay consistent with the rest of the app.
22. as a returning user, i want capture to behave consistently on my iPhone and a family member's Android, so that the app feels the same cross-platform.
23. as a user, i want non-food or uncertain detections to never create a bogus auto-estimate entry, so that my calorie totals stay trustworthy.
24. as the app, i want to hard-hide the Phase 2 generative dish-scan on ineligible devices instead of showing-then-failing, so that no buyer pays for a feature that only errors out (store-rejection safety).
25. as a user, i want the capture screen to show my photo during review, so that i can visually cross-check the items against what i actually ate.
26. as a user, i want to cancel or back out of a capture at any point, so that no partial or unwanted entry is written to my day.

## Implementation Decisions

**Platform strategy — two on-device tiers, one JS contract.** "Universal" means device *coverage*,
not a shared engine: each platform uses its own native APIs, exposed through a single JavaScript
interface.
- **Tier 1 (v1, ~all devices):** on-device OCR + image classification — iOS Vision
  (`VNRecognizeTextRequest`, `VNClassifyImageRequest`, available iOS 13+) and Android ML Kit
  (Text Recognition + Image Labeling). Free, offline, runs on budget Androids and old iPhones.
- **Tier 2 (Phase 2, flagship-only):** generative dish→macros via Apple Foundation Models
  (iOS 26 / Apple-Intelligence hardware) and, where viable, Android Gemini Nano / AICore.
  Hard-hidden on ineligible devices.
- **No cloud, no backend, no network calls.** Fully offline; privacy label stays "Data Not
  Collected." This reaffirms the app's existing non-negotiable local-first rule.

**On-device AI capability layer (extend the existing capability module).** Owns the single typed
contract for what THIS device can do: OCR availability, food/not-food classification availability,
and (Phase 2) generative availability, per platform, synchronously where possible. Screens never
touch native modules directly; they ask the layer and render accordingly. Extends the current
iOS-only linkage checks to include Android module linkage and to distinguish the Tier 1 (OCR +
classify) capability — available on both platforms — from the Tier 2 generative probe, which must
not be claimed from module linkage alone.

**Cross-platform image-analysis service (new deep module).** Given an image (captured or picked),
returns one normalized, testable result describing its *kind* — `label`, `dish`, `non-food`, or
`uncertain` — plus OCR text and/or classification labels. It wraps the two native backends behind
one interface so callers never know which platform tech ran. For labels it feeds OCR text into the
existing parser; for dishes it reports classification (Tier 1) or defers to the generative analyzer
(Tier 2); for non-food/uncertain it reports that verdict without inventing nutrition data.

**Nutrition-label parser (reuse existing, unchanged).** The current pure-TypeScript parser
(raw OCR text → structured per-100g nutrition draft) is already cross-platform and becomes the
shared sink for both iOS Vision OCR and Android ML Kit OCR. No behavioral change; it simply now
also receives Android-produced text.

**Multi-item meal draft model (new deep domain module).** Represents a reviewed capture as an
ordered list of editable line items — each with name, quantity + unit, and a per-100g macro
profile plus computed totals — and supports add / remove / edit and conversion to N separate
food-log writes. All gram conversion, macro scaling, and rounding route through the existing
safety-critical food math utilities (quantity→grams conversion, macro-profile resolution,
rounding); this module adds no independent nutrition math. It is the single place that turns a
capture into per-item log payloads.

**Capture & review UI (evolve the existing scan-label screen into a unified capture screen, plus
a new multi-item review screen).** The capture screen handles camera/gallery input, permission
prompts, progress, and routing by capability tier and result kind: label → editable label-draft
review (existing pattern); dish + generative (Phase 2) → multi-item review; dish + no generative →
photo attached + smart manual (search/quick-log); non-food/uncertain → warn with *Retake* /
*Log manually anyway*. The review surfaces mark all values as editable estimates and require an
explicit save.

**Entry points.** Promote a clearly-labeled "Scan food" primary action to the top of the
food-search screen and add a camera affordance on the Home dashboard. The center **+** FAB keeps
routing to search (preserving one-tap search-and-log); the FAB is not repurposed.

**Data-access & writes (reuse existing local data layer).** Per-item commit reuses the existing
food-log insert path — one insert per reviewed item, tagged with the chosen meal and time. **No
schema change in v1**: captured photos are ephemeral (shown during review, not persisted), so no
new column is required. If photo persistence is added later, it goes through the existing
`PRAGMA user_version` migration path with an explicit storage-cleanup policy.

**Non-food handling.** "Warn, don't block": on a `non-food` or `uncertain` verdict, show a
friendly Taglish heads-up with *Retake* and *Log manually anyway*. No auto-estimate entry is
created on this path regardless of choice.

**Estimates & safety.** Auto-generated nutrition is always labeled as an estimate and always
passes through a mandatory human review before any write. This satisfies the project's
"nutrition math is safety-critical" rule; the review step, not the model, is the source of truth.

**Build/runtime.** Both platforms require a custom dev/EAS build (native modules) — not Expo Go.
Camera and photo-library permission strings must be declared (iOS `NSCameraUsageDescription`,
`NSPhotoLibraryUsageDescription`; Android `CAMERA`, media access).

## Testing decisions

Good tests verify externally observable behavior — the normalized result of analyzing an image,
the payloads produced from a reviewed meal draft, and the capability verdict for a given
device/platform state — not internal wiring.

- **Nutrition-label parser:** extend the existing fixture-based parser test
  (`scripts/test-nutrition-label-parser.mjs` is the prior-art pattern) with Android-ML-Kit-style
  raw OCR text fixtures (different line breaks/spacing than iOS Vision) to prove the shared parser
  handles both platforms' output. This is the highest-value, already-established test surface.
- **Multi-item meal draft model:** unit-test add/remove/edit and the conversion to per-item log
  payloads — gram conversion across units (grams/ml/oz/servings), macro scaling, rounding, and
  guards for zero/negative/missing quantities and empty item lists. These are the safety-critical
  paths and must be covered by reasoning about the same edge cases the calorie/macro utilities
  already are.
- **On-device AI capability layer:** test tier resolution against mocked native-module
  presence/absence per platform (Tier 1 linked vs not; Tier 2 not claimed from linkage alone).
- **Image-analysis service:** test normalization/routing given mocked native results — `label`,
  `dish`, `non-food`, and the `uncertain` (real-food-classified-as-non-food) path — asserting no
  nutrition data is produced on non-food/uncertain.
- **Release gate:** the feature must keep `npm run release:check` (typecheck +
  nutrition-parser test) green.

Interactive/on-device behavior (real OCR quality, real classification thresholds, camera
permission flows, and any Phase 2 generative output) requires real-device verification and is not
claimed by automated tests.

## Out of scope

- **Tier 2 generative dish→macros recognition** — specced here but built in Phase 2 after a
  feasibility spike (see Further Notes). v1 does not ship on-device generative food understanding.
- **Any cloud/backend, network calls, or accounts** — the feature is fully on-device.
- **Persisting captured photos** to disk or database (v1 photos are ephemeral).
- **Barcode → product-catalog lookup** — there is no product database; a different feature.
- **Volumetric/portion-from-image estimation** (depth/size inference) — Phase 2+ at best.
- **Clinical/nutritional accuracy certification** of any estimate — requires a licensed dietitian,
  per existing project rules.
- **Tuning exact classifier confidence thresholds** as a blocking concern — mitigated by the
  "warn, don't block" decision, so precise thresholds are low-risk in v1.

## Further Notes

- **Phase 2 feasibility spike (blocking for Tier 2):** confirm whether Apple Foundation Models
  accepts image input at all. The current native bridge uses Foundation Models only to parse
  OCR'd *text*; if the model is text-only, Tier 2 on iOS must instead combine Vision food
  classification with LLM reasoning over derived labels (degraded), or ship a Core ML food
  classifier. On Android, generative on-device (Gemini Nano / AICore / ML Kit GenAI) is
  flagship-only (e.g. Pixel 8+, Galaxy S24+) with limited image support; Tier 2 must gate hard and
  hide on everything else.
- **Assumption — ephemeral photos:** v1 shows the captured image during review but does not store
  it. If users want photos saved on log entries, that is a schema addition (via the existing
  versioned-migration path) plus a storage-cleanup policy — deferred.
- **App size:** bundling ML Kit models increases Android app size; prefer ML Kit's Play-Services
  (unbundled) model variant where possible to limit the increase. iOS Vision adds no bundle cost.
- **Store compliance:** all processing on-device means the privacy label stays "Data Not
  Collected"; ensure camera/photo permission strings are present and the Phase 2 generative
  feature is hard-hidden (never behind the paywall / never show-then-fail) to avoid reviewer
  rejection.
- **Consistency with existing app:** dish items should prefer matches from the existing local food
  database so macros stay consistent with manual logging; all math reuses the existing
  safety-critical utilities rather than introducing new calculations.
- **Unresolved (non-blocking) product questions:** final Taglish copy for the non-food and
  fallback states (use the `taglish-genz` skill); exact visual treatment of the Home camera
  affordance; whether the "Scan" promotion replaces or sits beside the current in-search entry.
