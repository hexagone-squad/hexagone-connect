---
name: verify
description: Run deterministic repository validation in fail-fast order.
---

Run `pnpm run workflow:verify`.

If any stage fails, report the first failing stage and exit status.
If it succeeds, report that deterministic validation passed.
