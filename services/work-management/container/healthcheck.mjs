import { get } from 'node:http';
import process from 'node:process';

const request = get({ host: '127.0.0.1', port: Number(process.env.PORT ?? 3000), path: process.argv[2] ?? '/health/ready', timeout: 1_500 }, (response) => {
  response.resume();
  process.exit(response.statusCode === 200 ? 0 : 1);
});
request.on('timeout', () => request.destroy());
request.on('error', () => process.exit(1));
