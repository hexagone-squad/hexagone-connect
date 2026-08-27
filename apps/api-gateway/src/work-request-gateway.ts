import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { assertTenantAccess, type RequestPrincipal } from '@hexagone/identity-tenant';
import { buildWorkManagement } from '@hexagone/work-management';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 8_192;
const MAX_SERVICE_CATEGORY_LENGTH = 200;
const JSON_MEDIA_TYPE = 'application/json';
const WORK_REQUESTS_PATH = '/v1/work-requests';
// The synthetic bearer directory below is public, so the POC never leaves the host.
const LOOPBACK_HOST = '127.0.0.1';
const CREATE_FIELDS = new Set(['tenantId', 'customerId', 'serviceCategory']);

export const SYNTHETIC_TENANT_A = '11111111-1111-4111-8111-111111111111';
export const SYNTHETIC_TENANT_B = '33333333-3333-4333-8333-333333333333';
export const SYNTHETIC_CUSTOMER_A = '22222222-2222-4222-8222-222222222222';
export const SYNTHETIC_BEARER_TENANT_A = 'synthetic-tenant-a';
export const SYNTHETIC_BEARER_TENANT_B = 'synthetic-tenant-b';

// A Map keeps lookups to registered tokens only; a plain object would resolve
// inherited names such as __proto__ or constructor to truthy values.
const syntheticDirectory = new Map<string, RequestPrincipal>([
  [
    SYNTHETIC_BEARER_TENANT_A,
    { userId: 'user-a', tenantIds: [SYNTHETIC_TENANT_A], roles: ['operator'] },
  ],
  [
    SYNTHETIC_BEARER_TENANT_B,
    { userId: 'user-b', tenantIds: [SYNTHETIC_TENANT_B], roles: ['operator'] },
  ],
]);

export interface GatewayRequest {
  method: string | undefined;
  url: string | undefined;
  authorization: string | undefined;
  contentType: string | undefined;
  body: string;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface WorkRequestGateway {
  readonly workManagement: ReturnType<typeof buildWorkManagement>;
  handle(request: GatewayRequest): Promise<GatewayResponse>;
  listen(port?: number): Server;
}

interface CreateWorkRequestBody {
  tenantId: string;
  customerId: string;
  serviceCategory: string;
}

const responseHeaders = (correlationId: string): Record<string, string> => ({
  'content-type': 'application/json; charset=utf-8',
  'x-correlation-id': correlationId,
});

const errorResponse = (status: number, error: string, correlationId: string): GatewayResponse => ({
  status,
  headers: responseHeaders(correlationId),
  body: JSON.stringify({ error }),
});

const resolvePrincipal = (authorization: string | undefined): RequestPrincipal | undefined => {
  // RFC 9110 allows one or more spaces between scheme and credentials, and the
  // scheme itself is case-insensitive. The token is still matched exactly.
  const parts = (authorization ?? '').trim().split(/\s+/);
  if (parts.length !== 2) return undefined;
  const [scheme, token] = parts;
  return scheme.toLowerCase() === 'bearer' && token ? syntheticDirectory.get(token) : undefined;
};

const isJsonMediaType = (contentType: string | undefined): boolean =>
  (contentType ?? '').split(';')[0].trim().toLowerCase() === JSON_MEDIA_TYPE;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

const parseCreateBody = (raw: string): CreateWorkRequestBody | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;

  const body = parsed as Record<string, unknown>;
  if (Object.keys(body).some((field) => !CREATE_FIELDS.has(field))) return undefined;
  if (
    !isUuid(body.tenantId) ||
    !isUuid(body.customerId) ||
    typeof body.serviceCategory !== 'string'
  ) {
    return undefined;
  }
  if (body.serviceCategory.length > MAX_SERVICE_CATEGORY_LENGTH) return undefined;
  return {
    tenantId: body.tenantId,
    customerId: body.customerId,
    serviceCategory: body.serviceCategory,
  };
};

const readIncomingBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  let buffered = 0;
  for await (const chunk of request as AsyncIterable<Buffer>) {
    // Buffer one chunk past the limit so handle() can reject, then keep draining
    // the stream instead of leaving unread bytes on a reusable connection.
    if (buffered <= MAX_BODY_BYTES) {
      chunks.push(chunk);
      buffered += chunk.length;
    }
  }
  return Buffer.concat(chunks).toString('utf8');
};

// Failures raised after the status line was flushed (aborted connection, write
// error) cannot be answered with a second writeHead, which would throw
// ERR_HTTP_HEADERS_SENT inside the rejection handler and stop the process.
const failClosed = (response: ServerResponse): void => {
  if (response.writableEnded) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'internal' }));
};

export const createWorkRequestGateway = (): WorkRequestGateway => {
  const workManagement = buildWorkManagement();

  const handle = async (request: GatewayRequest): Promise<GatewayResponse> => {
    const correlationId = randomUUID();
    const path = (request.url ?? '/').split('?')[0];
    if (path !== WORK_REQUESTS_PATH || request.method?.toUpperCase() !== 'POST') {
      return errorResponse(404, 'not_found', correlationId);
    }

    const principal = resolvePrincipal(request.authorization);
    if (!principal) return errorResponse(401, 'unauthenticated', correlationId);

    if (!isJsonMediaType(request.contentType)) {
      return errorResponse(415, 'unsupported_media_type', correlationId);
    }

    const body =
      Buffer.byteLength(request.body, 'utf8') > MAX_BODY_BYTES
        ? undefined
        : parseCreateBody(request.body);
    if (!body) return errorResponse(400, 'invalid_request', correlationId);

    try {
      assertTenantAccess(principal, body.tenantId);
    } catch {
      return errorResponse(403, 'unauthorized_tenant', correlationId);
    }

    try {
      const created = await workManagement.createWorkRequest.execute({
        tenantId: body.tenantId,
        customerId: body.customerId,
        serviceCategory: body.serviceCategory,
        requestId: randomUUID(),
        eventId: correlationId,
        now: new Date().toISOString(),
      });
      return {
        status: 202,
        headers: responseHeaders(correlationId),
        body: JSON.stringify({
          requestId: created.props.id,
          tenantId: created.props.tenantId,
          status: created.props.status,
          correlationId,
        }),
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid work request') {
        return errorResponse(400, 'invalid_request', correlationId);
      }
      return errorResponse(500, 'internal', correlationId);
    }
  };

  const listen = (port = 0): Server =>
    createServer((request, response) => {
      void (async () => {
        const result = await handle({
          method: request.method,
          url: request.url,
          authorization: request.headers.authorization,
          contentType: request.headers['content-type'],
          body: await readIncomingBody(request),
        });
        response.writeHead(result.status, result.headers);
        response.end(result.body);
      })().catch(() => {
        failClosed(response);
      });
    }).listen(port, LOOPBACK_HOST);

  return { workManagement, handle, listen };
};
