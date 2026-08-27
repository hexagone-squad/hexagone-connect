import { createWorkRequestGateway } from './work-request-gateway.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
const listenUrl = `http://127.0.0.1:${port}`;

const server = createWorkRequestGateway().listen(port);

server.once('error', (error: NodeJS.ErrnoException) => {
  process.stderr.write(`POC NOT FOR PRODUCTION: failed to bind ${listenUrl}: ${error.message}\n`);
  process.exitCode = 1;
});

server.once('listening', () => {
  process.stdout.write(
    `POC NOT FOR PRODUCTION: POST /v1/work-requests listening on ${listenUrl}\n`,
  );
});
