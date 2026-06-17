import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import { createApp } from "../src/createApp.js";

let server: Server;
let baseUrl = "";

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long";
  process.env.TRASSA_DATA_DIR = `${process.cwd()}/data-test-${Date.now()}`;
  process.env.PORTAL_REGION_GATE = "off";

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  server?.close();
});

async function api(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

describe("API integration", () => {
  it("GET /api/health", async () => {
    const res = await api("/api/health");
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, "trassa-api");
  });

  it("GET /api/portal/region", async () => {
    const res = await api("/api/portal/region");
    const body = (await res.json()) as { ok: boolean };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
  });

  it("POST /api/portal/consent registers device headers", async () => {
    const deviceId = `test-device-${Date.now()}`;
    const res = await api("/api/portal/consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Trassa-Device-Id": deviceId,
        "X-Trassa-Device-Label": "CI Test Phone",
      },
      body: JSON.stringify({ policyVersion: "test-1" }),
    });
    const body = (await res.json()) as { ok: boolean };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);

    const statusRes = await api("/api/devices/status", {
      headers: { "X-Trassa-Device-Id": deviceId },
    });
    const statusBody = (await statusRes.json()) as { ok: boolean; r?: number };
    assert.equal(statusRes.status, 200);
    assert.equal(statusBody.ok, true);
    assert.equal(statusBody.r, 1);
  });

  it("auth register + login + me", async () => {
    const email = `ci-${Date.now()}@example.com`;
    const password = "TestPass123";

    const registerRes = await api("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const registerBody = (await registerRes.json()) as { ok: boolean };
    assert.equal(registerRes.status, 201);
    assert.equal(registerBody.ok, true);

    const loginRes = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = (await loginRes.json()) as { ok: boolean };
    assert.equal(loginRes.status, 200);
    assert.equal(loginBody.ok, true);
    const cookie = loginRes.headers.get("set-cookie");
    assert.ok(cookie);

    const meRes = await api("/api/auth/me", {
      headers: { cookie: cookie ?? "" },
    });
    const meBody = (await meRes.json()) as { ok: boolean; profile?: { email?: string } };
    assert.equal(meRes.status, 200);
    assert.equal(meBody.ok, true);
    assert.equal(meBody.profile?.email?.toLowerCase(), email.toLowerCase());
  });

  it("admin login rejects bad credentials", async () => {
    const res = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.com", password: "wrong" }),
    });
    const body = (await res.json()) as { ok: boolean };
    assert.equal(res.status, 401);
    assert.equal(body.ok, false);
  });
});
