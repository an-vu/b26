# Architecture overview

B26 is an Angular client, a Spring Boot API, and a PostgreSQL database.

```text
Browser → Angular frontend → /api/* → Spring Boot → PostgreSQL
```

The `/api` hop uses Angular's development proxy locally, Nginx in the Docker frontend, or Vercel rewrites in the configured hosted frontend. Browser API requests use relative URLs.

## The central idea: screens are boards

A board has a stable ID, a changeable URL slug, an owner, an internal name, a displayed title/description, and a revision. Widgets belong to boards and store their type, configuration, tile layout, order, and enabled flag.

Home, settings, insights, and sign-in are also boards. `system_settings` maps those routes to board IDs. `user_preferences` maps a user to their main board. This lets the app reuse the same renderer for user content and system screens.

## Frontend responsibilities

- `BoardPageComponent` loads pages and coordinates editing, account menus, and board identity.
- A widget registry selects the component for each widget type.
- Services call APIs; board/user stores provide account and navigation state.
- Edit mode loads a consistent snapshot. Save sends the revision, metadata, and complete widget collection together.
- Route guards and browser-unload handling protect unsaved drafts.

## Backend responsibilities

The Java packages are organized by feature: `auth`, `board`, `widget`, `user`, `system`, and `insights`. Each generally separates controllers/DTOs (`api`), behavior (`domain`), and entities/repositories (`persistence`). `common` holds shared errors and request configuration.

Authentication uses BCrypt password hashes and opaque bearer tokens. The server stores token hashes in `auth_sessions`; the browser stores the bearer token in local storage. Board writes require an owner/admin session. System route writes require admin authorization.

The editor uses a transaction and a board lock to check the submitted revision before writing. Concurrent saves with the same revision produce one accepted save and one HTTP 409 conflict, rather than silently overwriting changes.

## Data and migration boundaries

PostgreSQL is the application database. Flyway manages schema changes; Hibernate validates the application schema. Fast backend tests use an H2-generated schema, and separate PostgreSQL tests cover migrations and real-database behavior.

The legacy `cards` table still exists alongside widgets. Click analytics uses those card IDs; widget-link click tracking has not yet been connected. See [Feature status](Features).

[Project structure](Project-Structure) · [API reference](API-Reference) · [Database and backups](Dev-Data-Safety)
