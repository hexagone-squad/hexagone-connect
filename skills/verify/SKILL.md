# Verify skill

## Purpose
Verify that implementation work satisfies the repository quality gates before merge or release.

## Workflow
1. Run `pnpm run validate` and, when registry access is available, `pnpm run check:dependency-vulnerabilities`.
2. Confirm documentation and evidence updates exist for implementation changes.
3. Report exact pass/fail, not-run, and not-applicable evidence.

## Output
- Commands run
- Pass/fail result per gate
- Failed checks and why
- Merge-ready or blocked

## Rules
- Do not claim verification without running the required commands.
- Fail closed when required evidence is missing.
