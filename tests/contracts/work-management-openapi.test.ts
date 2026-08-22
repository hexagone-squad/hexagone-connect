import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const document = parse(readFileSync('contracts/openapi/work-management.v1.yaml', 'utf8')) as {
  paths?: {
    '/v1/work-requests'?: {
      post?: {
        requestBody?: { required?: boolean };
        responses?: Record<string, unknown>;
      };
    };
  };
};

describe('Work Management OpenAPI v1', () => {
  it('keeps createWorkRequest additive with a versioned request body and contract statuses', () => {
    const operation = document.paths?.['/v1/work-requests']?.post;
    expect(operation?.requestBody?.required).toBe(true);
    expect(operation?.responses).toMatchObject({
      '202': expect.any(Object),
      '400': expect.any(Object),
      '401': expect.any(Object),
      '403': expect.any(Object),
    });
  });
});
