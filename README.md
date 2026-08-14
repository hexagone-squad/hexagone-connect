# Hexagone Connect

Hexagone Connect is an early-stage TypeScript monorepo for an AI-assisted marketplace and service-operations platform. The product direction is a marketplace that connects customers, internal operators, and service partners through tenant-scoped workflows.

The repository currently serves the engineering team building the foundation. It does not yet contain a runnable web application, API server, deployment pipeline, or production infrastructure.

## Current Scope

Implemented now:

- workspace setup, validation scripts, and CI quality gates
- a `work-management` domain slice for creating and qualifying work requests
- an `identity-tenant` authorization helper for tenant access checks
- an `ai-orchestration` inspection assistant with schema checks, tenant-boundary checks, fallback behavior, audit payloads, and evaluation tests
- canonical OpenAPI and event contracts under [contracts](contracts)
- governance checks for architecture boundaries, contracts, type safety, secrets, licenses, docs, and Implementation Loop evidence

Current non-goals:

- production deployment, release automation, or multi-environment orchestration
- runnable frontend or API gateway behavior
- live model-provider, payment-provider, notification-provider, or cloud integrations
- load testing, disaster recovery, SBOM signing, or observability infrastructure

## Technology Stack

- Node.js and pnpm 10.x workspaces; CI uses Node.js 22.x
- TypeScript with `moduleResolution: NodeNext` and strict type checking
- Vitest for tests and AI evaluations
- ESLint and Prettier for baseline quality
- Docker Compose for optional local PostgreSQL only
- GitHub Actions for pull-request validation

## Repository Structure

```text
apps/             Placeholder app workspaces; no UI runtime yet
services/         Domain service workspaces and implemented service logic
packages/         Shared package workspaces
contracts/        Canonical public OpenAPI and event schemas
ai/               AI input/output types, guardrail policy, and evaluation data
database/         SQL migration drafts
scripts/          Validation and governance scripts
tests/            Repository-level governance, architecture, and contract tests
docs/             Canonical documentation system
policies/         Machine-readable governance policies
infrastructure/   Placeholder note; no production infrastructure yet
```

For a detailed map, see [docs/codebase-map.md](docs/codebase-map.md).

## Prerequisites

- Node.js compatible with the TypeScript toolchain; CI uses Node.js 22.x
- pnpm 10.x, as declared by `packageManager` in [package.json](package.json)
- Docker Desktop or Docker Engine only when using local PostgreSQL
- Git metadata for PR-only checks such as changed-source test mapping and Implementation Loop proof

## Environment Variables

[.env.example](.env.example) is the template and contains no secrets.

| Name | Required | Current use |
| --- | --- | --- |
| `APP_ENV` | No | Documents the local environment label. |
| `LOG_LEVEL` | No | Reserved for future runtime logging configuration. |

## Commands

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run the local feedback loop:

```bash
pnpm dev
```

Build all workspaces that currently expose a build script:

```bash
pnpm run build
```

Run tests:

```bash
pnpm test:unit
```

Run linting:

```bash
pnpm lint
```

Run deterministic full verification:

```bash
pnpm run validate
```

Run CI-equivalent verification, including the network-dependent dependency audit:

```bash
pnpm run build:ci
```

Optional local PostgreSQL:

```bash
docker compose up -d postgres
```

## AI Usage Policy

Use AI to understand the repository, not to bypass it.

Before any task, ask AI to map the relevant service and owning domain, identify the exact docs, contracts, and tests that govern the work, propose the smallest safe implementation, and list the validation steps and expected evidence.

In this repo, AI work belongs to the AI/Data Engineer ownership model and must remain within the service and contract boundaries defined by the project. The repo expects evidence, minimal scoped changes, and human review before a change is considered complete.

Treat AI as a force multiplier for repo comprehension and implementation quality, not as a shortcut around governance, reviews, or validation.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture overview](docs/architecture/README.md)
- [Codebase map](docs/codebase-map.md)
- [Development guide](docs/development.md)
- [Governance guide](docs/governance.md)
- [Troubleshooting guide](docs/troubleshooting.md)
- [Glossary](docs/glossary.md)
- [Decision records](docs/adr/)

## 5-Minute Onboarding: AI-First Loop

Default path: run the workflow first, then open only the doc that unblocks the next gate.

1. Start with `/wow` in Copilot Chat (local equivalent shown below):

```bash
pnpm run workflow:wow
```

2. Follow the next actionable step from `/wow` output.
3. For non-trivial changes, complete both Implementation Loop proof sections in [.github/pull_request_template.md](.github/pull_request_template.md):
	- human-readable summary table for reviewers
	- machine-readable `implementation-loop-evidence` JSON comment for remote validation
4. Ensure the PR passes remote `pnpm check:implementation-loop` and retains the proof artifact.

Eligible AI workflow commands follow the same convention: use the slash command first, then use a local script only when you are outside chat.

| Workflow goal | Preferred in chat | Local equivalent |
| --- | --- | --- |
| Course-correct to implementation loop | `/wow` | `pnpm run workflow:wow` |
| Run deterministic validation chain | `/verify` | `pnpm run workflow:verify` |
| Run instruction evaluation | `/eval-claude-md` | `pnpm run workflow:eval-claude-md` |
| Branch diff audit | `/audit` | Chat-first (no local script contract) |
| Local PR surface review | `/review-pr` | Chat-first (no local script contract) |
| Propose constitutional amendment | `/constitute` | Chat-first (no local script contract) |
| Promote defect to permanent rule decision | `/reflect` | Chat-first (no local script contract) |

Open references only when blocked:

- Loop stage requirement unclear: [docs/foundation/implementation-loop.md](docs/foundation/implementation-loop.md)
- `/wow` behavior or flags unclear: [docs/governance/agent-workflows.md](docs/governance/agent-workflows.md)
- Evidence format unclear: [.github/pull_request_template.md](.github/pull_request_template.md)

Quick references:

- Development-loop usage: [docs/development.md](docs/development.md)
- Governance expectations: [docs/governance.md](docs/governance.md)
- PR workflow command catalog: [docs/governance/agent-workflows.md](docs/governance/agent-workflows.md)

### Team Prompt Pack

Use these prompts in Copilot Chat on day one so onboarding is consistent and evidence-driven.

Onboarding prompt:

```text
Map this repo for me and prepare my onboarding checklist.
Include:
- which HC-* constraints apply most often
- which docs are canonical for implementation loop and workflow commands
- which checks will be run automatically by the workflow and which require human evidence
- how to complete Implementation Loop proof in the PR template
Then run /wow and tell me the next required step.
```

Complex-task kickoff prompt:

```text
I am starting a non-trivial task.
Create a plan using the canonical implementation loop, identify applicable HC-* and SC-* rules,
list required evidence, and propose the smallest independently testable change.
Before any edits, show:
- focused test to run first (or explicit N/A reason)
- BEFORE evidence to capture
- which deterministic validations you will run automatically and when
Then run /wow and report blockers and next actionable step.
```

Execution expectations for complex work:

1. Start with `/wow` (or `pnpm run workflow:wow` when running outside chat).
2. Let the AI workflow run routine deterministic checks automatically.
3. If `/wow` reports blocked or pending, resolve exactly the next gate before coding further.
4. Keep PR evidence current in [.github/pull_request_template.md](.github/pull_request_template.md).
5. Do not treat manual or unexecuted checks as passed.

## Project Maturity

This is initial setup. The repository can install, typecheck, lint, test, validate contracts, scan for secret patterns, and run governance checks. Most app and service workspaces are named boundaries only. Treat production-readiness, deployment, observability, and external integrations as deferred until there is executable runtime behavior and an accepted ADR.
