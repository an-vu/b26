#!/usr/bin/env bash
# Shared connection setup for PostgreSQL backup/restore. Explicit PG* variables win.
B26_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$B26_REPO_ROOT/backend/.env.dev" ]]; then
  set -a
  source "$B26_REPO_ROOT/backend/.env.dev"
  set +a
fi
B26_JDBC_URL="${SPRING_DATASOURCE_URL:-}"
export PGDATABASE="${PGDATABASE:-${B26_JDBC_URL#jdbc:}}"
export PGUSER="${PGUSER:-${SPRING_DATASOURCE_USERNAME:-}}"
export PGPASSWORD="${PGPASSWORD:-${SPRING_DATASOURCE_PASSWORD:-}}"
if [[ -z "$PGDATABASE" ]]; then
  echo 'Set PGDATABASE (and PGHOST/PGUSER), or configure backend/.env.dev.' >&2
  exit 1
fi
