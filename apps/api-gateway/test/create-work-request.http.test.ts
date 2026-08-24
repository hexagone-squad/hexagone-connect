import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_BEARER_TENANT_A,
  SYNTHETIC_BEARER_TENANT_B,
  SYNTHETIC_CUSTOMER_A,
  SYNTHETIC_TENANT_A,
  SYNTHETIC_TENANT_B,
  createWorkRequestGateway
} from "../src/work-request-gateway.js";

const validBody = {
  tenantId: SYNTHETIC_TENANT_A,
  customerId: SYNTHETIC_CUSTOMER_A,
  serviceCategory: "inspection"
};

const AUTH_TENANT_A = `Bearer ${SYNTHETIC_BEARER_TENANT_A}`;

const postRequest = (body: unknown, authorization: string | undefined = AUTH_TENANT_A) => ({
  method: "POST" as string | undefined,
  url: "/v1/work-requests" as string | undefined,
  authorization,
  contentType: "application/json" as string | undefined,
  body: typeof body === "string" ? body : JSON.stringify(body)
});

const unauthenticatedRequest = (body: unknown) => ({ ...postRequest(body), authorization: undefined });

describe("POST /v1/work-requests HTTP adapter", () => {
  it("accepts a synthetic create request and emits a tenant-scoped event", async () => {
    const gateway = createWorkRequestGateway();
    const response = await gateway.handle(postRequest(validBody));

    expect(response.status).toBe(202);
    const payload = JSON.parse(response.body) as {
      requestId: string;
      tenantId: string;
      status: string;
      correlationId: string;
    };
    expect(payload.status).toBe("submitted");
    expect(payload.tenantId).toBe(SYNTHETIC_TENANT_A);
    expect(payload.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(gateway.workManagement.outbox.events[0]).toMatchObject({
      eventType: "WorkRequestCreated",
      version: 1,
      tenantId: SYNTHETIC_TENANT_A,
      eventId: payload.correlationId
    });
    await expect(
      gateway.workManagement.repository.getById(SYNTHETIC_TENANT_B, payload.requestId)
    ).resolves.toBeUndefined();
  });

  it("returns 400 for invalid business input", async () => {
    const gateway = createWorkRequestGateway();
    const response = await gateway.handle(postRequest({ ...validBody, serviceCategory: "   " }));

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: "invalid_request" });
  });

  it("returns 400 for malformed, unknown-field, and oversized payloads", async () => {
    const gateway = createWorkRequestGateway();
    const malformed = await gateway.handle(postRequest("{"));
    const unknownField = await gateway.handle(postRequest({ ...validBody, isAdmin: true }));
    const oversized = await gateway.handle(
      postRequest({ ...validBody, serviceCategory: "x".repeat(9_000) })
    );
    const overLongCategory = await gateway.handle(
      postRequest({ ...validBody, serviceCategory: "x".repeat(201) })
    );

    expect([malformed.status, unknownField.status, oversized.status, overLongCategory.status]).toEqual([
      400, 400, 400, 400
    ]);
    expect(gateway.workManagement.outbox.events).toHaveLength(0);
  });

  it("returns 401 when the bearer token is missing or unknown", async () => {
    const gateway = createWorkRequestGateway();
    const missing = await gateway.handle(unauthenticatedRequest(validBody));
    const unknown = await gateway.handle(postRequest(validBody, "Bearer unknown-token"));
    const multiSegment = await gateway.handle(
      postRequest(validBody, `Bearer ${SYNTHETIC_BEARER_TENANT_A} extra`)
    );

    expect(missing.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(multiSegment.status).toBe(401);
  });

  it("returns 401 for tokens inherited from the object prototype chain", async () => {
    const gateway = createWorkRequestGateway();
    const inherited = ["__proto__", "constructor", "toString"];

    for (const token of inherited) {
      const response = await gateway.handle(postRequest(validBody, `Bearer ${token}`));
      expect(response.status).toBe(401);
    }
    expect(gateway.workManagement.outbox.events).toHaveLength(0);
  });

  it("returns 415 when the body is not declared as application/json", async () => {
    const gateway = createWorkRequestGateway();
    const textPlain = await gateway.handle({ ...postRequest(validBody), contentType: "text/plain" });
    const missingType = await gateway.handle({ ...postRequest(validBody), contentType: undefined });
    const withCharset = await gateway.handle({
      ...postRequest(validBody),
      contentType: "application/json; charset=utf-8"
    });

    expect(textPlain.status).toBe(415);
    expect(JSON.parse(textPlain.body)).toEqual({ error: "unsupported_media_type" });
    expect(missingType.status).toBe(415);
    expect(withCharset.status).toBe(202);
  });

  it("returns 403 when an authenticated principal targets another tenant", async () => {
    const gateway = createWorkRequestGateway();
    const response = await gateway.handle(
      postRequest(validBody, `Bearer ${SYNTHETIC_BEARER_TENANT_B}`)
    );

    expect(response.status).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ error: "unauthorized_tenant" });
    expect(gateway.workManagement.outbox.events).toHaveLength(0);
  });

  it("returns 404 outside the documented operation", async () => {
    const gateway = createWorkRequestGateway();
    const otherPath = await gateway.handle({ ...postRequest(validBody), url: "/v1/unknown" });
    const otherMethod = await gateway.handle({ ...postRequest(validBody), method: "GET" });

    expect(otherPath.status).toBe(404);
    expect(otherMethod.status).toBe(404);
  });

  it("serves the contract over a listening HTTP socket", async () => {
    const gateway = createWorkRequestGateway();
    const server = gateway.listen(0);
    await once(server, "listening");
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}/v1/work-requests`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${SYNTHETIC_BEARER_TENANT_A}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(validBody)
      });

      expect(response.status).toBe(202);
      expect(response.headers.get("x-correlation-id")).toBeTruthy();
      await response.body?.cancel();

      // The socket adapter must forward Content-Type so the contracted media
      // type is enforced on the wire, not only through direct handle() calls.
      const wrongMediaType = await fetch(`http://127.0.0.1:${port}/v1/work-requests`, {
        method: "POST",
        headers: { authorization: AUTH_TENANT_A, "content-type": "text/plain" },
        body: JSON.stringify(validBody)
      });
      expect(wrongMediaType.status).toBe(415);
      await wrongMediaType.body?.cancel();

      // An oversized body must be rejected without leaving the connection unusable.
      const oversized = await fetch(`http://127.0.0.1:${port}/v1/work-requests`, {
        method: "POST",
        headers: { authorization: AUTH_TENANT_A, "content-type": "application/json" },
        body: JSON.stringify({ ...validBody, serviceCategory: "x".repeat(64_000) })
      });
      expect(oversized.status).toBe(400);
      await oversized.body?.cancel();

      const reused = await fetch(`http://127.0.0.1:${port}/v1/work-requests`, {
        method: "POST",
        headers: { authorization: AUTH_TENANT_A, "content-type": "application/json" },
        body: JSON.stringify(validBody)
      });
      expect(reused.status).toBe(202);
      await reused.body?.cancel();
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
