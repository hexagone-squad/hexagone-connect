# API gateway

> **Status:** POC / TRAINING / NOT FOR PRODUCTION

The API gateway is the HTTP trust boundary between browser applications and
domain services. For the work-qualification POC it will:

- authenticate a synthetic bearer principal;
- authorize `X-Tenant-Id` before work-management access;
- expose the versioned queue-read and qualification operations from
  `contracts/openapi/work-management.v1.yaml`;
- validate request input and return safe status-based errors; and
- delegate domain behavior to the work-management package.

The gateway must not contain qualification business rules. Synthetic principals
are local fixtures, not production identity or credentials. A production
identity provider, durable persistence, rate limiting, TLS termination, and
deployment topology remain intentionally unresolved.

## Run locally

From the repository root:

```bash
pnpm --filter @hexagone/api-gateway start
```

The gateway listens on `http://127.0.0.1:4100` by default. Set `PORT` to use a
different local port. `GET /health` is an internal readiness probe; business
operations follow the versioned OpenAPI contract.

The local synthetic bearer is intentionally constrained to synthetic tenants.
It must be replaced by verified identity-provider tokens before deployment.

## Source organization

- `src/index.ts` is the runtime composition entrypoint and public module surface.
- `src/transport/http/` owns Node HTTP request validation and response mapping.
- `src/authentication/` owns authentication adapters; the current adapter is synthetic.
