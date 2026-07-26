---
name: write-a-prd
description: Create a rigorous product requirements document by gathering a detailed problem description, verifying claims against the repository, interviewing the user one decision at a time, designing deep testable module boundaries, and writing the result locally to issues/prd.md. Use when the user invokes `/write-a-prd`, asks to create or write a PRD, or wants to turn a feature or problem proposal into an implementation-ready product requirements document.
---

# Write PRD

Research and resolve the proposed feature with the user, then write the finished PRD to `issues/prd.md`. Skip a workflow step only when it adds no useful information or its outcome is already established.

## Workflow
`
1. Obtain a long, detailed description of the problem and any potential solution ideas. If the current conversation or a supplied artifact already provides enough detail, summarize the understood proposal and continue. Otherwise, ask the user for that description and stop until they answer.
2. Explore the relevant repository before asking detailed design questions. Inspect code, configuration, documentation, schemas, tests, and established patterns to verify the user's assertions and understand the current state. Answer discoverable factual questions through research rather than asking the user.
3. Interview the user relentlessly until reaching a shared understanding:
   - Build an internal design tree covering the goal, actors, workflows, scope, constraints, domain rules, data, interfaces, states, edge cases, failure modes, privacy and security, compatibility, rollout, observability, testing, and success criteria. Include only relevant branches.
   - Resolve foundational decisions before dependent decisions.
   - Ask exactly one question per response.
   - Include one clearly labeled recommended answer and a concise rationale with every question.
   - Reconcile each answer with prior decisions and repository evidence. Challenge contradictions, ambiguous language, hidden assumptions, and missing cases.
   - Continue until every material branch is resolved or explicitly placed out of scope. Do not mistake a clear happy path for a complete design.
4. Sketch the major modules to build or modify. Prefer deep modules that encapsulate substantial behavior behind small, stable, independently testable interfaces. Avoid shallow wrappers and boundaries that merely mirror incidental file organization. Determine responsibilities, public interfaces, dependencies, and external behavior without committing the PRD to specific file paths or code snippets.
5. Once the problem and solution are fully understood, create `issues/` if needed and write or replace `issues/prd.md` using the required template below. Do not create a GitHub issue, contact an external service, or publish the PRD.
6. Review the completed PRD for consistency with the interview and repository findings. Ensure the user stories are extensive, numbered, non-duplicative, and cover happy paths, alternate states, errors, permissions, recovery, and relevant lifecycle behavior.
7. Tell the user that `issues/prd.md` was written and briefly identify any explicit assumptions or deferred decisions. Do not begin implementation unless separately requested.

## PRD Template

Use these headings in this order:

```markdown
## problem statement

Describe the problem from the user's perspective.

## solution

Describe the solution from the user's perspective. Focus on outcomes and experience rather than implementation details.

## user stories

Provide a long, numbered list covering every material aspect of the feature. Write every story in this exact form:

1. as an <actor>, i want a <feature>, so that <benefit>

## Implementation Decisions

List the decisions made during research and the interview, including relevant modules to build or modify, their stable interfaces and responsibilities, technical clarifications, architecture, schema changes, API contracts, and specific interactions.

Do not include file paths or code snippets.

## Testing decisions

State that good tests verify externally observable behavior rather than implementation details. List which modules or behaviors require tests and cite relevant prior-art test patterns found in the repository. Distinguish test levels when useful.

## Out of scope

Describe everything explicitly excluded from this PRD.

## Further Notes

Record relevant assumptions, constraints, dependencies, rollout considerations, unresolved risks, or other useful context.
```

## Quality Rules

- Ground the PRD in repository evidence and clearly label any inference that cannot be verified.
- Preserve the product perspective in Problem Statement, Solution, and User Stories.
- Make implementation decisions specific enough to guide engineering without including brittle file paths or code snippets.
- Describe deep module boundaries in terms of cohesive responsibility and stable contracts, not size alone.
- Include only decisions actually established through evidence or user agreement. Put unresolved ideas in Further Notes or Out of Scope as appropriate.
- Write the PRD only after the interview is complete; do not continuously overwrite it during questioning.
- Treat `issues/prd.md` as the only required artifact.
