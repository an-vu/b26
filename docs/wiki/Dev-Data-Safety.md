# Database, migrations, and backups

**The application now uses PostgreSQL.** The old `~/.b26/b26-dev.mv.db` and `B26_DATA_DIR` instructions described the previous H2 workflow. They do not describe the current app or backup scripts.

## Where local data lives

`./setup.sh` uses `b26-local_local-postgres`. The separate `docker-compose.db.yml` workflow uses `b26-local-postgres` with its own Compose project prefix. These are different databases.

`./setup.sh stop` retains the preview data. Removing volumes deletes data.

A hosted database stores data with its provider. Check the active datasource settings before running a backup or restore.

## Home layout preview

Signed-in Home on localhost includes a development-only sample feed using snapshots of seven generated demo boards, with music embeds, illustrated link widgets, mixed tile sizes, and suggested-board cards. Relative times are sample labels, not publication timestamps. Production builds and signed-out Home do not show this preview. Following and live publishing are not implemented by this prototype.

Regenerate the fixtures from the repository root while the local Compose stack is running:

```bash
docker compose --project-name b26-local --file docker-compose.local.yml exec -T frontend node --input-type=module < scripts/seed-home-preview.mjs > frontend/src/app/pages/app-pages/home-preview-data.ts
```

This creates or resets only `home-preview-<username>` sample boards for the existing local demo users. It makes those sample boards public in the local database and replaces their sample widgets. Other boards and main-board preferences are preserved. Home reads the generated snapshot; rerun the command to refresh that snapshot after changing the fixture script.

## Migrations

- New empty databases use **`B21__fresh_install.sql`**, then later versioned migrations.
- Existing databases with V1–V21 history keep those migrations/checksums and apply **V22 onward**.
- V22 removes the obsolete required signup-route column.
- Hibernate validates the migrated schema; it does not create the normal application schema.
- The baseline is not a repair for a partially migrated existing database.

Do not edit already-applied migrations or run Flyway repair merely to silence an error. Add a new migration for a new schema change and test both fresh installation and upgrades.

The preview database does not publish a host port. Use the container backup commands below for that workflow.

## Backup using host tools

Requires PostgreSQL client tools (`pg_dump`, `pg_restore`) compatible with the server, plus npm for these wrapper commands.

From the repo root:

```bash
npm run db:backup
```

This produces a custom-format `.dump` archive in `backups/`. The scripts read `backend/.env.dev`; explicit PostgreSQL `PG*` connection variables can select a different target.

For the older manual Compose database with port 5432 published, override its Docker-only hostname when running host tools. This does not reach the setup-script preview database:

```bash
PGDATABASE='postgresql://localhost:5432/b26' PGUSER=b26 PGPASSWORD=b26-local-only npm run db:backup
```

## Backup without host PostgreSQL tools

For the `./setup.sh` preview database, run in the repo root:

```bash
mkdir -p backups
docker compose -p b26-local -f docker-compose.local.yml exec -T postgres \
  pg_dump -U b26 -d b26 --format=custom --no-owner --no-privileges \
  > "backups/b26-$(date +%Y%m%d-%H%M%S).dump"
```

Check the command succeeded; a failed shell redirection can leave an empty or partial file. This command targets only the supplied local database, not a hosted service.

## Restore

Restore replaces objects in the selected target database. Stop the application first, back up the current target, and verify which database the connection selects.

With host client tools:

```bash
npm run db:restore -- backups/<file>.dump --confirm
```

For the setup-script preview database without host tools:

```bash
docker compose -p b26-local -f docker-compose.local.yml stop backend frontend
docker compose -p b26-local -f docker-compose.local.yml exec -T postgres \
  pg_restore -U b26 -d b26 --clean --if-exists --no-owner --no-privileges --single-transaction \
  < backups/<file>.dump
```

Replace `<file>` with the actual archive name. Once restore succeeds, run `./setup.sh` to start the app again. The host scripts also perform restore in a single transaction.

Old H2 `.tgz` backups are not PostgreSQL archives and cannot be restored by these commands. Treat any H2-to-PostgreSQL data transfer as a separate migration task.
