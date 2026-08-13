import { describe, expect, it, vi } from "vitest";
import { humanReviewConfidenceThreshold, runInspectionAssistant } from "../src/inspection-assistant.js";

describe("inspection assistant contract", () => {
  it("rejects retrieval results from another tenant", async () => {
    await expect(
      runInspectionAssistant(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          question: "What is the safety status?",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-2", excerpt: "cross-tenant" }],
          generateAnswer: async () => ({ answer: "ok", confidence: 0.95 }),
          recordAudit: async () => undefined
        }
      )
    ).rejects.toThrow("Tenant boundary violation in retrieval result");
  });

  it("blocks consequential actions without human approval token", async () => {
    await expect(
      runInspectionAssistant(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          question: "Can we commit this remediation date?",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] },
          actionType: "customerCommitment"
        },
        {
          retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "inspection finding" }],
          generateAnswer: async () => ({ answer: "Recommend human confirmation before commitment.", confidence: 0.92 }),
          recordAudit: async () => undefined
        }
      )
    ).rejects.toThrow("Human approval required for consequential action");
  });

  it("allows consequential actions when human approval token is provided", async () => {
    const recordAudit = vi.fn(async () => undefined);

    const output = await runInspectionAssistant(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        question: "Can we commit this remediation date?",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] },
        actionType: "customerCommitment",
        humanApprovalToken: "approval-123"
      },
      {
        retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "inspection finding" }],
        generateAnswer: async () => ({ answer: "Commitment approved.", confidence: 0.92 }),
        recordAudit
      }
    );

    expect(output.requiresHumanReview).toBe(false);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ requiresHumanReview: false, usedFallback: false, tenantId: "tenant-1" })
    );
  });

  it("uses fallback and escalates to human review when model generation fails", async () => {
    const output = await runInspectionAssistant(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        question: "Summarize urgent risks",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] }
      },
      {
        retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "high-risk issue" }],
        generateAnswer: async () => {
          throw new Error("provider timeout");
        },
        recordAudit: async () => undefined
      }
    );

    expect(output.answer).toContain("Escalated for human review");
    expect(output.requiresHumanReview).toBe(true);
    expect(output.confidence).toBe(0);
  });

  it("escalates to human review when confidence is below the versioned threshold", async () => {
    const recordAudit = vi.fn(async () => undefined);

    const output = await runInspectionAssistant(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        question: "Is the roof compliant?",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] }
      },
      {
        retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "partial evidence" }],
        generateAnswer: async () => ({ answer: "Probably compliant.", confidence: 0.5 }),
        recordAudit
      }
    );

    expect(output.requiresHumanReview).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ requiresHumanReview: true, usedFallback: false })
    );
  });

  it("does not escalate when confidence equals the versioned threshold", async () => {
    const output = await runInspectionAssistant(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        question: "Is the roof compliant?",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] }
      },
      {
        retrieveCitations: async () => [{ sourceId: "doc-1", tenantId: "tenant-1", excerpt: "evidence" }],
        generateAnswer: async () => ({ answer: "Compliant.", confidence: humanReviewConfidenceThreshold }),
        recordAudit: async () => undefined
      }
    );

    expect(output.requiresHumanReview).toBe(false);
  });
});
