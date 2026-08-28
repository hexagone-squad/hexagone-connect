export interface QueueItem {
  id: string;
  serviceCategory: string;
  status: 'submitted' | 'qualified';
  tenantId: string;
}

export interface QualificationAuditEntry {
  action: 'work-request.qualified';
  actorId: string;
  tenantId: string;
  resourceType: 'work-request';
  resourceId: string;
  occurredAt: string;
}

export interface QualificationResult {
  item: QueueItem;
  correlationId: string;
  auditEntry: QualificationAuditEntry;
}

export interface QualificationAdapter {
  listPending(input: { tenantId: string }): Promise<QueueItem[]>;
  qualify(input: {
    actorId: string;
    correlationId: string;
    now: string;
    requestId: string;
    tenantId: string;
  }): Promise<QualificationResult>;
}

export type QueueError = 'authorization' | 'service' | 'validation';
export type QueueStatus = 'empty' | 'error' | 'idle' | 'loading' | 'ready';

export interface QualificationQueueState {
  status: QueueStatus;
  items: QueueItem[];
  auditEntries: QualificationAuditEntry[];
  correlationId?: string;
  error?: QueueError;
}

export interface QualificationQueueOptions {
  adapter: QualificationAdapter;
  operator: { actorId: string; tenantId: string };
  createCorrelationId: () => string;
  now: () => string;
}

export interface QualificationQueue {
  readonly state: QualificationQueueState;
  load(): Promise<void>;
  qualify(requestId: string): Promise<void>;
  subscribe(listener: (state: QualificationQueueState) => void): () => void;
}

function classifyError(error: unknown): QueueError {
  if (error instanceof Error && error.name === 'QualificationForbiddenError') {
    return 'authorization';
  }
  return 'service';
}

export function createQualificationQueue(options: QualificationQueueOptions): QualificationQueue {
  let state: QualificationQueueState = { status: 'idle', items: [], auditEntries: [] };
  const listeners = new Set<(nextState: QualificationQueueState) => void>();
  const update = (nextState: QualificationQueueState) => {
    state = nextState;
    listeners.forEach((listener) => listener(state));
  };

  return {
    get state() {
      return state;
    },
    async load() {
      update({ ...state, status: 'loading', error: undefined });
      try {
        const items = await options.adapter.listPending({ tenantId: options.operator.tenantId });
        update({
          ...state,
          status: items.length === 0 ? 'empty' : 'ready',
          items,
          error: undefined,
        });
      } catch (error) {
        update({ ...state, status: 'error', items: [], error: classifyError(error) });
      }
    },
    async qualify(requestId) {
      if (!requestId.trim()) {
        update({ ...state, status: 'error', error: 'validation' });
        return;
      }

      const correlationId = options.createCorrelationId();
      try {
        const result = await options.adapter.qualify({
          actorId: options.operator.actorId,
          correlationId,
          now: options.now(),
          requestId,
          tenantId: options.operator.tenantId,
        });
        const items = state.items.filter((item) => item.id !== result.item.id);
        update({
          status: items.length === 0 ? 'empty' : 'ready',
          items,
          auditEntries: [...state.auditEntries, result.auditEntry],
          correlationId: result.correlationId,
        });
      } catch (error) {
        update({ ...state, status: 'error', correlationId, error: classifyError(error) });
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
