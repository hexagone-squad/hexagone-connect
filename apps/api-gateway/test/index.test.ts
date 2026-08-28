import { describe, expect, it } from 'vitest';
import { appName, createApiGatewayServer } from '../src/index.js';

describe('API gateway entrypoint', () => {
  it('exports an unstarted server for explicit runtime composition', async () => {
    const server = await createApiGatewayServer();

    expect(appName).toBe('api-gateway');
    expect(server.listening).toBe(false);
    expect(server.address()).toBeNull();
  });
});
