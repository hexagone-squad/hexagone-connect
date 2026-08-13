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
15. applicable AI evaluations.

`pnpm run build:ci` runs `pnpm run validate` and then the network-dependent dependency vulnerability scan. The PR workflow runs implementation-loop proof validation afterward, because it requires PR metadata. CI reports each as a separate step so registry failures and evidence findings are actionable.

A stage without applicable artifacts MUST report `not applicable` and its reason.
A non-trivial pull request MUST fail if its implementation-loop declaration is
missing, stale, or does not match the final diff. The PR workflow must publish
the validated declaration and remote verification result as a workflow artifact.
It MUST NOT report success for work it did not execute.

## Implementation Loop PR evidence

Non-trivial pull requests require an `implementation-loop-evidence` JSON
declaration in the PR description, validated by `pnpm check:implementation-loop`
in the remote PR workflow. The declaration records the change identifier and
type, changed files, applicable steps, timestamps, BEFORE evidence reference,
focused failing-test result, documentation verification, diff audit, automated
review, and PR proof. The workflow binds it to the PR number, head SHA, base
SHA, final diff hash, and remote `pnpm run validate` outcome, then uploads the
normalized result as an implementation-loop workflow artifact.

The validator rejects missing or malformed declarations, placeholder text,
changed-file or diff-hash mismatches, late BEFORE evidence, invalid step order,
and unjustified exemptions. It cannot infer human approval, screen-reader
results, or cloud verification; those remain explicitly manual or external
evidence. Workflow artifacts follow the repository hosting provider's configured
retention policy; the PR check and its linked run remain the merge record.

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
exit status, and relevant output or artifact location. PR-authored declarations
must distinguish local evidence from the remote commands actually executed by
the workflow. A check that was not run is `not run`; a check without matching
scope is `not applicable`; neither may be used to claim merge readiness.
