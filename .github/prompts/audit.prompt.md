---
name: audit
description: Audit the complete local branch diff for correctness, security, tests, docs, privacy, accessibility, and performance risks.
---

Review the full local branch diff against `origin/main`.

Report findings first, ordered by severity, with exact file references.
For each finding, include:
- risk category
- evidence from the diff
- impact if unaddressed
- concrete remediation

If no findings exist, state that explicitly and list residual risks or missing evidence.
