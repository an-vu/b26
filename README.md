# BlueBerry 2026

Personal dashboard app where users create customizable pages and manage widgets.

## Tech Stack
- Angular
- Java Spring Boot
- PostgreSQL

## Local development
Requires Node 20.19+ (or a supported newer Node release), Java 21, and PostgreSQL.

1. Install dependencies: `npm ci` and `npm --prefix frontend ci`.
2. Optionally start a local database: `docker compose -f docker-compose.db.yml up -d`.
3. Copy `backend/.env.example` to `backend/.env.dev`. The example matches that local database; replace it for a hosted database.
4. Run `npm run dev` and open `http://localhost:4200`.

The backend runs Flyway before starting. New empty databases use `B21__fresh_install.sql`
then subsequent versioned migrations. Existing databases keep their V1–V21 history and
apply V22 onward. Do not modify applied migrations or run Flyway repair to bypass checksums.
Back up an existing database before upgrading. An existing partially migrated database
requires investigation; the fresh-install baseline is not a repair for it.

The initial system owner has no password. Use **Sign In → Don't Have an Account?** to
create a normal user. Signup atomically creates an empty starter board, pins it as the
user's main board, and opens `/b/<slug>` for editing. Public `/<username>` links resolve
to that main board. Existing accounts and boards are not backfilled by signup.

## Database backup and restore
Install PostgreSQL client tools compatible with your server. These commands use
`backend/.env.dev`, or explicit `PGDATABASE`, `PGHOST`, `PGUSER`, and `PGPASSWORD` variables.
They operate on PostgreSQL, not legacy H2 files.

- Backup: `npm run db:backup` (custom-format archive in `backups/`).
- Restore: stop the app, back up the target, then run `npm run db:restore -- backups/<file>.dump --confirm`.
- Restore replaces objects in the configured target database in one transaction. It does not accept old H2 `.tgz` archives.

## Verification
- Frontend: `npm --prefix frontend test -- --watch=false` and `npm --prefix frontend run build`.
- Backend: `cd backend && ./mvnw test` (Java 21).
- PostgreSQL migrations: additionally set `POSTGRES_TEST_URL` to a JDBC URL, with
  `POSTGRES_TEST_USER` and `POSTGRES_TEST_PASSWORD`. The migration test creates and drops
  its own randomly named schema; use a disposable test database whose user can create schemas.
  Without that URL, the PostgreSQL test is skipped. CI supplies PostgreSQL and runs it.

## Security Notes
- Never commit real `.env.dev` credentials
- Rotate DB password/token immediately if exposed
- Keep `backend/.env.example` placeholders only

---

See the wiki for full documentation.
