# Tenant-Boundary Scenario Matrix (POC)

Status: TRAINING / POC / NOT FOR PRODUCTION
Owner: Technology, Product & Architecture Lead

Purpose: define concrete tenant scenarios to validate isolation, authorization, and audit behavior before runtime architecture or policy decisions are finalized.

## Matrix

| Scenario ID | Actor type             | Tenant relationship                     | Action                                                   | Expected authorization outcome                                                                                                           | Expected audit evidence                                                                                 |
| ----------- | ---------------------- | --------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| TM-001      | Customer user          | Single customer organization tenant     | Create a work request in own tenant                      | Allow                                                                                                                                    | Correlation ID, tenant ID, actor ID, action, timestamp                                                  |
| TM-002      | Provider operator      | Single provider organization tenant     | Read assigned inspection artifacts for own tenant        | Allow                                                                                                                                    | Correlation ID, tenant ID, actor ID, read scope, timestamp                                              |
| TM-003      | Internal operator      | Platform internal operations tenant     | Review synthetic queue entries scoped to selected tenant | Allow only when active tenant context is explicit and the operator has an entitled role or scope for the selected tenant; deny otherwise | Correlation ID, operator ID, selected tenant ID, entitled role or scope, access reason, decision reason |
| TM-004      | Multi-affiliation user | Customer tenant A and provider tenant B | Perform action while tenant A is active                  | Allow for tenant A, reject tenant B resources in same session context                                                                    | Correlation ID, active tenant ID, attempted tenant ID, decision reason                                  |
| TM-005      | Customer user          | Tenant A only                           | Attempt to access tenant B work request by ID            | Deny (cross-tenant)                                                                                                                      | Correlation ID, actor ID, source tenant A, target tenant B, deny reason                                 |
| TM-006      | Provider operator      | Tenant B only                           | Attempt to mutate tenant A qualification state           | Deny (cross-tenant)                                                                                                                      | Correlation ID, actor ID, source tenant B, target tenant A, deny reason                                 |
| TM-007      | Unauthenticated client | No tenant context                       | Invoke tenant-scoped endpoint                            | Deny (authentication required)                                                                                                           | Correlation ID, missing identity marker, deny reason                                                    |
| TM-008      | Authenticated user     | Ambiguous tenant context                | Invoke endpoint without active tenant selection          | Deny (active tenant required)                                                                                                            | Correlation ID, actor ID, ambiguity marker, deny reason                                                 |

## Validation notes

- Use synthetic identities and synthetic resource IDs only.
- Record both successful and denied outcomes.
- Treat any missing tenant ID or missing correlation ID as a failed scenario.
- Treat explicit tenant selection as context, not authorization; require an entitled operator role or scope for that selected tenant.
