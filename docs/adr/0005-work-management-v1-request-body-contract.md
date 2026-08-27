# ADR-0005: Work Management v1 Request-Body Contract

## Status

Proposed

## Context

`contracts/openapi/work-management.v1.yaml` declared `POST /v1/work-requests`
as a walking-skeleton operation: an `operationId`, a bearer security
requirement, and four response codes carrying descriptions only. It defined no
request body, no response schema, and no component schemas.

The first runnable HTTP adapter (`apps/api-gateway`) needs a precise wire
contract: reviewers cannot verify tenant isolation or input validation against
an operation whose payload is undefined, and `HC-ARCH-002` requires a versioned
contract with registered schemas and compatibility evidence.

Declaring the request body as `required: true` is the compatibility-sensitive
part of that work. An operation without a `requestBody` does not forbid a
request that omits a body, so a client that previously sent none would now
receive `400`. `contracts.instructions.md` forbids a breaking change without a
migration plan and an ADR reference, which is why this decision is recorded
before the contract is relied upon.

## Decision

Define `CreateWorkRequest`, `WorkRequestAccepted`, and `ErrorBody` as
registered component schemas, require the JSON request body, and keep the change
inside the existing `v1` major contract as `info.version: 1.1.0`.

Compatibility evidence supporting a minor version rather than a new major
version:

- No server implementation existed for the operation before this change, so no
  request could previously succeed and no response shape was promised.
- No producer or consumer is registered against the operation; `apps/api-gateway`
  is its first and only caller, and it is introduced in the same change.
- The repository is in the pre-requirements phase declared by
  `docs/foundation/engineering-readiness-poc-guide.md`, with no deployed
  environment and no external client to migrate.
- The response schema documents the existing domain status `submitted` rather
  than introducing a new public vocabulary, so the contract stays aligned with
  `services/work-management` without a translation layer.

Migration plan: none is required for existing callers because none exist. Any
future contributor who needs an incompatible payload change must introduce a new
major contract file rather than amend this operation, because the operation now
has a registered schema and a real consumer.

This ADR requires reviewer approval before the contract change is merged.

## Alternatives considered

1. Leave the request body undefined and validate only in the adapter. Rejected
   because the public contract would stay silent on the payload, so contract
   tests could not detect adapter drift and `HC-ARCH-002` evidence would be
   impossible to produce.
2. Add the request body as optional to preserve strict compatibility. Rejected
   because the operation cannot create a work request without `tenantId`,
   `customerId`, and `serviceCategory`; an optional body would document a
   request shape that always fails.
3. Publish a new `work-management.v2.yaml` contract. Rejected because a major
   version exists to protect real consumers, and creating one for an operation
   with no implementation and no clients adds a permanent migration surface for
   no compatibility benefit.

## Consequences

- The adapter, the OpenAPI document, and `tests/contracts/work-management-openapi.test.ts`
  now describe one wire contract, so schema drift fails a deterministic check.
- Schema constraints must track adapter validation. The contract encodes the
  non-whitespace and maximum-length rules for `serviceCategory` and the `415`
  response for a non-JSON media type; divergence is a contract defect.
- The operation is now consumed, so a later incompatible change requires a new
  major contract file and a migration plan.
- `info.version` becomes the compatibility signal for this document; additive
  changes bump the minor version and breaking changes require a new major file.
