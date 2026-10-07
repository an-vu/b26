#!/usr/bin/env bash
set -euo pipefail

# Resolve paths from this file, even when invoked from another directory.
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_dir"

if ! command -v docker >/dev/null 2>&1; then
  echo "Install Docker Desktop, open it, then run this script again." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is missing. Install/update Docker Desktop, then try again." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not reachable. Open Docker Desktop and wait until its engine is running, then try again." >&2
  exit 1
fi

compose=(docker compose --project-name b26-local --file "$repo_dir/docker-compose.local.yml")
case "${1:-start}" in
  start)
    echo "Starting B26 with frontend live reload. The first run downloads dependencies and can take several minutes."
    if ! "${compose[@]}" up --build --detach --wait --wait-timeout 240; then
      echo "Setup did not finish. Check that port 4200 is free." >&2
      "${compose[@]}" logs --tail=60 >&2 || true
      echo "Run ./setup.sh logs for details, then rerun ./setup.sh after fixing the error." >&2
      exit 1
    fi
    cat <<'HELP'

B26 is ready: http://localhost:4200/signin
Local admin email: anvu@local
Password: any placeholder (local password bypass is enabled)
Edit the starter board: http://localhost:4200/b/default

Stop: ./setup.sh stop
Logs: ./setup.sh logs
Start/update dependencies or backend: ./setup.sh

Frontend source edits now update automatically in your browser.

Data persists in the b26-local Docker volume. This is a separate local database;
your existing .env files and hosted database are not used.
HELP
    ;;
  stop) "${compose[@]}" down ;;
  logs) "${compose[@]}" logs --tail=100 ;;
  *) echo "Usage: ./setup.sh [start|stop|logs]" >&2; exit 2 ;;
esac
