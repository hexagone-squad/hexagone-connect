import { WorkRequest } from "../domain/work-request.js";
import { Outbox } from "./ports/outbox.js";
import { WorkRequestRepository } from "./ports/work-request-repository.js";

export class WorkRequestNotFoundError extends Error {
  constructor() {
    super("Work request not found");
    this.name = "WorkRequestNotFoundError";
  }
}

export interface QualifyWorkRequestCommand {
  tenantId: string;
  requestId: string;
  eventId: string;
  now: string;
}

export class QualifyWorkRequest {
  constructor(private readonly repository: WorkRequestRepository, private readonly outbox: Outbox) {}

  async execute(command: QualifyWorkRequestCommand): Promise<WorkRequest> {
    const existing = await this.repository.getById(command.tenantId, command.requestId);
    if (!existing) throw new WorkRequestNotFoundError();

    const qualified = existing.qualify();
    await this.repository.save(qualified);
    await this.outbox.append({
      eventId: command.eventId,
      eventType: "WorkRequestQualified",
      version: 1,
      tenantId: command.tenantId,
      aggregateId: qualified.props.id,
      payload: {
        requestId: qualified.props.id,
        tenantId: qualified.props.tenantId,
        status: qualified.props.status
      }
    });

    return qualified;
  }
}
