import { assertTenantAccess, type RequestPrincipal } from '@hexagone/identity-tenant';
import { buildWorkManagement } from '@hexagone/work-management';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { authenticateSyntheticBearer } from '../../authentication/synthetic-bearer-authenticator.js';

const maxBodyBytes = 16_384;

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBodyBytes) throw new Error('Request body too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function tenantContext(
  request: IncomingMessage,
  response: ServerResponse,
): { principal: RequestPrincipal; tenantId: string } | undefined {
  const principal = authenticateSyntheticBearer(request.headers.authorization);
  if (!principal) {
    writeJson(response, 401, { error: 'unauthenticated' });
    return undefined;
  }
  const tenantHeader = request.headers['x-tenant-id'];
  const tenantId = Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;
  if (!tenantId) {
    writeJson(response, 400, { error: 'tenant_required' });
    return undefined;
  }
  try {
    assertTenantAccess(principal, tenantId);
  } catch {
    writeJson(response, 403, { error: 'tenant_access_denied' });
    return undefined;
  }
  return { principal, tenantId };
}

function qualificationInput(value: unknown): { correlationId: string } | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'correlationId')) return undefined;
  if (typeof record.correlationId !== 'string') return undefined;
  const correlationId = record.correlationId.trim();
  if (!correlationId || correlationId.length > 200) return undefined;
  return { correlationId };
}

export async function createApiGatewayServer() {
  const workManagement = buildWorkManagement();
  await workManagement.createWorkRequest.execute({
    tenantId: 'tenant-1',
    customerId: 'synthetic-customer-1',
    serviceCategory: 'inspection',
    requestId: 'request-1',
    eventId: 'event-create-request-1',
    now: '2026-08-23T09:00:00.000Z',
  });
  await workManagement.createWorkRequest.execute({
    tenantId: 'tenant-2',
    customerId: 'synthetic-customer-2',
    serviceCategory: 'maintenance',
    requestId: 'request-other-tenant',
    eventId: 'event-create-request-other-tenant',
    now: '2026-08-23T09:00:00.000Z',
  });

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://gateway.local');
    if (request.method === 'GET' && url.pathname === '/health') {
      writeJson(response, 200, { status: 'ok' });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/v1/work-requests') {
      const context = tenantContext(request, response);
      if (!context) return;
      const status = url.searchParams.get('status');
      if (status !== null && status !== 'submitted') {
        writeJson(response, 400, { error: 'invalid_status' });
        return;
      }
      const requests = await workManagement.listSubmittedWorkRequests.execute({
        tenantId: context.tenantId,
      });
      writeJson(
        response,
        200,
        requests.map((item) => ({
          id: item.props.id,
          tenantId: item.props.tenantId,
          serviceCategory: item.props.serviceCategory,
          status: item.props.status,
        })),
      );
      return;
    }

    const qualification = url.pathname.match(/^\/v1\/work-requests\/([^/]+)\/qualification$/);
    if (request.method === 'POST' && qualification) {
      const context = tenantContext(request, response);
      if (!context) return;
      let input: { correlationId: string } | undefined;
      try {
        input = qualificationInput(await readJson(request));
      } catch {
        input = undefined;
      }
      if (!input) {
        writeJson(response, 400, { error: 'invalid_request' });
        return;
      }
      let requestId: string;
      try {
        requestId = decodeURIComponent(qualification[1]);
      } catch {
        writeJson(response, 400, { error: 'invalid_request_path' });
        return;
      }
      const now = new Date().toISOString();
      try {
        const item = await workManagement.qualifyWorkRequest.execute({
          tenantId: context.tenantId,
          requestId,
          eventId: input.correlationId,
          now,
        });
        writeJson(response, 200, {
          item: {
            id: item.props.id,
            tenantId: item.props.tenantId,
            serviceCategory: item.props.serviceCategory,
            status: item.props.status,
          },
          correlationId: input.correlationId,
          auditEntry: {
            action: 'work-request.qualified',
            actorId: context.principal.userId,
            tenantId: context.tenantId,
            resourceType: 'work-request',
            resourceId: item.props.id,
            occurredAt: now,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'Work request not found') {
          writeJson(response, 404, { error: 'work_request_not_found' });
        } else if (message === 'Invalid work request status') {
          writeJson(response, 409, { error: 'invalid_work_request_status' });
        } else {
          writeJson(response, 503, { error: 'service_unavailable' });
        }
      }
      return;
    }

    writeJson(response, 404, { error: 'route_not_found' });
  });
}
