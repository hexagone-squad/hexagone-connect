import { WorkRequest, type WorkRequestStatus } from '../../domain/work-request.js';

export interface WorkRequestRepository {
  save(request: WorkRequest): Promise<void>;
  getById(tenantId: string, id: string): Promise<WorkRequest | undefined>;
  listByStatus(tenantId: string, status: WorkRequestStatus): Promise<WorkRequest[]>;
}
