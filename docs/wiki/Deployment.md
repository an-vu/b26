# Deployment notes

The repository contains configuration for an Angular frontend on Vercel and a Docker backend on Render, connected to PostgreSQL. Neon is the confirmed database provider.

## Hosting check — October 8, 2026

- **Vercel:** production deployment [A6GPk16UXHSx8MYv1SVbtRndBeBp](https://vercel.com/ans-projects-d68d4b8b/b26-frontend/A6GPk16UXHSx8MYv1SVbtRndBeBp) is **Ready**, sourced from `93a2e2b` (1.5.3), and assigned to `https://blueberry2026.vercel.app`. GitHub’s Vercel commit status also reports success. Dashboard evidence was used because the connector returned a scope-access error.
- **Render:** [b26-backend](https://dashboard.render.com/web/srv-d66gsbh5pdvs73d5kpp0) deployment `dep-db3658h5efls73c27icg` for `93a2e2b` is **update_failed**. The Docker build completed; startup applied V30/V31 and initialized JPA, then stopped producing startup logs. Render reported “Port scan timeout reached, no open ports detected” at October 7 15:33 UTC, then timed out at 15:36 UTC. This establishes the failure stage, not the underlying cause. The last successful deploy is `dep-db31q60473hc7386repg`, commit `6d712dd` (1.5.2), marked **live**. The public `/actuator/health` endpoint returned `UP` during this check; health alone does not establish running feature compatibility.
- **Neon:** [b26-db production](https://console.neon.tech/app/projects/odd-moon-16008051/branches/br-curly-unit-akypucwr), project `odd-moon-16008051`, default branch `br-curly-unit-akypucwr`, is **ready**. A read-only SQL query confirmed V30 `board profile website` and V31 `widget spacing` both have `success = true`, installed October 7 around 15:19 UTC.

**Retry result:** deployment `dep-db3l84bncjis73asd5pg` of the unchanged 1.5.3 commit became **live** October 8 at 03:30 CDT (08:30 UTC). Tomcat bound port 8080 and startup completed in 116.894 seconds. Health returned HTTP 200 / UP, and the production `/anvu/default` board loaded in Safari. No backend code or configuration change was needed; the original timeout’s root cause remains unproven. Frontend and backend now both deploy 1.5.3, with database V31. Authenticated production saves still await a signed-in test session. Local Aqua and Contact refinements remain uncommitted and undeployed; production build and 87 frontend tests pass. Aqua controls and About were visually checked at desktop and 390 × 844 phone dimensions in Safari, including light/dark settings. No 1.5.4 rollout was performed.

## Frontend: Vercel

- Project root: `frontend`.
- Build command: `npm run build`.
- Output directory: **`dist/b26`**. `angular.json` sets the browser output subdirectory to an empty string; the old wiki's `dist/b26/browser` is outdated.
- `frontend/vercel.json` rewrites `/api/*` and `/actuator/*` to `https://b26-backend.onrender.com` and other paths to `index.html`.
- Confirm the backend rewrite destination matches the service you actually deploy.

The current production domain is `https://blueberry2026.vercel.app`, confirmed in the October 8 dashboard check.

## Backend: Render or another Docker host

Build using `backend/` as the Docker build context and its `Dockerfile`. The image exposes port 8080. The health endpoint is `/actuator/health`.

Required configuration:

```dotenv
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<database-host>:5432/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<database-user>
SPRING_DATASOURCE_PASSWORD=<database-password>
APP_AUTH_REQUIRE_PASSWORD=true
APP_CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>
```

Use the TLS requirements supplied by the database provider. Keep Hibernate's default `validate` setting and let Flyway manage migrations. Do not deploy the local password bypass or the sample local database credentials.

## 1.2.0 URL rollout

- Deploy the backend before the frontend; new pages need the owner lookup endpoint.
- No schema migration or new index is required. Existing global slug uniqueness stays in place.
- Check existing usernames against the reserved list in [Page URLs](Pages-and-Editing); old profile edits could have bypassed it. Resolve conflicts with the account owner.
- Confirm direct nested URLs and refreshes reach the Angular app through the existing SPA fallback.
- Check canonical, legacy, main-board, signup, save, rename, and delete flows. Review API 404/5xx responses and browser errors.
- Roll back frontend before backend if needed. No data rollback is required; shared canonical URLs require the new routing code.

## Release checklist

1. Check CI, including PostgreSQL tests and the frontend production build.
2. Back up the database before a schema upgrade.
3. Confirm host environment variables and frontend API rewrites.
4. Deploy through the provider's configured branch or manual workflow. The old wiki assumed automatic deployment from `main`; check that setting in the dashboards.
5. Verify API health, sign-in, public board loading, and an owned-board save.

Repository sources: [frontend deployment config](https://github.com/an-vu/b26/blob/main/frontend/vercel.json), [Angular build config](https://github.com/an-vu/b26/blob/main/frontend/angular.json), [backend image](https://github.com/an-vu/b26/blob/main/backend/Dockerfile).

## Production sample profiles — 1.5.7

Added @vhuman, @vi, @moka, @sol, and @pixel to Neon production on October 8, 2026. Each has a public main board and five widgets. These sample profiles have no email or password and cannot sign in. The reviewed, repeatable SQL is in `scripts/seed-production-samples-1.5.7.sql`; it refuses username/URL conflicts and preserves existing accounts and edits. It is an explicit data operation, not an automatic migration or local database upload. Find the profiles through Search or `/vhuman/sample-vhuman` (and equivalent username/slug pairs). Home still uses its fixed preview collection.
