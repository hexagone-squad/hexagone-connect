# Implementation notes — work-request HTTP adapter POC

> **Status:** `TRAINING` / `POC` / `NOT FOR PRODUCTION`  
> **Author:** Joy Lukoji Mbiya (Product Engineer)  
> **Reviewer (planned):** Chapelle Kabangu  
> **Operational guide:** [README.md](./README.md)

This document records the decisions behind the adapter: why it lives where it does, why the request pipeline is ordered the way it is, and what was deliberately left out. It complements the readiness charter in [engineering-readiness-poc-guide.md section 5.3](../../docs/foundation/engineering-readiness-poc-guide.md). The code itself is the reference for behavior; this file does not restate it.

## 1. Goal

Expose the existing `CreateWorkRequest` use case over HTTP as `POST /v1/work-requests` with contract statuses `202`, `400`, `401`, `403`, and `415`, tenant authorization before any use-case call (`HC-SEC-002`), and no duplicated domain logic or second API contract (`HC-ARCH-002`).

The POC answers one question: can we add a runnable HTTP boundary without rebuilding work-management?

## 2. Change inventory

| Area              | Files                                                        | Purpose                                              |
| ----------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| HTTP adapter      | `src/work-request-gateway.ts`, `src/main.ts`, `src/index.ts` | Map HTTP to authentication, authorization, use case  |
| Tests             | `test/create-work-request.http.test.ts`                      | Adapter and tenant isolation evidence                |
| Contract          | `contracts/openapi/work-management.v1.yaml`                  | Request/response schemas, version `1.1.0`            |
| Contract decision | `docs/adr/0005-work-management-v1-request-body-contract.md`  | Compatibility evidence for the required request body |
| Contract test     | `tests/contracts/work-management-openapi.test.ts`            | Lock contract shape in CI                            |
| Package exports   | `services/identity-tenant`, `services/work-management`       | Public workspace APIs for composition                |
| Root script       | `package.json` → `poc:http-adapter`                          | One documented local start command                   |
| Env template      | `.env.example` → `PORT`                                      | Optional listen port                                 |
| Docs              | `README.md`, root `README.md`, architecture/codebase maps    | Register runtime and boundaries                      |

No domain rules were added under `services/work-management/src/domain/`.

## 3. Placement and dependencies

**Why `apps/api-gateway`.** Repository checks block cross-service source imports (`HC-ARCH-001`), and the gateway is the named edge workspace where composition belongs: it depends on `@hexagone/work-management` and `@hexagone/identity-tenant` as packages, calls `assertTenantAccess`, then invokes `CreateWorkRequest`. Putting HTTP inside `work-management` would either duplicate authentication or blur the service boundary. Chapelle's operator POC can call this boundary instead of re-implementing create.

**Why Node `http` rather than Express or Fastify.** No new production dependency (`HC-DEP-001`), a single operation does not justify a router, and the POC stays easy to delete or replace once an ADR settles the real gateway stack.

**Why new package exports.** `identity-tenant/src/index.ts` exported only `serviceName`, so `assertTenantAccess` existed but was not consumable. Exporting it alongside `buildWorkManagement` lets the gateway compose without `../../services/...` paths that fail architecture checks.

## 4. Design decisions

**Pipeline order is security-relevant.** The handler runs: route match, authenticate, media type, size and shape parse, tenant authorization, use case. Authentication precedes body parsing so an anonymous caller cannot reach the parser, and tenant authorization precedes the use case so a cross-tenant request writes nothing.

| Outcome             | Status | Note                                                        |
| ------------------- | ------ | ----------------------------------------------------------- |
| Wrong path/method   | `404`  | Not in OpenAPI; internal routing fallback                   |
| No/invalid bearer   | `401`  | Before body parsing                                         |
| Non-JSON media type | `415`  | After authentication, before parsing an unclaimed payload   |
| Bad JSON/shape/size | `400`  | Before tenant or domain                                     |
| Tenant mismatch     | `403`  | `assertTenantAccess`; nothing written to outbox             |
| Domain invalid      | `400`  | Maps `Invalid work request` only                            |
| Success             | `202`  | Returns ids and `correlationId`; emits `WorkRequestCreated` |

**Token directory is a `Map`, not a `Record`.** Object lookup resolves inherited names, so `Bearer __proto__` or `Bearer constructor` returned a truthy value and reached tenant authorization as `403` instead of failing authentication as `401`. A `Map` answers only for registered keys.

**The handler takes a narrow struct, not `IncomingMessage`.** Method, url, authorization, contentType, and body are everything the adapter needs from HTTP, which keeps unit tests free of sockets. `contentType` is in the struct because dropping the header at the socket boundary previously let a `text/plain` body be parsed as JSON.

**`Authorization` must split into exactly two segments.** Anything else is `401`, so `Bearer token-a token-b` is never silently reduced to its first token. Splitting on runs of whitespace after trimming keeps the two-segment rule while accepting the spacing RFC 9110 permits, and the scheme is compared case-insensitively (`bearer` / `Bearer` / `BEARER`). The token is still matched exactly, so leniency applies to framing only, never to credentials.

**A failure after the status line is flushed closes the connection instead of answering twice.** The socket handler's rejection path used an unconditional `writeHead(500)`, which throws `ERR_HTTP_HEADERS_SENT` when the response was already started — inside a rejection handler, that becomes an unhandled rejection and stops the process. The fallback now answers `500` only while the response is untouched, and otherwise destroys it.

**`main.ts` reports the port it actually bound.** The banner is written on the `listening` event and reads the port from `server.address()`, so `PORT=0` (OS-chosen port) is reported truthfully. An out-of-range or non-numeric `PORT` would make `listen` throw synchronously, so the value is validated and the fallback to `3000` is announced on stderr rather than applied silently. The `error` handler is registered with `on`, not `once`, because a post-bind error with no listener would terminate the process.

**The adapter validates transport and shape only.** JSON object, no unknown fields, UUID-shaped ids, and a bounded `serviceCategory` length. Business rules such as a non-empty category stay in `WorkRequest.create` and surface as `400` through the use-case catch block, preserving the domain, application, adapter direction.

**Oversized bodies are drained, not abandoned.** The reader stops buffering past the cap but keeps consuming the stream, so leftover bytes cannot poison a keep-alive connection. A test sends an oversized body then a valid request on the same connection.

**`correlationId` is reused as `eventId`** so HTTP tracing and outbox events align for later operator workflows. `requestId` is generated at the adapter because the client does not supply it, matching the current command shape.

**Synthetic fixtures are public test data, not secrets.** Two tenants exist so cross-tenant denial can be proven. `index.ts` exports only `appName` and `createWorkRequestGateway`; fixtures stay out of the package surface.

## 5. Contract (v1.1.0)

The document gained the `CreateWorkRequest` request body (required, `application/json` only), `WorkRequestAccepted` for `202`, `ErrorBody` for `4xx` including a documented `415`, the `X-Correlation-Id` response header, and a `serviceCategory` bounded by `minLength`, `maxLength`, and a non-whitespace `pattern`.

**Compatibility.** The operation previously declared no request body, so requiring one is compatibility-sensitive rather than purely additive. The decision, its evidence, and the absence of a migration burden are recorded in [ADR-0005](../../docs/adr/0005-work-management-v1-request-body-contract.md); `info.version` moves to `1.1.0` inside the existing `v1` contract (`HC-ARCH-002`).

**Parity.** Every adapter rejection has a schema counterpart, so the server never rejects a request the published schema accepts. The contract test asserts this rather than trusting review.

## 6. Tests

`test/create-work-request.http.test.ts` covers the happy path with its outbox event and cross-tenant read isolation; `400` for whitespace category, malformed JSON, unknown field, over-long category, and oversized body; `401` for missing, unknown, multi-segment, and prototype-chain tokens; `202` for lower-case, upper-case, and extra-spaced bearer schemes; `415` for missing and `text/plain` media types, with `application/json; charset=utf-8` still accepted; `403` with no outbox write; and the routing fallback.

Four cases run over a real socket rather than through `handle`, because the behavior they cover only exists at the socket boundary: a dropped `Content-Type` header, an unusable connection after an oversized body, a bind failure surfaced as `EADDRINUSE`, and a client that disconnects mid-body — after which the server must still answer the next request. `tests/contracts/work-management-openapi.test.ts` locks the contract shape, version, and `serviceCategory` constraints.

Tests import synthetic UUIDs from the gateway module so fixtures and assertions cannot drift apart.

## 7. Security posture (POC scope)

| Control                      | Implementation                                             |
| ---------------------------- | ---------------------------------------------------------- |
| Tenant gate before data      | `assertTenantAccess` before `execute`                      |
| Registered tokens only       | `Map` lookup; inherited property names cannot authenticate |
| Declared media type only     | `application/json` required before the body is parsed      |
| Unknown JSON fields rejected | Matches `additionalProperties: false`                      |
| Body bound                   | 8 KiB max, plus a bounded `serviceCategory`                |
| No secret leakage            | Stable error codes; no stack traces in responses           |
| Local-only listen            | `127.0.0.1`                                                |

**Explicitly not in scope:** JWT validation, rate limiting, TLS, audit persistence, production identity provider.

## 8. Intentionally not changed

PostgreSQL and outbox persistence (Abdou's POC), `qualifyWorkRequest` over HTTP (Chapelle's POC), `WorkRequestQualified` schema registration, UI apps, and any new HTTP framework dependency.

## 9. Review remediation

| Finding                                                    | Rule          | Resolution                                                                       |
| ---------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| Inherited property names authenticated and returned `403`  | `HC-SEC-002`  | `Map` lookup; failure reproduced before the fix, regression test added           |
| Socket adapter dropped `Content-Type`                      | `HC-ARCH-002` | Header forwarded; unsupported media types return a documented `415`              |
| `minLength: 1` accepted whitespace the adapter rejects     | `HC-ARCH-002` | Non-whitespace `pattern` and `maxLength`, mirrored by adapter and contract test  |
| Required request body lacked compatibility evidence        | `HC-ARCH-002` | ADR-0005 and `info.version` `1.1.0`                                              |
| Glossary entry replaced instead of extended                | `HC-DOC-001`  | Both entries present                                                             |
| Source files did not match repository Prettier conventions | —             | Reformatted to single quotes and trailing commas like the rest of the repository |
| Bearer scheme was compared case-sensitively                | —             | Scheme lower-cased, RFC 9110 spacing accepted, regression test added             |
| Banner claimed the gateway was up before the bind          | —             | Banner moved to the `listening` event; bind errors go to stderr with exit code 1 |

The response body was also questioned against an acceptance criterion of `{ id, status: "pending_review", correlationId }`. That criterion appeared only in the pull-request description and is not in the POC charter, which requires the contract's `202`, `400`, `401`, and `403` outcomes without prescribing field names. The adapter, schema, and tests consistently return `requestId`, `tenantId`, `status`, and `correlationId`, and `submitted` is the real `WorkRequestStatus` produced by `WorkRequest.create`. The description was corrected rather than inventing a public status the domain does not have.

## 10. Recommendation

**Reuse** this composition for the next HTTP slice (qualify or list). **Replace** synthetic authentication and in-memory adapters when Platform and architecture review approve an identity provider and persistence. This POC does **not** approve Express or Fastify, deployment topology, or production security controls.
