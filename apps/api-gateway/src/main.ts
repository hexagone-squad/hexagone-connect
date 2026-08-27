import { createWorkRequestGateway } from './work-request-gateway.js';

const DEFAULT_PORT = 3000;

// listen() throws synchronously on out-of-range ports, so an unusable PORT value
// falls back to the documented default instead of crashing with a stack trace.
const parsePort = (value: string | undefined): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65_535) return parsed;
  if (value !== undefined) {
    process.stderr.write(
      `POC NOT FOR PRODUCTION: ignoring invalid PORT "${value}", using ${DEFAULT_PORT}\n`,
    );
  }
  return DEFAULT_PORT;
};

const requestedPort = parsePort(process.env.PORT);
const server = createWorkRequestGateway().listen(requestedPort);

server.on('error', (error: NodeJS.ErrnoException) => {
  const stage = server.listening ? 'runtime error' : `failed to bind port ${requestedPort}`;
  process.stderr.write(`POC NOT FOR PRODUCTION: ${stage}: ${error.message}\n`);
  process.exitCode = 1;
});

server.once('listening', () => {
  const address = server.address();
  // Port 0 delegates the choice to the OS, so report the port actually bound.
  const boundPort = typeof address === 'object' && address !== null ? address.port : requestedPort;
  process.stdout.write(
    `POC NOT FOR PRODUCTION: POST /v1/work-requests listening on http://127.0.0.1:${boundPort}\n`,
  );
});
