# Abdou POC evidence and recommendation

> **POC / TRAINING / NOT FOR PRODUCTION**
> Environment: WSL 2, Node.js 22.23.2, pnpm 10.0.0
> Observed: 2026-08-19T15:38:50-05:00

## Before and after evidence

| Check                                                                                  | Status                 | Exact observation                                                                                                        |
| -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm vitest run tests/governance/platform-poc.test.ts` before implementation          | failed as expected     | 3 tests failed: missing non-root/readiness Docker controls, missing recovery drill, and missing SBOM/image scan workflow |
| `pnpm vitest run tests/governance/platform-poc.test.ts` after implementation           | passed                 | 1 file and 3 tests passed                                                                                                |
| Direct `/health/live` and `/health/ready` smoke using the container entrypoint scripts | passed                 | `PASS direct readiness smoke`                                                                                            |
| `bash -n database/poc/synthetic-recovery.sh`                                           | passed                 | Exit status 0                                                                                                            |
| `pnpm run validate`                                                                    | passed                 | 55 unit/governance tests passed; final output `PASS validate complete deterministic gate`                                |
| `pnpm run check:dependency-vulnerabilities`                                            | passed                 | `No known vulnerabilities found`                                                                                         |
| Docker image build and hardened non-root/read-only container smoke | passed | Image built successfully; hardened container started with read-only filesystem, all capabilities dropped, and no-new-privileges; `/health/ready` and `/health/live` both passed |
| Synthetic PostgreSQL dump and restore measurement | passed | 3 synthetic rows restored; checksum `6a21174405b22a5d15d51e62e7e513fb` matched; local restore time `287 ms` |
| Cloud runtime, production secrets, telemetry, and production recovery                  | not applicable locally | No provider or production architecture is approved                                                                       |

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

## Recommendation and open decisions

Reuse this slice as a reversible training harness. Docker-dependent checks now pass locally under WSL 2; continue to run them in CI as repeatable evidence. Do not promote this POC directly to production.
production. Celestin's architecture review should decide the registry/runtime,
immutable base-image digest and provenance policy, secrets manager, centralized
telemetry, backup encryption/storage/retention, restore-test ownership, and
business-approved RTO/RPO before production design begins.

The separate Windows `pnpm.cmd` runner fix was not included.
