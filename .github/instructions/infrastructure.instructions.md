---
description: Infrastructure, migration, deployment, and operational safeguards.
applyTo: 'database/**,infrastructure/**,docker-compose.yml,**/Dockerfile,.github/workflows/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Keep environment configuration explicit and keep secrets out of source control.
- Make migrations and deployments reversible; document rollback, monitoring, and recovery impact.
- Validate changed deployment configuration and container artifacts before review.
- Do not loosen CI or merge protection without an approved constitutional amendment.
- Record checks that require cloud access as manual or not run, never as passed.
