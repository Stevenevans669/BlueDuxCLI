# Prompt: Generate Phase 0 Smoke Tests for Bluedux v0

## Context

You are working on **Bluedux**, a private Markdown-aware file cloud with three surfaces: CLI, Web App, and Agent API.

The monorepo structure is:

```
bluedux/
├── packages/
│   ├── server/     # Hono + better-sqlite3 + Drizzle ORM
│   ├── cli/        # Commander.js, binary entry: `bluedux`
│   └── web/        # Next.js + Tailwind
├── pnpm-workspace.yaml
├── package.json
└── vitest.workspace.ts   # (create if not exists)
```

## Tech Stack

- **Monorepo:** pnpm workspace
- **Test framework:** Vitest (each sub-package has its own `vitest.config.ts`)
- **Server:** Hono (TypeScript), SQLite via better-sqlite3, Drizzle ORM + Drizzle Kit migrations
- **CLI:** Commander.js, binary entry at `packages/cli/bin/bluedux.js`
- **Web:** Next.js (no unit tests needed at this phase — `next build` success is the test)
- **Blob storage:** Local disk, content-addressed by SHA-256 hex hash

## Task

Generate smoke tests for **Phase 0 (Infrastructure & Scaffold)** only. These tests verify that the project skeleton works — not business logic. Every test should be minimal, fast, and runnable in CI.

### 1. `packages/server/src/__tests__/smoke.test.ts`

Test the following:

- **Health endpoint:** `GET /api/health` returns HTTP 200 and a JSON body `{ status: "ok" }`.
- **Database connection:** Drizzle can connect to an in-memory SQLite (`:memory:`) and execute a trivial query without throwing.
- **Schema migration:** `drizzle-kit` migrations apply cleanly on a fresh `:memory:` database. Tables created: `accounts`, `paths`, `snapshots`, `blobs`, `shares`, `invites`, `audit_logs`.
- **Migration idempotency:** Running migrations twice on the same database does not throw.

### 2. `packages/server/src/__tests__/blob-store.test.ts`

The blob store module exposes an interface like:

```ts
interface BlobStore {
  put(content: Buffer): Promise<string>;   // returns SHA-256 hex hash
  get(hash: string): Promise<Buffer>;      // retrieves content by hash
  exists(hash: string): Promise<boolean>;  // check existence
}
```

Test the following:

- **Store and retrieve:** `put(content)` → `get(hash)` returns identical content.
- **Dedup / deterministic hash:** Calling `put` twice with the same content returns the same hash; the file on disk is not duplicated.
- **Missing blob:** `get('nonexistent_hash')` throws or returns null (match whichever convention the implementation uses).
- **exists() correctness:** Returns `false` before `put`, `true` after.

Use a temporary directory (`fs.mkdtemp`) for the blob store root in tests; clean up in `afterAll`.

### 3. `packages/cli/src/__tests__/smoke.test.ts`

Test the following (use `execSync` or `execa`):

- **`--version`** prints a semver string (e.g. `0.0.1`) and exits with code 0.
- **`--help`** prints usage text containing `bluedux` and exits with code 0.
- **Unknown command** (`bluedux nonsense`) exits with a non-zero exit code.

### 4. CI Validation (no test file needed — just verify)

Confirm that the following commands succeed as a CI smoke check:

```bash
pnpm --filter server test
pnpm --filter cli test
pnpm --filter web build
```

## Constraints

- Do NOT generate tests for authentication, upload, sharing, or any Phase 1+ features.
- Do NOT use Jest. Use Vitest only.
- Each test file must be self-contained — no shared test fixtures across packages.
- Use `describe` / `test` blocks, not `it`.
- Use in-memory SQLite (`:memory:`) for all database tests — no persistent test databases.
- Keep each test under 20 lines. Prefer clarity over cleverness.
- If a module under test does not exist yet, create both the minimal implementation AND the test. The implementation should be just enough to make the test pass (skeleton code).

## Output

For each file you create or modify, state the full path relative to the monorepo root.
