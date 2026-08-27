import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const document = parse(readFileSync('contracts/openapi/work-management.v1.yaml', 'utf8')) as {
  info?: { version?: string };
  paths?: {
    '/v1/work-requests'?: {
      post?: {
        requestBody?: { required?: boolean; content?: Record<string, unknown> };
        responses?: Record<string, unknown>;
      };
    };
  };
  components?: {
    schemas?: {
      CreateWorkRequest?: { properties?: { serviceCategory?: Record<string, unknown> } };
      WorkRequestAccepted?: { required?: string[] };
    };
  };
};

describe('Work Management OpenAPI v1', () => {
  it('keeps createWorkRequest additive with a versioned request body and contract statuses', () => {
    const operation = document.paths?.['/v1/work-requests']?.post;
    expect(document.info?.version).toBe('1.1.0');
    expect(operation?.requestBody?.required).toBe(true);
    expect(Object.keys(operation?.requestBody?.content ?? {})).toEqual(['application/json']);
    expect(operation?.responses).toMatchObject({
      '202': expect.any(Object),
      '400': expect.any(Object),
      '401': expect.any(Object),
      '403': expect.any(Object),
      '415': expect.any(Object),
    });
  });

  it('constrains serviceCategory exactly as the adapter validates it', () => {
    const serviceCategory =
      document.components?.schemas?.CreateWorkRequest?.properties?.serviceCategory;

    expect(serviceCategory).toMatchObject({ minLength: 1, maxLength: 200, pattern: '.*\\S.*' });
    expect(new RegExp(String(serviceCategory?.pattern)).test('   ')).toBe(false);
    expect(new RegExp(String(serviceCategory?.pattern)).test('inspection')).toBe(true);
  });

  it('documents the accepted response fields the adapter returns', () => {
    expect(document.components?.schemas?.WorkRequestAccepted?.required).toEqual([
      'requestId',
      'tenantId',
      'status',
      'correlationId',
    ]);
  });
});
