import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiGatewayServer } from '../../apps/api-gateway/src/index.js';

let server: Awaited<ReturnType<typeof createApiGatewayServer>>;
let baseUrl: string;

const authorizedHeaders = {
  authorization: 'Bearer synthetic-operator-1',
  'x-tenant-id': 'tenant-1',
};

beforeAll(async () => {
  server = await createApiGatewayServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('work qualification HTTP boundary', () => {
  it('requires authentication and tenant authorization before queue access', async () => {
    const unauthenticated = await fetch(`${baseUrl}/v1/work-requests?status=submitted`, {
      headers: { 'x-tenant-id': 'tenant-1' },
    });
    expect(unauthenticated.status).toBe(401);

    const forbidden = await fetch(`${baseUrl}/v1/work-requests?status=submitted`, {
      headers: { authorization: 'Bearer synthetic-operator-1', 'x-tenant-id': 'tenant-2' },
    });
    expect(forbidden.status).toBe(403);
  });

  it('lists and qualifies tenant-scoped work through HTTP', async () => {
    const queueResponse = await fetch(`${baseUrl}/v1/work-requests?status=submitted`, {
      headers: authorizedHeaders,
    });
    expect(queueResponse.status).toBe(200);
    await expect(queueResponse.json()).resolves.toEqual([
      expect.objectContaining({ id: 'request-1', tenantId: 'tenant-1', status: 'submitted' }),
    ]);

    const qualificationResponse = await fetch(
      `${baseUrl}/v1/work-requests/request-1/qualification`,
      {
        method: 'POST',
        headers: { ...authorizedHeaders, 'content-type': 'application/json' },
        body: JSON.stringify({ correlationId: 'correlation-http-1' }),
      },
    );
    expect(qualificationResponse.status).toBe(200);
    await expect(qualificationResponse.json()).resolves.toMatchObject({
      item: { id: 'request-1', tenantId: 'tenant-1', status: 'qualified' },
      correlationId: 'correlation-http-1',
      auditEntry: { actorId: 'operator-1', resourceId: 'request-1' },
    });
  });

  it('returns safe validation and not-found responses', async () => {
    const invalid = await fetch(`${baseUrl}/v1/work-requests/request-1/qualification`, {
      method: 'POST',
      headers: { ...authorizedHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ correlationId: '' }),
    });
    expect(invalid.status).toBe(400);

    const missing = await fetch(`${baseUrl}/v1/work-requests/missing/qualification`, {
      method: 'POST',
      headers: { ...authorizedHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ correlationId: 'correlation-http-2' }),
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'work_request_not_found' });
  });
});
