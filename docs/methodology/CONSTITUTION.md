# Hexagone Connect Engineering Constitution

Status: Binding

Version: 2.0.0

Canonical policy source: this document

## Purpose and precedence

This constitution defines the merge-blocking hard constraints (`HC-*`) and
measurable, non-blocking goals (`SC-*`) for this repository. It applies to all
code, contracts, configuration, infrastructure, documentation, and AI artifacts.

When documents conflict, this constitution takes precedence. Path-scoped rules
may add detail but cannot weaken an `HC-*` constraint. A documented, approved,
time-bounded exception is the only permitted deviation from a hard constraint.

## Hard constraints

| ID          | Requirement                                                                                                                                                                | Applicable paths                                                                        | Failure prevented                                      | Verification                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| HC-SEC-001  | Repository content MUST NOT contain secrets, private keys, access tokens, or production personal data.                                                                     | `**/*`                                                                                  | Credential and data disclosure.                        | Automated secret and prohibited-pattern scan.                                                       |
| HC-SEC-002  | Tenant-scoped server operations MUST authorize the tenant before data access and prove isolation with tests.                                                               | `services/**`, `apps/api-gateway/**`, `database/**`                                     | Cross-tenant access.                                   | Automated authorization and integration tests; manual trust-boundary review for new identity flows. |
| HC-TYPE-001 | Production TypeScript MUST pass strict type checking; `any` requires a documented, approved escape-hatch comment.                                                          | `**/*.ts` excluding tests and generated code                                            | Runtime failures caused by unchecked values.           | `tsc --noEmit` and an automated scoped-`any` check.                                                 |
| HC-ARCH-001 | Imports MUST respect domain, application, adapter, package, and service ownership boundaries.                                                                              | `apps/**`, `services/**`, `packages/**`                                                 | Hidden coupling and a distributed monolith.            | Automated dependency-direction and prohibited-import check.                                         |
| HC-ARCH-002 | API and event changes MUST use a versioned contract, registered schema, and compatibility evidence.                                                                        | `contracts/**`, `packages/contracts/**`, `services/**`                                  | Breaking producer/consumer releases.                   | Automated schema, naming, registration, and contract-test validation.                               |
| HC-TEST-001 | Functional production changes MUST include mapped focused tests that pass.                                                                                                 | `apps/**/src/**`, `services/**/src/**`, `packages/**/src/**`, `tests/**`                | Unverified behavioral regressions.                     | Automated changed-source-to-test mapping in CI plus focused test execution.                         |
| HC-AI-001   | AI outputs MUST be schema-validated and versioned; consequential actions MUST require human approval; AI capability changes MUST include reproducible evaluation evidence. | `ai/**`, `services/ai-orchestration/**`                                                 | Unsafe, untraceable, or unreviewed AI behavior.        | Automated evaluation and schema checks; manual approval review for consequential actions.           |
| HC-DEP-001  | Production dependencies MUST have no unapproved high or critical vulnerabilities and MUST satisfy the license allowlist.                                                   | `package.json`, `pnpm-lock.yaml`, `**/package.json`                                     | Known vulnerable or legally incompatible dependencies. | Automated dependency audit and license-policy check.                                                |
| HC-DOC-001  | Changes to registered services, contracts, policies, operations, or deployment behavior MUST update their required documentation and registrations.                        | `services/**`, `contracts/**`, `policies/**`, `infrastructure/**`, `docs/**`            | Architecture and operating-documentation drift.        | Automated registration, link, and documentation-consistency checks.                                 |
| HC-GOV-001  | Governance references MUST resolve; hard-constraint amendments MUST have an approved evaluation scenario and non-regression review.                                        | `docs/methodology/**`, `docs/constitution/**`, `policies/**`, `.github/**`, `AGENTS.md` | Broken or silently weakened governance.                | Automated methodology-integrity and rule-reference checks; mandatory human approval for amendments. |
| HC-GIT-001  | Agents MUST preserve user-owned changes and MUST NOT commit, push, amend, reset, rebase, branch, or open a pull request without explicit user approval.                    | Agent instruction files and agent activity                                              | Accidental loss or publication of user work.           | Mandatory agent instruction acknowledgement; manual review of Git actions.                          |

## Measurable non-blocking goals

| ID          | Goal and metric                                                                             | Applicable paths                 | Measurement                                           |
| ----------- | ------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| SC-TEST-001 | Report line and branch coverage by workspace and changed-code coverage.                     | TypeScript source and tests      | Coverage report compared with the committed baseline. |
| SC-A11Y-001 | Report serious and moderate accessibility findings by changed UI flow once UI exists.       | `apps/**`                        | Axe result summary per E2E flow.                      |
| SC-I18N-001 | Report locale-key completeness and untranslated-key count once locale resources exist.      | UI source and locale resources   | Locale consistency report.                            |
| SC-PERF-001 | Report artifact-size deltas and focused interaction timing once build outputs exist.        | Deployable apps and services     | Budget report and measurement comparison.             |
| SC-TEL-001  | Report critical-operation telemetry registration coverage once a telemetry registry exists. | Services, observability, AI      | Registered-event coverage report.                     |
| SC-DEP-001  | Report outdated dependencies and remediation age.                                           | Workspace manifests and lockfile | Dependency freshness report.                          |

`SC-*` results are reported but do not block merge unless promoted through the
amendment process.

## Required implementation workflow

Non-trivial changes MUST proceed in this order:

1. Update the requirement, ADR, contract, runbook, or relevant documentation.
2. Identify applicable `HC-*` and `SC-*` rules and the acceptance evidence.
3. Add or update tests; run the focused test to capture the expected failure
   before implementation when a failing precondition can be demonstrated.
4. Capture comparable before evidence.
5. Implement the smallest independently testable change.
6. Run focused validation and capture comparable after evidence.
7. Verify documentation, registrations, contracts, and generated artifacts.
8. Audit the complete diff for correctness, security, privacy, accessibility,
   performance, testing, documentation, architecture, telemetry, and operations.
9. Run automated review and prepare factual evidence for human review.

Evidence status MUST be recorded as `passed`, `failed`, `not run`, or `not
applicable` with a reason. Manual or unexecuted checks MUST NOT be reported as
passed. For pull requests, implementation-loop declarations belong in the PR
description and are validated and retained by the remote PR workflow; generated
workflow evidence MUST NOT be committed to a shared repository path.

## Evidence requirements

| Change type                    | Required before/after evidence                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Server or API                  | Failing then passing request or test output, plus contract and authorization evidence. |
| UI                             | Before/after screenshots, interaction test output, and accessibility result.           |
| Security                       | Reproduction of the defect or threat scenario and a passing regression test.           |
| Performance                    | Comparable measurements using the same command, data shape, and environment.           |
| Telemetry                      | Missing or malformed event evidence followed by a valid registered event.              |
| Documentation or configuration | Rendered or semantic before/after comparison and link/reference validation.            |

## Amendment and exceptions

Every proposed rule change MUST document a demonstrated risk, objective
requirement, enforcement mechanism, evaluation scenario, affected rules,
automation gaps, and non-regression analysis. A change that weakens or removes
an `HC-*` rule requires an ADR and explicit human approval before merge.

Exceptions MUST name the affected rule, owner, approver, risk, compensating
controls, and expiry date. Expired exceptions are violations.
