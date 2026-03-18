# Bluedux CLI Spec v0

## Conventions

- Binary name: `bluedux`
- All commands support `--json` for machine-parseable output
- All commands exit `0` on success, non-zero on failure
- Exit codes:
  - `0` -- success
  - `1` -- general error
  - `2` -- auth error
  - `3` -- validation error
- When `--json` is set, all output (including errors) is JSON to stdout
- Without `--json`, human-readable text goes to stdout, errors to stderr
- Password input priority: `--password <value>` flag > `BLUEDUX_SHARE_PASSWORD` env var > interactive TTY prompt > stdin pipe. Fails with exit `3` if no source available.

---

## `bluedux login`

**Synopsis:**

```
bluedux login [--force] [--json]
```

**Description:** Authenticates the user via browser-based OAuth flow.

**Flags:**

| Flag | Description |
|---|---|
| `--force` | Re-authenticate even if already logged in |
| `--json` | Output result as JSON |

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

## `bluedux logout`

**Synopsis:**

```
bluedux logout [--json]
```

**Description:** Removes stored credentials and ends the current session.

**Flags:**

| Flag | Description |
|---|---|
| `--json` | Output result as JSON |

**Output (plain):**

```
Logged out.
```

**Output (`--json`):**

```json
{ "status": "ok" }
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Not logged in | 0 | `Not logged in.` |

---

## `bluedux whoami`

**Synopsis:**

```
bluedux whoami [--json]
```

**Description:** Displays the currently authenticated user.

**Flags:**

| Flag | Description |
|---|---|
| `--json` | Output result as JSON |

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
| Not logged in | 2 | `Not logged in. Run bluedux login.` |
| Expired/invalid token | 2 | `Session expired. Run bluedux login.` |

---

## `bluedux upload`

**Synopsis:**

```
bluedux upload <file> [--json]
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
| Not logged in | 2 | `Not logged in. Run bluedux login.` |
| File not found | 3 | `File not found: <path>` |
| File not readable | 3 | `Cannot read file: <path>` |
| No file argument | 3 | `Usage: bluedux upload <file>` |
| Server unreachable | 1 | `Could not reach server. Check your connection.` |
| Upload failed | 1 | `Upload failed: <reason>` |

---

## `bluedux share`

**Synopsis:**

```
bluedux share <path> --to <user|email> [--password [<password>]] [--json]
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
2. **Environment variable:** `BLUEDUX_SHARE_PASSWORD` -- used if flag is present with no value
3. **TTY prompt:** if running in an interactive terminal, prompts securely (input hidden)
4. **Stdin pipe:** reads from stdin if piped
5. **Failure:** exits with code `3` if none of the above yields a value

**Output (plain):**

Share to existing user:

```
Shared: /notes.md -> steve@example.com
Link: https://app.bluedux.io/s/a8f3k2x9
```

Share with invite:

```
Invited: newuser@example.com
Shared: /notes.md -> newuser@example.com (pending invite)
Link: https://app.bluedux.io/s/a8f3k2x9
```

**Output (`--json`):**

```json
{
  "status": "ok",
  "path": "/notes.md",
  "to": "steve@example.com",
  "type": "share",
  "link": "https://app.bluedux.io/s/a8f3k2x9",
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
  "link": "https://app.bluedux.io/s/a8f3k2x9",
  "password_set": false
}
```

**Errors:**

| Condition | Exit | Message |
|---|---|---|
| Not logged in | 2 | `Not logged in. Run bluedux login.` |
| Path not found remotely | 3 | `Path not found: <path>. Upload it first.` |
| Missing `--to` flag | 3 | `Usage: bluedux share <path> --to <user\|email>` |
| Invalid target (not username or email) | 3 | `Invalid target: <value>. Provide a username or email.` |
| Password required but unavailable | 3 | `No password provided. Pass a value, set BLUEDUX_SHARE_PASSWORD, or use an interactive terminal.` |
| Server unreachable | 1 | `Could not reach server. Check your connection.` |
| Share creation failed | 1 | `Share failed: <reason>` |

---

## Global Behavior

### Authentication

All commands except `login` require valid credentials. If credentials are missing or expired, the command exits with code `2` and a message directing the user to run `bluedux login`.

### Config Directory

`~/.bluedux/` stores:

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
bluedux --help
bluedux <command> --help
```

### `--version`

```
bluedux --version
```

Prints the CLI version and exits with code `0`.
