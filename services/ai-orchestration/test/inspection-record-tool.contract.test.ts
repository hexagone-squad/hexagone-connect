import { describe, expect, it, vi } from "vitest";
import { getInspectionRecord } from "../src/inspection-record-tool.js";

describe("inspection record tool contract", () => {
  it("returns a synthetic inspection record for an authorized tenant", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    const record = await getInspectionRecord(
      {
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        principal: { userId: "u-1", tenantIds: ["tenant-1"] }
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

    expect(record.inspectionId).toBe("insp-1");
    expect(record.tenantId).toBe("tenant-1");
    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "getInspectionRecord",
        tenantId: "tenant-1",
        inspectionId: "insp-1",
        userId: "u-1",
        outcome: "success"
      })
    );
  });

  it("denies access when the principal is not authorized for the tenant", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-2",
          inspectionId: "insp-1",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord: async () => null,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Tenant access denied");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-2",
        outcome: "denied"
      })
    );
  });

  it("rejects a retrieved record that belongs to another tenant", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "insp-1",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
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

  it("returns a deterministic not-found error when the record does not exist", async () => {
    const recordToolAudit = vi.fn(async () => undefined);

    await expect(
      getInspectionRecord(
        {
          tenantId: "tenant-1",
          inspectionId: "missing",
          principal: { userId: "u-1", tenantIds: ["tenant-1"] }
        },
        {
          getSyntheticInspectionRecord: async () => null,
          recordToolAudit
        }
      )
    ).rejects.toThrow("Inspection record not found");

    expect(recordToolAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionId: "missing",
        outcome: "not-found"
      })
    );
  });
});
