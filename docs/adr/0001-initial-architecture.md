# ADR-0001: Initial Repository Architecture

## Status

Accepted

## Context

The repository needs enough structure to support early marketplace and service-workflow development without creating expensive coupling. The current codebase already contains service workspaces, contracts, validation scripts, tests, and AI evaluation scaffolding.

## Decision

Use a governed pnpm monorepo with domain-aligned service workspaces, canonical contracts under `contracts/`, repository-level validation scripts, and a walking-skeleton approach. Do not add production infrastructure until there is runnable service or app behavior that needs it.

## Alternatives considered

1. Polyrepo from day one. Rejected because shared contracts and governance checks are simpler to enforce in one repository during setup.
2. Big-bang implementation of every named service. Rejected because most service boundaries are not proven by executable behavior yet.
3. Production deployment architecture now. Rejected because no runnable production service exists yet.

## Consequences

- Repository-wide validation can enforce setup and boundary rules early.
- Named workspaces may exist before they have real runtime behavior, so docs must label maturity clearly.
- Production deployment, release, and observability decisions remain open until executable runtime requirements exist.
