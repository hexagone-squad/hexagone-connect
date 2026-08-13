---
description: Backend, domain, and shared-package safeguards.
applyTo: 'services/**,packages/domain-core/**,packages/observability/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Preserve domain → application → adapter dependency direction.
- Authorize tenant scope before repository or external access.
- Validate external input at boundaries and use safe, documented error contracts.
- Add focused unit or integration tests for behavior and failure paths.
- Register versioned telemetry for consequential operations and avoid sensitive values in logs.
- Update the owned service documentation when runtime behavior or operations change.
