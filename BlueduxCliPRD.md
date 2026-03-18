# Bluedux Lite PRD

## Product

Bluedux is a private, Markdown-aware file cloud for individuals and agents.

It has two surfaces:

- **Human surface:** CLI + web app
- **Agent surface:** JSON API / Skill

Each Account owns one **Personal Library**. All uploads go there.  
Bluedux v0 does **not** have team workspaces.

---

## Core Model

- **Account**  
    An authenticated user.
    
- **Personal Library**  
    The Account's private root namespace.
    
- **Path**  
    A file path inside a Personal Library.
    
- **Snapshot**  
    An immutable version of a Bound Path after a successful upload.
    
- **Share**  
    A path-based access point where any visitor can view the content by navigating to the path, optionally protected by a password.
    
- **Invite**  
    A pending Share sent to an email that does not yet have an Account.
    

Shared content stays owned by the sender. It is not copied into the recipient's Personal Library.

A Share points to a **live Path**, not a frozen Snapshot. Recipients see the current state of that Path.

Because the owner must be able to view the password later, share passwords are stored **encrypted at rest**, not one-way hashed.

---

## v0 Scope

### In Scope

- Browser-based login from the CLI
- Upload a single file
- Scan Markdown files for linked local dependencies
- Prevent incomplete uploads when dependencies are missing
- Store immutable Snapshots
- Share a file with an existing user
- Invite by email when the user does not exist
- Optional password on each Share
- Canonical share link on each Share
- Web views for:
    - **My Library**
    - **Shared with Me**
    - file detail
    - version history
    - restore
    - share settings
- Agent API for the same core actions

### Out of Scope

- Team workspaces
- Real-time collaboration
- Background sync
- Git compatibility, branching, or merging
- Edit access on shared content
- Rich document editing
- Custom Markdown dialects beyond standard relative links and images

---

## CLI

### `Bluedux login`

Authenticates the user in the browser.

Behavior:

- CLI starts a temporary login session
- browser opens to the login page
- user completes auth in the browser
- CLI receives tokens and stores them locally

Storage:

- use OS keychain when available
- otherwise fall back to `.bluedux/auth.json`

### `Bluedux upload <file>`

Uploads a single file.

Behavior:

- accepts one file path per invocation
- each successful upload creates one new Snapshot for the Bound Path

Markdown behavior:

- for every `.md` file in the upload set:
    - parse standard relative image references
    - treat each relative image target as a dependency
    - ignore external URLs
- if any referenced image is missing from the upload set, the upload still succeeds but returns a warning listing the missing images

Upload behavior:

- hash files locally
- ask the server which blobs are missing
- upload only missing blobs
- commit a new Snapshot

### `Bluedux share <path> --to <user|email> [--password <password>]`

Creates a Share for an existing file

Behavior:

- `<path>` is resolved relative to the Directory and maps to the corresponding Path in the Personal Library
- the Path must already exist remotely
- target can be:
    - existing username
    - existing email
    - new email
- if the target user exists, create the Share immediately
- if the target user does not exist:
    - if an email is already provided, create an Invite
    - otherwise prompt for an email, then create an Invite
- if `--password` is provided, require that password before the recipient can open the Share
- return the canonical share link

CLI rule:

- `--password <password>` is supported
- `--password` with no value should prompt securely to avoid shell history leaks

v0 rules:

- Shares are **viewer-only**
- only the owner can create, modify, or revoke Shares

---

## Share Link Format

Every Share has one canonical link:

`https://<app-host>/s/<share_token>`


Rules:

- `share_token` is opaque and non-guessable
- the URL does not expose the  path, recipient, or password
- the same format is used for:
    - direct Shares to existing users
    - Invites to new emails
- revoking a Share invalidates its link

Open flow:

1. recipient opens the share link
2. if the Share has a password, the app prompts for the password
3. after successful password check, the app opens the shared Path



---

## Web App

### My Library

Shows content the user owns.

Quick actions on a file

- preview
- view versions
- share
- restore
- view password

The **share** action opens **Share Settings**.

### Share Settings

Shows all active Shares on the selected Path.

Per-share actions:

- copy share link
- view password
- change password
- revoke share

Rules:

- `view password` is owner-only
- `view password` appears only when a password exists

### Shared with Me

Shows content shared by other users.

Includes:

- shared file
- owner
- latest update time

Recipients can open and preview shared content, but they cannot:

- view the password
- change the password
- revoke the Share
- re-share the content

### File Detail

Shows:

- metadata
- preview when supported
- version history
- restore action
- share settings

Restore is owner-only in v0.  
Restore never mutates history. It creates a new Snapshot.

Because Shares point to a live Path, recipients see the restored state after restore.

---

## Agent Surface

Bluedux exposes the same core system to agents through a stable JSON API / Skill.

Core operations:

- authenticate
- list accessible files
- resolve Markdown dependencies
- upload blobs
- create Snapshot
- list versions
- restore a prior version
- create Share
- list Shares on a Path
- read share link and password as owner
- revoke Share

Principles:

- same backend as the human surface
- explicit, stable operations
- no UI emulation
- scoped credentials with least privilege

---

## System Design

### Stack

- **Frontend:** React / Next.js
- **Backend:** Node.js
- **Auth:** PocketBase
- Mail: Resend
- **Metadata DB:** SQLite
- **Blob Storage:** local disk first, S3-compatible later
- **Versioning:** custom Snapshot engine

### Storage Model

It uses:

- **content-addressed blobs** for file contents
- **immutable Snapshots** for version history
- **database-backed ACL and metadata** for sharing, invites, and audit logs

This matches the product model better than a source-control model.

---

## Access Control and Audit

Access is enforced at the application layer.

Minimum auditable actions:

- login
- upload
- share create
- invite create
- password view
- password change
- share revoke
- restore

---

## MVP Definition

Bluedux v0 is done when a user can:


1. run `Bluedux login`
2. complete browser login
3. upload a Markdown file with all required local dependencies
4. view content in **My Library**
5. create a Share to an existing user or invited email
6. set an optional password on that Share
7. get a canonical share link
8. view, change, or revoke the share password as the owner
9. receive content in **Shared with Me**
10. open shared content after auth and password check
11. inspect version history and restore a prior version
12. perform the same core actions through the agent API

---

## Product Positioning

**Bluedux is a Markdown-aware private file cloud with snapshots, sharing, and agent-native APIs.**