# Run everything with Docker

Open Docker Desktop, then run this from the repo root:

```bash
./setup.sh
```

The first run downloads dependencies, builds both apps, starts PostgreSQL, applies migrations, and waits for health checks. No Java, Node, Maven, PostgreSQL, or `.env` copy is needed on your computer.

1. Open [local sign-in](http://localhost:4200/signin).
2. Use `anvu@local` with any placeholder password for the seeded local admin.
3. Open [the sample board](http://localhost:4200/anvu/default), or create a normal account through the signup toggle.

## Everyday commands

```bash
./setup.sh         # Start; rebuild backend/config changes
./setup.sh logs    # Recent startup/service logs
./setup.sh stop    # Stop containers; keep local data
```

The frontend runs Angular’s development server inside Docker. `frontend/src` and `frontend/public` are mounted and watched with polling, so edits live-reload. Container dependencies stay separate from host `node_modules`. Rerun `./setup.sh` after backend, dependency, or build-configuration changes. [Host development](Getting-Started-%28Local%29) is an alternative.

## What this setup uses

- `docker-compose.local.yml`, with Compose project name `b26-local`.
- A dedicated PostgreSQL volume: `b26-local_local-postgres`.
- Local password bypass: `APP_AUTH_REQUIRE_PASSWORD=false`.
- Website bound to `127.0.0.1:4200`. API and database ports stay inside Docker.
- No `.env.dev`, Neon connection, or hosted configuration changes.

Check health through [the frontend proxy](http://localhost:4200/actuator/health), or run:

```bash
docker compose -p b26-local -f docker-compose.local.yml ps
```

This workflow is for local preview, not deployment or phone/LAN access. Keep password checks enabled in hosted environments.

## Host development database

`docker-compose.db.yml` only starts PostgreSQL for [host development](Getting-Started-%28Local%29) (`npm run dev` with `backend/.env.dev`). Its database volume is different from this one, so the two workflows do not share data.

[Dev login](Dev-Login-and-Accounts) · [Database and backups](Dev-Data-Safety) · [Troubleshooting](Troubleshooting)
