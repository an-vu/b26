# Development and operations reference

Moved from the repository README on October 7, 2026. Local behavior is updated below; the dated deployment audit remains historical. This is a holding page for detailed material pending a broader wiki cleanup.

Personal dashboard app where users create customizable pages and manage widgets.

## Current milestone

As of October 8, 2026, the latest local release commit is **1.5.3** (`93a2e2b`), following 1.5.2 (`6d712dd`). Profile/sidebar editing, automatic board settings, panel redesigns, and performance refinements are **committed in 1.5.3**. The About panel displays **Version 26.1**; this display label is not a Git tag or deployment identifier.

Hosting checked October 8, 2026: Vercel production is Ready on 1.5.3; Render’s retry of 1.5.3 is live; Neon production has successful V30/V31 migrations. See deployment notes for evidence. The October 6 audit below remains historical evidence. Permission matrices, full insights, and social counts remain unfinished.

## Tech Stack

- Angular
- Java Spring Boot
- PostgreSQL

## Quick local setup (Docker only)

Install and open Docker Desktop. From this repo, run:

```bash
./setup.sh
```

The script starts the frontend development server, builds the backend, starts PostgreSQL, applies migrations, and
waits for health checks. No Node, Java, or `.env` setup is required on your computer.
Open [local sign-in](http://localhost:4200/signin) and use `anvu@local` with any placeholder password.
Open `/anvu/default` to edit as the seeded admin (`/b/default` still works).

This local-only setup enables password bypass and binds the website to loopback; the API/database stay inside Docker.
It uses `docker-compose.local.yml` and its own `b26-local` database volume, separate
from existing Compose workflows and hosted data. It does not load `.env.dev`.
Check API health through `http://localhost:4200/actuator/health`; port 8080 is not published in this workflow.
Stop with `./setup.sh stop` (data is retained), inspect with `./setup.sh logs`, and
rerun `./setup.sh` to start or rebuild after backend, dependency, or build-config changes.
Frontend files under `frontend/src` and `frontend/public` are mounted into Docker;
Angular watches them with polling and updates the browser automatically after edits.
Container dependencies stay separate from host `node_modules`.
If port 4200 is already occupied, stop the other local frontend first.

The workflow below is an alternative for running development tools directly on your computer.

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

## Board appearance

Open the board-name button in the bottom toolbar. Theme, background color, pattern/intensity, light mode, widget radius, and widget spacing save automatically. Board name and URL save on blur or Enter. Reset to default also saves automatically; there are no settings Save/Cancel buttons. Failed saves keep the draft and offer Retry saving; successful-save feedback disappears automatically.

Five themes: **Berry**, **Aero**, **Aqua**, **Omakase**, and **Kiwi**. The Light switch controls light/dark mode independently. Nine background colors blend into the wallpaper, with darker tinting in dark mode. Patterns are None, Stars, Snow, Meteor, Rainfall, Sakura, and Wave. Clicking a selected animated pattern cycles its light/medium/heavy intensity. Visitors see saved appearance; writes remain owner/admin only.

The theme picker uses five previews in one row. Theme, color, and pattern labels reflect the hovered choice, then return to the selection. Settings tools run left to right: board switcher, Reset to default, red Delete board. The switcher selects boards and sets the main board; on smaller screens it occupies the settings panel instead of opening beside it.

## Board themes (local development)

Berry preserves the stored `default` family; Aero uses `frutiger-aero`; Omakase keeps the legacy internal spelling `omahakase`. Aqua and Kiwi use `aqua` and `kiwi`. These persisted IDs are not display names.

Aero uses blue-green glass and aurora artwork. Aqua draws on Mountain Lion/Mavericks and older iOS materials. Omakase combines dark surfaces, pink sakura glass, and warm amber accents. Kiwi draws on translucent gaming hardware and luminous green glass.

V23 adds appearance defaults; V24 adds theme family independently of light/dark mode; V25 adds Aqua; V26 adds Rainfall; V27 adds intensity; V28 adds Omakase; V29 adds Kiwi. Migrations V30 and V31, committed in 1.5.3, add the profile website field and widget spacing. Preserve applied migration checksums and deploy the backend before the frontend. No hosted rollout is implied by these local changes.

See [Appearance and panels](Board-Appearance-and-Panels) for the current interface.

## Production deployment checks

**Historical audit plus rollout guidance:** provider observations below were recorded October 6, 2026. Reconfirm actual deployed commits, settings, and migration history before the next rollout.

- Frontend: `https://blueberry2026.vercel.app` (the old `b26-frontend.vercel.app` redirects here).
- Vercel root: `frontend`; build: `npm run build`; output: `dist/b26`.
- Render build context: `backend`; Dockerfile: `backend/Dockerfile`; health path: `/actuator/health`.
- Deploy the backend before the frontend. Review every pending migration, including committed V30–V31; do not change older applied migrations.

Required Render settings (keep connection credentials in the provider dashboard):

```dotenv
SPRING_PROFILES_ACTIVE=prod
APP_AUTH_REQUIRE_PASSWORD=true
APP_DEMO_USERS_ENABLED=false
APP_CORS_ALLOWED_ORIGINS=https://blueberry2026.vercel.app
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<database-user>
SPRING_DATASOURCE_PASSWORD=<database-password>
```

Use the database provider's supplied TLS settings. Keep Hibernate schema validation enabled;
Flyway owns migrations. Add any actual custom frontend domains to the CORS list.
Startup rejects password bypass or demo seeding under `prod` or on Render, using
[Render's documented runtime marker](https://render.com/docs/environment-variables).
Local Docker retains its existing dev login.

Before deployment, verify a recent Neon backup and its restore procedure, record the current
frontend/backend deploy IDs, and confirm CI passes. Roll back the frontend first, then the backend
if needed; retain additive migration columns. Do not restore the production database over newer user
writes without assessing data loss. Confirm the actual deployed versions in the dashboards.

Audit on 2026-10-06: frontend and nested routes respond. After initial API timeouts, the hosted
health endpoint returned UP, public board lookup returned saved appearance/revision data,
private account endpoints rejected anonymous requests (401), and env/configprops endpoints
returned 404. Render logs and Vercel dashboard screenshots confirm both providers run `03c4c29`.
Vercel uses Node 24.x and the build settings above. Render currently uses the `postgres` profile;
the user confirmed password enforcement is enabled and demo seeding is unset (defaults to false).
Plan the switch to `prod` and explicit demo-seeding disablement with the rollout. CORS remains
unverified. Render automatically deploys backend commits on `main`; coordinate the push with
release readiness rather than assuming it waits for CI.

Neon snapshot `b26-pre-1.5.0-2026-10-06` was restored into an isolated branch. All 10 tables matched
production by row count and content checksum; columns, constraints, indexes, and migration history
also matched. Production data was not restored or modified. This verifies manual snapshot recovery;
automatic snapshot scheduling remains absent and recovery-history retention is six hours.
Test-compute suspension was accepted, but its final state could not be confirmed after provider errors.

The live password-based signup/signin/save/delete journey still needs verification after rollout.
Auth/search endpoints do not currently have application rate limits; the click abuse guard does not
protect them. Flyway currently uses Neon's pooled connection; use a direct connection for migration
and export workflows. The new production safety guard is local until deployed.

## Database backup and restore

Install PostgreSQL client tools compatible with your server. These commands use
`backend/.env.dev`, or explicit `PGDATABASE`, `PGHOST`, `PGUSER`, and `PGPASSWORD` variables.
They operate on PostgreSQL, not legacy H2 files.

- Backup: `npm run db:backup` (custom-format archive in `backups/`).
- Restore: stop the app, back up the target, then run `npm run db:restore -- backups/<file>.dump --confirm`.
- Restore replaces objects in the configured target database in one transaction. It does not accept old H2 `.tgz` archives.

## Username search and demo accounts

Click the blue **Search** dot. Results appear above the field after at least two username characters; the minimum is not shown as an instruction in the panel. Search is case-insensitive, accepts a leading `@`, and returns up to 10 users. Select a result to open their main board. Empty results and request failures have separate messages; failed requests can be retried. Escape closes the dialog.

`./setup.sh` adds these local demo users, each with a main board:

`@blueberry` · `@news` · `@feature` · `@daily` · `@emma` · `@victoria` · `@nori`

Try `em`, `ne`, or `@blue`. With local password bypass, you can sign in as `emma@demo.local` (or another demo username at `demo.local`) using any placeholder password. Existing users and their edits are not overwritten on restart.

Demo seeding is opt-in through `APP_DEMO_USERS_ENABLED=true`, enabled in `docker-compose.local.yml` only, and excluded from the `prod` profile. It defaults to false elsewhere. For host development, enable it in your local env file and restart; use the local password bypass to sign into these passwordless fixtures.

The public `GET /api/search/users?q=...` endpoint returns only `username` and `displayName`. Queries are limited to 64 characters after trimming an optional `@`. Debouncing limits browser requests; it is not server-side rate limiting.

## Board URLs

- `/{username}/{boardSlug}` opens a board belonging to that user.
- `/{username}` opens their main board. System routes (`/`, `/signin`, `/settings`, `/insights`) retain their existing behavior.
- Existing `/b/{boardSlug}` and `/u/{boardSlug}` links still work. New account, signup, and create-board links use the owner-qualified URL.
- Slugs remain **globally unique**, so legacy links and existing widget/write APIs remain unambiguous. Two users cannot claim the same slug.
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

Edit in the left sidebar loads a consistent board/widget snapshot with its revision. Save submits the owner's display name, description, website, and widgets through `PUT /api/board/{slug}/editor` in one transaction. The display name belongs to the user; the description and website belong to the board. A stale revision returns HTTP 409 and retains drafts. Cancel and reopen the editor to load the latest version. Navigation and browser reload warn about unsaved changes.

Board Settings uses a separate automatic-save flow for board name, URL, and appearance. The board switcher in that panel changes boards and sets the main board after server acceptance. Existing writes advance the board revision.

Deletion requires owner/admin access and confirmation. The last board, main board, and system-route boards are protected. Choose replacements before deleting a main/system board. Failure keeps drafts; deleting the active board redirects to the main board or home fallback.

## Verification

- Frontend: `npm --prefix frontend test -- --watch=false` and `npm --prefix frontend run build`.
- Backend: `cd backend && ./mvnw test` (Java 21).
- PostgreSQL migrations: additionally set `POSTGRES_TEST_URL` to a JDBC URL, with
  `POSTGRES_TEST_USER` and `POSTGRES_TEST_PASSWORD`. The migration test creates and drops
  its own randomly named schema; use a disposable test database whose user can create schemas.
  Without that URL, the PostgreSQL test is skipped. CI supplies PostgreSQL and runs it.

## Security notes

- Never commit real `.env.dev` credentials
- Rotate DB password/token immediately if exposed
- Keep `backend/.env.example` placeholders only

---

[Start here](https://github.com/an-vu/b26/wiki) · [Docker setup](https://github.com/an-vu/b26/wiki/Docker) · [Page URLs](https://github.com/an-vu/b26/wiki/Pages-and-Editing) · [Release roadmap](https://github.com/an-vu/b26/wiki/Release-Roadmap)
