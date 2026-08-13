# Implementation Loop

This is the mandatory delivery loop for all teams in this repository.

## Rule

No feature, fix, migration, AI behavior change, or infrastructure change is
complete unless it follows the canonical workflow in
`docs/methodology/CONSTITUTION.md` and records evidence under
`docs/methodology/verification.md`. All changes must satisfy applicable `HC-*`
constraints.

## Required sequence

Every non-trivial pull request must include a machine-readable
`implementation-loop-evidence` declaration in its description and pass the
remote `pnpm check:implementation-loop` check before merge:

1. Specification updated.
2. Tests written or updated.
3. Focused test fails before implementation.
4. BEFORE evidence captured.
5. Implementation completed.
6. Focused and regression tests pass.
7. Comparable AFTER evidence captured.
8. Documentation verified.
9. Complete diff audited.
10. Independent automated review completed.
11. PR proof prepared.

The validator binds the PR declaration to its number, head and base revisions,
changed files, final reviewed diff hash, and remote validation result. It writes
a normalized proof to a CI artifact instead of a shared tracked file, so
parallel pull requests do not conflict. A late or reconstructed BEFORE artifact
is rejected. Trivial changes may exempt only objectively justified steps
recorded in the declaration; they must still pass `pnpm run validate`.

## Exit criteria

A change exits the loop only when all stages are satisfied and blocking quality gates pass in CI.
