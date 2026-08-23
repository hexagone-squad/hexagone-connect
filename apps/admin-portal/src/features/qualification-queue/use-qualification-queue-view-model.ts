import { startTransition, useState } from 'react';
import {
  useQualificationQueue,
  useQualificationQueueState,
} from '../../hooks/use-qualification-queue.js';
import type { QualificationScenario } from '../../http-qualification-adapter.js';
import type { QualificationQueuePageProps } from './qualification-queue.types.js';

export function useQualificationQueueViewModel(props: QualificationQueuePageProps) {
  const [scenario, setScenarioState] = useState<QualificationScenario>('normal');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const queue = useQualificationQueue({ ...props, scenario });
  const state = useQualificationQueueState(queue);

  const setScenario = (nextScenario: QualificationScenario) => {
    startTransition(() => setScenarioState(nextScenario));
  };

  const qualifyRequest = async (requestId: string) => {
    if (!queue) return;
    setPendingRequestId(requestId);
    try {
      await queue.qualify(requestId);
    } finally {
      setPendingRequestId(null);
    }
  };

  return {
    pendingRequestId,
    qualifyRequest,
    refresh: () => queue?.load(),
    scenario,
    setScenario,
    state,
  };
}
