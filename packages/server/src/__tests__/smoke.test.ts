import { describe, expect, test } from "vitest";
import app from "../app.js";
import { createDb } from "../db/index.js";
import { migrate } from "../db/migrate.js";

describe("health endpoint", () => {
  test("GET /api/health returns 200 with { status: ok }", async () => {
    const server = app.listen(0);

    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to bind test server");
      }

      const res = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

describe("database connection", () => {
  test("Drizzle connects to in-memory SQLite and executes a query", () => {
    const db = createDb(":memory:");
    const result = db.prepare("SELECT 1 as val").get() as { val: number };
    expect(result).toEqual({ val: 1 });
    db.close();
  });
});

describe("schema migration", () => {
  test("migrations run without throwing", () => {
    const db = createDb(":memory:");
    expect(() => migrate(db)).not.toThrow();
    db.close();
  });

  test("migrations are idempotent (running twice does not throw)", () => {
    const db = createDb(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    db.close();
  });
});
