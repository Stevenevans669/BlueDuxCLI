#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

export POCKETBASE_BIN="${POCKETBASE_BIN:-$REPO_ROOT/pocketbase/pocketbase}"

if [ ! -x "$POCKETBASE_BIN" ]; then
  echo "PocketBase binary not found at: $POCKETBASE_BIN"
  echo "Download it into pocketbase/ or set POCKETBASE_BIN env var."
  exit 1
fi

cd "$REPO_ROOT"
pnpm --filter @bluedux/server test "$@"
