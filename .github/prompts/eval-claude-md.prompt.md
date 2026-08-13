---
name: eval-claude-md
description: Evaluate instruction and rule changes with baseline/current scoring and branch-bound receipts.
---

Run `pnpm run workflow:eval-claude-md`.

If the command exits non-zero, report BLOCKED with the reason from:

- `.eval-claude-md/runs/<latest>/phase1-report.md`
- `.eval-claude-md/runs/<latest>/judge-report.md`

If the command exits zero, summarize:

- merge base and head from `pass-receipt.txt`
- scenario scores from `results-baseline.md` and `results-current.md`
- stale receipt status from `judge-report.md`
