import { createServer } from 'node:http';
import process from 'node:process';

const port = Number(process.env.PORT ?? '3000');
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('invalid PORT');
const server = createServer((request, response) => {
  const status = request.url === '/health/live' ? 'live' : request.url === '/health/ready' ? 'ready' : undefined;
  response.writeHead(status ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(status ? { status, service: 'work-management-poc' } : { error: 'not_found' }));
});
server.listen(port, '0.0.0.0');
const shutDown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
