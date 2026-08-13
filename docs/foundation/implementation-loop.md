# Implementation Loop

This is the mandatory delivery loop for all teams in this repository.

## Rule

No feature, fix, migration, AI behavior change, or infrastructure change is
complete unless it follows the canonical workflow in
`docs/methodology/CONSTITUTION.md` and records evidence under
`docs/methodology/verification.md`. All changes must satisfy applicable `HC-*`
constraints.

## Required sequence

Every non-trivial change must produce a machine-readable manifest at
`evidence/implementation-loop/manifest.json` and pass
`pnpm check:implementation-loop` before merge:

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

The validator binds commands, timestamps, scenarios, artifacts, audit/review
reports, PR proof, relevant source files, and the final reviewed diff hash. A
late or reconstructed BEFORE artifact is rejected. Trivial changes may exempt
only objectively justified steps recorded in the manifest; they must still pass
`pnpm run validate`.

## Exit criteria

A change exits the loop only when all stages are satisfied and blocking quality gates pass in CI.
