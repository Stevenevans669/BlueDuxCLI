import { describe, test, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { startPb, stopPb, type PbInstance } from "./utils/pb-server.js";
import { authMiddleware } from "../middleware/auth.js";

let pb: PbInstance;
let server: Server;
let expressUrl: string;

const TEST_EMAIL = "testuser@example.com";
const TEST_PASSWORD = "testPassword123!";

// Skip integration tests if PocketBase binary is not available
const pbBinExists = await (async () => {
  try {
    const { accessSync } = await import("node:fs");
    const { join } = await import("node:path");
    const bin =
      process.env.POCKETBASE_BIN ||
      join(import.meta.dirname, "../../../../..", "pocketbase/pocketbase");
    accessSync(bin);
    return true;
  } catch {
    return false;
  }
})();

const describeIntegration = pbBinExists ? describe : describe.skip;

describeIntegration("auth flow (integration)", () => {
  beforeAll(async () => {
    pb = await startPb();

    const app = express();
    app.use(express.json());

    // Set PB URL so middleware knows where to validate tokens
    process.env.POCKETBASE_URL = pb.url;

    app.get("/api/me", authMiddleware, (req, res) => {
      res.json({ user: (req as any).user });
    });

    server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("Failed to bind");
    expressUrl = `http://127.0.0.1:${addr.port}`;
  }, 30_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    if (pb) stopPb(pb);
    delete process.env.POCKETBASE_URL;
  });

  test("register a new user via PB API returns token", async () => {
    const res = await fetch(
      `${pb.url}/api/collections/users/records`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          passwordConfirm: TEST_PASSWORD,
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
  });

  test("login with correct credentials returns token", async () => {
    const res = await fetch(
      `${pb.url}/api/collections/users/auth-with-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
  });

  test("valid token on GET /api/me returns 200 with user email", async () => {
    // Login to get a real token
    const loginRes = await fetch(
      `${pb.url}/api/collections/users/auth-with-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      },
    );
    const { token } = await loginRes.json();

    const res = await fetch(`${expressUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(TEST_EMAIL);
  });

  test("fake token on GET /api/me returns 401", async () => {
    const res = await fetch(`${expressUrl}/api/me`, {
      headers: { Authorization: "Bearer fake-forged-token-value" },
    });
    expect(res.status).toBe(401);
  });

  test("register with duplicate email returns 400", async () => {
    const res = await fetch(
      `${pb.url}/api/collections/users/records`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          passwordConfirm: TEST_PASSWORD,
        }),
      },
    );
    expect(res.status).toBe(400);
  });

  test("login with wrong password returns 400", async () => {
    const res = await fetch(
      `${pb.url}/api/collections/users/auth-with-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: TEST_EMAIL,
          password: "wrongPassword999!",
        }),
      },
    );
    expect(res.status).toBe(400);
  });
});
