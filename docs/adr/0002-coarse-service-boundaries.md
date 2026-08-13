# ADR-0002: Coarse Service Boundaries

## Status

Accepted

## Context

The repository needs named ownership boundaries before broad feature work starts. Current code includes one implemented service slice and several named service workspaces.

## Decision

Use eight coarse-grained service boundaries: identity-tenant, partner-network, catalog-discovery, work-management, commercial, engagement, ai-orchestration, and reporting-admin.

## Rules

- Each service owns its domain behavior and data model when implemented.
- Public API shapes use versioned OpenAPI contracts under `contracts/openapi/`.
- Cross-service events use versioned schemas under `contracts/events/`.
- Cross-service database access is prohibited.
- Extraction, splitting, or deployment machinery requires evidence of scaling, ownership, reliability, or runtime need.

## Alternatives considered

1. Fine-grained microservices from day one. Rejected because most seams are not proven by code yet.
2. One undifferentiated application workspace. Rejected because it would hide ownership and contract boundaries.

## Consequences

- The codebase has clear places to add domain behavior.
- Placeholder workspaces must remain clearly labeled until implemented.
- Architecture checks must continue blocking direct cross-service source imports.
