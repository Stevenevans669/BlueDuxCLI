import { describe, test, expect } from "vitest";
import app from "../app.js";
import { createDb } from "../db.js";
import { migrate } from "../migrate.js";

describe("health endpoint", () => {
  test("GET /api/health returns 200 with { status: ok }", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("database connection", () => {
  test("Drizzle connects to in-memory SQLite and executes a query", () => {
    const db = createDb(":memory:");
    const result = db.run("SELECT 1 as val");
    expect(result).toBeDefined();
  });
});

describe("schema migration", () => {
  test("migrations run without throwing", () => {
    const db = createDb(":memory:");
    expect(() => migrate(db)).not.toThrow();
  });

  test("migrations are idempotent (running twice does not throw)", () => {
    const db = createDb(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
  });
});
