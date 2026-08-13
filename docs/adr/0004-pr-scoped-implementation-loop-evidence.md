# ADR-0004: PR-Scoped Implementation-Loop Evidence

## Status

Accepted

## Context

The prior implementation-loop design required every non-trivial pull request to
modify shared files below `evidence/implementation-loop/`. Parallel pull
requests therefore conflicted on a manifest and on generated logs even when
their product changes were independent. Resolving those conflicts could also
invalidate a manifest's final-diff hash.

The required enforcement must remain merge-blocking: a PR needs an explicit
delivery declaration, remote validation against the final diff, and durable
review evidence without claiming unexecuted work passed.

## Decision

Implementation-loop declarations are PR-scoped JSON comments in the PR
description. The PR workflow validates the declaration, binds it to the PR
number, base and head revisions, changed files, final diff hash, and successful
remote deterministic validation, then uploads a normalized proof as a workflow
artifact. Generated proof is ignored by Git and is not committed.

The repository requester approved this constitutional amendment on 2026-08-13.

## Alternatives considered

1. Keep one tracked manifest and generated logs. Rejected because independent
   PRs conflict and conflict resolution makes hash-based proof stale.
2. Store only free-form evidence in a PR description. Rejected because it
   cannot be machine-validated against the final diff or remote command result.
3. Generate all evidence only in CI. Rejected because CI cannot prove that a
   focused test failed before a contributor began implementation; that evidence
   remains a reviewed PR declaration.

## Consequences

- `pnpm run validate` continues to verify deterministic repository checks; the
  PR-only implementation-loop check runs afterward with GitHub PR metadata.
- The PR workflow uploads the evidence proof on both success and failure so
  reviewers can inspect the normalized declaration and validation error.
- Workflow artifact retention follows repository hosting settings. The PR check
  and linked workflow run are the long-lived merge record.
- Evaluation scenario: a PR with a missing, malformed, stale, or out-of-order
  declaration fails `pnpm check:implementation-loop`; a complete declaration
  matching the final diff produces an artifact only after `pnpm run validate`
  succeeds.