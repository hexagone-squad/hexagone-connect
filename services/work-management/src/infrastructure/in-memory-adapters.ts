import { Outbox } from "../application/ports/outbox.js";
import { WorkRequestRepository } from "../application/ports/work-request-repository.js";
import { WorkRequest } from "../domain/work-request.js";

export class InMemoryWorkRequestRepository implements WorkRequestRepository {
  private readonly items = new Map<string, WorkRequest>();
  async save(request: WorkRequest): Promise<void> { this.items.set(`${request.props.tenantId}:${request.props.id}`, request); }
  async getById(tenantId: string, id: string): Promise<WorkRequest | undefined> { return this.items.get(`${tenantId}:${id}`); }
}

export class InMemoryOutbox implements Outbox {
  readonly events: Array<Record<string, unknown>> = [];
  async append(event: Record<string, unknown>): Promise<void> { this.events.push(event); }
}
