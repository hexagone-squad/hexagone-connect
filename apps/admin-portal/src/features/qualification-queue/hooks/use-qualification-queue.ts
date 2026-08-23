import { useEffect, useState, useSyncExternalStore } from 'react';
import type { QualificationScenario } from '../adapters/http-qualification-adapter.js';
import {
  createQualificationQueue,
  type QualificationAdapter,
  type QualificationQueue,
  type QualificationQueueOptions,
  type QualificationQueueState,
} from '../model/qualification-queue.js';

const loadingState: QualificationQueueState = { status: 'loading', items: [], auditEntries: [] };

export interface UseQualificationQueueOptions extends Pick<
  QualificationQueueOptions,
  'createCorrelationId' | 'now' | 'operator'
> {
  createAdapter: (scenario: QualificationScenario) => Promise<QualificationAdapter>;
  scenario: QualificationScenario;
}

export function useQualificationQueue(
  options: UseQualificationQueueOptions,
): QualificationQueue | null {
  const [queue, setQueue] = useState<QualificationQueue | null>(null);

  useEffect(() => {
    let active = true;
    setQueue(null);
    void options.createAdapter(options.scenario).then((adapter) => {
      if (!active) return;
      const nextQueue = createQualificationQueue({
        adapter,
        operator: options.operator,
        createCorrelationId: options.createCorrelationId,
        now: options.now,
      });
      setQueue(nextQueue);
      void nextQueue.load();
    });
    return () => {
      active = false;
    };
  }, [
    options.createAdapter,
    options.createCorrelationId,
    options.now,
    options.operator.actorId,
    options.operator.tenantId,
    options.scenario,
  ]);

  return queue;
}

export function useQualificationQueueState(
  queue: QualificationQueue | null,
): QualificationQueueState {
  return useSyncExternalStore(
    (listener) => queue?.subscribe(listener) ?? (() => undefined),
    () => queue?.state ?? loadingState,
    () => loadingState,
  );
}
