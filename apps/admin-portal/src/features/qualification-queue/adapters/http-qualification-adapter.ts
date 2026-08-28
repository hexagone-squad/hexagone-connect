import type {
  QualificationAdapter,
  QualificationResult,
  QueueItem,
} from '../model/qualification-queue.js';

export type QualificationScenario = 'authorization' | 'empty' | 'normal' | 'service';

export class QualificationHttpError extends Error {
  constructor(readonly code: 'forbidden' | 'not-found' | 'service') {
    super(code);
    this.name = code === 'forbidden' ? 'QualificationForbiddenError' : 'QualificationHttpError';
  }
}

export interface HttpQualificationAdapterOptions {
  fetch?: typeof globalThis.fetch;
  scenario?: QualificationScenario;
}

export function createHttpQualificationAdapter(
  options: HttpQualificationAdapterOptions = {},
): QualificationAdapter {
  const request = options.fetch ?? globalThis.fetch;
  const scenario = options.scenario ?? 'normal';
  const tenantId = scenario === 'empty' ? 'tenant-empty' : 'tenant-1';
  const apiPrefix = scenario === 'service' ? '/unavailable-api' : '/api';
  const headers = () => ({
    authorization: 'Bearer synthetic-operator-1',
    'x-tenant-id': tenantId,
  });

  async function decode<T>(response: Response): Promise<T> {
    if (response.status === 403) throw new QualificationHttpError('forbidden');
    if (response.status === 404) throw new QualificationHttpError('not-found');
    if (!response.ok) throw new QualificationHttpError('service');
    return response.json() as Promise<T>;
  }

  return {
    async listPending(_input): Promise<QueueItem[]> {
      return decode<QueueItem[]>(
        await request(`${apiPrefix}/v1/work-requests?status=submitted`, {
          headers: headers(),
        }),
      );
    },
    async qualify(input): Promise<QualificationResult> {
      const requestTenantId = scenario === 'authorization' ? 'tenant-2' : input.tenantId;
      return decode<QualificationResult>(
        await request(
          `${apiPrefix}/v1/work-requests/${encodeURIComponent(input.requestId)}/qualification`,
          {
            method: 'POST',
            headers: {
              ...headers(),
              'content-type': 'application/json',
              'x-tenant-id': requestTenantId,
            },
            body: JSON.stringify({ correlationId: input.correlationId }),
          },
        ),
      );
    },
  };
}
