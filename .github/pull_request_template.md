## Summary and scope

- Requirement and acceptance criteria:
- In scope / explicitly out of scope:
- Applicable rules (`HC-*` / `SC-*`):

## Traceability

- Requirement:
- Acceptance criteria:
- ADR, if applicable:

## Implementation loop checklist

### 1) Define

- [ ] Requirement and acceptance criteria are explicit
- [ ] Ownership and scope are clear
- [ ] Applicable hard constraints are identified

### 2) Design

- [ ] Dependency direction and boundary impact reviewed
- [ ] ADR/architecture docs updated when needed

### 3) Implement

- [ ] Change is minimal and respects domain/application/adapter boundaries
- [ ] Tenant and contract constraints preserved
- [ ] Focused test was confirmed failing before implementation, or N/A is explained

### 4) Verify

- [ ] `pnpm run validate` result and run link/output are recorded below
- [ ] `pnpm run check:dependency-vulnerabilities` result is recorded when registry access is available
- [ ] Any skipped stage is marked `not applicable` with its reason
- [ ] Manual checks are marked `passed`, `failed`, or `not run`; none are implied

### 5) Evidence

- [ ] Comparable before and after evidence is linked below
- [ ] Documentation, registrations, and evidence artifacts are updated

### 6) Review

- [ ] PR includes traceability and evidence links
- [ ] Required reviewers/CODEOWNERS requested
- [ ] Hard constraints remain satisfied (or approved expiring exception is linked)
- [ ] Complete diff audit covers correctness, security, privacy, accessibility, performance, testing, documentation, architecture, telemetry, and operational readiness
- [ ] Each review finding cites an `HC-*` or `SC-*` rule and affected location

### 7) Release Readiness

- [ ] Rollback and monitoring considerations addressed for production-impacting changes

### 8) Learn

- [ ] Follow-up learnings/actions identified (or explicitly N/A)

## Risk and rollback

## Implementation Loop proof

Paste and complete this JSON comment for every non-trivial change. The remote
workflow validates it against the final diff and uploads a normalized proof
artifact. Do not report a manual or unexecuted check as `passed`.

<!-- implementation-loop-evidence
{
	"schemaVersion": 1,
	"changeId": "replace-with-change-identifier",
	"changeType": "feature | fix | governance | infrastructure | ai",
	"changedFiles": ["path/to/changed-file.ts"],
	"implementationStartedAt": "2026-01-01T00:00:00Z",
	"steps": {
		"specification": { "status": "passed", "timestamp": "2026-01-01T00:00:00Z", "detail": "Requirement updated." },
		"tests": { "status": "passed", "timestamp": "2026-01-01T00:01:00Z", "detail": "Focused test added or updated." },
		"focused-failure": { "status": "passed", "timestamp": "2026-01-01T00:02:00Z", "detail": "Exact failing command and output link." },
		"before-evidence": { "status": "passed", "timestamp": "2026-01-01T00:03:00Z", "detail": "Comparable BEFORE evidence link." },
		"implementation": { "status": "passed", "timestamp": "2026-01-01T00:04:00Z", "detail": "Smallest implementation completed." },
		"documentation": { "status": "passed", "timestamp": "2026-01-01T00:05:00Z", "detail": "Documentation and registrations checked." },
		"diff-audit": { "status": "passed", "timestamp": "2026-01-01T00:06:00Z", "detail": "Complete diff audited." },
		"automated-review": { "status": "passed", "timestamp": "2026-01-01T00:07:00Z", "detail": "Independent automated review completed." },
		"pr-proof": { "status": "passed", "timestamp": "2026-01-01T00:08:00Z", "detail": "PR evidence reviewed." }
	}
}
-->

- [ ] Remote `pnpm check:implementation-loop` passed against the final diff
- [ ] The uploaded proof artifact matches this declaration and the remote validation result

## Validation commands and exact results

| Command or check                            | Category: deterministic / network / manual / external | Status: passed / failed / not run / not applicable | Output or evidence link |
| ------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| `pnpm check:implementation-loop`            | deterministic                                         |                                                    |                         |
| `pnpm run validate`                         | deterministic                                         |                                                    |                         |
| `pnpm run check:dependency-vulnerabilities` | network                                               |                                                    |                         |

## Before and after evidence

## Manual verification

## Known limitations and uncovered risks

## Required reviewers
