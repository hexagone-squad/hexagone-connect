import { describe, expect, it, vi } from 'vitest';
import {
  QualificationHttpError,
  createHttpQualificationAdapter,
} from '../src/features/qualification-queue/adapters/http-qualification-adapter.js';

describe('HTTP qualification adapter', () => {
  it('maps queue and qualification requests to the API contract', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'request-1',
              tenantId: 'tenant-1',
              serviceCategory: 'inspection',
              status: 'submitted',
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              id: 'request-1',
              tenantId: 'tenant-1',
              serviceCategory: 'inspection',
              status: 'qualified',
            },
            correlationId: 'correlation-1',
            auditEntry: {
              action: 'work-request.qualified',
              actorId: 'operator-1',
              tenantId: 'tenant-1',
              resourceType: 'work-request',
              resourceId: 'request-1',
              occurredAt: '2026-08-23T10:00:00.000Z',
            },
          }),
          { status: 200 },
        ),
      );
    const adapter = createHttpQualificationAdapter({ fetch: request });

    await expect(adapter.listPending({ tenantId: 'tenant-1' })).resolves.toHaveLength(1);
    await expect(
      adapter.qualify({
        actorId: 'operator-1',
        tenantId: 'tenant-1',
        requestId: 'request-1',
        correlationId: 'correlation-1',
        now: '2026-08-23T10:00:00.000Z',
      }),
    ).resolves.toMatchObject({ correlationId: 'correlation-1' });

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/api/v1/work-requests?status=submitted',
      expect.objectContaining({ headers: expect.objectContaining({ 'x-tenant-id': 'tenant-1' }) }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/api/v1/work-requests/request-1/qualification',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ correlationId: 'correlation-1' }),
      }),
    );
  });

  it('maps forbidden and unavailable HTTP responses to safe adapter errors', async () => {
    const forbidden = createHttpQualificationAdapter({
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    });
    await expect(forbidden.listPending({ tenantId: 'tenant-1' })).rejects.toBeInstanceOf(
      QualificationHttpError,
    );

    const unavailable = createHttpQualificationAdapter({
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    });
    await expect(unavailable.listPending({ tenantId: 'tenant-1' })).rejects.toMatchObject({
      code: 'service',
    });
  });
});
