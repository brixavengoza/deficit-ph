---
name: grill-me
description: Relentlessly interview the user about a plan, proposal, specification, or design until its branches, decisions, dependencies, assumptions, constraints, risks, and acceptance criteria are resolved into a shared understanding. Use when the user invokes `/grill-me` or `$grill-me`, asks to be grilled or challenged on a plan, or wants a rigorous one-question-at-a-time design review before implementation.
---

# Grill Me

Interrogate the plan one decision at a time. Prefer discovering answers from the codebase over asking the user, and recommend an answer whenever user judgment is required.

## Workflow

1. Identify the plan under discussion from the current conversation or supplied artifact. If no plan is available, ask the user to provide it and stop.
2. Inspect the relevant codebase, configuration, documentation, tests, history, and established conventions before beginning the interview. Use this evidence to answer factual questions directly.
3. Build and continuously update an internal design tree covering goals, users, scope, constraints, architecture, data, interfaces, states and edge cases, security and privacy, operations, migration, testing, rollout, and success criteria. Include only branches relevant to the plan.
4. Order unresolved decisions by dependency. Resolve foundational choices before questions whose answers depend on them.
5. Ask exactly one question per response. Do not bundle subquestions, numbered prompts, or multiple choices that conceal several decisions.
6. With every question, provide one clearly labeled recommended answer and a concise rationale grounded in the plan and repository evidence. Mention the most important tradeoff when useful.
7. After the user answers, record the decision, reconcile it with earlier answers, inspect the codebase again when the answer exposes a factual question, and then ask the next highest-priority unresolved question.
8. Challenge contradictions, vague terms, hidden assumptions, omitted failure modes, and premature commitments. Reopen an earlier branch when new information invalidates it.
9. Continue until every material branch is resolved or explicitly deferred with an owner or condition. Do not stop merely because the main path seems clear.
10. Finish with a concise shared-understanding summary: resolved decisions, repository-derived facts, explicit assumptions, deferred items, and acceptance criteria. Ask the user to confirm the summary before treating the plan as settled.

## Question Rules

- Never ask the user a question that can be answered with reasonable confidence by inspecting the available codebase or artifacts. Explore first, then state the finding as context.
- Separate facts from preferences. Discover facts; ask only for product, business, risk, or tradeoff judgments that require the user.
- Make the recommendation decisive rather than saying only "it depends." State any assumption that materially affects it.
- Keep each turn focused enough that the user's answer resolves one decision node.
- Do not implement the plan during the interview unless the user explicitly asks to switch from interrogation to implementation.
- If the user declines a recommendation, accept the decision and probe its downstream consequences without repeatedly relitigating it unless new evidence appears.
