# Bluedux v0 Development Plan

> Based on PRD + CLI Spec + UX Mockups

---

## Phase 0 — Infrastructure & Scaffold

**Goal:** Project skeleton in place, CI green, local dev environment boots.

| # | Task | Deliverable | Notes |
|---|------|-------------|-------|
| 0.1 | Monorepo init | `packages/cli`, `packages/web`, `packages/server` | pnpm workspace |
| 0.2 | Backend scaffold | Node.js + SQLite + PocketBase Auth | Express; SQLite via better-sqlite3 and Drizzle |
| 0.3 | Frontend scaffold | Next.js app (shell + Tailwind) | Align CSS variables with UX mockup design tokens |
| 0.4 | CLI scaffold | `bluedux` binary entry + Commander/yargs | Support `--json`, `--help`, `--version` global conventions |
| 0.5 | Database schema v0 | accounts, paths, snapshots, blobs, shares, invites, audit_logs | Migration tool: Drizzle Kit |
| 0.6 | Blob storage layer | Local disk content-addressed store | Abstract the interface for future |
| 0.7 | CI/CD | GitHub Actions: lint + test + build | |

---

## Phase 1 — Authentication

**Goal:** Users can sign up and log in; CLI can obtain and store tokens.

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | PocketBase Auth integration | OAuth / email+password backend |
| 1.2 | Web: Login page | Maps to UX `Login` frame |
| 1.3 | Web: Sign Up page | Maps to UX `Sign Up` frame |
| 1.4 | CLI: `bluedux login` | Temporary HTTP server for callback; token stored in OS keychain / `~/.bluedux/auth.json` |
| 1.5 | CLI: `bluedux logout` | Clear local credentials |
| 1.6 | CLI: `bluedux whoami` | Validate token and display current user |
| 1.7 | Auth middleware | Guard for all subsequent API routes; exit code 2 semantics |
| 1.8 | Audit: login event | Write to audit_logs table |

**Acceptance:** CLI `login` → browser auth completes → `whoami` returns email → `logout` clears credentials.

---

## Phase 2 — Upload & Snapshot

**Goal:** Single-file upload with content-addressed storage and immutable snapshot version chain.

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Server: blob upload API | `POST /api/blobs` — content-addressed (SHA-256 hash) |
| 2.2 | Server: snapshot commit API | `POST /api/snapshots` — associates path + blob hash |
| 2.3 | Server: dedup check API | `POST /api/blobs/check` — client submits hash list, server returns missing items |
| 2.4 | CLI: `bluedux upload <file>` | Local hash → check → upload missing blobs → commit snapshot |
| 2.5 | Markdown dependency scan | Parse `![](relative/path)` image references in `.md` files |
| 2.6 | Missing dependency warnings | Upload succeeds + warnings array (non-blocking) |
| 2.7 | Audit: upload event | Write to audit_logs |

**Acceptance:** `bluedux upload notes.md` → snapshot created → re-uploading identical content skips blob transfer → `.md` with missing images returns warning without failing.

---

## Phase 3 — Web: My Library

**Goal:** Users can browse their files and version history in the browser.

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | Server: list paths API | `GET /api/library` — returns Personal Library file listing |
| 3.2 | Server: file detail API | `GET /api/paths/:path` — metadata + latest snapshot |
| 3.3 | Server: version history API | `GET /api/paths/:path/versions` — snapshot list |
| 3.4 | Server: blob download API | `GET /api/blobs/:hash` — file content |
| 3.5 | Web: Sidebar component | Maps to UX `Component/Sidebar` — My Library / Shared with Me nav |
| 3.6 | Web: My Library page | Maps to UX `My Library` — file list + quick actions |
| 3.7 | Web: File Detail page | Maps to UX `File Detail` — metadata + preview |
| 3.8 | Web: Markdown preview | Inline `.md` rendering (react-markdown or similar) |
| 3.9 | Web: Version History page | Maps to UX `Version History` — snapshot timeline |
| 3.10 | Server + Web: Restore | `POST /api/paths/:path/restore` — creates new snapshot from old one |
| 3.11 | Audit: restore event | Write to audit_logs |

**Acceptance:** Uploaded file visible in web → click to preview → view version history → restore old version (creates new snapshot, history unchanged).

---

## Phase 4 — Sharing

**Goal:** Share files with existing users or invite by email; password protection; canonical link.

| # | Task | Deliverable |
|---|------|-------------|
| 4.1 | Server: create share API | `POST /api/shares` — generates non-guessable `share_token` |
| 4.2 | Server: share password encrypted storage | AES-256 encryption at rest (not one-way hash) |
| 4.3 | Server: invite logic | Target email has no account → create Invite record |
| 4.4 | Server: Resend email integration | Send invite emails |
| 4.5 | CLI: `bluedux share` | Full implementation: `--to`, `--password`, password resolution priority chain |
| 4.6 | Server: list shares API | `GET /api/paths/:path/shares` |
| 4.7 | Server: share management APIs | Change password / revoke / view password (owner-only) |
| 4.8 | Web: Share Settings page | Maps to UX `Share Settings` — list active shares, copy link, view/change password, revoke |
| 4.9 | Audit: share/invite/revoke/password events | Write to audit_logs |

**Acceptance:** CLI share → link generated → password set → web view/change/revoke password → invite email sent.

---

## Phase 5 — Share Recipient Experience

**Goal:** Recipients open share link, pass password check, and view content.

| # | Task | Deliverable |
|---|------|-------------|
| 5.1 | Server: share link resolve API | `GET /api/s/:share_token` — check password requirement |
| 5.2 | Server: share password verify | `POST /api/s/:share_token/verify` |
| 5.3 | Web: Share Link View page | Maps to UX `Share Link View` — password prompt (if required) |
| 5.4 | Web: Shared Content View page | Maps to UX `Shared Content View` — read-only preview |
| 5.5 | Web: Shared with Me page | Maps to UX `Shared with Me` — files shared by others |
| 5.6 | Invite-to-share auto-binding | New user signs up → pending invites auto-convert to active shares |

**Acceptance:** Open share link → enter password → view file → Shared with Me list populated → invited user signs up and share activates automatically.

---

## Phase 6 — Agent API

**Goal:** Expose a JSON API equivalent to the human surface for agent/skill consumption.

| # | Task | Deliverable |
|---|------|-------------|
| 6.1 | API key / scoped token auth | Separate from browser OAuth; agent-specific credentials |
| 6.2 | Agent API routes | Unified `/api/agent/` prefix, reuses core logic |
| 6.3 | Full operation coverage | authenticate, list, upload, snapshot, versions, restore, share, revoke |
| 6.4 | Least-privilege scoping | Token granularity control (read-only / read-write / share-manage) |
| 6.5 | API documentation | OpenAPI spec or equivalent Markdown reference |

**Acceptance:** Agent token can perform all core operations listed in the PRD.

---

## Phase 7 — Hardening & Ship

| # | Task | Deliverable |
|---|------|-------------|
| 7.1 | End-to-end tests | CLI → Server → Web full-chain coverage |
| 7.2 | Rate limiting + security headers | helmet / rate-limit middleware |
| 7.3 | Error handling consistency | All exit codes / JSON error shapes aligned with CLI Spec |
| 7.4 | Audit log query endpoint | Admin use; optional for v0 |
| 7.5 | Docker deployment config | Dockerfile + docker-compose.yml |
| 7.6 | README + user docs | Getting started / CLI reference |

---

## Dependency Graph

```
Phase 0 (Infrastructure)
  │
  ├──► Phase 1 (Auth)
  │      │
  │      ├──► Phase 2 (Upload)
  │      │      │
  │      │      └──► Phase 3 (My Library Web)
  │      │             │
  │      │             └──► Phase 4 (Sharing)
  │      │                    │
  │      │                    └──► Phase 5 (Recipient)
  │      │
  │      └──► Phase 6 (Agent API) ← can parallelize after Phase 3
  │
  └──► Phase 7 (Hardening) ← runs throughout, consolidated at the end
```

---

## Milestones

| Milestone | Phases Included | Demo Capability |
|-----------|----------------|-----------------|
| **M1: Login & Upload** | 0 + 1 + 2 | CLI login + upload + blob dedup |
| **M2: Web Usable** | + 3 | Browse files, versions, and restore in browser |
| **M3: Sharing Loop** | + 4 + 5 | Share + password + invite + recipient view |
| **M4: Agent Ready** | + 6 | Agent API full coverage |
| **M5: v0 Ship** | + 7 | Hardened + deployed + documented |

---

## Tech Decision Notes

- **Monorepo tool:** pnpm workspace (lightweight) or Turborepo (build cache)
- **Backend framework:** Hono (light, fast, TS-first) or Express (larger ecosystem)
- **ORM:** Drizzle (native SQLite support, type-safe)
- **CLI framework:** Commander.js (lightweight, sufficient)
- **Keychain:** `keytar` (node-keytar) or Rust binding
- **Blob hash:** SHA-256, hex-encoded as filename
- **Share token:** `crypto.randomBytes(16).toString('base64url')` — 128-bit non-guessable
- **Password encryption:** AES-256-GCM, key derived from server secret
- **Email:** Resend SDK
- **Deployment:** Docker self-host
