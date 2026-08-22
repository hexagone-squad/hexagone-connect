# Implementation notes — work-request HTTP adapter POC

> **Status:** `TRAINING` / `POC` / `NOT FOR PRODUCTION`  
> **Author:** Joy Lukoji Mbiya (Product Engineer)  
> **Reviewer (planned):** Chapelle Kabangu  
> **Operational guide:** [README.md](./README.md)

This document explains **what changed**, **why each block was written this way**, and **what was deliberately left out**. It complements the readiness charter in [engineering-readiness-poc-guide.md §5.3](../../docs/foundation/engineering-readiness-poc-guide.md).

## 1. Goal

Expose the existing `CreateWorkRequest` use case over HTTP as `POST /v1/work-requests`, with:

- contract statuses `202`, `400`, `401`, `403`
- tenant authorization before any use-case call (`HC-SEC-002`)
- no duplicated domain logic and no second API contract (`HC-ARCH-002`)

The POC answers: *can we add a runnable HTTP boundary without rebuilding work-management?*

## 2. Change inventory

| Area | Files | Purpose |
| --- | --- | --- |
| HTTP adapter | `src/work-request-gateway.ts`, `src/main.ts`, `src/index.ts` | Map HTTP → auth → use case |
| Tests | `test/create-work-request.http.test.ts` | Adapter + tenant isolation evidence |
| Contract | `contracts/openapi/work-management.v1.yaml` | Additive request/response schemas |
| Contract test | `tests/contracts/work-management-openapi.test.ts` | Lock contract shape in CI |
| Package exports | `services/identity-tenant`, `services/work-management` | Public workspace APIs for composition |
| Root script | `package.json` → `poc:http-adapter` | One documented local start command |
| Env template | `.env.example` → `PORT` | Optional listen port |
| Docs | `README.md`, root `README.md`, architecture/codebase maps | Register runtime and boundaries |

No domain rules were added under `services/work-management/src/domain/`.

## 3. Architecture choices

### 3.1 Why `apps/api-gateway`?

Repository checks block cross-service **source** imports (`HC-ARCH-001`). The gateway is the named BFF/edge workspace and is where **composition** belongs: it may depend on `@hexagone/work-management` and `@hexagone/identity-tenant` as packages, call `assertTenantAccess`, then invoke `CreateWorkRequest`.

Putting HTTP inside `work-management` would either duplicate auth or blur the service boundary. Chapelle’s operator POC can call this gateway instead of re-implementing create.

### 3.2 Why Node `http` instead of Express/Fastify?

- Zero new production dependencies (`HC-DEP-001`)
- Single operation (`POST /v1/work-requests`) — a framework would add surface without proving the domain boundary
- Keeps the POC easy to delete or replace after an ADR on the real gateway stack

### 3.3 Why workspace package exports?

`identity-tenant/src/index.ts` previously exported only `serviceName`; `assertTenantAccess` existed but was not consumable as a package. Exporting `buildWorkManagement` and `assertTenantAccess` lets the gateway compose without `from '../../services/...'` paths that fail architecture checks.

## 4. Code walkthrough and rationale

### 4.1 `work-request-gateway.ts` — constants (lines 6–11)

```typescript
const UUID_PATTERN = /.../;
const MAX_BODY_BYTES = 8_192;
const WORK_REQUESTS_PATH = "/v1/work-requests";
const LOOPBACK_HOST = "127.0.0.1";
const CREATE_FIELDS = new Set(["tenantId", "customerId", "serviceCategory"]);
```

| Constant | Rationale |
| --- | --- |
| `UUID_PATTERN` | Matches OpenAPI `format: uuid` and `WorkRequestCreated.v1` event schema before the use case runs |
| `MAX_BODY_BYTES` | Simple DoS guard for a POC server; oversized bodies return `400` |
| `WORK_REQUESTS_PATH` | Single documented operation — no generic router |
| `LOOPBACK_HOST` | Synthetic bearer tokens are documented in README; binding to `127.0.0.1` prevents LAN exposure |
| `CREATE_FIELDS` | Enforces OpenAPI `additionalProperties: false` at the adapter |

### 4.2 Synthetic fixtures (lines 13–22)

UUIDs and bearer strings are **public test fixtures**, not secrets. They are exported for tests only. Two tenants prove cross-tenant denial (`403`).

### 4.3 `GatewayRequest` / `GatewayResponse` (lines 24–41)

The handler accepts a **narrow struct** (method, url, authorization, body) instead of full Node `IncomingMessage`. That keeps unit tests free of sockets and documents exactly what the adapter needs from HTTP.

`workManagement` is exposed on the gateway object so tests can assert outbox/repository side effects without HTTP.

### 4.4 `resolvePrincipal` (lines 60–65)

```typescript
const parts = (authorization ?? "").split(" ");
if (parts.length !== 2) return undefined;
```

**Choice:** reject malformed `Authorization` headers (missing token, extra segments, wrong scheme) with `401`, instead of silently taking the first token segment. This avoids accidentally accepting `Bearer token-a token-b`.

### 4.5 `parseCreateBody` (lines 69–88)

**Transport validation only:**

1. Valid JSON object
2. No unknown fields (contract alignment)
3. UUID-shaped ids and string `serviceCategory`

**Domain validation** (e.g. non-empty `serviceCategory`) stays in `WorkRequest.create` and surfaces as `400` via the use-case catch block. That preserves domain → application → adapter direction.

### 4.6 `readIncomingBody` (lines 90–102)

Reads the stream with a byte cap, **then keeps draining** after the limit so keep-alive connections are not poisoned by leftover bytes. A test sends an oversized body followed by a valid request on the same connection.

### 4.7 `handle` pipeline (lines 107–152)

Order is fixed and security-relevant:

```text
route check → authenticate → size/shape parse → tenant authorize → use case
```

| Step | Status | Notes |
| --- | --- | --- |
| Wrong path/method | `404` | Not in OpenAPI; internal routing fallback |
| No/invalid bearer | `401` | Before body parsing |
| Bad JSON/shape/size | `400` | Before tenant or domain |
| Tenant mismatch | `403` | `assertTenantAccess`; nothing written to outbox |
| Domain invalid | `400` | Maps `Invalid work request` only |
| Success | `202` | Returns ids + `correlationId`; emits `WorkRequestCreated` |

`correlationId` is reused as `eventId` so HTTP tracing and outbox events align for operator workflows later.

`requestId` is generated at the adapter (new UUID per create) — the client does not supply it, matching the current use-case command shape.

### 4.8 `listen` (lines 154–169)

Wraps `handle` for real HTTP. The outer `.catch` returns generic `500` JSON without stack traces (`HC-SEC-001`). Binds to `LOOPBACK_HOST` only.

### 4.9 `main.ts`

Minimal entrypoint: parse `PORT`, call `listen`, print POC banner. Port fallback `3000` matches `.env.example`.

### 4.10 `index.ts`

Exports `appName` (workspace convention) and `createWorkRequestGateway` only. Synthetic constants stay in the implementation/test module, not the public package surface.

## 5. OpenAPI changes (additive v1)

Extended `contracts/openapi/work-management.v1.yaml` with:

- `CreateWorkRequest` request body
- `WorkRequestAccepted` for `202`
- `ErrorBody` for `4xx`
- `X-Correlation-Id` response header

**Why additive:** same `info.version` and path — no second contract file. Repository contract checks require versioned schemas under `contracts/` (`HC-ARCH-002`).

## 6. Tests

`test/create-work-request.http.test.ts` covers:

| Case | Evidence for |
| --- | --- |
| `202` + outbox event | Happy path + event emission |
| Cross-tenant `getById` undefined | Tenant isolation |
| Whitespace `serviceCategory` | Domain rule via HTTP |
| Malformed JSON, unknown field, oversized body | Adapter validation |
| Missing/unknown/multi-segment bearer | Authentication strictness |
| Cross-tenant body with valid bearer B | `403` + no outbox write |
| Wrong path/method | Routing fallback |
| Socket test + oversized then reuse | Stream draining / keep-alive |

Tests import synthetic UUIDs from the gateway module to avoid drift between fixtures and assertions.

## 7. Security posture (POC scope)

| Control | Implementation |
| --- | --- |
| Tenant gate before data | `assertTenantAccess` before `execute` |
| No secret leakage | Stable error codes; no stacks in responses |
| Local-only listen | `127.0.0.1` |
| Body bound | 8 KiB max |
| Unknown JSON fields rejected | Matches `additionalProperties: false` |

**Explicitly not in scope:** JWT validation, rate limiting, TLS, audit persistence, production IdP.

## 8. Intentionally not changed

- PostgreSQL / outbox persistence (Abdou’s POC)
- `qualifyWorkRequest` over HTTP (Chapelle’s POC)
- `WorkRequestQualified` event schema registration
- UI apps (`admin-portal`, etc.)
- New HTTP framework dependency

## 9. How to validate

```bash
pnpm exec vitest run apps/api-gateway services/work-management services/identity-tenant tests/contracts
pnpm lint
pnpm typecheck
pnpm run check:architecture
pnpm run check:contracts
pnpm run check:docs
```

Full repo gate before merge:

```bash
pnpm run validate
```

## 10. Recommendation

**Reuse** this gateway composition for the next HTTP slice (qualify/list). **Replace** synthetic auth and in-memory adapters when Platform and architecture review approve IdP and persistence. This POC does **not** approve Express/Fastify, deployment topology, or production security controls.
