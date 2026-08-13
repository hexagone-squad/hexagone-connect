import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { humanReviewConfidenceThreshold, runInspectionAssistant } from "../src/inspection-assistant.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const evaluationPolicy = JSON.parse(
  readFileSync(resolve(currentDir, "../../../ai/evaluations/inspection-assistant.v1.json"), "utf8")
) as {
  thresholds: {
    groundedness: number;
    schemaCompliance: number;
  };
  humanReviewConfidenceThreshold: number;
};

describe("inspection assistant evaluation", () => {
  it("keeps blocking threshold for groundedness and schema compliance", () => {
    expect(evaluationPolicy.thresholds.groundedness).toBeGreaterThanOrEqual(0.9);
    expect(evaluationPolicy.thresholds.schemaCompliance).toBe(1.0);
  });

  it("blocks consequential actions without an approval token", async () => {
    await expect(
      runInspectionAssistant(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          question: "Can we make this customer commitment?",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] },
          actionType: "customerCommitment"
        },
        {
          retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "finding" }],
          generateAnswer: async () => ({ answer: "Escalate to reviewer.", confidence: 0.91 }),
          recordAudit: async () => undefined
        }
      )
    ).rejects.toThrow("Human approval required for consequential action");
  });

  it("requires citations for grounded answers", async () => {
    await expect(
      runInspectionAssistant(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          question: "Answer without source",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          retrieveCitations: async () => [],
          generateAnswer: async () => ({ answer: "no sources", confidence: 0.8 }),
          recordAudit: async () => undefined
        }
      )
    ).rejects.toThrow("Grounded answer requires at least one citation");
  });

  it("escalates low-confidence answers for human review", async () => {
    const output = await runInspectionAssistant(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        question: "Is remediation required?",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] }
      },
      {
        retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "finding" }],
        generateAnswer: async () => ({
          answer: "Uncertain.",
          confidence: evaluationPolicy.humanReviewConfidenceThreshold - 0.1
        }),
        recordAudit: async () => undefined
      }
    );

    expect(output.requiresHumanReview).toBe(true);
  });

  it("uses the versioned evaluation threshold as the escalation boundary", () => {
    expect(humanReviewConfidenceThreshold).toBe(evaluationPolicy.humanReviewConfidenceThreshold);
  });
});
