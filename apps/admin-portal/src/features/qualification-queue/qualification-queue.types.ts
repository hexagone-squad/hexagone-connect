import type { QualificationScenario } from './adapters/http-qualification-adapter.js';
import type { QualificationAdapter } from './model/qualification-queue.js';

export interface QualificationQueuePageProps {
  createAdapter: (scenario: QualificationScenario) => Promise<QualificationAdapter>;
  createCorrelationId: () => string;
  now: () => string;
  operator: { actorId: string; tenantId: string };
}
