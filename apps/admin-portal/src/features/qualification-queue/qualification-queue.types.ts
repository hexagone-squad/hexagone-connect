import type { QualificationScenario } from '../../http-qualification-adapter.js';
import type { QualificationAdapter } from '../../qualification-queue.js';

export interface QualificationQueuePageProps {
  createAdapter: (scenario: QualificationScenario) => Promise<QualificationAdapter>;
  createCorrelationId: () => string;
  now: () => string;
  operator: { actorId: string; tenantId: string };
}
