# Documentation Index

Use this page as the canonical navigation map. Prefer updating these documents over adding new topic-level docs.

## Start Here

- [Root README](../README.md) — project purpose, maturity, stack, structure, and commands
- [Architecture overview](architecture/README.md) — current components, flows, boundaries, and constraints
- [Codebase map](codebase-map.md) — important directories, entry points, tests, config, and where to add changes
- [Development guide](development.md) — setup, workflow, tests, debugging, docs, and review preparation
- [Governance guide](governance.md) — constitution summary, verification, evidence, PR, and Git safety rules
- [Agent workflows](governance/agent-workflows.md) — slash-command workflow system and evaluation artifacts
- [Troubleshooting guide](troubleshooting.md) — verified command-driven fixes
- [Glossary](glossary.md) — project-specific terminology

## Canonical References

- [Engineering constitution](methodology/CONSTITUTION.md) — binding `HC-*` and `SC-*` rules
- [Verification contract](methodology/verification.md) — validation gate and evidence rules
- [Implementation Loop](foundation/implementation-loop.md) — required workflow for non-trivial changes
- [Engineering readiness and POC contribution guide](foundation/engineering-readiness-poc-guide.md) — pre-requirements team practice, POC charters, and review expectations
- [Decision readiness register (POC)](foundation/decision-readiness-register.md) — open architecture and business decisions with evidence and owners
- [Tenant-boundary scenario matrix (POC)](foundation/tenant-boundary-scenario-matrix.md) — synthetic allow/deny tenant scenarios and expected audit evidence
- [IT architecture review agenda (POC)](foundation/it-architecture-review-agenda.md) — review cadence and outputs for unresolved decisions
- [Team ownership](TEAM_OWNERSHIP.md) — profile-based ownership model used by CODEOWNERS
- [Decision records](adr/) — accepted architecture decisions and the ADR template

## Area Notes

- [Applications](../apps/README.md)
- [Services](../services/README.md)
- [Work management service](../services/work-management/README.md)
- [AI orchestration service](../services/ai-orchestration/README.md)
- [AI workspace](../ai/README.md)
- [Infrastructure note](../infrastructure/README.md)

## Documentation Rules

- Keep one canonical document per topic.
- Link to policy sources instead of copying full policy text.
- Include exact commands and file paths when documenting setup or troubleshooting.
- Label planned or experimental areas clearly.
- Run `pnpm run check:docs` after documentation changes.
