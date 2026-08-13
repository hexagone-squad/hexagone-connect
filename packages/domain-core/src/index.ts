export type TenantId = string & { readonly __brand: "TenantId" };
export type CorrelationId = string & { readonly __brand: "CorrelationId" };

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly version: number;
  readonly occurredAt: string;
  readonly tenantId: TenantId;
  readonly correlationId: CorrelationId;
  readonly payload: TPayload;
}
