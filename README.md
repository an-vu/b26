# BlueBerry 26

A personal portfolio web app built to showcase Angular and Java using Spring Boot.

## Tech Stack

### Frontend
- Angular
- TypeScript
- CSS Grid (bento-style layout)

### Backend
- Java
- Spring Boot
- REST API
- H2 file-based database (dev), pluggable to PostgreSQL (prod)

### Tooling
- GitHub
- Docker (optional)

## Architecture Overview

```
Angular (Frontend)
|
| HTTP (JSON)
v
Spring Boot API (Backend)
|
v
Database (H2)
```

- Angular handles UI, routing, and rendering
- Spring Boot exposes REST endpoints and models data
- Clear separation between frontend and backend responsibilities

## Features

- Public bento-style board page
- Reusable card-based layout
- Board data fetched from REST API
- Basic analytics endpoints (click tracking)
- Optional admin/editor view (demo-only, no auth)

## Project Structure

```
b26/
├─ frontend/        # Angular app
├─ backend/         # Spring Boot API
├─ docker/          # Docker configs (optional)
├─ docs/            # Screenshots, diagrams
└─ README.md
````

## Why This Stack

This project intentionally uses Angular and Spring Boot to demonstrate:
- Component-based frontend architecture
- REST API design
- Java backend fundamentals
- Patterns commonly used in enterprise applications

For a static portfolio, a simpler stack would be sufficient.  
This implementation exists to show **applied engineering judgment**, not necessity.

## Getting Started (Local)

### VS Code (One Click, Separate Terminals)

1. Open **Run and Debug** in VS Code.
2. Select **Run App (Frontend + Backend)**.
3. Click the green play button.

This starts frontend and backend in separate terminal panels.

### One Command (Frontend + Backend)

```bash
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
````

Runs at: `http://localhost:4200`
LAN access (same Wi-Fi): `http://<your-mac-ip>:4200`


### Backend

```bash
cd backend
mvn spring-boot:run
```

Runs at: `http://localhost:8080`

Note: `http://localhost:8080/` returns a Spring 404 page because root (`/`) is not mapped. Use API routes like `http://localhost:8080/api/board/default`.

## API Endpoints (Planned)

* `GET /api/board/{handle}`
* `PUT /api/board/{handle}`
* `POST /api/click/{cardId}`
* `GET /api/analytics/{handle}`

## Live Deployment

- Frontend (Vercel): `https://b26-frontend.vercel.app`
- Backend (Render): `https://b26-backend.onrender.com`
- Backend health: `https://b26-backend.onrender.com/actuator/health`

### Deployment Workflow

1. Push changes to `main`.
2. Vercel auto-deploys frontend from `frontend/`.
3. Render auto-deploys backend from `backend/`.

### Provider Config (Current)

- Vercel:
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist/b26/browser`
  - Rewrites: `frontend/vercel.json` forwards `/api/*` and `/actuator/*` to Render backend
- Render:
  - Service type: Docker web service
  - Root/Context: `backend`
  - Dockerfile: `backend/Dockerfile`
  - Health check: `/actuator/health`
  - Required env vars:
    - `SPRING_PROFILES_ACTIVE=prod`
    - `APP_CORS_ALLOWED_ORIGINS=https://b26-frontend.vercel.app`

## Docker (Local Full Stack)

### Build and Run

```bash
docker compose up --build
```

### URLs

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:8080`
- Backend health: `http://localhost:8080/actuator/health`

### Stop

```bash
docker compose down
```

## Runtime Config (Dev vs Prod)

### Backend Runtime Profiles

- Default profile: `dev` (H2 file DB at `${user.home}/.b26/b26-dev`, persists across restarts)
- Docker Compose profile: `prod` (H2 file DB at `/data`, persists via Docker volume)
- PostgreSQL profile: `postgres` (external Postgres via `SPRING_DATASOURCE_*`)

### Flyway Migrations

- Flyway is enabled for app profiles by default.
- Initial schema migration: `backend/src/main/resources/db/migration/V1__init_schema.sql`
- Existing local DBs are handled with `spring.flyway.baseline-on-migrate=true`
- Test profile keeps Flyway disabled to avoid test lifecycle conflicts.

### Run Backend with PostgreSQL

Set env vars and run with `postgres` profile:

```bash
cd backend
SPRING_PROFILES_ACTIVE=postgres \
SPRING_DATASOURCE_URL='jdbc:postgresql://<host>:5432/<db>' \
SPRING_DATASOURCE_USERNAME='<user>' \
SPRING_DATASOURCE_PASSWORD='<password>' \
mvn spring-boot:run
```

Notes:
- PostgreSQL driver defaults to `org.postgresql.Driver`.
- In `postgres` profile, Hibernate is set to `validate` (schema must come from Flyway).

### Backend Environment Variables

- `SPRING_PROFILES_ACTIVE` (example: `prod`)
- `APP_CORS_ALLOWED_ORIGINS` (comma-separated origins)
- `APP_ADMIN_TOKEN` (optional: protects `POST/PUT/PATCH/DELETE /api/board/**` via `X-Admin-Token`)
- `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME` (optional, defaults to H2 driver)
- `SPRING_JPA_HIBERNATE_DDL_AUTO` (optional, default in `prod` is `update`)

You can switch from file-based H2 to PostgreSQL by setting `SPRING_DATASOURCE_*` values in deploy.

### Optional Admin Token Protection

If backend sets `APP_ADMIN_TOKEN`, mutating board/widget APIs require:

- Header: `X-Admin-Token: <same token value>`

Frontend support:

- `frontend/src/environments/environment*.ts` includes `adminToken` (empty by default), OR
- set token in browser storage:

```js
localStorage.setItem('b26_admin_token', '<your-token>')
```

Clear token:

```js
localStorage.removeItem('b26_admin_token')
```

### Frontend API Base URL

- Frontend uses relative API paths (`/api/...`) in both dev and production.
- Dev server proxy (`frontend/proxy.conf.json`) forwards `/api` and `/actuator` to `http://localhost:8080`.
- Production Nginx proxy forwards `/api` and `/actuator` to backend in Docker/deploy.

### Smoke Checklist

1. Open `http://localhost:4200/b/default` and confirm page renders.
2. Open `http://localhost:8080/api/board/default` and confirm JSON response.
3. Open `http://localhost:8080/actuator/health` and confirm health JSON response.
4. Open `http://localhost:8080/api/board/default/widgets` and confirm widget JSON array.
5. From UI, add/edit/delete one widget and refresh to confirm persistence.

## Dev Data Safety

### Stable Local DB Path

- Dev DB uses: `${user.home}/.b26/b26-dev.mv.db`
- This path is stable even if you run backend from different folders.
- Override path only if needed: `B26_DATA_DIR=/custom/path`

### Backup / Restore

Create backup:

```bash
npm run db:backup
```

Restore backup:

```bash
npm run db:restore -- ./backups/<backup-file>.tgz
```

Notes:
- Restore overwrites current local dev DB files.
- Restart backend after restore.

## How to Access From Another Device (Same Network)

Suggested wiki outline:
1. Start app (`npm run dev`)
2. Find host machine IP (`ipconfig getifaddr en0` / `en1`)
3. Open `http://<host-ip>:4200` from phone/tablet
4. Troubleshooting:
   - same Wi‑Fi required
   - firewall permission
   - avoid `localhost` on phone

Find your Mac IP:

```bash
ipconfig getifaddr en0
```

If `en0` is empty:

```bash
ipconfig getifaddr en1
```

On iPhone/tablet (same Wi-Fi), open:
- `http://<your-mac-ip>:4200`
- `http://<your-mac-ip>:4200/b/default`
