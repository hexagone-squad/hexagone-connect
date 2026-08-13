# PR review skill

## Purpose
Review a pull request for compliance with the implementation loop, hard constraints, evidence expectations, and release readiness.

## Workflow
1. Read the PR template and confirm all loop stages are addressed.
	If the PR template is absent or incomplete, immediately set the final state to **blocked** and list the missing sections before proceeding with any other checks.
2. Check requirement traceability and acceptance criteria coverage.
3. Review architecture impact, dependency direction, and contract compatibility.
4. Check whether documentation and evidence were updated with the implementation.
5. Validate risk and rollback considerations are explicit.
6. Confirm AI, security, and operational constraints are satisfied.
7. Final decision: approved, changes requested, or blocked.
	Use **blocked** when a hard constraint, security policy, or missing traceability makes the PR unshippable regardless of minor fixes. Use **changes requested** when issues are correctable by the author and only the affected sections need re-review before approval.
	If any workflow step is inconclusive (insufficient context to evaluate), treat it as **blocked** and list the specific information needed to complete the check.

## Output
- PR summary
- Severity levels are: **critical** (blocking, unshippable), **major** (changes requested required), **minor** (non-blocking suggestion). Label each finding with its severity.
- Review findings by severity
- Missing evidence or policy checks
- Final approval state

## Rules
- Blocking issues must be explicit.
- Approval requires concrete artifacts (e.g., test results, updated docs, traceability links), not the reviewer's subjective confidence that the implementation is correct.
