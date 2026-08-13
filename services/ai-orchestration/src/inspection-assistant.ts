import type { InspectionAssistantInput, InspectionAssistantOutput } from "../../../ai/agents/inspection-assistant.js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface AiPrincipal {
  userId: string;
  tenantIds: string[];
}

export interface Citation {
  sourceId: string;
  tenantId: string;
  excerpt: string;
}

export type ConsequentialAction = "safetyFinding" | "customerCommitment" | "commercialDecision";

export interface RunInspectionAssistantRequest extends InspectionAssistantInput {
  principal: AiPrincipal;
  actionType?: ConsequentialAction;
  humanApprovalToken?: string;
}

export interface AiAuditRecord {
  tenantId: string;
  inspectionId: string;
  question: string;
  citationIds: string[];
  requiresHumanReview: boolean;
  usedFallback: boolean;
}

export interface InspectionAssistantDependencies {
  retrieveCitations(input: Pick<RunInspectionAssistantRequest, "tenantId" | "question" | "inspectionId">): Promise<Citation[]>;
  generateAnswer(input: { question: string; citations: Citation[] }): Promise<{ answer: string; confidence: number }>;
  recordAudit(record: AiAuditRecord): Promise<void>;
}

const approvalRequiredActions = new Set<ConsequentialAction>([
  "safetyFinding",
  "customerCommitment",
  "commercialDecision"
]);

export const humanReviewConfidenceThreshold = loadHumanReviewConfidenceThreshold();

function loadHumanReviewConfidenceThreshold(): number {
  const policyPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../ai/evaluations/inspection-assistant.v1.json"
  );
  const policy: unknown = JSON.parse(readFileSync(policyPath, "utf8"));
  const threshold =
    typeof policy === "object" && policy !== null
      ? (policy as Record<string, unknown>).humanReviewConfidenceThreshold
      : undefined;

  if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
    throw new Error("Evaluation policy must define humanReviewConfidenceThreshold between 0 and 1");
  }

  return threshold;
}

export async function runInspectionAssistant(
  request: RunInspectionAssistantRequest,
  dependencies: InspectionAssistantDependencies
): Promise<InspectionAssistantOutput> {
  assertTenantAccess(request.principal, request.tenantId);

  const actionRequiresApproval = request.actionType ? approvalRequiredActions.has(request.actionType) : false;
  assertHumanApproval(actionRequiresApproval, request.humanApprovalToken);

  const citations = await dependencies.retrieveCitations({
    tenantId: request.tenantId,
    inspectionId: request.inspectionId,
    question: request.question
  });
  assertTenantBoundary(citations, request.tenantId);

  let output: InspectionAssistantOutput;
  let usedFallback = false;

  try {
    const generation = await dependencies.generateAnswer({ question: request.question, citations });
    output = {
      answer: generation.answer,
      citations: citations.map((citation) => citation.sourceId),
      confidence: generation.confidence,
      // Low-confidence answers are escalated against the versioned evaluation threshold.
      requiresHumanReview: generation.confidence < humanReviewConfidenceThreshold
    };
  } catch {
    // Provide a deterministic non-AI fallback and force human review on degraded paths.
    usedFallback = true;
    output = {
      answer: "Unable to produce an AI answer right now. Escalated for human review.",
      citations: citations.map((citation) => citation.sourceId),
      confidence: 0,
      requiresHumanReview: true
    };
  }

  validateOutput(output);

  await dependencies.recordAudit({
    tenantId: request.tenantId,
    inspectionId: request.inspectionId,
    question: request.question,
    citationIds: output.citations,
    requiresHumanReview: output.requiresHumanReview,
    usedFallback
  });

  return output;
}

function assertTenantAccess(principal: AiPrincipal, tenantId: string): void {
  if (!principal.tenantIds.includes(tenantId)) {
    throw new Error("Tenant access denied");
  }
}

function assertTenantBoundary(citations: Citation[], tenantId: string): void {
  if (citations.length === 0) {
    throw new Error("Grounded answer requires at least one citation");
  }

  const outOfScopeCitation = citations.find((citation) => citation.tenantId !== tenantId);
  if (outOfScopeCitation) {
    throw new Error("Tenant boundary violation in retrieval result");
  }
}

function validateOutput(output: InspectionAssistantOutput): void {
  if (!output.answer.trim()) {
    throw new Error("Schema validation failed: answer is required");
  }

  if (!Array.isArray(output.citations) || output.citations.length === 0) {
    throw new Error("Schema validation failed: citations are required");
  }

  if (typeof output.confidence !== "number" || output.confidence < 0 || output.confidence > 1) {
    throw new Error("Schema validation failed: confidence must be between 0 and 1");
  }
}

function assertHumanApproval(actionRequiresApproval: boolean, humanApprovalToken?: string): void {
  if (!actionRequiresApproval) return;
  if (!humanApprovalToken || !humanApprovalToken.trim()) {
    throw new Error("Human approval required for consequential action");
  }
}
