# Work Management Service

Owns customer requests, qualification, estimates, assignments, inspections, jobs, lifecycle transitions, outbox, and recovery workflows. Primary owner: Product Engineer B.

## Supported workflow

- `createWorkRequest`: validates request input, persists tenant-scoped submission data, and emits a `WorkRequestCreated` event.
- `listSubmittedWorkRequests`: returns submitted requests within one tenant boundary.
- `qualifyWorkRequest`: transitions a submitted request to `qualified`, persists the new status, and emits a `WorkRequestQualified` event.

## Architectural rules

- Domain logic remains inside the service boundary and not in framework or adapter code.
- Tenant-scoped persistence enforces isolation between tenants.
- Event emission is versioned and captured in the outbox for traceability.

## POC package boundary

The workspace package exports `buildWorkManagement` so synthetic POCs can exercise the existing use cases without importing service source paths or duplicating domain rules. The composition root uses in-memory adapters and is not a production transport or persistence API.
