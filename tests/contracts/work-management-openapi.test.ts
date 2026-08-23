import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Operation {
  operationId?: string;
  security?: Array<Record<string, unknown>>;
  responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  info?: { version?: string };
  paths?: Record<string, Record<string, Operation>>;
}

describe('work-management OpenAPI v1', () => {
  const document = parse(
    readFileSync('contracts/openapi/work-management.v1.yaml', 'utf8'),
  ) as OpenApiDocument;

  it('registers tenant-secured queue and qualification operations', () => {
    const list = document.paths?.['/v1/work-requests']?.get;
    const qualify = document.paths?.['/v1/work-requests/{requestId}/qualification']?.post;

    expect(document.info?.version).toBe('1.0.0');
    expect(list).toMatchObject({
      operationId: 'listWorkRequests',
      security: [{ bearerAuth: [] }],
      responses: expect.objectContaining({
        '200': expect.anything(),
        '401': expect.anything(),
        '403': expect.anything(),
      }),
    });
    expect(qualify).toMatchObject({
      operationId: 'qualifyWorkRequest',
      security: [{ bearerAuth: [] }],
      responses: expect.objectContaining({
        '200': expect.anything(),
        '400': expect.anything(),
        '401': expect.anything(),
        '403': expect.anything(),
        '404': expect.anything(),
      }),
    });
  });
});
