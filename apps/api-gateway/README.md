# API Gateway — work-request HTTP adapter

> **Status:** `TRAINING` / `POC` / `NOT FOR PRODUCTION`  
> Assigned readiness POC: Joy Lukoji Mbiya (Product Engineer). Peer reviewer: Chapelle.

This workspace is the first runnable HTTP boundary for the existing work-request creation use case. It does not own domain rules. It maps `POST /v1/work-requests` onto `CreateWorkRequest` and authorizes tenant access before the use case runs.

For a change log and code-level rationale, see [IMPLEMENTATION.md](./IMPLEMENTATION.md).

## Problem

Can the repository expose the existing `createWorkRequest` use case behind the canonical OpenAPI operation, with tenant isolation and contract statuses `202` / `400` / `401` / `403` / `415`, without rebuilding work-management or inventing a second API?

## Scope

Included:

- Node `http` adapter in this workspace (no new HTTP framework)
- Synthetic bearer directory (not an identity provider)
- In-memory work-management adapters reused from `buildWorkManagement()`
- Request/response schemas on `contracts/openapi/work-management.v1.yaml`, versioned as `1.1.0` under the compatibility decision in [ADR-0005](../../docs/adr/0005-work-management-v1-request-body-contract.md)

Excluded:

- PostgreSQL persistence, Docker hardening, UI, qualification HTTP, payments, live IdP, cloud deploy

## Assumptions and required business input

- Assumption: a local bearer token is enough to prove the HTTP and tenant boundary. Owner who can confirm later: Platform Engineer (identity provider decision).
- Assumption: `tenantId` belongs in the JSON body and must still pass `assertTenantAccess`. Impact if wrong: move tenant selection to a header after an ADR.
- Synthetic data only. Tokens below are fixtures, not secrets.

## Setup and execution

Install at the repository root, then start the adapter:

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm run poc:http-adapter
```

Expected stdout: `POC NOT FOR PRODUCTION: POST /v1/work-requests listening on http://127.0.0.1:3000`.

Optional listen port: `PORT` in `.env.example` (default `3000`).

Synthetic request that must return `202`:

```http
POST /v1/work-requests HTTP/1.1
Host: 127.0.0.1:3000
Authorization: Bearer synthetic-tenant-a
Content-Type: application/json

{
  "tenantId": "11111111-1111-4111-8111-111111111111",
  "customerId": "22222222-2222-4222-8222-222222222222",
  "serviceCategory": "inspection"
}
```

Expected response body shape: `requestId`, `tenantId`, `status: submitted`, `correlationId`, plus header `x-correlation-id`.

Failure demonstrations:

- omit `Authorization` → `401` `{ "error": "unauthenticated" }`
- use `bearer` / `BEARER` (scheme is case-insensitive) with a registered token → same as `Bearer`
- use `Bearer synthetic-tenant-b` with tenant A's `tenantId` → `403` `{ "error": "unauthorized_tenant" }`
- set `serviceCategory` to whitespace → `400` `{ "error": "invalid_request" }`
- send an unknown field, malformed JSON, a `serviceCategory` over 200 characters, or a body over 8 KiB → `400` `{ "error": "invalid_request" }`
- send the body without `Content-Type: application/json` → `415` `{ "error": "unsupported_media_type" }`

Any other path or method returns `404`. Only the documented `POST` operation is served, so `404` is a routing fallback and is intentionally not part of the contract.

Focused tests:

```bash
pnpm test:unit
```

## Architecture notes

```text
HTTP POST /v1/work-requests
  -> resolve synthetic principal
  -> require Content-Type: application/json
  -> assertTenantAccess (identity-tenant)
  -> CreateWorkRequest (work-management application)
  -> in-memory repository + outbox
```

Imports use workspace packages `@hexagone/work-management` and `@hexagone/identity-tenant`. Cross-service source paths are not used (`HC-ARCH-001`).

The adapter validates transport and shape only: media type, UUID format, known fields, a bounded `serviceCategory` length, and a bounded body size. Business rules such as a non-empty `serviceCategory` stay in the domain and surface as `400` through the use case. Every constraint the adapter enforces is expressed in the OpenAPI document, so a request that satisfies the schema is never rejected for shape.

## Security / privacy / tenant

- Tenant membership is checked before the use case (`HC-SEC-002`).
- Cross-tenant create is rejected with `403` and writes nothing to the outbox.
- No production secrets, no personal data (`HC-SEC-001`).
- Error bodies carry a stable code only; no stack traces or internal messages.
- Request bodies are capped at 8 KiB and unknown fields are rejected.
- The synthetic directory is a `Map`, so only registered tokens authenticate; names inherited from the object prototype chain (`__proto__`, `constructor`) return `401`.
- Only `application/json` is accepted, so a body is never parsed under an unclaimed media type.

## Cleanup

Stop the process with Ctrl+C. State is in-memory and discarded when the process exits.

## Recommendation

**Reuse** this composition pattern for later operator HTTP (qualify) and for Chapelle's admin-portal adapter. **Defer** choosing Express/Fastify, a real IdP, and Postgres until an ADR and business input exist. This POC does not approve a production gateway.

## Open decisions

- Identity provider and token format — Platform Engineer.
- Whether tenant is selected from body, header, or single-tenant token — Tech Lead + business.
- Persistence adapter replacing in-memory repository — after Abdou's restore POC / architecture review.
