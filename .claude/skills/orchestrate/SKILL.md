---
name: orchestrate
description: Run the multi-agent red-team pipeline for a high-stakes deficit-ph task — parallel specialist drafts, four-angle adversarial red-team, synthesis into one definitive design, then an independent calibrated confidence audit. Use for whole features, risky refactors, data-model/migration changes, calorie/nutrition math, or anything you want to ship with an honest, verified confidence level.
---

# Orchestrate — parallel specialists → red-team → synthesis → confidence audit

Use this when the task is **high-stakes** (a whole feature, a migration, safety-critical
math, or anything you want to publish with a calibrated confidence level). For small,
low-risk edits, skip this and just do the work.

You (the main session) are the **orchestrator**. You run the four phases below by spawning
the agents in `.claude/agents/`. Do not do the specialists' thinking yourself — the value
comes from genuinely independent passes and a real adversarial round.

## Phase 0 — Frame the task (you)

Write a tight problem statement: goal, constraints, the files likely involved, and what
"done" means. Include the non-negotiables from `CLAUDE.md` (offline-first, expo-sqlite via
`lib/local-data.ts`, strict types, reuse-first, Taglish copy, health-safety). Every agent
gets this frame verbatim so they start from the same facts.

## Phase 1 — Specialists draft in parallel (4 agents)

Spawn all four **in a single message** (parallel `Agent` calls), each with the Phase-0 frame:

- `architect` — data model, state boundaries, migration safety, reuse.
- `implementer` — components/hooks/routes, Uniwind + reusables, code sketches.
- `product-guardian` — UX, Taglish copy, store & health-safety readiness.
- `correctness-analyst` — calorie/macro math, units, label parsing, SQLite integrity (runs checks).

Each returns an independent draft with a self-declared confidence. Do **not** let them see
each other's output — independence is the point.

## Phase 2 — Four-angle adversarial red-team (4 agents in parallel)

Bundle the four drafts. Spawn **four `red-team` instances in one message**, each assigned a
different angle in its prompt:

1. Correctness  2. Data-loss & persistence  3. UX & edge/health-safety  4. Store-rejection, security & performance.

Each tries to break the drafts (running `typecheck`/tests where it proves a point) and reports
ranked findings, marking **confirmed** vs **plausible**, plus what held up.

## Phase 3 — Synthesis (1 agent)

Spawn `synthesizer` with the four drafts **and** the red-team findings. It produces **one
definitive design** (not a digest): reconciled decisions, an exact change set, and a
line-by-line resolution of every Critical/High red-team finding (fixed or honestly deferred).
If the user asked you to build it, tell the synthesizer to **implement**, then it runs
`npm run typecheck` and `npm run test:nutrition-parser` and reports real output.

## Phase 4 — Independent confidence audit (1 agent)

Spawn `confidence-auditor` (it must not have participated earlier) with the synthesized
design/diff. It independently re-verifies by reading and running checks, separates
**verified-solid** from **unvouchable**, and returns a **calibrated, honest confidence
level** — explicitly naming what needs human sign-off (licensed dietitian for health/formula
accuracy; final human/legal review for store & privacy compliance).

## Phase 5 — Report back (you)

Give the user:

1. **The definitive design / what changed.**
2. **Red-team resolution** — how the serious findings were handled.
3. **Calibrated confidence** — the auditor's honest level, per area.
4. **Human sign-off required** — the dietitian / legal / store items, called out plainly.
5. **Verification run** — actual `npm run release:check` output if code changed.

## Rules

- **Parallel where the phase allows** (Phase 1, Phase 2): batch the `Agent` calls in one message.
- **Only `synthesizer` writes code.** Specialists and red-team are read-only drafters/critics.
- **Never round confidence up.** Untested is untested; "a human must check X" is a valid output.
- **Scale it down when sensible.** For a medium task you may run 2 specialists and a 2-angle
  red-team — but keep the independent audit; that honesty is the whole point.
