import { describe, expect, it, vi } from 'vitest';
import { QualificationHttpError } from '../src/features/qualification-queue/adapters/http-qualification-adapter.js';
import { createQualificationQueue } from '../src/features/qualification-queue/model/qualification-queue.js';

const operator = { actorId: 'operator-1', tenantId: 'tenant-1' };

describe('work-qualification queue', () => {
  it("records the adapter's qualification and audit evidence", async () => {
    const adapter = {
      listPending: vi.fn().mockResolvedValue([
        {
          id: 'request-1',
          tenantId: 'tenant-1',
          serviceCategory: 'inspection',
          status: 'submitted' as const,
        },
      ]),
      qualify: vi.fn().mockResolvedValue({
        item: {
          id: 'request-1',
          tenantId: 'tenant-1',
          serviceCategory: 'inspection',
          status: 'qualified' as const,
        },
        correlationId: 'correlation-qualify-1',
        auditEntry: {
          action: 'work-request.qualified' as const,
          actorId: 'operator-1',
          tenantId: 'tenant-1',
          resourceType: 'work-request' as const,
          resourceId: 'request-1',
          occurredAt: '2026-08-23T10:00:00.000Z',
        },
      }),
    };
    const queue = createQualificationQueue({
      adapter,
      operator,
      createCorrelationId: () => 'correlation-qualify-1',
      now: () => '2026-08-23T10:00:00.000Z',
    });

    await queue.load();
    expect(queue.state).toMatchObject({
      status: 'ready',
      items: [{ id: 'request-1', status: 'submitted' }],
    });

    await queue.qualify('request-1');

    expect(queue.state).toMatchObject({
      status: 'empty',
      correlationId: 'correlation-qualify-1',
      auditEntries: [
        { action: 'work-request.qualified', actorId: 'operator-1', resourceId: 'request-1' },
      ],
    });
    expect(adapter.qualify).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        tenantId: 'tenant-1',
      }),
    );
  });

  it('represents loading and empty states', async () => {
    let resolveItems: ((items: []) => void) | undefined;
    const adapter = {
      listPending: vi.fn(
        () =>
          new Promise<[]>((resolve) => {
            resolveItems = resolve;
          }),
      ),
      qualify: vi.fn(),
    };
    const queue = createQualificationQueue({
      adapter,
      operator,
      createCorrelationId: () => 'correlation-1',
      now: () => '2026-08-23T10:00:00.000Z',
    });

    const loading = queue.load();
    expect(queue.state.status).toBe('loading');
    resolveItems?.([]);
    await loading;

    expect(queue.state.status).toBe('empty');
  });

  it('shows validation, authorization, and safe service errors', async () => {
    const qualify = vi.fn();
    const adapter = { listPending: vi.fn().mockResolvedValue([]), qualify };
    const queue = createQualificationQueue({
      adapter,
      operator,
      createCorrelationId: () => 'correlation-1',
      now: () => '2026-08-23T10:00:00.000Z',
    });

    await queue.qualify('');
    expect(queue.state).toMatchObject({ status: 'error', error: 'validation' });
    expect(qualify).not.toHaveBeenCalled();

    qualify.mockRejectedValueOnce(new QualificationHttpError('forbidden'));
    await queue.qualify('request-other-tenant');
    expect(queue.state).toMatchObject({ status: 'error', error: 'authorization' });

    qualify.mockRejectedValueOnce(new Error('database connection details'));
    await queue.qualify('request-1');
    expect(queue.state).toMatchObject({ status: 'error', error: 'service' });
    expect(JSON.stringify(queue.state)).not.toContain('database connection details');
  });
});
