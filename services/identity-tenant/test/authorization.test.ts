import { describe, expect, it } from "vitest";
import { assertTenantAccess } from "../src/authorization.js";

describe("tenant authorization", () => {
  it("rejects a tenant outside the principal scope", () => expect(() => assertTenantAccess({ userId: "u", tenantIds: ["t1"], roles: [] }, "t2")).toThrow("Tenant access denied"));
});
