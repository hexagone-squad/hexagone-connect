# Decision Readiness Register (POC)

Status: TRAINING / POC / NOT FOR PRODUCTION
Owner: Technology, Product & Architecture Lead

Purpose: make unresolved architecture and business decisions visible, with explicit evidence and missing input, before production commitments.

## Scope

- Captures open decisions only.
- Links each entry to current repository evidence.
- Records business input still required.

## Decision register

| Decision ID | Current evidence | Missing business input | Options | Decision owner | Required POC | Status | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DR-001 | [ADR-0002 coarse service boundaries](../adr/0002-coarse-service-boundaries.md), [Architecture boundary check](../../scripts/check-governance.ts) | Approved MVP throughput targets and expected concurrency by tenant | 1) Keep modular monorepo service boundaries for MVP, 2) consolidate runtime deployment until measured scale requires split | Technology, Product & Architecture Lead | Tenant-boundary scenario matrix and adapter-level authorization evidence | Open | 2026-09-05 |
| DR-002 | [Constitution HC-SEC-002](../methodology/CONSTITUTION.md), [Repository codebase map](../codebase-map.md) | Canonical business tenant model for customers, providers, operators, and multi-affiliation users | 1) Single active-tenant context per request, 2) scoped multi-affiliation session model with explicit active tenant selection | Technology, Product & Architecture Lead with Compliance input | Tenant-boundary scenario matrix with cross-tenant rejection evidence | Open | 2026-09-05 |
| DR-003 | [ADR-0003 AI provider-neutral gateway](../adr/0003-ai-provider-neutral-gateway.md), [AI orchestration service scope](../../services/ai-orchestration/README.md) | Approved policy on AI data retention window and redaction obligations per tenant | 1) Minimal retention for audit only, 2) configurable retention tiers by tenant policy | Technology, Product & Architecture Lead with Legal/Compliance input | Read-only tool boundary abuse evaluation pack and redaction tests | Open | 2026-09-12 |
| DR-004 | [PR quality gates workflow](../../.github/workflows/pull-request.yml), [governance guide](../governance.md) | SLO/SLA and operational ownership model for post-MVP release readiness | 1) Team-owned shared operational rotation, 2) service-owned operational rotation after runtime split | Technology, Product & Architecture Lead with Operations input | Operational readiness checklist POC with synthetic incident rehearsal | Open | 2026-09-12 |

## Review cadence

- Review open decisions weekly in IT architecture review.
- Promote an entry to "Decided" only when business input and evidence are complete.
- Move decided items into an ADR or accepted governance artifact.
