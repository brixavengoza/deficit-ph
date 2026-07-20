## problem statement

People who want to manage their calorie intake need a dependable way to calculate a reasonable daily target, record food and hydration, monitor weight trends, and understand their progress without creating an account or sending sensitive health data to a remote service. The current app demonstrates most of those workflows, but its product identity, platform configuration, health rules, privacy controls, device compatibility, and quality gates are not yet coherent enough for a paid production release.

Users currently encounter a product described interchangeably as trackk, Deficit PH, and a generic starter template. Some settings imply accounts, notifications, subscriptions, or profile identity even though those capabilities do not exist. Imperial measurements can be handled inconsistently, the bundled food catalog has no recorded provenance, and the label scanner is presented even on devices that cannot run its on-device model. A local-only user cannot erase all data from inside the app and has no portable export. These gaps can create confusion, inaccurate calculations, broken expectations, and avoidable privacy risk.

Passing TypeScript and four nutrition-parser fixtures is useful but insufficient evidence for production. The project has unresolved dependency and native-configuration findings, placeholder application identifiers, broad Android permissions, no formal database migration versioning, limited behavioral tests, and no physical-device release matrix. Users paying once for the app should receive a polished, predictable product whose core workflows function offline on both supported mobile platforms and whose limitations are stated honestly.

## solution

Release **Deficit** as a one-time paid, international-English nutrition tracker for adults on iOS and Android. The core experience remains completely offline and account-free. Users choose metric or imperial units, complete transparent adult onboarding, receive an estimated calorie and macro target, optionally customize that target, record foods and hydration, track weight and progress, manage custom foods, and control their local data.

The app stores canonical measurements locally and converts them consistently for display and input. It provides a compact, source-verified offline food catalog rather than claiming comprehensive coverage. Users can expand their catalog through custom food entry and, on qualifying devices, an on-device AI nutrition-label scanner. Scanner access appears only when the device can actually run the required model. Images, OCR text, and AI prompts remain temporary; only nutrition values reviewed and approved by the user are saved.

The product removes misleading identity, account, notification, subscription, billing, analytics, and cloud concepts. Settings focus on calculation inputs, targets, units, appearance, privacy, export, and deletion. Users can export a versioned JSON copy of their information and permanently delete all local data in the app. Store releases, not over-the-air updates, distribute new versions.

Production readiness requires consistent Deficit branding, permanent application identifiers, minimal permissions, synchronized native configuration, deterministic database migrations, expanded automated behavioral tests, a clean release toolchain, and successful end-to-end testing on representative physical devices. Nutrition and legal review remain strongly recommended but are documented risks rather than formal release blockers.

## user stories

1. as a prospective customer, i want a clear paid-upfront store listing, so that i understand there are no subscriptions or in-app purchases
2. as a prospective customer, i want the same Deficit product identity on both stores, so that i am confident i found the correct app
3. as a prospective customer, i want an honest description of offline functionality and device-dependent scanning, so that i know what my purchase includes
4. as a new user, i want the app to work without creating an account, so that i can begin privately and quickly
5. as a new user, i want to know that my information stays on my device, so that i can make an informed privacy decision
6. as a new user, i want to be told that the app is intended for adults, so that its eligibility rules are clear
7. as an underage user, i want onboarding to stop with a respectful explanation, so that i am not given adult calorie guidance
8. as a new user, i want the app to suggest units from my device locale, so that onboarding starts with familiar measurements
9. as a new user, i want to change between metric and imperial units before entering measurements, so that i do not need to convert values myself
10. as a user, i want all unit labels to match my selected system, so that i know how to interpret every value
11. as a user, i want unit changes to preserve the underlying measurement, so that switching units does not corrupt my history or targets
12. as a new user, i want a clear explanation of why the calorie estimate needs a sex calculation parameter, so that i can answer knowingly
13. as a new user, i want the sex calculation parameter distinguished from gender identity, so that the app does not misrepresent what it collects
14. as a new user, i want validation for age, height, and weight, so that impossible inputs do not produce misleading targets
15. as a new user, i want understandable activity-level descriptions, so that i can select the closest match consistently
16. as a new user, i want to choose between losing, maintaining, and gaining weight, so that the app reflects my intended outcome
17. as an underweight adult, i want the app to prevent a weight-loss goal and explain why, so that it does not encourage a potentially unsafe deficit
18. as an adult user, i want BMI used only as a limited safety check, so that the app does not label my body or diagnose my health
19. as a user, i want my calorie target labeled as an estimate rather than medical advice, so that its limitations are clear
20. as a user, i want to see how my calorie and macro targets were derived at a high level, so that the recommendation is transparent
21. as a user, i want conservative lower bounds on calorie targets, so that the app does not recommend obviously unsafe intake
22. as a user following professional guidance, i want to customize calorie and macro targets, so that the app can reflect my approved plan
23. as a user customizing targets, i want numeric safety validation and clear warnings, so that accidental or extreme values are caught
24. as a user with custom targets, i want to restore the calculated recommendation, so that experimentation is reversible
25. as a returning user, i want onboarding completion and preferences to persist offline, so that i resume where i left off
26. as a user, i want a concise dashboard of calories, macros, hydration, recent foods, and weight progress, so that i can understand today at a glance
27. as a user, i want dashboard totals to update after every successful write, so that the displayed state matches my saved data
28. as a user, i want loading, empty, and failure states to be explicit, so that a blank screen is never mistaken for lost data
29. as a user, i want to search a useful offline catalog of common foods, so that i can log everyday items without internet access
30. as a user, i want bundled foods to distinguish raw, cooked, and prepared states, so that i choose nutrition values that match what i ate
31. as a user, i want bundled food values to come from a documented source and version, so that their provenance can be audited
32. as a user, i want the app to avoid claiming that its food catalog is comprehensive, so that limited coverage is not misleading
33. as a user, i want to create a custom food with validated nutrition values, so that i can track foods missing from the catalog
34. as a user, i want to edit or replace a custom food deliberately, so that corrections do not silently create confusing duplicates
35. as a user, i want saved custom foods to remain available offline, so that repeated logging is efficient
36. as a user, i want food search to handle case and ordinary spacing consistently, so that minor typing differences do not hide results
37. as a user, i want to choose quantity and unit when logging food, so that calories and macros match the amount consumed
38. as a user, i want serving and weight conversions to be deterministic, so that repeated calculations produce the same totals
39. as a user, i want to assign a food to a meal and consumption time, so that my daily log reflects when i ate it
40. as a user, i want to review calculated calories and macros before saving, so that obvious input mistakes can be corrected
41. as a user, i want to edit an existing food log, so that i can correct quantity, meal, or time without creating a duplicate
42. as a user, i want to delete a food log with a clear confirmation or reversible interaction, so that accidental taps do not erase history
43. as a user, i want food-log snapshots to remain stable when a source food changes, so that historical totals do not change retroactively
44. as a user on a qualifying device, i want nutrition-label scanning to be discoverable, so that i can create foods more quickly
45. as a user on a non-qualifying device, i want unavailable scanning controls hidden, so that i am not led into a guaranteed failure
46. as an Android user in V1, i want manual food creation to remain complete without scanner prompts, so that the core paid experience is usable
47. as a scanner user, i want camera and photo access requested only when i initiate scanning, so that permission requests have clear context
48. as a scanner user who denies permission, i want a useful recovery path and manual alternative, so that i am not blocked from food logging
49. as a scanner user, i want the app to verify model availability at runtime, so that operating-system version alone does not produce a false promise
50. as a scanner user, i want visible progress and actionable failure messages, so that on-device processing does not appear frozen
51. as a scanner user, i want to review and edit every AI-derived nutrition value, so that model output is never accepted blindly
52. as a scanner user, i want suspicious, missing, or low-confidence values called out, so that i know where manual verification is important
53. as a scanner user, i want nutrition normalized to clear units and bases, so that per-serving and per-100-gram values are not confused
54. as a scanner user, i want captured images and OCR text discarded after completion or cancellation, so that temporary label data is not retained
55. as a user, i want to add hydration quickly, so that daily water tracking requires little effort
56. as a user, i want hydration entries stored in canonical volume units, so that unit changes do not alter totals
57. as a user, i want to record weight with the currently selected units, so that progress logging feels familiar
58. as a user, i want weight records stored canonically and displayed accurately after unit changes, so that trends remain trustworthy
59. as a user, i want progress charts and summaries to handle sparse or missing history, so that early use does not produce misleading trends
60. as a user, i want streak calculations to follow local calendar days, so that timezone boundaries do not create unexpected results
61. as a traveler, i want historical log dates to remain stable when my timezone changes, so that previous entries do not move between days
62. as a user, i want Settings to contain only real, functioning controls, so that i am not shown inactive notifications or account actions
63. as a user, i want to change theme and units from Settings, so that the app remains comfortable after onboarding
64. as a user, i want to update calculation inputs and understand when targets will recalculate, so that changes do not silently surprise me
65. as a user, i want to customize and restore targets from Settings, so that long-term adjustments remain manageable
66. as a user, i want no name, username, email, or profile photo requirement, so that the app collects only information needed for its core purpose
67. as a privacy-conscious user, i want a policy that accurately describes local storage and on-device AI, so that the app's claims match its behavior
68. as a user, i want camera and photo permissions limited to scanner workflows, so that unrelated access is not requested
69. as a user, i want to export my information as a versioned JSON archive, so that i can inspect and retain a portable copy
70. as a user exporting data, i want a warning that shared files leave the app's protection, so that i understand the privacy consequence
71. as a user, i want export failures to leave my database unchanged, so that portability does not threaten the source data
72. as a user, i want to delete all app data from inside Settings, so that i control retention without uninstalling
73. as a user deleting data, i want an explicit destructive confirmation that describes what will be removed, so that the decision is informed
74. as a user who confirms deletion, i want all personal records and preferences removed atomically, so that partial deletion does not leave sensitive remnants
75. as a user who deletes all data, i want the app to return to first-run onboarding, so that the reset is visible and complete
76. as a user, i want no analytics, advertising identifiers, or remote crash reporting, so that the offline privacy promise remains true
77. as a user requesting support, i want local diagnostics to exclude nutrition and health records, so that troubleshooting does not expose sensitive data
78. as a user, i want accessible labels, scalable text, sufficient contrast, and usable touch targets, so that core workflows work with assistive needs
79. as a user, i want the app to tolerate interruptions and restarts during writes, so that local records are not corrupted
80. as an existing installation user, i want upgrades to preserve all compatible local data, so that paid app updates do not erase my history
81. as a user, i want a clear recovery message when local data cannot be opened, so that i know what action is safe to try
82. as a customer, i want identical core functionality on iOS and Android, so that platform choice does not change the paid product except for explicitly capability-gated scanning
83. as a customer, i want app updates delivered through my platform store, so that version history and installation are managed predictably
84. as a customer, i want app branding, icons, permissions, policy, and support details to be consistent, so that the product feels legitimate
85. as a customer, i want support and privacy contacts that are active and monitored, so that i can get help when necessary

## Implementation Decisions

- Rename all customer-facing product identity to **Deficit**. Remove trackk, Deficit PH, and starter-template branding from customer-facing copy, metadata, policies, screenshots, and documentation.
- Use `com.deficitapp.mobile` as both the production iOS bundle identifier and Android application ID. Treat this identifier as permanent after first publication.
- Target iOS and Android for V1. Explicitly exclude web support and remove claims that web or Expo Go provide the full production experience.
- Use international English in V1. Remove Taglish and geography-specific language and formatting. Defer localization infrastructure and translated content.
- Distribute the app as a one-time paid download on both stores. Include no subscriptions, in-app purchases, paywalls, advertisements, billing SDKs, entitlements, or purchase-restoration UI.
- Keep the product completely local-only and offline for core use. Include no accounts, authentication, cloud sync, remote food search, analytics, advertising identifiers, or remote crash reporting.
- Replace Profile with a focused Settings experience. Remove full name, username, email, profile photo, login, and logout concepts. Retain only calculation inputs, units, goals, targets, appearance, privacy, support, export, and deletion controls.
- Create a deep measurement module with a small stable interface for locale defaults, parsing, validation, display formatting, and bidirectional conversions. Persist canonical kilograms, centimeters, milliliters, grams, and timestamps regardless of display units.
- Place unit selection at the beginning of onboarding, default it from device locale, and allow later changes without rewriting canonical historical measurements.
- Restrict onboarding to adults aged 18 and older. Prevent underage completion and avoid persisting an underage profile.
- Describe the formula input as the sex parameter used for the calorie estimate rather than gender identity. Store only the local calculation parameter required by the selected formula.
- Keep calorie estimation and safety policy in separate deep domain modules. The estimator owns BMR, activity, goal adjustment, calorie bounds, and macro calculation. The safety policy owns eligibility, warnings, and allowed goal transitions.
- Use BMI only to block a weight-loss goal for an underweight adult. Remove Asia-Pacific classifications, body-category labels, and automatic weight-loss recommendations.
- Treat calorie and macro outputs as estimates, not medical advice. Retain conservative calorie floors and require automated boundary coverage. Professional dietitian review is recommended but not a release blocker.
- Permit manual calorie and macro targets through a secondary customization flow with numeric validation, warnings, source state, and an action to restore calculated recommendations.
- Remove the notification preference, inactive notification UI, and related database state. Notifications are not part of V1.
- Create a capability service for nutrition-label scanning with a small interface that reports runtime availability and performs scans without exposing native implementation details to screens.
- Show scanner entry points only when the on-device model is currently available, not merely when the operating-system version appears compatible. V1 scanner availability is limited to qualifying Apple Intelligence devices; Android keeps complete manual entry.
- Keep scanning fully on-device. Treat camera images, selected images, OCR text, model prompts, and unconfirmed drafts as temporary. Persist only values explicitly reviewed and confirmed by the user.
- Require scanner drafts to expose normalized units, confidence or validation state, missing fields, and editable values before save. Never auto-log model output.
- Request camera and photo permissions contextually from scanner actions. Remove unnecessary Android storage and overlay permissions and ensure platform declarations match actual behavior.
- Create a versioned offline food-catalog module whose public contract supports deterministic seeding and provenance lookup. Use a compact global catalog sourced from an authoritative public dataset and record source/version metadata separately from user-created foods.
- Preserve immutable nutrition snapshots in historical food logs so catalog or custom-food updates never rewrite past intake.
- Keep the local database as the single persistence boundary. Introduce explicit schema versions, ordered transactional migrations, idempotent seed upgrades, integrity checks, and upgrade tests instead of relying only on opportunistic column checks.
- Centralize local-day and timestamp semantics so food, hydration, weight, streak, and progress calculations behave predictably across restarts, daylight-saving changes, and timezone travel.
- Create one local data-lifecycle module with stable operations for versioned export and atomic full deletion. Export a documented JSON archive through the system share sheet; do not implement import or automatic backup in V1.
- Make full deletion transactional and comprehensive, including profile inputs, preferences, targets, custom foods, food logs, weight, hydration, temporary artifacts, and cached in-memory state. Return to first-run onboarding only after successful deletion.
- Keep diagnostic information local and exclude food, nutrition, weight, measurements, goals, and exported content. Replace development-only console noise with deliberate user-facing error states and sanitized local diagnostics.
- Use store-managed releases only. Remove the unused over-the-air update dependency and configuration. Establish reproducible iOS and Android release profiles and keep generated native configuration synchronized with the source configuration.
- Resolve all Expo Doctor findings before release: duplicate native modules, SDK patch mismatches, and ambiguity between checked-in native projects and prebuild-managed configuration.
- Add a release configuration module or documented source of truth for product name, scheme, identifiers, versions, build numbers, permissions, support contacts, and privacy contacts. Customer-facing support uses `support@deficitapp.com`; privacy requests use `privacy@deficitapp.com`.
- Rewrite the privacy policy and store disclosures to reflect adult-only local storage, on-device AI, temporary scanner artifacts, data export, deletion, no tracking, no accounts, and no remote services. Legal review is recommended but not a release blocker.
- Keep modules deep and behavior-oriented: measurement conversion, target estimation, safety policy, scanner capability, nutrition normalization, food catalog, local persistence/migrations, data lifecycle, progress aggregation, and release configuration. Screens consume these stable contracts rather than duplicating domain rules.
- Remove dead, unreachable, misleading, template, and legacy Supabase artifacts from the shipped product surface. Retain no code or documentation that implies unsupported subscriptions, authentication, notifications, cloud data, or platform coverage.

## Testing decisions

- A good test verifies externally observable behavior through a stable public interface. It should remain valid when internal functions, file organization, SQL statements, or component composition change without changing user-visible behavior. Avoid tests that assert private implementation steps, incidental hook calls, exact internal queries, or styling structure.
- Retain strict TypeScript checking as a baseline, but do not treat compilation as behavioral verification.
- Expand the existing nutrition-label parser fixture approach beyond its current four fixtures. Cover international label formats, locale decimals, kcal and kJ, per-serving and per-100-unit bases, split OCR rows, missing values, multiple columns, misleading preparation instructions, sodium units, malformed text, and confidence degradation.
- Test the measurement module across metric and imperial round trips, locale defaults, decimal parsing, rounding boundaries, display labels, invalid inputs, and repeated unit switching. Verify canonical stored values do not drift.
- Test calorie estimation through public inputs and outputs for both sex parameters, all activity levels and goals, boundary ages and body sizes, invalid and missing values, calorie floors, maintenance ceilings, macro rounding, and restoration after custom targets.
- Test safety policy behavior for underage rejection, underweight weight-loss blocking, adult goal selection, unknown inputs, manual-target validation, and neutral non-diagnostic copy.
- Test scanner capability behavior with native boundaries replaced by deterministic fakes: qualifying, ineligible, disabled-model, model-not-ready, busy, permission-denied, cancellation, OCR failure, low confidence, malformed result, user edit, save, and temporary-data cleanup.
- Test nutrition normalization independently from scanner UI so per-serving conversion, unit handling, missing nutrient behavior, and validation can be proven with deterministic fixtures.
- Test the food catalog through its public seed and search behavior: first install, idempotent reseed, catalog version upgrade, provenance availability, source precedence, Unicode/case/spacing search, custom-food collisions, and historical snapshot stability.
- Test local persistence with a real temporary SQLite database. Cover fresh schema creation, every supported historical migration path, migration rollback on failure, foreign-key behavior, concurrent writes, soft deletion, interrupted operations, deterministic queries, and integrity after restart.
- Test data export as an externally readable versioned archive containing the agreed record categories and excluding temporary or internal-only fields. Verify cancellation and sharing failures never mutate source data.
- Test full deletion through observable results: every user record disappears, seeded catalog state is correct, in-memory caches clear, temporary files are gone, and the next route is first-run onboarding. Verify injected deletion failure cannot produce a falsely completed reset.
- Test food logging as complete behavior: search or custom selection, quantities and units, meal and local time, totals, save, edit, delete, day boundaries, snapshot preservation, dashboard refresh, and error recovery.
- Test hydration, weight, streak, dashboard, and progress aggregation with empty data, sparse data, multiple same-day entries, deleted entries, timezone changes, daylight-saving boundaries, and long histories.
- Add component or screen integration tests for onboarding eligibility, unit selection, custom targets, scanner visibility, permission denial, all major empty/error states, Settings controls, export warning, and destructive deletion confirmation.
- Add accessibility checks for screen-reader names and roles, dynamic type, focus order, contrast, reduced motion where relevant, keyboard avoidance, and minimum touch targets. Verify core workflows manually with VoiceOver and TalkBack.
- Preserve the existing release-check pattern but expand it to include type checking, all domain tests, SQLite migration/integration tests, lint or formatting checks, Expo Doctor with zero failures, and build-configuration validation.
- Build release candidates and complete end-to-end physical testing on at least one qualifying Apple Intelligence iPhone, one non-qualifying iPhone, one current high-end Android device, and one lower-memory Android device.
- Physical release testing must cover fresh install, upgrade from a prior database, onboarding, both unit systems, all logging and editing paths, offline restart, scanner availability and temporary-data behavior, permission denial, theme changes, export, deletion, interrupted writes, background/foreground transitions, and app relaunch.
- Existing prior art consists of the TypeScript release gate and deterministic nutrition-parser fixtures. Reuse their simple fail-fast style, but recognize that the repository currently has no meaningful persistence, calculation, component, or end-to-end test suite.
- A release candidate is not approved while automated checks fail, Expo Doctor reports unresolved findings, either platform cannot produce a signed release build, required physical-device flows fail, destructive data operations are unverified, or customer-facing metadata and privacy claims contradict runtime behavior.

## Out of scope

- Web application support for V1.
- Users under 18, parental consent, child accounts, or pediatric calorie guidance.
- Accounts, authentication, usernames, email profiles, profile photos, cloud sync, server backup, or cross-device state.
- Remote food databases, remote AI, network-required core features, or Supabase integration.
- Android nutrition-label AI scanning until a qualifying, fully on-device implementation is separately designed and validated.
- Showing scanner controls on devices where the required on-device model is unavailable, disabled, ineligible, or not ready.
- Automatic acceptance or logging of AI-generated nutrition data.
- Retaining scanner images, OCR text, prompts, or rejected drafts.
- Notifications, reminders, background scheduling, or notification preferences.
- Subscriptions, in-app purchases, paywalls, trials, advertisements, billing SDKs, purchase restoration, or entitlement management.
- Analytics, advertising identifiers, remote telemetry, or third-party crash reporting.
- Over-the-air application updates.
- Importing data archives or automatically backing them up.
- Comprehensive global food coverage or claims that bundled nutrition data covers every cuisine or branded food.
- Medical diagnosis, treatment, clinical nutrition plans, pregnancy guidance, eating-disorder treatment, or guarantees of weight change.
- BMI-based body labeling or automatic recommendations to lose weight.
- Full localization or translated store/app content beyond international English.
- Direct App Store or Google Play submission, pricing configuration, external policy hosting, or any external service operation as part of this PRD.
- Formal dietitian, legal, privacy, accessibility, or store-policy certification as a release blocker; these reviews remain recommended and their absence remains an explicit risk.

## Further Notes

- Repository inspection found that the existing release command currently passes TypeScript and four nutrition-parser fixtures. Expo Doctor currently reports duplicate native worklet versions, three Expo SDK patch mismatches, and unsynchronized native/app configuration risk. These are known implementation inputs, not evidence of readiness.
- The current scanner uses Vision OCR plus Apple's on-device Foundation Models and requires an eligible Apple Intelligence device with the model enabled and ready. Capability detection must become a first-class runtime contract before hiding or showing the feature can be reliable.
- The current database creates tables and adds selected columns opportunistically but does not maintain an explicit schema version. Production migration work must preserve existing local records and prove upgrade paths using representative historical databases.
- The current Android manifest requests broad storage and overlay permissions that are not justified by the agreed V1 behavior. Final merged release manifests, not only source manifests, must be audited.
- The paid-upfront price and country-specific price tiers are configured in App Store Connect and Google Play Console outside the app. Both listings should promise the same unlocked core functionality.
- `support@deficitapp.com` and `privacy@deficitapp.com` are assumed to be controlled, active, and monitored before submission. If that assumption is false, release metadata and in-app contacts require a new user-approved identity.
- The authoritative public dataset and license for the bundled food catalog remain to be selected during implementation. Source provenance, redistribution rights, version, transformation rules, and audit samples must be documented before release.
- Nutrition formulas, macro ratios, calorie floors, safety thresholds, and health copy will be tested and disclosed as estimates. The user explicitly chose not to make licensed-dietitian review a formal release blocker.
- Privacy and store disclosures will be aligned with observed runtime behavior. The user explicitly chose not to make qualified legal/privacy review a formal release blocker.
- The app's native project naming may remain an internal build concern where renaming would add unnecessary risk, but every customer-visible label, identifier, scheme, icon, policy, and store artifact must consistently present Deficit.
- The PRD defines readiness work; it does not authorize implementation, external publication, store submission, pricing changes, domain setup, or messages to reviewers.
