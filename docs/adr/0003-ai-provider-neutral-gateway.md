# ADR-0003: Provider-Neutral AI Gateway

## Status

Accepted

## Context

The repository already contains an AI inspection assistant and evaluation tests. Direct model-provider SDK imports from product services would make tenant checks, fallback behavior, human approval, and schema validation inconsistent.

## Decision

All product AI behavior enters through `services/ai-orchestration`. Product services must not import model-provider SDKs directly.

## Alternatives considered

1. Direct vendor SDK usage in each product service. Rejected because it duplicates safety and tenant-boundary controls.
2. Thin shared AI utility package. Rejected because the current checks need one enforceable service boundary for policy and tests.

## Consequences

- Architecture checks can block direct provider imports outside `services/ai-orchestration`.
- AI behavior must carry focused tests and evaluations.
- Future live provider integrations must extend this boundary instead of bypassing it.
