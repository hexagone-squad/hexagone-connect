export interface Outbox {
  append(event: { eventId: string; eventType: string; version: number; tenantId: string; aggregateId: string; payload: unknown }): Promise<void>;
}
