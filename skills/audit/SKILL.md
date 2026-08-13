# Audit skill

## Purpose
Audit a repository change, decision, or operating state for compliance with the repository constitution, hard constraints, and evidence requirements.

## Workflow
If the scope of the audit (change, decision, or operating state) is not clearly stated in the request, respond with: "Audit scope is undefined. Please specify the change, decision, or operating state to be audited before proceeding."

1. Read the documents explicitly provided in the audit request. If no documents are provided, list what is missing and halt.
2. Check the implementation against constitution articles and hard constraints.
3. Validate that required evidence exists: tests, evaluations, docs, and runbooks.
4. Confirm that each of the following has documented approval on record: tenant isolation controls, security review sign-off, and AI governance approval. If any approval is missing or undated, record it as a blocker.
5. Record findings in categories: pass, risk, blocker, or exception.
6. For any finding recorded as exception, verify that a written waiver exists naming the policy article waived, the approver, and an expiry date. If any of these three elements are missing, escalate the finding to blocker.

Use this severity rubric: blocker = required evidence is absent or a hard constraint is violated; risk = evidence is incomplete or a soft policy is not met; pass = all required evidence is present and constraints are satisfied; exception = explicitly waived with time-bound approval on record.

## Output
- Summary of scope audited
- Findings by severity
- Missing evidence or policy violations
- Required remediation steps
- Ready / needs changes / blocked

## Rules
- No compliance claim without evidence.
- No silent exceptions; all waivers must be explicit and time-bounded.
