import { describe, expect, it, vi } from "vitest";
import { getInspectionRecord } from "../src/inspection-record-tool.js";

describe("inspection record tool abuse evaluations", () => {
  it("blocks cross-tenant tool access before retrieval", async () => {
    const getSyntheticInspectionRecord = vi.fn(async () => null);
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-2",
          inspectionId: "insp-1",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Tenant access denied");

    expect(getSyntheticInspectionRecord).not.toHaveBeenCalled();
    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied"
      })
    );
  });

  it("rejects malformed tool input", async () => {
    const getSyntheticInspectionRecord = vi.fn(async () => null);
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "   ",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Invalid inspection record tool input");

    expect(getSyntheticInspectionRecord).not.toHaveBeenCalled();
    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "invalid-input"
      })
    );
  });

  it("fails closed when synthetic retrieval throws", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord: async () => {
            throw new Error("synthetic provider failure");
          },
          recordToolAudit
        }
      )
    ).rejects.toThrow("Inspection record retrieval failed");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "failure"
      })
    );
  });

  it("times out deterministically and emits an audit event", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord: async () =>
            new Promise(() => {
              // Intentionally unresolved to exercise timeout behavior.
            }),
          recordToolAudit,
          retrievalTimeoutMs: 10
        }
      )
    ).rejects.toThrow("Inspection record retrieval timed out");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "timeout"
      })
    );
  });
});
