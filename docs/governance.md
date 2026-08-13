# Governance Guide

This guide summarizes how governance works. The binding source is [methodology/CONSTITUTION.md](methodology/CONSTITUTION.md).

## Constitution

The constitution defines merge-blocking hard constraints (`HC-*`) and measurable non-blocking goals (`SC-*`). If another document conflicts with it, the constitution wins.

## Rule Types

- `HC-*`: hard constraints. They block merge when violated unless an approved, time-bound exception exists.
- `SC-*`: measurable goals. They are reported but do not block merge unless promoted through the amendment process.

Use [methodology/CONSTITUTION.md](methodology/CONSTITUTION.md) for exact rule text.

## Path-Scoped Rules

Path-specific instructions live in `.github/instructions/`:

| Path | Instruction file |
| --- | --- |
| `services/**`, `packages/domain-core/**`, `packages/observability/**` | `.github/instructions/backend.instructions.md` |
| `contracts/**`, `packages/contracts/**`, transport/adapter paths | `.github/instructions/contracts.instructions.md` |
| `apps/**` | `.github/instructions/ui.instructions.md` |
| `ai/**`, `services/ai-orchestration/**` | `.github/instructions/ai.instructions.md` |
| `database/**`, `infrastructure/**`, Docker and workflow files | `.github/instructions/infrastructure.instructions.md` |
| docs, policies, agent instructions, PR template | `.github/instructions/governance.instructions.md` |

Read the matching instruction before changing a path.

## Verification Requirements

The deterministic gate is:

```bash
pnpm run validate
```

The CI-equivalent command including network dependency audit is:

```bash
pnpm run build:ci
```

The detailed verification contract is [methodology/verification.md](methodology/verification.md).

## Evidence Expectations

Non-trivial changes follow [foundation/implementation-loop.md](foundation/implementation-loop.md). Put the structured implementation-loop declaration in the PR description; the PR workflow validates it and retains the normalized proof as an artifact. Evidence must record exact commands, status, timestamps, environment, and artifacts. A check that was not run is `not run`; a check outside scope is `not applicable`.

## Audit Workflow

Use [../skills/audit/SKILL.md](../skills/audit/SKILL.md) for repository audits. Findings should cite exact `HC-*` or `SC-*` IDs and affected files.

## Pull Request Requirements

- Use [.github/pull_request_template.md](../.github/pull_request_template.md).
- Record `pnpm run validate` and dependency vulnerability scan results.
- Complete the Implementation Loop evidence declaration in the PR description for non-trivial changes.
- Request owners from [.github/CODEOWNERS](../.github/CODEOWNERS).
- Do not imply manual checks passed unless they were actually completed.

## Git Safety

Agents and contributors must preserve user-owned changes and must not commit, push, amend, reset, rebase, create branches, or open pull requests without explicit approval. This is enforced as `HC-GIT-001` in the constitution and repeated in [../AGENTS.md](../AGENTS.md).