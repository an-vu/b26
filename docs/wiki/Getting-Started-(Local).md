# Local development with live frontend reload

Use this path when actively editing source code. Angular and Spring Boot run on your computer; PostgreSQL may run in Docker. For an all-container setup, use [Docker](Docker) instead.

## Prerequisites

- Node compatible with the checked-in Angular toolchain: Node 20.19+ on the 20.x line, 22.12+ on 22.x, or a supported 24.x release.
- Java **21**. Check with `java -version`.
- PostgreSQL, either local or hosted. Docker is optional if you already have a development database.
- Maven does not need a separate installation: the repo includes `backend/mvnw`.

Run commands from the repo root unless shown otherwise.

## First run

Install both sets of npm dependencies:

```bash
npm ci
npm --prefix frontend ci
```

For the provided local database:

```bash
docker compose -f docker-compose.db.yml up -d --wait postgres
```

Create the backend settings without overwriting an existing file:

```bash
if [ ! -f backend/.env.dev ]; then
  cp backend/.env.example backend/.env.dev
fi
```

Check the connection settings:

```dotenv
SPRING_PROFILES_ACTIVE=postgres
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/b26
SPRING_DATASOURCE_USERNAME=b26
SPRING_DATASOURCE_PASSWORD=b26-local-only
APP_AUTH_REQUIRE_PASSWORD=true
```

Here the backend runs on your computer, so the database host is **`localhost`**. For a hosted development database, substitute its connection details and required TLS options.

Start both applications:

```bash
npm run dev
```

Open **http://localhost:4200/signin**. Create a normal account, or use [dev login](Dev-Login-and-Accounts) for admin access.

## Separate terminals

From the repo root:

```bash
npm run dev:frontend
```

In a second terminal:

```bash
npm run dev:backend
```

The backend npm script loads `backend/.env.dev`. Running `./mvnw spring-boot:run` directly does not automatically load that file.

Frontend edits reload in the browser. Restart the backend after Java or environment changes. Stop `npm run dev` with Ctrl+C; the database container stays running until you stop it separately.

## Check it is working

1. Open `http://localhost:8080/actuator/health` for backend health.
2. Open `http://localhost:4200` for the website.
3. Create an account; signup opens an owned starter board.
4. Add a link widget, choose Done, then refresh to check persistence.

A 404 at `http://localhost:8080/` is expected: the backend has no root page. If startup fails, use [Troubleshooting](Troubleshooting).

Older wiki instructions referenced a VS Code launch configuration. That configuration is not present in the checked-in repo; the npm commands above are the supported starting point.
