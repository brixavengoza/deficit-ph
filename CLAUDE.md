# deficit-ph (trackk) — Project Rules

Local-first **calorie-deficit / nutrition tracker** for a **Filipino Gen Z** audience.
React Native + Expo mobile app (iOS / Android / web). App display name is `trackk`;
product name is **Deficit PH**.

## What the app does

- **Onboarding** (`app/onboarding/`): basic info → activity level → goal (lose / maintain / gain).
- **Dashboard** (`app/dashboard/`): daily calories + macro rings, logged meals.
- **Food logging**: search (`log-food-search`), add custom food (`add-custom-food`),
  saved foods (`saved-foods`), add food (`add-food`), scan nutrition label
  (`scan-label` → camera → `lib/nutrition-label-parser.ts`).
- **Progress** (`app/dashboard/progress.tsx`): weight + streak stats.
- **Profile / settings**, privacy policy, subscription plan.

## Stack & where things live

| Concern | Choice | Location |
| --- | --- | --- |
| Routing | Expo Router (file-based, `typedRoutes`) | `app/` |
| Styling | Uniwind (Tailwind for RN) + `global.css` tokens | components + `global.css` |
| UI kit | React Native Reusables (shadcn-style, local) | `components/ui/` |
| Server cache | TanStack Query | `lib/query-client.ts`, `hooks/use-trackk-query.ts` |
| Global state | Zustand | `stores/` |
| Validation | Zod + react-hook-form | `lib/*-form.ts`, `components/schema/` |
| **Database** | **expo-sqlite (local, on-device)** | `lib/local-data.ts` (single source of truth) |
| Seed data | static food table | `lib/local-seed-foods.ts` |
| Domain math | calorie targets, add-food helpers | `utils/calorie-targets.ts`, `utils/add-food-utils.ts` |

## Non-negotiable rules

1. **expo-sqlite is the datastore. Supabase is deprecated** — do not add Supabase calls
   or network data dependencies. The app must work fully offline. `supabase/` is legacy.
2. **`lib/local-data.ts` is the only data-access layer.** All reads/writes go through it.
   It maps app-facing enums (`'Very Active'`) to DB enums (`'very'`) via the `*_TO_DB` /
   `*_FROM_DB` tables — keep that mapping intact on both sides when adding fields.
3. **Strict TypeScript. No `any`.** Type props, hook returns, and store slices.
4. **Reuse before you build.** Check `components/ui/` and `utils/` before adding anything.
5. **User-facing copy is Taglish / Gen Z** — use the `taglish-genz` skill. Code, comments,
   and identifiers stay in English.
6. **Money & nutrition math is safety-critical.** Calorie/macro/target changes must go
   through `utils/calorie-targets.ts` and be covered by reasoning about edge cases
   (zero, negative, missing weight/height, unit conversion Metric↔Imperial).

## Publish-readiness gate

Before calling anything "publish ready", it must pass:

```bash
npm run release:check   # = npm run typecheck && npm run test:nutrition-parser
```

- `npm run typecheck` → `tsc --noEmit` (must be clean).
- `npm run test:nutrition-parser` → parser test (`scripts/test-nutrition-label-parser.mjs`).
- App must run: `npm run dev` (Expo). See the `run` and `publish-gate` skills.

## Skills (auto-discovered from `.claude/skills/`)

- `react-best-practices`, `react-native-reusables-ui`, `data-fetching`,
  `forms-validation-errors`, `async-error-handling`, `naming-conventions`,
  `taglish-genz` — day-to-day coding standards for this repo.
- **`orchestrate`** — the multi-agent red-team pipeline for high-stakes tasks
  (parallel specialists → adversarial red-team → synthesis → confidence audit).
- **`publish-gate`** — release-readiness checklist.

## Multi-agent orchestration

For high-stakes or whole-feature work, invoke `/orchestrate`. It fans out four
domain **specialists** in parallel, runs a four-angle **red-team**, **synthesizes** one
definitive design, then runs an independent **confidence audit** that reports a
calibrated, honest confidence level and flags what no model can vouch for (e.g.
nutritional/health accuracy needs a licensed dietitian; store-policy compliance needs
a final human review). Agent roles live in `.claude/agents/`.

> Codex users: the same standards live in `AGENTS.md` + `my-skill/`. Keep the two in
> sync when you change a shared standard.
