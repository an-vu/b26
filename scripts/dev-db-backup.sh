#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${B26_DATA_DIR:-}" ]]; then
  DB_BASE="$B26_DATA_DIR/b26-dev"
elif [[ -f "$HOME/.b26/b26-dev.mv.db" ]]; then
  DB_BASE="$HOME/.b26/b26-dev"
elif [[ -f "$PWD/backend/data/b26-dev.mv.db" ]]; then
  DB_BASE="$PWD/backend/data/b26-dev"
else
  DB_BASE="$HOME/.b26/b26-dev"
fi
TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${1:-$PWD/backups}"
OUT_FILE="$OUT_DIR/b26-dev-$TS.tgz"

mkdir -p "$OUT_DIR"

if [[ ! -f "$DB_BASE.mv.db" ]]; then
  echo "No dev database found at: $DB_BASE.mv.db"
  echo "Start backend once to create it, then retry."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp "$DB_BASE.mv.db" "$TMP_DIR/"
if [[ -f "$DB_BASE.trace.db" ]]; then
  cp "$DB_BASE.trace.db" "$TMP_DIR/"
fi

tar -czf "$OUT_FILE" -C "$TMP_DIR" .
echo "Source DB: $DB_BASE.mv.db"
echo "Backup created: $OUT_FILE"
