---
description: User-interface accessibility, localization, and interaction safeguards.
applyTo: 'apps/admin-portal/**,apps/inspection-app/**,apps/provider-portal/**,apps/public-web/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Put user-facing text in registered locale resources; do not hard-code it in components.
- Add keyboard-capable interaction coverage and an automated accessibility assertion for changed flows.
- Capture before and after screenshots for user-visible changes.
- Keep error states actionable and do not expose internal details or sensitive data.
- Record browser, viewport, and assistive-technology checks that remain manual.
