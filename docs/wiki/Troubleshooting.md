# Troubleshooting

Start with the section that matches the symptom. The website uses **4200**. Host development also exposes API **8080** and database **5432**; `./setup.sh` keeps API/database ports inside Docker.

| Symptom | What to check |
|---|---|
| `docker: command not found` | Install Docker Desktop and reopen the terminal. |
| Cannot connect to Docker daemon | Start Docker Desktop and wait until its engine is ready. |
| Java runtime missing | Host development needs Java 21; the all-Docker workflow does not. |
| `concurrently` or `ng` missing | Run both `npm ci` and `npm --prefix frontend ci` in the repo root. |
| Port already allocated | Stop the other app/container using 4200, 8080, or 5432. Avoid running both app workflows at once. |
| Backend database connection refused in Docker | JDBC host must be `postgres` for the provided Compose database; wait for the database before starting the backend. |
| Database hostname `postgres` cannot resolve on your computer | Host development uses `localhost`; `postgres` is the container-network service name. |
| Missing datasource environment variable | For host development, create/check `backend/.env.dev`. The setup-script workflow needs no env file. |
| 404 at `localhost:8080/` | Expected. Open the website on 4200 or API health at `/actuator/health`. |
| Sign-in fails for seeded admin | Follow [Dev login](Dev-Login-and-Accounts). The seeded account has no password. |
| Login still checks passwords after editing the flag | Restart the host backend or recreate its Docker container; a Docker restart alone does not load changed container environment settings. |
| Signed in but no Edit button | Open `/<username>/<slug>` (legacy `/b/<slug>` also works) and check that you own the board or are an admin. |
| Save reports conflict / HTTP 409 | Your drafts remain local. Cancel and reopen to fetch the latest board revision. |
| Board looks empty or says “not found” | Check API health and the browser Network panel. Some current UI load errors are rendered as an empty/missing board. |
| Docker app does not show source edits | Rebuild its images; the current Dockerfiles do not enable live source reload. |
| Settings password/delete controls do nothing | Those controls are unfinished. Sign Out works in settings and the account menu. |
| Theme/radius resets after refresh | Appearance persistence is not implemented yet. |

## Docker diagnostics

Run from the repo root:

```bash
docker compose -p b26-local -f docker-compose.local.yml ps
./setup.sh logs
```

Do not paste credentials or session tokens from logs/configuration into public issues.

## Flyway migration errors

Fresh databases use the `B21` baseline plus later migrations. Existing versioned databases retain their historical migrations. If a database is partially migrated or reports checksum mismatches, keep its data and inspect the failure before changing anything.

Do not delete volumes or run Flyway repair as a generic startup fix. Back up first and consult [Database and backups](Dev-Data-Safety).

## Frontend build warning

The board layout CSS currently exceeds its 8 kB warning budget (about 9.81 kB at the 1.2.0 verification). A successful build can emit this warning; it is not the same as a failed build.

[Docker setup](Docker) · [Local development](Getting-Started-%28Local%29) · [Page URLs](Pages-and-Editing)
