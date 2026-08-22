# Work Management Service

Owns customer requests, qualification, estimates, assignments, inspections, jobs, lifecycle transitions, outbox, and recovery workflows. Primary owner: Product Engineer B.

## Supported workflow

- `createWorkRequest`: validates request input, persists tenant-scoped submission data, and emits a `WorkRequestCreated` event. A training/POC HTTP adapter in `apps/api-gateway` maps `POST /v1/work-requests` onto this use case; the domain stays in this service.
- `qualifyWorkRequest`: transitions a submitted request to `qualified`, persists the new status, and emits a `WorkRequestQualified` event.

## Architectural rules

- Domain logic remains inside the service boundary and not in framework or adapter code.
- Tenant-scoped persistence enforces isolation between tenants.
- Event emission is versioned and captured in the outbox for traceability.
