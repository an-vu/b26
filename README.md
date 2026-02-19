# b26

Production baseline: Angular frontend on Vercel, Spring Boot backend on Render, PostgreSQL on Neon.

## Architecture
- Frontend: Vercel (`frontend/`)
- Backend: Render (`backend/`)
- Database: Neon Postgres

## Deployment Checklist

### Vercel (Frontend)
- Project root directory: `frontend`
- Framework preset: `Other`
- Build command: `npm run build`
- Output directory: `dist/b26`
- `frontend/vercel.json` must include:
  - `/api/:path*` rewrite to Render backend
  - `/actuator/:path*` rewrite to Render backend
  - SPA fallback rewrite `/(.*) -> /index.html`

### Render (Backend)
- Service root/context: `backend`
- Required env vars:
  - `SPRING_PROFILES_ACTIVE=postgres`
  - `SPRING_DATASOURCE_URL=jdbc:postgresql://<neon-host>:5432/neondb?sslmode=require`
  - `SPRING_DATASOURCE_USERNAME=neondb_owner`
  - `SPRING_DATASOURCE_PASSWORD=<neon-password>`
- Optional but recommended:
  - `APP_ADMIN_TOKEN=<strong-random-token>`
  - `APP_CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>`

### Neon (Database)
- Use separate branches for dev and prod.
- Keep Render pointed to prod branch connection string.
- Keep local `.env.dev` pointed to dev branch connection string.

## Local Dev Workflow

### Backend
1. Copy env template:
   - `cp backend/.env.example backend/.env.dev`
2. Fill real values in `backend/.env.dev`.
3. Start backend:
   - `npm run dev:backend`

### Frontend
- Start frontend:
  - `npm run dev:frontend`

## Smoke Test Checklist
- Backend health:
  - `https://<render-backend>/actuator/health`
- API route:
  - `https://<render-backend>/api/board/home` (or an existing board id)
- Frontend routes:
  - `/`, `/insights`, `/settings`, `/b/home`
- Edit/save widget from frontend and verify persistence in Neon.

## Common Issues
- Vercel `404 NOT_FOUND`:
  - Usually domain mapping or wrong output directory.
- App stuck on `Loading...`:
  - Usually backend unavailable/cold-start or failing API route.
- Flyway error `Found more than one migration with version X` locally:
  - Clear stale build cache: `rm -rf backend/target` then rerun backend.

## Security Notes
- Do not commit real `.env.dev` credentials.
- Rotate DB password/token immediately if accidentally exposed.
- Keep `backend/.env.example` as placeholders only.
