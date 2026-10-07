# BlueBerry 26

Personal dashboard app where users create customizable pages and manage widgets.

## Current milestone

**1.3.0 username search is implemented and tested locally**, following 1.2.0 URLs and 1.2.1 documentation cleanup. Hosted verification is pending. Next: settings persistence (1.4.0), then advanced controls/release checks (1.5.0).

Appearance persistence and permission matrices remain unfinished. Keep their existing controls visible. Track scope in the [release roadmap](https://github.com/an-vu/b26/wiki/Release-Roadmap).

## Tech Stack

- Angular
- Java Spring Boot
- PostgreSQL

## Quick local setup (Docker only)

Install and open Docker Desktop. From this repo, run:

```bash
./setup.sh
```

The script builds the frontend/backend, starts PostgreSQL, applies migrations, and
waits for health checks. No Node, Java, or `.env` setup is required on your computer.
Open [local sign-in](http://localhost:4200/signin) and use `anvu@local` with any placeholder password.
Open `/anvu/default` to edit as the seeded admin (`/b/default` still works).

This local-only setup enables password bypass and binds the website to loopback; the API/database stay inside Docker.
It uses `docker-compose.local.yml` and its own `b26-local` database volume, separate
from existing Compose workflows and hosted data. It does not load `.env.dev`.
Check API health through `http://localhost:4200/actuator/health`; port 8080 is not published in this workflow.
Stop with `./setup.sh stop` (data is retained), inspect with `./setup.sh logs`, and
rerun `./setup.sh` to start or rebuild after code changes. Builds do not live-reload.
If port 4200 is already occupied, stop the other local frontend first.

For code editing with live frontend reload, use the workflow below.

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
user's main board, and opens `/<username>/<slug>` for editing. Public `/<username>` links resolve
to that main board. Existing accounts and boards are not backfilled by signup.

## Database backup and restore

Install PostgreSQL client tools compatible with your server. These commands use
`backend/.env.dev`, or explicit `PGDATABASE`, `PGHOST`, `PGUSER`, and `PGPASSWORD` variables.
They operate on PostgreSQL, not legacy H2 files.

- Backup: `npm run db:backup` (custom-format archive in `backups/`).
- Restore: stop the app, back up the target, then run `npm run db:restore -- backups/<file>.dump --confirm`.
- Restore replaces objects in the configured target database in one transaction. It does not accept old H2 `.tgz` archives.

## Username search and demo accounts

Click the yellow **Search** dot, then type at least two username characters. Search is case-insensitive, accepts a leading `@`, and returns up to 10 users. Select a result to open their main board. Empty results and request failures have separate messages; failed requests can be retried. Escape closes the dialog.

`./setup.sh` adds these local demo users, each with a main board:

`@blueberry` · `@news` · `@feature` · `@daily` · `@emma` · `@victoria` · `@nori`

Try `em`, `ne`, or `@blue`. With local password bypass, you can sign in as `emma@demo.local` (or another demo username at `demo.local`) using any placeholder password. Existing users and their edits are not overwritten on restart.

Demo seeding is opt-in through `APP_DEMO_USERS_ENABLED=true`, enabled in `docker-compose.local.yml` only, and excluded from the `prod` profile. It defaults to false elsewhere. For host development, enable it in your local env file and restart; use the local password bypass to sign into these passwordless fixtures.

The public `GET /api/search/users?q=...` endpoint returns only `username` and `displayName`. Queries are limited to 64 characters after trimming an optional `@`. Debouncing limits browser requests; it is not server-side rate limiting.

## Board URLs

- `/{username}/{boardSlug}` opens a board belonging to that user.
- `/{username}` opens their main board. System routes (`/`, `/signin`, `/settings`, `/insights`) retain their existing behavior.
- Existing `/b/{boardSlug}` and `/u/{boardSlug}` links still work. New account, signup, and create-board links use the owner-qualified URL.
- Slugs remain **globally unique** in 1.2.0, so legacy links and existing widget/write APIs remain unambiguous. Two users cannot claim the same slug.
- Renaming a username updates generated board links; the old username path returns not found. Legacy links still work if the slug is unchanged.
- Renaming a board slug changes both URL forms. Old slugs are not retained as aliases. Main-board preferences follow the stable board ID.
- Username and slug formats use lowercase letters, numbers, and single hyphens. Usernames `b`, `u`, `api`, `actuator`, `insights`, `settings`, `signin`, `signup`, and `assets` are reserved.

The public lookup `GET /api/board/by-owner/{username}/{slug}` validates ownership;
missing users, missing boards, and mismatched owners return 404. Board responses include
`ownerUsername`. Existing APIs and write authorization stay in place.

### Rollout and rollback

No schema migration or new index is needed: existing unique username/slug indexes and
owner references support this lookup. Deploy the backend first, then the frontend.
Before rollout, check existing usernames against the reserved list; older profile edits
could have bypassed that rule. Resolve conflicts with the account owner rather than
silently renaming them.

After deployment, open a canonical link directly and refresh it; check the main-board,
legacy, signup, edit/save, rename, and delete flows. Watch API 404/5xx responses and
browser errors. Hosting must serve the Angular app for nested non-API paths (existing
Vercel/Nginx SPA fallbacks). Roll back the frontend before the backend if necessary;
no data rollback is required. Shared canonical links require the new routing code.

## Board editing

Opening Edit loads a consistent board/widget snapshot with its revision. Done submits
metadata and all widgets to `PUT /api/board/{slug}/editor` in one transaction. A stale
revision returns HTTP 409 and keeps the local drafts; cancel and reopen the editor to
load the latest board. Navigation and browser reload warn about unsaved changes.

Board name/URL changes have explicit Save and Cancel controls. Set Main Board in the
account menu persists the selection only after the server accepts it. Existing API
endpoints remain available; their writes also advance the board revision.

Deletion requires owner/admin access and confirmation. The last board, main board, and system-route boards are protected. Choose replacements before deleting a main/system board. Failure keeps drafts; deleting the active board redirects to the main board or home fallback.

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

[Start here](https://github.com/an-vu/b26/wiki) · [Docker setup](https://github.com/an-vu/b26/wiki/Docker) · [Page URLs](https://github.com/an-vu/b26/wiki/Pages-and-Editing) · [Release roadmap](https://github.com/an-vu/b26/wiki/Release-Roadmap)
