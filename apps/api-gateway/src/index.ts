import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiGatewayServer } from './transport/http/create-api-gateway-server.js';

export const appName = 'api-gateway' as const;
export { createApiGatewayServer } from './transport/http/create-api-gateway-server.js';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number.parseInt(process.env.PORT ?? '4100', 10);
  const server = await createApiGatewayServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`API gateway listening on http://127.0.0.1:${port}`);
  });
}
