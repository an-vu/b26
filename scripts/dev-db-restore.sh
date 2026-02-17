#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/dev-db-restore.sh <backup-file.tgz>"
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

DB_DIR="${B26_DATA_DIR:-$HOME/.b26}"
DB_BASE="$DB_DIR/b26-dev"

mkdir -p "$DB_DIR"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

if [[ ! -f "$TMP_DIR/b26-dev.mv.db" ]]; then
  echo "Invalid backup: missing b26-dev.mv.db"
  exit 1
fi

cp "$TMP_DIR/b26-dev.mv.db" "$DB_BASE.mv.db"
if [[ -f "$TMP_DIR/b26-dev.trace.db" ]]; then
  cp "$TMP_DIR/b26-dev.trace.db" "$DB_BASE.trace.db"
fi

echo "Restore complete: $DB_BASE.mv.db"
echo "If backend is running, restart it to pick up restored data."
