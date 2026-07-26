# PRD — Full macro tracking (optional depth, calories-first)

**Status:** Draft for implementation · **Author:** interview-driven (write-a-prd) · **Date:** 2026-07-25
**Separate from** the AI food-photo PRD at `issues/prd.md` — this is its own workstream.

> **Guiding principle (owner directive):** the app stays **easy-first with calories up front**.
> Macros are **optional depth** — always glanceable but never required, never in the way for a
> newbie — while being **fully capable for hardcore trackers**. Every decision below serves that.

## problem statement

Deficit PH already *stores* full per-food macros and even *computes* macro targets, but to a user
the app reads as calorie-only. The daily dashboard gives calories the full treatment — a goal, a
progress ring, "remaining," and "% used" — while the three macro tiles show only raw consumed grams
(e.g. `Protein 45g`) with no goal, no progress, and nothing to compare against. The macro *targets*
that would make those tiles meaningful already exist in the on-device settings, but they are never
surfaced.

Two audiences are underserved as a result. Newbies doing a simple deficit are fine on calories but
see dead macro numbers that add clutter without value. Serious trackers — who set specific gram
goals (e.g. 180 g protein) — can't set or track their own macro targets at all, since the app's
targets are a fixed 30/40/30 split that is silently recomputed and overwritten whenever body stats
change.

## solution

Make macros a first-class but **optional** layer, without disturbing the calorie-first experience.

- **Everyone (no setup):** calories stay the hero. Right below the calorie ring, the existing
  protein/carbs/fat tiles are upgraded from "grams eaten" to **consumed vs target with a progress
  bar** — the same treatment calories already get, but secondary. A newbie can ignore them; a
  tracker gets an at-a-glance read. No toggle, nothing hidden, no onboarding step added.
- **Hardcore trackers (opt-in, found only in Settings):** set your own **protein, carbs, and fat
  targets in grams**. Custom targets persist and are never overwritten when your weight, activity,
  or goal changes. Your daily calorie goal keeps updating from your body stats (still safety-gated),
  independent of your macros; if your gram macros don't add up to your calorie goal, the app gives a
  gentle, non-blocking heads-up rather than forcing them to reconcile. You can switch back to the
  automatic split anytime.
- **Reviewers (opt-in, on the Progress screen):** a weekly view of average protein/carbs/fat versus
  target sits alongside the existing weekly-calorie view.

Calories remain the default focus; macro depth is there for those who reach for it.

## user stories

1. as a newbie user, i want calories to remain the main focus of the dashboard, so that the app stays simple and i'm not overwhelmed by macros.
2. as a user, i want to see my protein/carbs/fat below the calorie ring with no setup, so that macros are available at a glance if i care and ignorable if i don't.
3. as a user, i want each macro tile to show consumed vs target with a progress bar, so that i can track macros the same way i track calories.
4. as a user with no custom targets, i want my macro goals to use the app's automatic split by default, so that macro tracking works out of the box.
5. as a user, i want macros never to be required during onboarding, so that getting started stays fast and calorie-focused.
6. as a user, i want a macro tile to show exact consumed and target grams (e.g. 45 / 150 g), so that i know both the amount and the goal.
7. as a user who exceeds a macro target, i want the tile to show i'm over (capped bar + actual grams) without judgmental framing, so that i stay informed without feeling shamed.
8. as a user with nothing logged yet today, i want macro tiles to show 0 against my target, so that the starting state is clear.
9. as a hardcore tracker, i want to set my own protein, carbs, and fat targets in grams, so that i can follow a specific plan instead of the default split.
10. as a hardcore tracker, i want the custom-target editor to pre-fill with my current targets, so that i can adjust from a sensible starting point.
11. as a hardcore tracker, i want my custom gram targets to persist and not be overwritten when my weight/activity/goal changes, so that my chosen plan stays intact.
12. as a user, i want my daily calorie goal to keep updating from my body stats even while using custom macros, so that my calorie target stays accurate and safety-gated.
13. as a hardcore tracker, i want a non-blocking heads-up when my macro grams don't add up to my calorie goal, so that i can reconcile them if i choose, but am never forced to.
14. as a user, i want to switch back from custom to automatic macros, so that i can return to the default split without manual recalculation.
15. as a user, i want custom macro targets to live only in settings, so that the default experience stays uncluttered.
16. as a user, i want my custom gram targets validated (non-negative, sane maximums, whole grams), so that i can't save nonsensical goals.
17. as a user, i want custom macros to never lower my calorie goal below the safe minimum, so that the app can't be configured into an unsafe intake.
18. as a user, i want target and reconciliation math to stay correct across edge cases (zero, missing weight/height), so that i can trust the numbers.
19. as a tracker, i want a weekly view of average protein/carbs/fat versus target on the Progress screen, so that i can review how consistent i've been.
20. as a user, i want the weekly macro trend beside the existing weekly-calorie view, so that i can review calories and macros together.
21. as a user with sparse logging, i want the weekly macro trend to handle no-data days gracefully, so that averages aren't misleading.
22. as a returning user, i want my macro targets (auto or custom) to survive app restarts, so that my setup is durable.
23. as a user, i want macro grams shown consistently across the dashboard, add-food, and progress, so that the app feels coherent.
24. as a hardcore tracker, i want the dashboard macro progress to reflect new custom targets immediately after saving, so that i see the effect right away.
25. as the app, i want macro targets to remain fully on-device, so that the offline / no-backend guarantee is preserved.

## Implementation Decisions

**Scope.** Targets + tracking apply to the **big three macros only** (protein, carbs, fat).
Fiber/sugar/sodium stay display-only (already shown per-food). Custom targets are expressed as
**absolute grams**. Calories are **not** directly editable; they stay derived and safety-gated.
No show/hide toggle — macros are always shown but secondary. No macro setup in onboarding.

**Macro/calorie relationship (safety-critical).** The daily calorie goal continues to be derived
from body stats through the existing safety-gated calculation (sex-aware floor unchanged). Custom
gram macros are tracked as **independent** goals. Custom macros can **never** move the calorie goal,
so the safety floor cannot be bypassed. When the calories implied by the gram macros
(protein·4 + carbs·4 + fat·9) diverge beyond a defined tolerance from the derived calorie goal, the
app shows a **non-blocking** heads-up; it never forces reconciliation.

**Macro target math (extend the existing safety-critical target utility).** Add, alongside the
current derived-split (30/40/30) computation: a reconciliation helper that converts gram macros to
calories and reports whether they diverge from a given calorie goal beyond tolerance; and validation
for user-entered gram targets (non-negative whole numbers within sane upper bounds). The existing
derived split and safety-gated floor are unchanged. All macro/target math stays in this one module
per project rule 6.

**Target persistence + mode (extend the on-device data layer).** Introduce a macro-target **mode**
on the goals record — `auto` vs `custom` — via a single **additive** column (bump the on-device
schema version; the protein/carbs/fat target columns already exist, so no other schema change). The
recompute routine that fires on weight/activity/goal change is made mode-aware: in `auto` it writes
the derived macros exactly as today; in `custom` it updates **only** the safety-gated calorie goal
and leaves the stored custom gram macros intact. New data operations: read current macro targets +
mode; set custom gram targets (switches to `custom`); revert to `auto` (restores the derived split
on the next recompute). Fully local.

**Home dashboard read model (extend).** The daily summary gains the three macro **targets** (and the
mode) next to the already-present consumed macro grams, so tiles render progress without extra
round-trips.

**Dashboard macro tile (evolve the existing component).** Upgrade each consumed-grams tile into a
consumed/target tile with a slim progress bar mirroring the add-food macro-bar pattern: show both
numbers, cap the bar at 100%, indicate over-target **neutrally** (no moralizing), and degrade to
grams-only if a target is missing or zero. Calorie hero and layout priority are unchanged.

**Custom macro targets editor (new settings surface).** A Profile settings row/section to view and
edit the three gram targets, toggle `auto` ↔ `custom`, pre-fill from current targets, validate
inputs, surface the soft reconciliation warning, and persist via the data layer. Reached only in
settings (opt-in). Uses the established schema-first form pattern (React Hook Form + Zod + field
errors).

**Progress weekly macro trend (extend the progress read model + add a card).** The progress query
aggregates per-day protein/carbs/fat across the week and computes averages; a new card shows weekly
average protein/carbs/fat versus target beside the existing weekly-calorie card, handling no-data
days.

## Testing decisions

Good tests verify externally observable behavior — computed targets, the tile/read model a screen
receives, and mode-aware recompute outcomes — not internal wiring.

- **Macro target math (highest value, safety-critical):** unit-test the gram→calorie reconciliation
  and divergence tolerance, and gram-target validation across edge cases (zero, negative, huge,
  non-integer, missing values). The existing calorie-target math is the prior-art pattern for
  safety-critical coverage; a fixtures-style test similar to the nutrition-parser test fits well.
- **Mode-aware recompute:** test that in `custom` mode a weight/activity/goal change updates the
  calorie goal but **not** the macro grams, while in `auto` mode it updates both.
- **Dashboard read model / tile states:** test that targets + consumed both reach the tile model,
  and the over-target, zero-consumed, and missing-target rendering states.
- **Progress aggregation:** test weekly averages with full, sparse, and empty data.
- **Release gate:** keep `npm run release:check` (typecheck + nutrition-parser) green.

## Out of scope

- Fiber, sugar, and sodium **targets** (they remain display-only).
- Percentage/ratio-based or hybrid (protein-grams + ratio) custom targets — absolute grams chosen.
- ~~Directly editing the daily **calorie** goal~~ — **AMENDED 2026-07-25 (owner request):** a manual
  calorie goal IS now supported. It reuses the same auto/custom mode mechanism (a `calorie_goal_mode`
  flag), keeps the hard sex-independent safety floor (manual goal must be ≥ 1200 kcal, validated in
  `calorie-targets.ts`), is preserved across recomputes, and — when macros are on auto — re-derives
  the 30/40/30 split from the manual goal. Lives as its own "Calorie Goal" row in Profile → App.
- A show/hide toggle for macros (they are always shown, secondary).
- Any macro setup during onboarding.
- Per-meal macro targets, or targets that vary by day (e.g. training vs rest day).
- Cloud/backend/sync — everything stays on-device.

## Further Notes

- **Assumption — divergence tolerance:** the soft-warning threshold (e.g. ~15% of the calorie goal)
  is tunable and informational only; the exact value is a follow-up detail, not a blocker.
- **Unit safety:** custom targets are always in grams, sidestepping Metric/Imperial conversion — no
  new unit-conversion risk.
- **Migration:** only one additive column (the mode flag); follow the versioned additive-migration
  rule (no destructive rebuild). The big-three target columns already exist.
- **Clinical boundary:** the default 30/40/30 split and any guidance still need licensed-dietitian
  sign-off; custom targets are user-owned and must not be presented as clinical advice.
- **Consistency with the app's ethos:** calories stay primary everywhere; macro depth is opt-in.
  This PRD deliberately avoids adding required steps to the newbie path.
- **Relationship to other work:** independent of the AI food-photo feature (`issues/prd.md`); this
  document lives at `issues/macro-support-prd.md` to avoid overwriting it.
