import { createWorkRequestGateway } from './work-request-gateway.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;

createWorkRequestGateway().listen(port);
process.stdout.write(
  `POC NOT FOR PRODUCTION: POST /v1/work-requests listening on http://127.0.0.1:${port}\n`,
);
