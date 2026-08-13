# Repository agent instructions

Before planning, coding, reviewing, or validating, read
`docs/methodology/CONSTITUTION.md`. Then load every matching file in
`.github/instructions/` for the paths being changed, followed by the relevant
local README, contract, and service documentation.

Agents MUST preserve existing conventions, make the smallest scoped change,
avoid unrelated refactoring, preserve user-owned worktree changes, and provide
only factual validation evidence. Agents MUST NOT commit, push, amend, reset,
rebase, create branches, or open pull requests without explicit user approval.

For non-trivial changes, create and validate
`evidence/implementation-loop/manifest.json` using `pnpm check:implementation-loop`,
then follow the workflow and evidence contract in
`docs/methodology/CONSTITUTION.md` and `docs/methodology/verification.md`.

## Repository agent skills

This repository defines reusable implementation and review skills under the visible `skills/` folder.

Use the relevant skill for the task type:

- Audit: `skills/audit/SKILL.md`
- Verify: `skills/verify/SKILL.md`
- PR Review: `skills/pr-review/SKILL.md`
- Re-engineering: `skills/re-engineering/SKILL.md`
- Architecture Review: `skills/review-architecture/SKILL.md`

These skills are intended to keep work consistent with the repo constitution, quality gates, implementation loop, and evidence-driven delivery model.
