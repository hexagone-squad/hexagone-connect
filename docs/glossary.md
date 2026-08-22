# Glossary

| Term | Meaning in this repository |
| --- | --- |
| API gateway | The `apps/api-gateway` training/POC HTTP boundary that maps `POST /v1/work-requests` to work-management. |
| Canonical contract | A versioned public API or event schema under `contracts/`. |
| Consequential action | An AI-assisted action category that requires a human approval token before execution. |
| Evidence | Recorded proof of commands, tests, artifacts, review, or manual checks used to support a change. |
| Hard constraint | An `HC-*` rule in the constitution that blocks merge when violated. |
| Implementation Loop | The required evidence workflow for non-trivial changes. |
| Outbox | The current in-memory event payload collection used by work-management tests. |
| Tenant boundary | The rule that tenant-scoped behavior must authorize tenant access before data access or AI output. |
| Work request | The current work-management aggregate for customer service requests. |