# Development Guide

## First-Time Setup

Workflow command reference: [governance/agent-workflows.md](governance/agent-workflows.md).

1. Install Node.js compatible with the TypeScript toolchain and pnpm 10.x. CI uses Node.js 22.x.
2. Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Expected result: pnpm completes without lockfile changes.

3. Run deterministic validation:

```bash
pnpm run validate
```

Expected result: the command ends with `PASS validate complete deterministic gate`.

## Normal Local Workflow

1. Read the relevant docs from [docs/README.md](README.md).
2. Run the focused test or check for the area you will change.
3. Make the smallest scoped change.
4. Run the focused test again.
5. Run `pnpm run validate` before review.
6. Run `pnpm run build:ci` when you need the dependency vulnerability audit too.

For a fast feedback loop:

```bash
pnpm dev
```

Expected result: Vitest starts in watch mode.

## Use AI Effectively In This Repository

This repository is designed for AI-assisted engineering, but AI is a tool inside a governed workflow, not a replacement for repo knowledge, ownership, or evidence. New team members should use AI to accelerate understanding, implementation, and validation while staying aligned with the repo's architecture, service boundaries, and proof requirements.

### Start with the repo map

Before making changes, use AI to read the foundational documents and explain the repo's shape:

- [README.md](../README.md)
- [codebase-map.md](codebase-map.md)
- [TEAM_OWNERSHIP.md](TEAM_OWNERSHIP.md)
- [methodology/CONSTITUTION.md](methodology/CONSTITUTION.md)

AI should be used to answer:

- what the repo is trying to build
- which service or domain owns the work
- which files are authoritative for the change
- which docs and constraints apply before code is touched

### Apply ownership and domain boundaries

The repo is organized around explicit ownership and service boundaries. Before editing code, AI should identify:

- the owning engineer profile and service area
- the relevant documentation and contract files
- the correct service boundary
- the minimal files likely to change

This is especially important for AI-related work, which is governed by the AI/Data Engineer ownership model in [TEAM_OWNERSHIP.md](TEAM_OWNERSHIP.md) and the AI orchestration service in [../services/ai-orchestration/README.md](../services/ai-orchestration/README.md).

### Use AI for scoped understanding, not broad rewrites

AI is most useful when asked to:

- summarize the relevant modules and responsibilities
- identify the minimal change surface
- propose a small, testable fix
- list impacted tests, contracts, and docs
- explain the validation path before implementation

AI should not be used to:

- rewrite large areas without repo context
- bypass contract or ownership boundaries
- ignore documentation, evidence, or validation requirements
- claim a fix without checking the repo's rules and tests

### Ask for evidence, not opinions

Good AI usage in this repo requires grounded answers. Ask AI to cite the exact files and docs behind its recommendation and to name the relevant validation steps. Examples:

- "Which files define this service boundary?"
- "What repo rules apply to this change?"
- "What tests or checks should validate this behavior?"
- "What contract or documentation updates are required?"

### Follow the validation flow

Every task should end with evidence. Use AI to identify the relevant commands from the repo's workflow, including:

- unit and contract tests
- governance checks
- focused validation
- repo-wide verification described in this guide

The goal is not "AI wrote it," but "the change is grounded in the repo, validated against the repo, and documented the way this repo expects."

### Rule of thumb

Use AI to understand the repository, not to bypass it.

Before any task, ask AI to:

- map the relevant service and owning domain
- identify the exact docs, contracts, and tests that govern the work
- propose the smallest safe implementation
- list the validation steps and expected evidence

In this repo, AI work belongs to the AI/Data Engineer ownership model and must remain within the service and contract boundaries defined by the project. The repo expects evidence, minimal scoped changes, and human review before a change is considered complete.

Treat AI as a force multiplier for repo comprehension and implementation quality, not as a shortcut around governance, reviews, or validation.

## Add A Feature

1. Identify the owning area in [codebase-map.md](codebase-map.md).
2. Check path-scoped instructions under `.github/instructions/`.
3. For service behavior, keep domain rules in `src/domain`, orchestration in `src/application`, and adapters in `src/infrastructure`.
4. Update contracts under `contracts/` before relying on new public API or event shapes.
5. Add focused tests in the owning workspace or under `tests/`.
6. Update docs when behavior, setup, contracts, governance, or troubleshooting changes.

## Add And Run Tests

Use the closest focused command:

```bash
pnpm test:unit
pnpm test:contracts
pnpm test:architecture
pnpm test:ai
```

Integration, E2E, accessibility, localization, and budget checks currently report not applicable unless matching artifacts exist.

## Run Governance And Security Checks Locally

Run the repository-owned PR checks with these commands:

```bash
pnpm run check:ownership
pnpm run check:governance
pnpm run check:docs
pnpm run check:test-mapping
pnpm run check:licenses
pnpm run check:secrets
pnpm run check:sdl-source
pnpm run check:dependency-vulnerabilities
pnpm run test:ai
```

Expected result: each command exits with status `0` or prints `NOT APPLICABLE` when scoped behavior does not exist yet.

## Debug

- Type errors: run `pnpm typecheck` and inspect the first TypeScript diagnostic.
- Lint errors: run `pnpm lint` and fix the reported file and rule.
- Test failures: run `pnpm test:unit` or the smallest matching test command, then rerun after the fix.
- Contract failures: run `pnpm test:contracts` and `pnpm run check:contracts`.
- Governance failures: run the specific `pnpm run check:*` command printed by `pnpm run validate`.

## Update Documentation

1. Update the canonical topic document listed in [docs/README.md](README.md).
2. Prefer links to canonical policy files over copying policy text.
3. Include exact commands and file paths.
4. Run:

```bash
pnpm run check:docs
```

Expected result: documentation references pass.

## Run The Implementation Loop

For non-trivial changes, follow [foundation/implementation-loop.md](foundation/implementation-loop.md) and [methodology/verification.md](methodology/verification.md).

When GitHub PR metadata is unavailable, `pnpm check:implementation-loop` reports not applicable. For a non-trivial pull request, add the structured declaration from the PR template; the remote workflow validates it against the final diff and publishes the proof artifact.

## Prepare A Change For Review

1. Confirm applicable `HC-*` and `SC-*` rules in [governance.md](governance.md).
2. Run the focused tests for the changed area.
3. Run:

```bash
pnpm run validate
pnpm run build:ci
```

4. For branch-protection parity with CI, run the key PR jobs locally:

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test:unit
pnpm run test:contracts
pnpm run test:architecture
pnpm run test:integration
pnpm run test:e2e
pnpm run test:a11y
```

5. Fill out [.github/pull_request_template.md](../.github/pull_request_template.md) with exact command results.
6. Request owners from [.github/CODEOWNERS](../.github/CODEOWNERS).

Do not commit, push, create a branch, or open a pull request unless that action is explicitly approved in the current task.