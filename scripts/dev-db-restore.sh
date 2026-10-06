#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 2 || "$2" != '--confirm' ]]; then
  echo 'Usage: npm run db:restore -- <backup.dump> --confirm' >&2
  echo 'Restores over the configured PostgreSQL database. Stop the app and back up first.' >&2
  exit 1
fi
[[ -f "$1" ]] || { echo 'Backup file not found.' >&2; exit 1; }
source "$(dirname "${BASH_SOURCE[0]}")/postgres-env.sh"
command -v pg_restore >/dev/null || { echo 'Install PostgreSQL client tools (pg_restore).' >&2; exit 1; }
pg_restore --dbname="$PGDATABASE" --clean --if-exists --no-owner --no-privileges --single-transaction "$1"
echo 'Restore complete.'
