# Deployment

The Angular frontend deploys to Vercel, the Docker backend to Render, and the database is PostgreSQL on Neon. Production frontend: `https://blueberry2026.vercel.app`.

## Frontend: Vercel

- Project root: `frontend`.
- Build command: `npm run build`.
- Output directory: **`dist/b26`** (`angular.json` sets the browser subdirectory to an empty string).
- `frontend/vercel.json` rewrites `/api/*` and `/actuator/*` to `https://b26-backend.onrender.com` and every other path to `index.html`. Confirm that destination matches the backend you actually deploy.

## Backend: Render or another Docker host

Build with `backend/` as the Docker build context and its `Dockerfile`. The image exposes port 8080; the health endpoint is `/actuator/health`. Render deploys pushes to `main` automatically and does not wait for CI.

Required configuration (keep credentials in the provider dashboard):

```dotenv
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<database-host>:5432/<database>?sslmode=require
SPRING_DATASOURCE_USERNAME=<database-user>
SPRING_DATASOURCE_PASSWORD=<database-password>
APP_AUTH_REQUIRE_PASSWORD=true
APP_DEMO_USERS_ENABLED=false
APP_CORS_ALLOWED_ORIGINS=https://blueberry2026.vercel.app
```

Use the TLS settings the database provider supplies. Keep Hibernate's `validate` setting and let Flyway manage migrations; never edit an applied migration. Startup refuses the local password bypass and demo seeding under `prod` or on Render. Prefer a direct (non-pooled) Neon connection for migration and export work.

## Release checklist

1. Check CI, including PostgreSQL tests and the frontend production build.
2. Back up the database before a schema upgrade, and review every pending migration.
3. Confirm host environment variables and the frontend API rewrite.
4. Deploy the backend first, then the frontend, and record both deploy IDs.
5. Verify API health, sign-in, public board loading, and an owned-board save.

Roll back the frontend before the backend. Don't restore the production database over newer user writes without assessing data loss.

## Migration notes

- **V37** archives `cards` and `system_settings` and changes `click_events.card_id` to `target_id`. Don't run a pre-V37 backend against a V37 database; fix forward or restore the pre-migration backup with the matching old release.
- **V40 onward:** see [Release roadmap](Release-Roadmap) for what each pending migration changes before rolling it out.

## Production sample profiles

@vhuman, @vi, @moka, @sol, and @pixel are public sample profiles with no email or password. `scripts/seed-production-samples-1.5.7.sql` recreates them; it refuses username/URL conflicts and preserves existing accounts. Running it is an explicit data operation, not a migration.

Repository sources: [frontend deployment config](https://github.com/an-vu/b26/blob/main/frontend/vercel.json), [Angular build config](https://github.com/an-vu/b26/blob/main/frontend/angular.json), [backend image](https://github.com/an-vu/b26/blob/main/backend/Dockerfile).
