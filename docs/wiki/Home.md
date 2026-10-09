# Start here

BlueBerry 26 (B26) is a board builder: users create pages, arrange widgets, and share a main board at `/<username>`.

**Returning after a while? Start with one of these:**

| I want to… | Read this |
|---|---|
| Run the app without installing Java, Node, or PostgreSQL | [Docker setup](Docker) |
| Edit code with the Angular development server | [Local development](Getting-Started-%28Local%29) |
| Sign in as the local admin / remember “dev mode” | [Dev login and accounts](Dev-Login-and-Accounts) |
| Find the pages and their editable URLs | [Page and editing guide](Pages-and-Editing) |
| Fix a startup or login problem | [Troubleshooting](Troubleshooting) |

## The essentials

- Open Docker Desktop and run `./setup.sh`. The website is at **http://localhost:4200**; API/database ports stay internal in this workflow.
- Application data lives in **PostgreSQL**. H2 is used by the fast backend tests.
- The local password-bypass switch is `APP_AUTH_REQUIRE_PASSWORD=false`; it requires a backend restart/recreation. See the dev-login page before using it.
- `/settings`, `/insights`, `/signin`, and `/` are dedicated application pages. `/<username>` displays the optional public main board or a minimal profile. Open `/<username>/<board-slug>` to edit as an owner or admin. Legacy `/b/<slug>` links still work.
- No env-file copy is needed for `./setup.sh`. The separate host-development workflow still uses `backend/.env.dev`.
- **Current release: 1.6.0.** The current pass completes public/private and owner/admin access, with matching frontend account state. See [Permissions](Permissions), [Architecture](Architecture-Overview), and [Testing](Testing). Hosted status is tracked separately.

## Understand or maintain the project

[Architecture](Architecture-Overview) · [Project structure](Project-Structure) · [Feature status](Features) · [Tech stack](Tech-Stack) · [Why this stack](Why-This-Stack)

[Configuration](Runtime-Config-%28Dev-vs-Prod%29) · [API reference](API-Reference) · [Database and backups](Dev-Data-Safety) · [Testing](Testing) · [Deployment](Deployment) · [Phone / LAN access](How-to-Access-From-Another-Device-%28Same-Network%29)

Updated release and architecture notes: October 9, 2026. Some older reference pages still describe earlier milestones; use [Development and operations](Development-Reference) for the migrated README details and dated hosting audit.
