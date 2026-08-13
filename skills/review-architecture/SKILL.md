# Review architecture skill

## Purpose
Assess whether a change or design remains architecturally sound, boundary-safe, and aligned with the repository constitution.

## Workflow
1. Check dependency direction and ownership boundaries.
2. Confirm the design still matches the service catalog and domain boundaries.
3. Review contracts, events, and API evolution for compatibility and traceability.
4. Validate tenant isolation, security, and operational readiness.
5. Identify architectural drift, hidden coupling, or unowned responsibilities.
6. Make a recommendation: approved, blocked, or redesign required.

## Output
- Architecture summary
- Boundary analysis
- Risk areas and violations
- Recommended fixes or required changes

## Rules
- No design approval without checking dependency direction and ownership.
- No contract breakage without versioning and migration plan.
- If the design violates the constitution or hard constraints, block it.
