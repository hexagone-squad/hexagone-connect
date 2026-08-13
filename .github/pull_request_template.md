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

- Manifest: `evidence/implementation-loop/manifest.json`
- [ ] `pnpm check:implementation-loop` passed against the final diff
- [ ] Manifest covers all applicable steps 1–11, or records a valid narrow exemption
- [ ] BEFORE and AFTER artifacts use the same scenario, invocation, environment, and observable
- [ ] Audit, automated review, PR proof, and manifest all match the final reviewed diff hash

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
