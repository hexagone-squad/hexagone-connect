export interface TraceContext {
  traceId: string;
  spanId: string;
  correlationId: string;
}

export interface AuditRecord {
  action: string;
  actorId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
}
