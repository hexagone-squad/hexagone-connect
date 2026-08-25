export interface InspectionRecordToolPrincipal {
  userId: string;
  tenantIds: string[];
}

export interface GetInspectionRecordInput {
  tenantId: string;
  inspectionId: string;
  principal: InspectionRecordToolPrincipal;
  correlationId: string;
}

export interface SyntheticInspectionRecord {
  inspectionId: string;
  tenantId: string;
  status: "open" | "closed" | "requires-review";
  summary: string;
}

export interface InspectionRecordToolResponse {
  record: SyntheticInspectionRecord;
  correlationId: string;
  invocationCount: number;
  latencyMs: number;
}

export type InspectionRecordToolAuditOutcome =
  | "success"
  | "not-found"
  | "denied"
  | "invalid-input"
  | "timeout"
  | "excessive-data"
  | "redacted"
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
    correlationId: string;
    outcome: InspectionRecordToolAuditOutcome;
    latencyMs: number;
    invocationCount: number;
  }): Promise<void>;

  retrievalTimeoutMs?: number;
  maxResponseBytes?: number;
}

const DEFAULT_RETRIEVAL_TIMEOUT_MS = 1000;
const DEFAULT_MAX_RESPONSE_BYTES = 4096;

export async function getInspectionRecord(
  input: GetInspectionRecordInput,
  dependencies: InspectionRecordToolDependencies
): Promise<InspectionRecordToolResponse> {
  const startedAt = performance.now();
  const invocationCount = 1;

  if (
    !input.tenantId.trim() ||
    !input.inspectionId.trim() ||
    !input.correlationId.trim()
  ) {
    await recordAudit(
      input,
      dependencies,
      "invalid-input",
      startedAt,
      invocationCount
    );

    throw new Error("Invalid inspection record tool input");
  }

  if (!input.principal.tenantIds.includes(input.tenantId)) {
    await recordAudit(
      input,
      dependencies,
      "denied",
      startedAt,
      invocationCount
    );

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
      await recordAudit(
        input,
        dependencies,
        "timeout",
        startedAt,
        invocationCount
      );

      throw new Error("Inspection record retrieval timed out");
    }

    await recordAudit(
      input,
      dependencies,
      "failure",
      startedAt,
      invocationCount
    );

    throw new Error("Inspection record retrieval failed");
  }

  if (!record) {
    await recordAudit(
      input,
      dependencies,
      "not-found",
      startedAt,
      invocationCount
    );

    throw new Error("Inspection record not found");
  }

  if (record.tenantId !== input.tenantId) {
    await recordAudit(
      input,
      dependencies,
      "denied",
      startedAt,
      invocationCount
    );

    throw new Error("Tenant boundary violation in inspection record");
  }

  const sanitizedRecord = redactSensitiveData(record);

  const response: InspectionRecordToolResponse = {
    record: sanitizedRecord,
    correlationId: input.correlationId,
    invocationCount,
    latencyMs: elapsedMs(startedAt)
  };

  const responseSize = Buffer.byteLength(
    JSON.stringify(response),
    "utf8"
  );

  const maxResponseBytes =
    dependencies.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  if (responseSize > maxResponseBytes) {
    await recordAudit(
      input,
      dependencies,
      "excessive-data",
      startedAt,
      invocationCount
    );

    throw new Error("Inspection record response exceeds size limit");
  }

  await recordAudit(
    input,
    dependencies,
    "success",
    startedAt,
    invocationCount
  );

  return response;
}

function redactSensitiveData(
  record: SyntheticInspectionRecord
): SyntheticInspectionRecord {
  return {
    inspectionId: record.inspectionId,
    tenantId: record.tenantId,
    status: record.status,
    summary: redactText(record.summary)
  };
}

function redactText(value: string): string {
  return value
    .replace(/password\s*[:=]\s*\S+/gi, "[REDACTED]")
    .replace(/token\s*[:=]\s*\S+/gi, "[REDACTED]")
    .replace(/secret\s*[:=]\s*\S+/gi, "[REDACTED]")
    .replace(/api[_-]?key\s*[:=]\s*\S+/gi, "[REDACTED]");
}

function elapsedMs(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(3));
}

async function recordAudit(
  input: GetInspectionRecordInput,
  dependencies: InspectionRecordToolDependencies,
  outcome: InspectionRecordToolAuditOutcome,
  startedAt: number,
  invocationCount: number
): Promise<void> {
  await dependencies.recordToolAudit({
    toolName: "getInspectionRecord",
    tenantId: input.tenantId,
    inspectionId: input.inspectionId,
    userId: input.principal.userId,
    correlationId: input.correlationId,
    outcome,
    latencyMs: elapsedMs(startedAt),
    invocationCount
  });
}

class ToolTimeoutError extends Error {}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
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
