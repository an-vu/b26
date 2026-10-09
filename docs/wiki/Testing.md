# Testing and verification

Commands use the host-development tools. See [Local development](Getting-Started-%28Local%29) for prerequisites.

## Frontend

From the repo root:

```bash
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build
```

Tests use Vitest through Angular. The production output is `frontend/dist/b26`, not `dist/b26/browser`.

The local 1.6.0 production frontend build passed. See [Troubleshooting](Troubleshooting) for build issues.

## Backend: fast suite

```bash
cd backend
./mvnw test
```

Use Java 21. These tests normally use H2 and generated schemas; they do not by themselves prove PostgreSQL migrations work.

## Backend: include PostgreSQL tests

Start a disposable PostgreSQL database, then run from `backend/`:

```bash
POSTGRES_TEST_URL='jdbc:postgresql://localhost:5432/b26_test' POSTGRES_TEST_USER=postgres POSTGRES_TEST_PASSWORD=postgres ./mvnw test
```

The database in that example must already exist, and the credentials must match it. The PostgreSQL tests create and drop randomly named schemas; use a test database whose user can create schemas. They do not clean the connection's default schema.

Without `POSTGRES_TEST_URL`, those tests are skipped. They cover fresh migrations, upgrades from historical versioned migrations, real-database onboarding, schema validation, simultaneous editor saves, and concurrent deletion safeguards.

## CI

`.github/workflows/ci.yml` runs backend tests with PostgreSQL 16, frontend tests, and a production frontend build on pushes and pull requests. The Docker image build skips backend tests, so image creation alone is not a replacement for CI.

## Manual smoke check

1. Start the app. Check `http://localhost:4200/actuator/health` with Docker preview, or port 8080 with host development.
2. Sign up; confirm an owned starter board opens.
3. Add a widget and save; refresh and confirm it persists.
4. Open the same board in two tabs, enter Edit in both, then save one. Saving the older draft in the other should report a conflict and retain its draft.
5. Make an unsaved edit and try navigating to another board; the discard prompt should appear.
6. Set another owned board as main; check `/<username>`.
7. Sign in as one user and visit another user's public URL; it should remain on the visited page.

8. Open `/<username>/<slug>` directly and refresh. Check `/b/<slug>` and `/u/<slug>` still open the same board.
9. Pair a board with the wrong username; expect not found. Rename a slug; confirm new links work and old slugs do not.
10. Delete an extra board from both menu flows; check confirmation, safeguards, draft retention on failure, and the active-board redirect.

## Recorded local verification

### 1.6.0 — October 9, 2026

- **119 backend tests passed**, with no failures or skips, including PostgreSQL migrations and concurrency tests. `mvn verify` also built the backend package.
- The 37 new permission tests cover every board/widget mutation for owners and admins, denied writes with unchanged data, private/public GET and HEAD reads, editor/insights restrictions, and self-scoped account preferences.
- Routing regressions cover `mine` / `by-owner` board slugs, context paths, percent-encoded segments, and matrix parameters. Tests also check missing policies, missing policy variables, declared coverage of all application handlers, and OPTIONS/CORS behavior.
- Expired/revoked sessions lose private access. Anonymous public reads, event access checks, and main-board restrictions retain their existing behavior.
- **141 frontend tests passed** across 29 files, and the production build passed. Regression coverage includes immediate permission clearing, account switching/sign-out, canceled late responses and queued profile saves, same-origin bearer headers, admin/read-only controls, username-renamed board links, and the active board indicator.
- The local Docker backend was rebuilt and became healthy. Live checks returned 200 for public board/permissions reads, 404 for a visitor's editor read, 401 for an unauthenticated write, and 410 for retired system routes.

No new migration is required. These are local checks, not a hosted rollout. Git publication and hosted deployment are tracked separately.

### 1.5.9 — October 9, 2026

- **82 backend tests passed**, with no failures or skips, including PostgreSQL migrations and concurrency tests.
- **108 frontend tests passed**, including real board link tracking and suppression in previews. Tests for the retired admin route picker were removed.
- Frontend production build and backend package build passed.
- V37 tests preserve archived cards, route mappings, and historical click targets on fresh/historical migration paths.
- Pagination tests cover private-board exclusion, stable ordering, page size, and invalid bounds. Click tests cover simultaneous requests, expiry, capacity, target ownership, visibility, and enabled state.
- The local database was backed up before V37; the rebuilt local backend became healthy. Live API checks confirmed the paginated board response and 410 for retired system routes.

These are local checks, not proof of a hosted deployment.

### Historical 1.2.0 verification

On October 6, 2026, implementation `b8deab3` passed **57 frontend tests**, **51 fast backend tests**, **4 PostgreSQL tests**, and a production build. Browser checks covered canonical/legacy links, saving, renaming, creation, deletion redirects, and a 320px layout. The CSS-size warning remains.

This is the 1.2.0 verification record, not a new test run for documentation changes or proof of a hosted deployment. Consult current CI and complete the [deployment checklist](Deployment) before release.
