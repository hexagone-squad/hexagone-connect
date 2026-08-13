import { describe, expect, it } from "vitest";
import { buildWorkManagement } from "../src/composition-root.js";

describe("create work request", () => {
  it("persists a tenant-scoped request and emits a versioned event", async () => {
    const app = buildWorkManagement();
    const request = await app.createWorkRequest.execute({ tenantId: "tenant-1", customerId: "customer-1", serviceCategory: "inspection", requestId: "request-1", eventId: "event-1", now: "2026-08-13T00:00:00Z" });
    expect(request.props.status).toBe("submitted");
    expect(app.outbox.events[0]).toMatchObject({ eventType: "WorkRequestCreated", version: 1, tenantId: "tenant-1" });
    await expect(app.repository.getById("tenant-2", "request-1")).resolves.toBeUndefined();
  });

  it("qualifies a submitted request and emits a status-change event", async () => {
    const app = buildWorkManagement();
    await app.createWorkRequest.execute({ tenantId: "tenant-1", customerId: "customer-1", serviceCategory: "inspection", requestId: "request-1", eventId: "event-1", now: "2026-08-13T00:00:00Z" });

    const request = await app.qualifyWorkRequest.execute({ tenantId: "tenant-1", requestId: "request-1", eventId: "event-2", now: "2026-08-13T01:00:00Z" });

    expect(request.props.status).toBe("qualified");
    expect(app.outbox.events[1]).toMatchObject({ eventType: "WorkRequestQualified", version: 1, tenantId: "tenant-1", aggregateId: "request-1" });
  });

  it("rejects invalid business input", async () => {
    const app = buildWorkManagement();
    await expect(app.createWorkRequest.execute({ tenantId: "tenant-1", customerId: "customer-1", serviceCategory: "", requestId: "r", eventId: "e", now: new Date().toISOString() })).rejects.toThrow("Invalid work request");
  });
});
