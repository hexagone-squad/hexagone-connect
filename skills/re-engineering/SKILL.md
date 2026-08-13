# Re-engineering skill

## Purpose
Refactor or modernize the codebase while preserving behavior, contracts, ownership boundaries, and evidence requirements.

## Workflow
1. Identify the behavior to preserve and the constraints that must remain. If existing behavior is identified as a bug rather than an intentional contract, flag it explicitly in Risks and Assumptions and do not silently change it - surface it for human review before proceeding.
2. Map dependencies, boundaries, and contracts before changing them.
3. Make changes in the smallest independently testable unit possible — one logical concern or one module at a time — so each step can be reverted without affecting others.
4. Preserve tenant isolation, contracts, and security boundaries.
5. Add or update tests that assert identical inputs produce identical outputs and that all existing public contracts (return types, error codes, side effects) are preserved. Do not delete existing passing tests.
6. Update documentation and evidence.

## Output
- Initial state and target state
- Risks and assumptions
- Refactor plan
- Validation results
Validation results must include: test run output showing all previously passing tests still pass, a summary of any new tests added, and confirmation that all public contracts are unchanged.

## Rules
- Do not trade correctness for cleanup speed.
- Do not ignore existing contracts or ownership boundaries.
