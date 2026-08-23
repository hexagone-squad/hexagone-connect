import type { WorkRequest } from '../domain/work-request.js';
import type { WorkRequestRepository } from './ports/work-request-repository.js';

export class ListSubmittedWorkRequests {
  constructor(private readonly repository: WorkRequestRepository) {}

  execute(input: { tenantId: string }): Promise<WorkRequest[]> {
    return this.repository.listByStatus(input.tenantId, 'submitted');
  }
}
