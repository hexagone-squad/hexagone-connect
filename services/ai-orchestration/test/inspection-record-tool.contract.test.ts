import { describe, expect, it, vi } from "vitest";
import { getInspectionRecord } from "../src/inspection-record-tool.js";

describe("inspection record tool contract", () => {
  it("returns a bounded synthetic record for an authorized tenant", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    const result = await getInspectionRecord(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        correlationId: "corr-001",
        principal: {
          userId: "u-1",
          tenantIds: ["tenant-1"]
        }
      },
      {
        getSyntheticInspectionRecord: async () => ({
          inspectionId: "insp-1",
          tenantId: "tenant-1",
          status: "requires-review",
          summary: "Synthetic inspection finding"
        }),
        recordToolAudit
      }
    );

    expect(result.record.inspectionId).toBe("insp-1");
    expect(result.record.tenantId).toBe("tenant-1");
    expect(result.correlationId).toBe("corr-001");
    expect(result.invocationCount).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "getInspectionRecord",
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        userId: "u-1",
        correlationId: "corr-001",
        outcome: "success",
        invocationCount: 1
      })
    );
  });

  it("denies access before retrieval for an unauthorized tenant", async () => {
    const getSyntheticInspectionRecord = vi.fn(async () => null);
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-2",
          inspectionId: "insp-1",
          correlationId: "corr-002",
          principal: {
            userId: "u-1",
            tenantIds: ["tenant-1"]
          }
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
        correlationId: "corr-002",
        outcome: "denied"
      })
    );
  });

  it("rejects a retrieved record belonging to another tenant", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          correlationId: "corr-003",
          principal: {
            userId: "u-1",
            tenantIds: ["tenant-1"]
          }
        },
        {
          getSyntheticInspectionRecord: async () => ({
            inspectionId: "insp-1",
            tenantId: "tenant-2",
            status: "open",
            summary: "Cross-tenant synthetic record"
          }),
          recordToolAudit
        }
      )
    ).rejects.toThrow("Tenant boundary violation in inspection record");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied"
      })
    );
  });

  it("returns a deterministic not-found error", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "missing",
          correlationId: "corr-004",
          principal: {
            userId: "u-1",
            tenantIds: ["tenant-1"]
          }
        },
        {
          getSyntheticInspectionRecord: async () => null,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Inspection record not found");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "not-found"
      })
    );
  });

  it("rejects missing correlation metadata", async () => {
    const getSyntheticInspectionRecord = vi.fn(async () => null);
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          correlationId: "",
          principal: {
            userId: "u-1",
            tenantIds: ["tenant-1"]
          }
        },
        {
          getSyntheticInspectionRecord,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Invalid inspection record tool input");

    expect(getSyntheticInspectionRecord).not.toHaveBeenCalled();
  });
});
