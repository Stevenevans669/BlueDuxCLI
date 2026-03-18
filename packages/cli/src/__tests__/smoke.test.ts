import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bin = resolve(__dirname, "../../bin/bluedux.js");

function run(args: string): string {
  return execSync(`node ${bin} ${args}`, { encoding: "utf-8" }).trim();
}

describe("CLI smoke", () => {
  test("--version prints a semver string", () => {
    const output = run("--version");
    expect(output).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("--help prints usage containing 'bluedux'", () => {
    const output = run("--help");
    expect(output.toLowerCase()).toContain("bluedux");
  });

  test("unknown command exits with non-zero code", () => {
    expect(() => run("nonsense")).toThrow();
  });
});
