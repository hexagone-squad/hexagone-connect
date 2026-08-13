import { WorkRequest } from "../domain/work-request.js";
import { Outbox } from "./ports/outbox.js";
import { WorkRequestRepository } from "./ports/work-request-repository.js";

export interface CreateWorkRequestCommand {
  tenantId: string;
  customerId: string;
  serviceCategory: string;
  requestId: string;
  eventId: string;
  now: string;
}

export class CreateWorkRequest {
  constructor(private readonly repository: WorkRequestRepository, private readonly outbox: Outbox) {}

  async execute(command: CreateWorkRequestCommand): Promise<WorkRequest> {
    const request = WorkRequest.create({ id: command.requestId, tenantId: command.tenantId, customerId: command.customerId, serviceCategory: command.serviceCategory }, command.now);
    await this.repository.save(request);
    await this.outbox.append({
      eventId: command.eventId,
      eventType: "WorkRequestCreated",
      version: 1,
      tenantId: command.tenantId,
      aggregateId: request.props.id,
      payload: { requestId: request.props.id, tenantId: request.props.tenantId, customerId: request.props.customerId, serviceCategory: request.props.serviceCategory }
    });
    return request;
  }
}
