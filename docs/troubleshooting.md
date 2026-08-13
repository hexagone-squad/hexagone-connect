# Troubleshooting Guide

This guide lists verified local issues and commands. It does not cover production incidents because no production runtime exists yet.

## Install Fails Or Lockfile Is Out Of Date

Run:

```bash
pnpm install --frozen-lockfile
```

Expected success: `Already up to date` or an install summary ending with `Done`.

If it fails because the lockfile is stale, update dependencies intentionally with pnpm, then rerun the frozen install command.

## Node Or pnpm Version Mismatch

Run:

```bash
node --version
pnpm --version
```

Expected result: pnpm is `10.x`. CI uses Node.js `22.x`; local Node versions newer than that may work, but failures should be reproduced on Node.js `22.x` before review.

## TypeScript Build Or Typecheck Fails

Run:

```bash
pnpm typecheck
```

Expected success: command exits with status `0` and no TypeScript diagnostics.

Fix the first reported diagnostic, then rerun the command.

## Lint Fails

Run:

```bash
pnpm lint
```

Expected success: command exits with status `0`.

Fix the reported file and rule before rerunning validation.

## Unit Tests Fail

Run:

```bash
pnpm test:unit
```

Expected success: Vitest reports all unit test files passed.

Use the failing test name to choose the owning area from [codebase-map.md](codebase-map.md).

## Contract Checks Fail

Run:

```bash
pnpm test:contracts
pnpm run check:contracts
```

Expected success: the WorkRequestCreated test passes and contract validation reports event/OpenAPI documents validated.

If this fails, check files under `contracts/` before changing service code.

## Documentation Links Or Paths Fail

Run:

```bash
pnpm run check:docs
```

Expected success: documentation references pass.

If this fails, update or remove the broken Markdown link or documented file path.

## Ownership Check Fails

Run:

```bash
pnpm run check:ownership
```

Expected success: `PASS ownership policy`.

If this fails, fix invalid owner syntax (owners must start with `@`), restore the catch-all `*` ownership rule, or update stale CODEOWNERS paths that no longer exist.

## SDL Source Analysis Fails

Run:

```bash
pnpm run check:sdl-source
```

Expected success: `PASS SDL source analysis`.

If this fails, replace risky constructs such as `eval`, `new Function`, `vm.runIn*`, `exec`, or `shell: true`. For unavoidable controlled exceptions, add a one-line `// SDL-ALLOW` comment directly above the exact line and document why the exception is safe.

## PR Check Name Is Missing In Branch Protection

If a PR cannot merge even though workflow jobs pass, verify that branch protection requires the current check names from [governance.md](governance.md). Old required contexts such as `quality-gates` should be replaced with the current independent checks.

## Implementation Loop Reports Not Applicable

Run:

```bash
pnpm check:implementation-loop
```

Expected result outside the GitHub PR workflow: `NOT APPLICABLE implementation loop: remote pull-request metadata is unavailable`.

Expected result in a real non-trivial pull request: the PR-description declaration is validated against the final diff and a proof artifact is uploaded.

## Local PostgreSQL Is Needed

Run:

```bash
docker compose up -d postgres
```

Expected result: Docker starts a `postgres` service and the healthcheck eventually passes.

If Docker Desktop or the Docker daemon is not running, the observed failure is:

```text
Cannot connect to the Docker daemon at unix:///Users/cmbuyamba/.docker/run/docker.sock. Is the docker daemon running?
```

Start Docker Desktop or the Docker daemon, then inspect status:

```bash
docker compose ps postgres
```

Expected result: the `postgres` service is listed as running or healthy.

## External Dependency Audit Fails

Run:

```bash
pnpm run check:dependency-vulnerabilities
```

Expected success: `No known vulnerabilities found`.

If the npm registry is unreachable, record the check as `not run` or `failed`; do not report it as passed.