import { describe, test, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";

vi.mock("pocketbase", () => {
  const MockPB = vi.fn();
  MockPB.prototype.collection = vi.fn(() => ({
    authRefresh: vi.fn(),
  }));
  return { default: MockPB };
});

import PocketBase from "pocketbase";
import { authMiddleware } from "../middleware/auth.js";

let server: Server;
let baseUrl: string;

beforeAll(() => {
  if (typeof authMiddleware !== "function") {
    // Middleware not implemented yet — tests will fail on assertions
    return;
  }
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.get("/test", (req, res) => {
    res.json({ user: (req as any).user });
  });

  server = app.listen(0);
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind");
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  if (!server) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("auth middleware", () => {
  test("authMiddleware is exported as a function", () => {
    expect(typeof authMiddleware).toBe("function");
  });

  test("no Authorization header returns 401", async () => {
    expect(baseUrl).toBeDefined();
    const res = await fetch(`${baseUrl}/test`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  test("malformed Authorization header returns 401", async () => {
    expect(baseUrl).toBeDefined();
    const res = await fetch(`${baseUrl}/test`, {
      headers: { Authorization: "NotBearer some-token" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  test("invalid token returns 401 with invalid_token error", async () => {
    expect(baseUrl).toBeDefined();
    const mockCollection = { authRefresh: vi.fn().mockRejectedValue(new Error("Invalid token")) };
    vi.mocked(PocketBase.prototype.collection).mockReturnValue(mockCollection as any);

    const res = await fetch(`${baseUrl}/test`, {
      headers: { Authorization: "Bearer invalid-token-here" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_token" });
  });

  test("valid token populates req.user and calls next()", async () => {
    expect(baseUrl).toBeDefined();
    const userRecord = { id: "user123", email: "test@example.com" };
    const mockCollection = {
      authRefresh: vi.fn().mockResolvedValue({ record: userRecord }),
    };
    vi.mocked(PocketBase.prototype.collection).mockReturnValue(mockCollection as any);

    const res = await fetch(`${baseUrl}/test`, {
      headers: { Authorization: "Bearer valid-token-here" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual(userRecord);
  });

  test("expired token returns 401", async () => {
    expect(baseUrl).toBeDefined();
    const mockCollection = {
      authRefresh: vi.fn().mockRejectedValue(new Error("Token expired")),
    };
    vi.mocked(PocketBase.prototype.collection).mockReturnValue(mockCollection as any);

    const res = await fetch(`${baseUrl}/test`, {
      headers: { Authorization: "Bearer expired-token-here" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_token" });
  });
});
