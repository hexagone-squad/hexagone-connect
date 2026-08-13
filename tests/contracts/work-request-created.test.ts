import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schema = JSON.parse(
  readFileSync('contracts/events/work-request-created.v1.schema.json', 'utf8'),
) as {
  title: string;
  required: string[];
  properties: {
    eventType: { const: string };
    version: { const: number };
    requestId: { type: string; format: string };
  };
};

describe('WorkRequestCreated.v1', () => {
  it('defines a versioned, tenant-scoped event contract', () => {
    expect(schema.title).toBe('WorkRequestCreated.v1');
    expect(schema.required).toEqual(
      expect.arrayContaining(['eventType', 'version', 'requestId', 'tenantId', 'customerId']),
    );
    expect(schema.properties.eventType.const).toBe('WorkRequestCreated');
    expect(schema.properties.version.const).toBe(1);
    expect(schema.properties.requestId).toMatchObject({ type: 'string', format: 'uuid' });
  });
});
