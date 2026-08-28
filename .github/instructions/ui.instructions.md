---
description: User-interface accessibility, localization, and interaction safeguards.
applyTo: 'apps/admin-portal/**,apps/inspection-app/**,apps/provider-portal/**,apps/public-web/**'
---

Read `docs/methodology/CONSTITUTION.md` first.

- Put user-facing text in registered locale resources; do not hard-code it in components.
- Use Fluent UI React v9 for interactive production controls (`HC-UI-001`).
- Keep browser/service communication behind local adapters over versioned contracts (`HC-ARCH-003`).
- Import another feature only through its public `index.ts` (`HC-ARCH-004`).
- Add keyboard-capable interaction coverage and an automated accessibility assertion for changed flows.
- Capture before and after screenshots for user-visible changes.
- Keep error states actionable and do not expose internal details or sensitive data.
- Record browser, viewport, and assistive-technology checks that remain manual.
