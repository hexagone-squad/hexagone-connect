# PR review skill

## Purpose

Review a pull request for compliance with the implementation loop, hard constraints, evidence expectations, and release readiness.

## Workflow

1. Read the PR template and confirm all loop stages are addressed.
   If the PR template is absent or incomplete, immediately set the final state to **blocked** and list the missing sections before proceeding with any other checks.
2. Check requirement traceability and acceptance criteria coverage.
3. Inspect the complete diff and record a separate result for every judgment category:
   - **Correctness:** behavior, state transitions, failure handling, concurrency, and regressions.
   - **Architecture fit:** ownership boundaries, dependency direction, contracts, and consistency with accepted patterns.
   - **Missing scenarios:** untested edge cases, failure paths, authorization boundaries, migrations, and compatibility cases.
   - **Naming and maintainability:** names, component and module responsibilities, file placement, duplication, and unnecessary complexity.
   - **Usability:** workflow clarity, actionable states, accessibility, responsive behavior, and localization.
   - **Privacy:** data minimization, tenant isolation, sensitive-data exposure, retention, and logging.
   - **Operational risks:** observability, safe failure, rollback, recovery, deployment impact, and external dependencies.
   - **Evidence credibility:** commands actually run, fresh and comparable artifacts, traceability to the final diff, and no unexecuted check reported as passed.
4. Check whether documentation and evidence were updated with the implementation.
5. Validate risk and rollback considerations are explicit.
6. Confirm AI, security, and operational constraints are satisfied.
7. For each judgment category, record `findings`, `no findings`, or `not assessable`. A `not assessable` result must identify the exact missing evidence and blocks approval when the category is applicable.
8. Final decision: approved, changes requested, or blocked.
   Use **blocked** when a hard constraint, security policy, or missing traceability makes the PR unshippable regardless of minor fixes. Use **changes requested** when issues are correctable by the author and only the affected sections need re-review before approval.
   If any workflow step is inconclusive (insufficient context to evaluate), treat it as **blocked** and list the specific information needed to complete the check.

## Output

- PR summary
- Severity levels are: **critical** (blocking, unshippable), **major** (changes requested required), **minor** (non-blocking suggestion). Label each finding with its severity.
- Review findings by severity
- Judgment rubric table covering all eight required categories and their result
- Missing evidence or policy checks
- Final approval state

## Rules

- Blocking issues must be explicit.
- Approval requires concrete artifacts (e.g., test results, updated docs, traceability links), not the reviewer's subjective confidence that the implementation is correct.
- Every finding must cite the affected file and line, explain observable impact, and reference an applicable `HC-*` or `SC-*` rule when one exists.
- Deterministic CI results are evidence inputs, not substitutes for judgment-based review.
