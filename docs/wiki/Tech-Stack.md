# Tech stack

Versions below describe the checked-in project, not recommendations to upgrade.

| Layer | Current choice | Source |
|---|---|---|
| Frontend | Angular 21, TypeScript 5.9, RxJS 7.8, custom CSS Grid | `frontend/package.json` |
| Frontend tests | Vitest through the Angular unit-test builder | `frontend/angular.json` |
| Backend | Java 21, Spring Boot 3.5.5, Maven wrapper | `backend/pom.xml` |
| Persistence | Spring Data JPA / Hibernate, PostgreSQL | `backend/pom.xml`, application profiles |
| Migrations | Flyway SQL | `backend/src/main/resources/db/migration/` |
| Backend tests | Spring Boot Test / MockMvc, H2 for fast tests, PostgreSQL integration checks | `backend/src/test/` |
| Local database container | PostgreSQL 16 | `docker-compose.local.yml`, `docker-compose.db.yml` |
| Container frontend | Node build → Nginx runtime | `frontend/Dockerfile` |
| Container backend | Maven/Java build → Java runtime | `backend/Dockerfile` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

The repository contains configuration for a Vercel frontend and Render backend. Older deployment notes recorded Neon as the hosted PostgreSQL provider; the app accepts any appropriately configured PostgreSQL connection. Actual account/provider settings live outside this repo and must be checked separately.

[Why this stack](Why-This-Stack) · [Architecture](Architecture-Overview) · [Deployment](Deployment)
