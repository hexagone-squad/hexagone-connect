# Abdou POC evidence and recommendation

> **POC / TRAINING / NOT FOR PRODUCTION**
> Environment: WSL 2, Node.js 22.23.2, pnpm 10.0.0
> Observed: 2026-08-19T15:38:50-05:00

## Before and after evidence
| Check / Exact Command | Environment | Timestamp | Exit Status | Status | Exact Observation / Artifact Location |
| --------------------- | ----------- | --------- | ----------- | ------ | ------------------------------------- |
| `pnpm vitest run tests/governance/platform-poc.test.ts` (before implementation) | WSL 2 (Ubuntu, Node.js 22.23.2, pnpm 10.0.0) | 2026-08-19T15:38:50-05:00 | 1 | failed as expected | 3 tests failed: missing non-root/readiness Docker controls, missing recovery drill, and missing SBOM/image scan workflow (late-before disclosure) |
| `pnpm vitest run tests/governance/platform-poc.test.ts` (after implementation) | WSL 2 (Ubuntu, Node.js 22.23.2, pnpm 10.0.0) | 2026-08-19T15:42:10-05:00 | 0 | passed | 1 file and 3 tests passed |
| `node packages/work-management/docker/readiness-check.mjs` (smoke check) | WSL 2 (Ubuntu, Node.js 22.23.2, pnpm 10.0.0) | 2026-08-19T15:45:00-05:00 | 0 | passed | `PASS direct readiness smoke` for `/health/live` and `/health/ready` |
| `bash -n database/poc/synthetic-recovery.sh` | WSL 2 (Ubuntu) | 2026-08-19T15:46:12-05:00 | 0 | passed | Syntax valid, exit status 0 |
| `pnpm run validate` | WSL 2 (Ubuntu, Node.js 22.23.2, pnpm 10.0.0) | 2026-08-23T10:15:30-05:00 | 0 | passed | 55 unit/governance tests passed; final output: `PASS validate complete deterministic gate` |
| `pnpm run check:dependency-vulnerabilities` | WSL 2 (Ubuntu, Node.js 22.23.2, pnpm 10.0.0) | 2026-08-23T10:16:00-05:00 | 0 | passed | `No known vulnerabilities found` |
| `docker build -t work-management:poc -f packages/work-management/Dockerfile . && docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges work-management:poc` | WSL 2 (Docker Desktop engine) | 2026-08-23T10:20:45-05:00 | 0 | passed | Image built; container started as `node` user with read-only rootfs; `/health/ready` and `/health/live` passed |
| `bash database/poc/synthetic-recovery.sh` | WSL 2 (PostgreSQL 16 client/local) | 2026-08-23T10:22:15-05:00 | 0 | passed | 3 synthetic rows restored; checksum `6a21174405b22a5d15d51e62e7e513fb` matched; local restore time `387 ms` |
| `trivy image --exit-code 1 --severity HIGH,CRITICAL work-management:poc` | WSL 2 (Trivy 0.74.0) | 2026-08-23T10:25:00-05:00 | 0 | passed | 0 HIGH/CRITICAL findings detected |
| Cloud runtime, production secrets, telemetry, and production recovery | Target cloud environment | N/A | N/A | not applicable | Local POC scope only; no cloud provider or production architecture approved |
## Observations

- The hardened POC uses the existing work-management Docker path, runs as the
  image's `node` user, and supports read-only/capability-dropped execution.
- The readiness process is intentionally dependency-free because the repository
  has no runnable work-management HTTP adapter yet. It proves container health
  mechanics, not application or database readiness.
- The recovery drill uses three synthetic, tenant-tagged records and compares a
  deterministic row-count/checksum after `pg_dump` and `pg_restore`.
- CI adds only the missing container evidence. Existing secret, SDL source,
  dependency, and license checks remain unchanged.

## Review remediation evidence — 2026-08-23

- **Implementation-order limitation:** The original POC implementation began
  before verifiable BEFORE evidence was recorded. The later evidence is
  `late-before` evidence and does not replace true pre-change evidence. Reviewer
  approval of this disclosed exception is required.
- Recovery safety tests initially failed `2 of 5`, demonstrating fixed database
  names and unsafe cleanup. After remediation, all `5 of 5` focused tests passed.
- The recovery drill now creates uniquely named source and restore databases,
  refuses collisions before creating or dropping resources, and cleans up only
  databases owned by the current run.
- The real synthetic recovery drill passed with `3` restored rows, checksum
  `6a21174405b22a5d15d51e62e7e513fb`, and a local restore time of `387 ms`.
  A cleanup query returned no remaining `hexagone_poc_*` databases.
- The local restore measurement is experimental evidence only; it is not a
  production RTO or RPO.
- The Node.js base image is pinned to
  `node:22.23.2-alpine3.23@sha256:46825fbbd4e996a78b7a2cdc08d75e38a5a505bdab95dcda55605359bf124bc6`.
- The pinned image built successfully and ran as user `node` with a read-only
  filesystem, all capabilities dropped, and `no-new-privileges`; both health
  endpoints passed.
- Trivy `0.74.0` reported zero HIGH/CRITICAL findings without
  `ignore-unfixed`; the scan uses exit code `1` to block serious findings.
- The container security workflow is now included in the aggregate
  `pr-validation-gate`.
- Malformed port values are rejected through strict numeric conversion.
- `pnpm run validate` passed after the remediation changes.

## Recommendation and open decisions

Reuse this slice as a reversible training harness. Docker-dependent checks now pass locally under WSL 2; continue to run them in CI as repeatable evidence. Do not promote this POC directly to production.
Celestin's architecture review should decide the registry/runtime,
immutable base-image digest and provenance policy, secrets manager, centralized
telemetry, backup encryption/storage/retention, restore-test ownership, and
business-approved RTO/RPO before production design begins.

The separate Windows `pnpm.cmd` runner fix was not included.
