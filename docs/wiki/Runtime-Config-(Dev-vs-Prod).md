# Runtime configuration

## Which file actually supplies settings?

| How the backend runs | Where settings come from |
|---|---|
| `npm run dev` / `npm run dev:backend` | The shell script sources `backend/.env.dev` before starting Maven. |
| `./mvnw spring-boot:run` directly | Your process environment; `.env.dev` is not loaded automatically. |
| `./setup.sh` | Explicit local values in `docker-compose.local.yml`; `.env.dev` is not loaded. |
| Older manual `docker-compose.yml` workflow | `backend/.env.dev` via `env_file`, plus explicit Compose overrides. |
| Hosted backend | Environment variables configured in the hosting service. |

`backend/.env.example` is a template, not the active environment file. Keep real credentials out of Git.

## Profiles and authentication are separate

- Default profile: **`postgres`**.
- `postgres` and `dev`: external PostgreSQL connection, Hibernate `validate`.
- `prod`: external PostgreSQL connection, Hibernate defaults to `validate`; an override exists through `SPRING_JPA_HIBERNATE_DDL_AUTO`.
- `test`: in-memory H2, schema `create-drop`, Flyway disabled. Real PostgreSQL tests run separately.
- **`APP_AUTH_REQUIRE_PASSWORD=false`** controls local password bypass. Choosing the `dev` profile alone does not enable it.

The older `docker-compose.yml` explicitly overrides `SPRING_PROFILES_ACTIVE` to `prod` unless its interpolation environment supplies another value. It also supplies `APP_CORS_ALLOWED_ORIGINS`, defaulting to `http://localhost:4200`. Values set only in the service's `.env.dev` cannot override these explicit Compose entries.

## Important settings

| Setting | Meaning / default |
|---|---|
| `SPRING_DATASOURCE_URL` | JDBC PostgreSQL URL; required |
| `SPRING_DATASOURCE_USERNAME` | Database user; required |
| `SPRING_DATASOURCE_PASSWORD` | Database password; required |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | Defaults to `org.postgresql.Driver` |
| `SPRING_PROFILES_ACTIVE` | Optional profile override; default is `postgres` outside Compose |
| `APP_AUTH_REQUIRE_PASSWORD` | `true` by default; `false` skips password verification for existing users |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins; defaults to localhost:4200 |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | Prod override; leave `validate` for migration-managed databases |

Session lifetime defaults to 720 hours in `AuthService`; the Spring property is `app.auth.session-ttl-hours`.

## Database hostname by workflow

| Backend location | Host in JDBC URL for the supplied database |
|---|---|
| Running on your computer | `localhost:5432` |
| Running in either supplied Docker workflow | `postgres:5432` |
| Hosted | Provider-supplied hostname and any required TLS options |

## Authentication

Board/widget writes require a bearer session belonging to the owner or an admin.

System-route updates and the `APP_ADMIN_TOKEN` / `X-Admin-Token` bypass are retired. Board and widget writes use bearer sessions. For local use, see [Dev login](Dev-Login-and-Accounts).

## API routing

- Frontend code uses relative `/api/...` paths.
- Angular development proxy forwards to `http://localhost:8080`.
- Docker Nginx forwards to `http://backend:8080`.
- `frontend/vercel.json` forwards to the configured Render backend URL.

See [Docker](Docker), [Local development](Getting-Started-%28Local%29), and [Deployment](Deployment) for complete workflows.
