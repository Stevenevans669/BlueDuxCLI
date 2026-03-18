# Bluedox CLI Spec v0

## Conventions

- Binary name: `bluedox`
- All commands support `--json` for machine-parseable output
- All commands exit `0` on success, non-zero on failure
- Exit codes:
  - `0` -- success
  - `1` -- general error
  - `2` -- auth error
  - `3` -- validation error
- When `--json` is set, all output (including errors) is JSON to stdout
- Without `--json`, human-readable text goes to stdout, errors to stderr
- Password input priority: `--password <value>` flag > `BLUEDOX_SHARE_PASSWORD` env var > interactive TTY prompt > stdin pipe. Fails with exit `3` if no source available.

---

## `bluedox login`

**Synopsis:**

```
bluedox login [--force] [--json]
```

**Description:** Authenticates the user via browser-based OAuth flow.

**Flags:**

| Flag | Description |
|---|---|
| `--force` | Re-authenticate even if already logged in |
| `--json` | Output result as JSON |

**Behavior:**

1. Generate a one-time session token
2. Start a temporary local HTTP server on a random available port
3. Open `https://<app-host>/auth/cli?session=<token>` in the default browser
4. Wait for the browser callback with auth credentials (timeout: 120s)
5. Store tokens using OS keychain; fall back to `~/.bluedox/auth.json` if keychain unavailable
6. Shut down the local server

**Output (plain):**

```
Logged in as steve@example.com
```

**Output (`--json`):**

```json
{ "status": "ok", "user": "steve@example.com" }
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Browser fails to open | 1 | `Could not open browser. Visit <url> manually.` |
| Timeout (120s) | 1 | `Login timed out. Try again.` |
| Server callback error | 1 | `Login failed: <reason>` |
| Already logged in (no `--force`) | 0 | `Already logged in as <user>. Use --force to re-authenticate.` |

---

## `bluedox whoami`

**Synopsis:**

```
bluedox whoami [--json]
```

**Description:** Displays the currently authenticated user.

**Flags:**

| Flag | Description |
|---|---|
| `--json` | Output result as JSON |

**Behavior:**

1. Read stored credentials from keychain or `~/.bluedox/auth.json`
2. If valid, display user info
3. If no credentials or expired, report not logged in

**Output (plain):**

```
steve@example.com
```

**Output (`--json`):**

```json
{ "status": "ok", "user": "steve@example.com" }
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Not logged in | 2 | `Not logged in. Run bluedox login.` |
| Expired/invalid token | 2 | `Session expired. Run bluedox login.` |

---

## `bluedox upload`

**Synopsis:**

```
bluedox upload <file> [--json]
```

**Description:** Uploads a single file to the user's Personal Library, creating a new Snapshot.

**Arguments:**

| Argument | Description |
|---|---|
| `<file>` | Path to the file to upload (required) |

**Flags:**

| Flag | Description |
|---|---|
| `--json` | Output result as JSON |

**Behavior:**

1. Resolve `<file>` to an absolute path
2. Verify the file exists and is readable
3. If the file is `.md`, parse for relative image references:
   - Extract all standard Markdown image links (`![alt](relative/path)`)
   - Ignore external URLs (http/https)
   - Each relative image target is treated as a dependency
4. Hash the file (and any dependencies) locally using SHA-256
5. Send the hash list to the server; receive back which blobs are missing
6. Upload only missing blobs
7. Commit a new Snapshot for the file's Path in the Personal Library
8. If any referenced images are missing from disk, the upload still succeeds but a warning is returned listing the missing images

**Output (plain):**

```
Uploaded: notes.md (snapshot abc123def)
```

With missing dependencies:

```
Uploaded: notes.md (snapshot abc123def)
Warning: missing dependencies:
  - images/diagram.png
  - assets/photo.jpg
```

**Output (`--json`):**

```json
{
  "status": "ok",
  "file": "notes.md",
  "path": "/notes.md",
  "snapshot": "abc123def",
  "warnings": [
    { "type": "missing_dependency", "path": "images/diagram.png" },
    { "type": "missing_dependency", "path": "assets/photo.jpg" }
  ]
}
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Not logged in | 2 | `Not logged in. Run bluedox login.` |
| File not found | 3 | `File not found: <path>` |
| File not readable | 3 | `Cannot read file: <path>` |
| No file argument | 3 | `Usage: bluedox upload <file>` |
| Server unreachable | 1 | `Could not reach server. Check your connection.` |
| Upload failed | 1 | `Upload failed: <reason>` |

---

## `bluedox share`

**Synopsis:**

```
bluedox share <path> --to <user|email> [--password [<password>]] [--json]
```

**Description:** Creates a viewer-only Share for an existing file in the user's Personal Library.

**Arguments:**

| Argument | Description |
|---|---|
| `<path>` | Path to the file in the Personal Library (required) |

**Flags:**

| Flag | Description |
|---|---|
| `--to <user\|email>` | Target user (username or email, required) |
| `--password [<password>]` | Set a password on the Share (see password resolution below) |
| `--json` | Output result as JSON |

**Password Resolution:**

When `--password` is present, the password value is resolved in this order:

1. **Inline value:** `--password mysecret` -- uses `mysecret`
2. **Environment variable:** `BLUEDOX_SHARE_PASSWORD` -- used if flag is present with no value
3. **TTY prompt:** if running in an interactive terminal, prompts securely (input hidden)
4. **Stdin pipe:** reads from stdin if piped
5. **Failure:** exits with code `3` if none of the above yields a value

**Behavior:**

1. Resolve `<path>` to a Path in the Personal Library
2. Verify the Path exists remotely
3. Resolve the `--to` target:
   - If target matches an existing username or email, create the Share immediately
   - If target is an email with no matching account, create an Invite
   - If target is neither a username nor an email, exit with error
4. If `--password` is provided, attach the password to the Share (encrypted at rest)
5. Return the canonical share link

**Output (plain):**

Share to existing user:

```
Shared: /notes.md -> steve@example.com
Link: https://app.bluedox.io/s/a8f3k2x9
```

Share with invite:

```
Invited: newuser@example.com
Shared: /notes.md -> newuser@example.com (pending invite)
Link: https://app.bluedox.io/s/a8f3k2x9
```

**Output (`--json`):**

```json
{
  "status": "ok",
  "path": "/notes.md",
  "to": "steve@example.com",
  "type": "share",
  "link": "https://app.bluedox.io/s/a8f3k2x9",
  "password_set": true
}
```

With invite:

```json
{
  "status": "ok",
  "path": "/notes.md",
  "to": "newuser@example.com",
  "type": "invite",
  "link": "https://app.bluedox.io/s/a8f3k2x9",
  "password_set": false
}
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Not logged in | 2 | `Not logged in. Run bluedox login.` |
| Path not found remotely | 3 | `Path not found: <path>. Upload it first.` |
| Missing `--to` flag | 3 | `Usage: bluedox share <path> --to <user\|email>` |
| Invalid target (not username or email) | 3 | `Invalid target: <value>. Provide a username or email.` |
| Password required but unavailable | 3 | `No password provided. Pass a value, set BLUEDOX_SHARE_PASSWORD, or use an interactive terminal.` |
| Server unreachable | 1 | `Could not reach server. Check your connection.` |
| Share creation failed | 1 | `Share failed: <reason>` |

---

## Global Behavior

### Authentication

All commands except `login` require valid credentials. If credentials are missing or expired, the command exits with code `2` and a message directing the user to run `bluedox login`.

### Config Directory

`~/.bluedox/` stores:

- `auth.json` -- fallback credential storage (when keychain is unavailable)
- Keyed by app host to support multiple environments

### `--json` Contract

When `--json` is passed:

- Stdout is always a single JSON object
- Errors use the shape: `{ "status": "error", "code": <exit_code>, "message": "<error message>" }`
- Success uses the shape: `{ "status": "ok", ... }` with command-specific fields
- Warnings are included in a `"warnings"` array when present
- No text is written to stderr

### `--help`

All commands support `--help` which prints usage information and exits with code `0`.

```
bluedox --help
bluedox <command> --help
```

### `--version`

```
bluedox --version
```

Prints the CLI version and exits with code `0`.
