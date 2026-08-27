# Abdou container hardening and synthetic recovery POC

> **POC / TRAINING / NOT FOR PRODUCTION**

## Problem and baseline gap

`main` has a placeholder work-management Dockerfile, a local PostgreSQL Compose
service, and source/dependency security checks. It does not yet prove a non-root
service image, an executable readiness check, image/SBOM inspection, or a
repeatable synthetic database restore.

## Scope and success criteria

This POC will:

- build the existing work-management container deterministically from the locked
  workspace inputs and run it as a non-root user;
- expose live and ready endpoints and verify them with a container health check;
- produce an SPDX SBOM and a vulnerability report for the locally built image;
- back up and restore synthetic, tenant-tagged PostgreSQL records; and
- verify the restored row count and checksum while recording elapsed local time.

It will not select a cloud, registry, secrets manager, telemetry platform,
production backup product, RTO, RPO, or availability commitment. The separate
Windows `pnpm.cmd` runner fix is explicitly excluded.

## Assumptions and applicable constraints

- Docker with Compose is available to the reviewer and can pull public POC tools.
- Synthetic UUIDs and labels are not customer or production data.
- `HC-SEC-001`, `HC-DEP-001`, and `HC-DOC-001` apply. `HC-SEC-002` is preserved
  by using isolated synthetic tenant identifiers and no live tenant data.
- Celestin owns architecture confirmation and all production decisions.

## Options considered

1. Use Docker-native build, health, SBOM, and scan tooling in the existing PR
   workflow. This is portable and reviewable but depends on public action/tool
   availability.
2. Adopt a registry or cloud security/recovery service. Deferred because it
   creates an unapproved vendor and production architecture commitment.

## Evidence and recommendation

Exact commands and observed results will be recorded after implementation. Local
timings are evidence for reproducibility only, not production recovery targets.
The provisional recommendation is to reuse this narrow drill for learning, then
investigate production secrets, telemetry, runtime, registry, and recovery only
after business recovery objectives and an architecture decision exist.
