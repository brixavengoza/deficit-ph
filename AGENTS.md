## Skills

A skill is a set of local instructions stored in a `SKILL.md` file.

### Available skills

- skill-creator: Guide for creating effective skills. Use when creating or updating a skill. (file: ~/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into `$CODEX_HOME/skills`. Use when listing/installing curated or GitHub-hosted skills. (file: ~/.codex/skills/.system/skill-installer/SKILL.md)
- async-error-handling: Use when writing async logic in React Native, including API calls, mutations, uploads, and local persistence. (file: my-skill/async-error-handling/SKILL.md)
- data-fetching: Use when implementing React Native data fetching, caching, and mutations. (file: my-skill/data-fetching/SKILL.md)
- forms-validation-errors: Use when building or refactoring React Native forms and validation flows. (file: my-skill/forms-validation-errors/SKILL.md)
- naming-conventions: Use when naming React Native files, screens, components, hooks, state slices, API modules, or TypeScript types. (file: my-skill/naming-conventions/SKILL.md)
- react-best-practices: Use when building or refactoring React Native screens and components. (file: my-skill/react-best-practices/SKILL.md)
- react-native-reusables-ui: Use when building or refactoring React Native UI in this codebase with local reusables + Uniwind patterns. (file: my-skill/react-native-reusables-ui/SKILL.md)
- taglish-genz: Use when writing user-facing content for Filipino Gen Z audience in natural Taglish tone. (file: my-skill/taglish-genz/SKILL.md)

### How to use skills

- Trigger a skill by naming it directly (for example `$react-best-practices`) or by asking for work that clearly matches the skill description.
- If multiple skills apply, use the smallest set that covers the task.
- Open each `SKILL.md` and follow its workflow; only load additional referenced files as needed.
- Keep the working context lean and avoid loading unrelated reference content.

### Reliability note

- Codex globally auto-discovers skills from `~/.codex/skills`.
- This repo includes `my-skill/sync-to-codex-home.sh` to keep `my-skill/*` linked into `~/.codex/skills`.
- Re-run sync after adding/removing skill folders.
