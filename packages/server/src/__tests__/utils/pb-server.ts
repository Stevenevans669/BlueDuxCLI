import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const DEFAULT_PB_BIN = join(
  import.meta.dirname,
  "../../../../..",
  "pocketbase/pocketbase",
);

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to bind"));
        return;
      }
      const { port } = addr;
      server.close(() => resolve(port));
    });
  });
}

async function waitForReady(url: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`PocketBase not ready after ${timeoutMs}ms`);
}

export interface PbInstance {
  url: string;
  process: ChildProcess;
  dataDir: string;
}

export async function startPb(): Promise<PbInstance> {
  const bin = process.env.POCKETBASE_BIN || DEFAULT_PB_BIN;
  const port = await findAvailablePort();
  const dataDir = mkdtempSync(join(tmpdir(), `pb-test-${randomUUID()}-`));
  const url = `http://127.0.0.1:${port}`;

  const child = spawn(bin, [
    "serve",
    "--http",
    `127.0.0.1:${port}`,
    "--dir",
    dataDir,
  ]);

  // Pipe stderr for debugging if needed
  child.stderr?.on("data", () => {});
  child.stdout?.on("data", () => {});

  await waitForReady(url);

  return { url, process: child, dataDir };
}

export function stopPb(instance: PbInstance): void {
  instance.process.kill("SIGTERM");
  try {
    rmSync(instance.dataDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
