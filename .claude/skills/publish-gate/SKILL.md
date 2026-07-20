---
name: publish-gate
description: Release-readiness checklist for deficit-ph before an App Store / Google Play build. Use when asked whether the app is "publish ready", before cutting a release/EAS build, or to audit store-compliance, permissions, and privacy. Runs the automated gate and walks the manual store checklist.
---

# Publish gate — is deficit-ph ready to ship?

Nothing is "publish ready" until the automated gate passes **and** the manual checklist is
clean. Report honestly; a failing check is a blocker, not a footnote.

## 1. Automated gate (must pass, paste real output)

```bash
npm run release:check    # typecheck + nutrition-parser test
npm run typecheck        # tsc --noEmit — zero errors
npm run test:nutrition-parser
```

Then confirm the app actually launches (see the `run` skill):

```bash
npm run dev              # Expo dev server; open iOS / Android / web
```

## 2. Correctness & data safety (safety-critical for this app)

- [ ] Calorie/macro targets correct across Metric ↔ Imperial and boundary inputs
      (`utils/calorie-targets.ts`, `utils/add-food-utils.ts`).
- [ ] Nutrition-label parser handles locale numbers, kJ↔kcal, per-serving↔per-100g
      (`lib/nutrition-label-parser.ts`).
- [ ] **SQLite upgrade path is safe** for users with an existing install — no dropped data,
      enum maps (`*_TO_DB`/`*_FROM_DB`) intact, seeds idempotent (`lib/local-data.ts`).
- [ ] App works fully **offline** (no Supabase / network dependency — Supabase is deprecated).

## 3. Store & platform config

- [ ] `app.json`: `version`, `ios.bundleIdentifier`, `android.package`, icons, splash,
      `scheme` all correct for the real release identity.
- [ ] iOS usage strings present and accurate (`NSCameraUsageDescription`,
      `NSPhotoLibraryUsageDescription`).
- [ ] Android permissions minimal and justified.
- [ ] Version/build number bumped for this release.

## 4. Compliance, privacy & health responsibility

- [ ] Privacy policy present, reachable in-app (`app/dashboard/privacy-policy.tsx`), and
      matches what the app actually collects/stores (local-only → say so).
- [ ] Subscription/paywall disclosure meets store rules (`subscription-plan`).
- [ ] No unsupported medical/health **claims** in copy; deficit guidance is framed responsibly
      with guardrails against dangerous targets and disordered-eating triggers.
- [ ] **Requires human sign-off** (a model cannot certify these):
      health/nutrition-formula accuracy → **licensed dietitian**; store-policy & privacy-law
      compliance → **final human/legal review**.

## 5. UX polish

- [ ] First-run, empty, loading, error, and permission-denied states exist and feel intentional.
- [ ] Taglish/Gen Z voice is consistent (`taglish-genz` skill).
- [ ] No dead routes, no `console` noise, no `any` in touched files.

## Verdict

State a **calibrated** verdict: what's verified green, what's still red, and which items are
gated on human (dietitian / legal / store) review. For a rigorous pre-release audit, run this
inside `/orchestrate` so the red-team and confidence-auditor pressure-test the checklist.
