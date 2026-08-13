# Verification Contract

## Status

Binding. This document defines the executable and reviewable verification
contract for repository changes.

## Validation Gates

`pnpm run validate` is the complete deterministic fail-fast gate. Each stage starts only after the previous stage succeeds:

1. frozen dependency installation in CI;
2. formatting check;
3. linting;
4. strict type checking;
5. unit tests;
6. contract and schema tests;
7. architecture-boundary tests;
8. integration tests;
9. applicable browser end-to-end tests;
10. applicable accessibility tests;
11. secret-pattern and license checks;
12. localization, documentation, and registration checks;
13. rule-reference and methodology-integrity checks;
14. artifact-size budget checks;
15. applicable AI evaluations;
16. Implementation Loop proof validation with `pnpm check:implementation-loop`.

`pnpm run build:ci` runs `pnpm run validate` and then the network-dependent dependency vulnerability scan. CI uses both gates, reported as separate steps so registry failures and vulnerability findings are actionable.

A stage without applicable artifacts MUST report `not applicable` and its reason.
A non-trivial change with Git metadata MUST fail if
`evidence/implementation-loop/manifest.json` is missing or stale.
It MUST NOT report success for work it did not execute.

## Implementation Loop evidence manifest

Non-trivial changes require `evidence/implementation-loop/manifest.json`, validated
by `pnpm check:implementation-loop`. The manifest records the change identifier
and type, changed and relevant files, applicable and exempted steps, exact
commands with exit codes and timestamps, scenario/environment identity, BEFORE
and AFTER artifact hashes and observables, focused failing and passing results,
full verification, audit and independent-review reports, PR proof, and the final
reviewed diff hash.

The validator rejects missing or empty artifacts, placeholder or unrelated logs,
late BEFORE evidence, mismatched scenarios or invocations, stale source or diff
hashes, unchecked PR proof, and unjustified exemptions. It cannot infer human
approval, screen-reader results, or cloud verification; those remain explicitly
manual or external evidence.

A trivial exemption is allowed only for objectively classified typo,
comment-only, or simple documentation-correction changes. It cannot cover
production behavior, tests, dependencies, security/privacy, CI/deployment,
governance/methodology, agent instructions, or public contracts. The exemption
must identify every skipped step and justify it. The change must still pass
`pnpm run validate`.

| Category                | Current checks                                                                                                                 | Status semantics                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Automated deterministic | Formatting, linting, type checking, contracts, architecture, unit tests, rule routing, documentation, and policy mapping.      | `passed` or `failed` from local execution.                                                                                 |
| Network-dependent       | Dependency vulnerability audit.                                                                                                | `passed` only for the observed registry response; an unavailable registry is `not run` or `failed`, never silently passed. |
| Required manual         | Screen-reader review, threat modelling, data classification, consequential-AI approval, production deployment/recovery review. | Recorded by a named reviewer in PR evidence.                                                                               |
| Not provable locally    | GitHub branch protection, CODEOWNERS enforcement, cloud IAM/networking, production capacity, external consumer rollout.        | `not applicable locally` with an external verification owner.                                                              |

Formatting enforcement currently covers governance, policy, validation, and
test surfaces. Broader product-code formatting is an explicit adoption task and
must be expanded deliberately instead of rewriting unrelated changes.

## Required validation by change type

| Change type                 | Required automated checks                                           | Required manual verification                | Cannot be proven locally                                 |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| Server/API                  | Unit, contract, integration, authorization, error-path checks       | New public trust-boundary review            | Production IAM and provider behavior                     |
| Contract/event              | Schema, compatibility, producer/consumer, replay/idempotency checks | Migration review for breaking changes       | External consumer rollout                                |
| UI                          | E2E interaction, axe, locale, budget checks                         | Keyboard and screen-reader review           | Real-device and assistive-technology experience          |
| Security/privacy            | Secret, dependency, regression, telemetry checks                    | Threat model and data-classification review | Cloud/network controls and legal assessment              |
| AI                          | Evaluation, schema, authorization, audit, fallback checks           | Human approval for consequential use        | Model-provider behavior and production safety outcomes   |
| Infrastructure/data         | Configuration, migration, rollback, artifact checks                 | Deployment, recovery, and monitoring review | Cloud permissions, backup restoration, and live capacity |
| Performance                 | Budget and comparable local measurement                             | Workload and SLO review                     | Production latency and capacity                          |
| Documentation/configuration | Link, reference, registration, semantic comparison checks           | Reader/operator review                      | Third-party rendering and operational understanding      |

## Evidence rules

Every validation record MUST contain the exact command, environment, timestamp,
exit status, and relevant output or artifact location. A check that was not run
is `not run`; a check without matching scope is `not applicable`; neither may be
used to claim merge readiness.
