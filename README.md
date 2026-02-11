# Bento '26

A bento-style personal portfolio web app built to showcase Angular and Java using Spring Boot.

## Tech Stack

### Frontend
- Angular
- TypeScript
- CSS Grid (bento-style layout)

### Backend
- Java
- Spring Boot
- REST API
- H2 in-memory database

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

- Public bento-style profile page
- Reusable card-based layout
- Profile data fetched from REST API
- Basic analytics endpoints (click tracking)
- Optional admin/editor view (demo-only, no auth)

## Project Structure

```
bento26/
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

Note: `http://localhost:8080/` returns a Spring 404 page because root (`/`) is not mapped. Use API routes like `http://localhost:8080/api/profile/default`.

## API Endpoints (Planned)

* `GET /api/profile/{handle}`
* `PUT /api/profile/{handle}`
* `POST /api/click/{cardId}`
* `GET /api/analytics/{handle}`

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

### Backend Profiles

- Default profile: `dev` (H2 in-memory, reset on restart)
- Docker Compose profile: `prod` (H2 file DB at `/data`, persists via Docker volume)

### Backend Environment Variables

- `SPRING_PROFILES_ACTIVE` (example: `prod`)
- `APP_CORS_ALLOWED_ORIGINS` (comma-separated origins)
- `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME` (optional, defaults to H2 driver)
- `SPRING_JPA_HIBERNATE_DDL_AUTO` (optional, default in `prod` is `update`)

You can switch from file-based H2 to PostgreSQL by setting `SPRING_DATASOURCE_*` values in deploy.

### Frontend API Base URL

- Frontend uses relative API paths (`/api/...`) in both dev and production.
- Dev server proxy (`frontend/proxy.conf.json`) forwards `/api` and `/actuator` to `http://localhost:8080`.
- Production Nginx proxy forwards `/api` and `/actuator` to backend in Docker/deploy.

### Smoke Checklist

1. Open `http://localhost:4200/u/default` and confirm page renders.
2. Open `http://localhost:8080/api/profile/default` and confirm JSON response.
3. Open `http://localhost:8080/actuator/health` and confirm health JSON response.
4. Open `http://localhost:8080/api/profile/default/widgets` and confirm widget JSON array.
5. From UI, add/edit/delete one widget and refresh to confirm persistence.

# `How to access the app on any device in the same network`

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
- `http://<your-mac-ip>:4200/u/default`