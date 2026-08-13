---
description: API, event, and schema compatibility safeguards.
applyTo: 'contracts/**,packages/contracts/**,apps/api-gateway/**,services/**/src/**/adapters/**,services/**/src/**/transport/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Treat API and event changes as compatibility-sensitive contracts.
- Use explicit versions and register schemas before producers or consumers rely on them.
- Add producer, consumer, invalid-payload, and replay/idempotency evidence as applicable.
- Do not make a breaking change without a migration plan and ADR reference.
- Record exact contract validation commands and results for review.
