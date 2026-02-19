# BlueBerry 2026

Personal dashboard app where users create customizable pages and manage widgets.

## Tech Stack
- Angular
- Java Spring Boot
- PostgreSQL

## Local Dev
### Backend
1. Copy env template: `cp backend/.env.example backend/.env.dev`
2. Fill real values in `backend/.env.dev`
3. Start backend: `npm run dev:backend`

### Frontend
- Start frontend: `npm run dev:frontend`

## Security Notes
- Never commit real `.env.dev` credentials
- Rotate DB password/token immediately if exposed
- Keep `backend/.env.example` placeholders only

---

See the wiki for full documentation.
