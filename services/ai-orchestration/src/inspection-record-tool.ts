export interface InspectionRecordToolPrincipal {
  userId: string;
  tenantIds: string[];
}

export interface GetInspectionRecordInput {
  tenantId: string;
  inspectionId: string;
  principal: InspectionRecordToolPrincipal;
}

export interface SyntheticInspectionRecord {
  inspectionId: string;
  tenantId: string;
  status: "open" | "closed" | "requires-review";
  summary: string;
}

export type InspectionRecordToolAuditOutcome =
  | "success"
  | "not-found"
  | "denied"
  | "invalid-input"
  | "timeout"
  | "failure";

export interface InspectionRecordToolDependencies {
  getSyntheticInspectionRecord(input: {
    tenantId: string;
    inspectionId: string;
  }): Promise<SyntheticInspectionRecord | null>;

  recordToolAudit(input: {
    toolName: "getInspectionRecord";
    tenantId: string;
    inspectionId: string;
    userId: string;
    outcome: InspectionRecordToolAuditOutcome;
  }): Promise<void>;

  retrievalTimeoutMs?: number;
}

const DEFAULT_RETRIEVAL_TIMEOUT_MS = 1000;

export async function getInspectionRecord(
  input: GetInspectionRecordInput,
  dependencies: InspectionRecordToolDependencies
): Promise<SyntheticInspectionRecord> {
  if (!input.tenantId.trim() || !input.inspectionId.trim()) {
    await recordAudit(input, dependencies, "invalid-input");
    throw new Error("Invalid inspection record tool input");
  }

  if (!input.principal.tenantIds.includes(input.tenantId)) {
    await recordAudit(input, dependencies, "denied");
    throw new Error("Tenant access denied");
  }

  let record: SyntheticInspectionRecord | null;

  try {
    record = await withTimeout(
      dependencies.getSyntheticInspectionRecord({
        tenantId: input.tenantId,
        inspectionId: input.inspectionId
      }),
      dependencies.retrievalTimeoutMs ?? DEFAULT_RETRIEVAL_TIMEOUT_MS
    );
  } catch (error) {
    if (error instanceof ToolTimeoutError) {
      await recordAudit(input, dependencies, "timeout");
      throw new Error("Inspection record retrieval timed out");
    }

    await recordAudit(input, dependencies, "failure");
    throw new Error("Inspection record retrieval failed");
  }

  if (!record) {
    await recordAudit(input, dependencies, "not-found");
    throw new Error("Inspection record not found");
  }

  if (record.tenantId !== input.tenantId) {
    await recordAudit(input, dependencies, "denied");
    throw new Error("Tenant boundary violation in inspection record");
  }

  await recordAudit(input, dependencies, "success");

  return record;
}

async function recordAudit(
  input: GetInspectionRecordInput,
  dependencies: InspectionRecordToolDependencies,
  outcome: InspectionRecordToolAuditOutcome
): Promise<void> {
  await dependencies.recordToolAudit({
    toolName: "getInspectionRecord",
    tenantId: input.tenantId,
    inspectionId: input.inspectionId,
    userId: input.principal.userId,
    outcome
  });
}

class ToolTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new ToolTimeoutError("Tool retrieval timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
