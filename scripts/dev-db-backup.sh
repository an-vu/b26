#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/postgres-env.sh"
command -v pg_dump >/dev/null || { echo 'Install PostgreSQL client tools (pg_dump).' >&2; exit 1; }
OUT_DIR="${1:-$B26_REPO_ROOT/backups}"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/b26-$(date +%Y%m%d-%H%M%S).dump"
TEMP_FILE="$(mktemp "$OUT_DIR/.b26-backup.XXXXXX")"
trap 'rm -f "$TEMP_FILE"' EXIT
pg_dump --format=custom --no-owner --no-privileges --file="$TEMP_FILE"
mv "$TEMP_FILE" "$OUT_FILE"
echo "Backup created: $OUT_FILE"
