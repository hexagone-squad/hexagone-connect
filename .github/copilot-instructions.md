# Copilot repository instructions

Read `docs/methodology/CONSTITUTION.md` before making a plan or changing code.
For every changed path, load the matching `.github/instructions/*.instructions.md`
file, then read the local README and contract documentation.

Use the smallest independently testable change. Preserve conventions and
user-owned worktree changes. Do not perform unrelated refactors. Never claim a
manual or unexecuted check passed. For non-trivial changes, complete the
implementation-loop declaration in the PR description; the remote PR workflow
validates it with `pnpm check:implementation-loop`.
Never commit, push, amend, reset, rebase,
create a branch, or open a pull request without explicit user approval.
