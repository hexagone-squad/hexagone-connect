---
name: review-pr
description: Perform independent review of the complete local PR surface.
---

Review all local changes relative to `origin/main` as a PR reviewer.

Follow `skills/pr-review/SKILL.md`. Inspect the complete diff and explicitly
evaluate every judgment category below. For each category, report `findings`,
`no findings`, or `not assessable`; when not assessable, name the missing
evidence.

- correctness
- architecture fit
- missing scenarios
- naming and maintainability
- usability
- privacy
- operational risks
- evidence credibility

Treat deterministic CI output as evidence, not as a substitute for this review.
Ground findings in affected file/line references and applicable `HC-*` or `SC-*`
rules. Do not report an unexecuted or stale check as passed.

Output:

- blocking findings (if any)
- non-blocking improvements
- judgment rubric table covering all eight categories
- required follow-up tests or evidence
- merge recommendation: ready or not ready
