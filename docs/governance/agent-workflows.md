# Agent Workflow Commands

This repository installs a portable slash-command workflow system under `.github/prompts`.

## Installed commands

- `/eval-claude-md`
- `/constitute`
- `/reflect`
- `/audit`
- `/verify`
- `/review-pr`
- `/wow`

## Invocation examples

- Run structural and behavioral instruction evaluation:
  - `/eval-claude-md`
  - Local command equivalent: `pnpm run workflow:eval-claude-md`
- Run deterministic validation chain:
  - `/verify`
  - Local command equivalent: `pnpm run workflow:verify`
- Run branch diff audit:
  - `/audit`
- Run local PR surface review:
  - `/review-pr`
  - The review must cover correctness, architecture fit, missing scenarios,
    naming and maintainability, usability, privacy, operational risks, and
    evidence credibility. Each category is reported as findings, no findings,
    or not assessable with the missing evidence named.
- Propose enforceable constitutional amendment:
  - `/constitute`
- Decide whether a defect should become a permanent rule:
  - `/reflect`
- Course-correct in-progress work to the canonical implementation loop:
  - `/wow`
  - Local command equivalent: `pnpm run workflow:wow -- [--accept] [task-name]`
  - Expected output includes:
    - effective accept-mode state (explicit vs auto-detected)
    - evidence classification and required method
    - canonical checklist with `pending`, `completed`, `blocked`, or `late-before-required`
    - blockers and remediation commands
    - next actionable step

## Runtime and model capabilities

- `/eval-claude-md` requires Node.js plus `pnpm` and `tsx`.
- `/eval-claude-md` requires an independent judge command in `EVAL_CLAUDE_MD_JUDGE_CMD`. If unavailable, evaluation reports `BLOCKED`.
- `/audit` and `/review-pr` require a local git branch and readable diff against `origin/main`.
- `/wow` accepts these forms:
  - `/wow`
  - `/wow --accept`
  - `/wow <task-name>`
  - `/wow --accept <task-name>`
- `/wow --accept` skips only initial plan confirmation. It never bypasses evidence, security, irreversible-operation, ambiguity, audit, or review gates.

## Generated artifacts

`/eval-claude-md` writes timestamped runs to:

- `.eval-claude-md/runs/<timestamp>/phase1-report.md`
- `.eval-claude-md/runs/<timestamp>/results-baseline.md`
- `.eval-claude-md/runs/<timestamp>/results-current.md`
- `.eval-claude-md/runs/<timestamp>/judge-report.md`
- `.eval-claude-md/runs/<timestamp>/pass-receipt.txt` (PASS only)

The run folder is gitignored and pruned to the latest 10 runs.

## Validation commands

- Focused workflow tests:
  - `pnpm vitest run tests/governance/eval-claude-md.test.ts tests/governance/workflow-discovery.test.ts`
- Standard repository checks:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm run build`

## Known limitations

- Independent judging is represented as an external runtime dependency and is not bundled in-repo.
- `/eval-claude-md` evaluates the repository instruction surface configured in `.github/workflows/eval-claude-md/config.json`.
- Receipt freshness is branch-local and validated against the complete diff fingerprint that includes tracked, staged, unstaged, and untracked file content hashes.
- `/wow` can only infer status from concrete evidence inputs and repository state. Without explicit evidence records, it keeps loop steps pending or blocked.

## /wow evidence policy

`/wow` classifies evidence by changed surface and applies method-specific requirements from [../foundation/wow-evidence-classification.md](../foundation/wow-evidence-classification.md).

If implementation happened before BEFORE evidence, `/wow` marks an ordering violation, requires `late-before` evidence, and requires limitation disclosure in the PR summary.
