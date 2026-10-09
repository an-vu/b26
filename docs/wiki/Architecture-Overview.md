# Architecture overview

B26 is an Angular client, a Spring Boot API, and a PostgreSQL database.

```text
Browser → Angular frontend → /api/* → Spring Boot → PostgreSQL
```

The `/api` hop uses Angular's development proxy locally, Nginx in the Docker frontend, or Vercel rewrites in the configured hosted frontend. Browser API requests use relative URLs.

## Boards and application pages

A board has a stable ID, a changeable URL slug, an owner, an internal name, a displayed title/description, and a revision. Widgets belong to boards and store their type, configuration, tile layout, order, and enabled flag.

Home, settings, insights, and sign-in are dedicated application pages. User boards use the widget renderer; Home has its own feed and appearance preferences. `user_preferences` stores an optional public main board. Legacy route mappings are archived; retired admin widgets show an explanation instead of route controls.

## Frontend responsibilities

- `BoardPageComponent` coordinates board loading, draft state, permissions, and saves; profile, settings, and widget-editor components own their feature views.
- `SiteNavigationComponent` owns shared navigation and Account. Panel dismissal and internal-view height preservation use one shared directive.
- Page routes load their components on demand, with board navigation guards retained.
- A widget registry selects the component for each widget type.
- Services call APIs; board/user stores provide account and navigation state.
- Edit mode loads a consistent snapshot. Save sends the revision, metadata, and complete widget collection together.
- Route guards and browser-unload handling protect unsaved drafts.

## Backend responsibilities

The Java packages are organized by feature: `auth`, `board`, `widget`, `user`, and `insights`. Each generally separates controllers/DTOs (`api`), behavior (`domain`), and entities/repositories (`persistence`). `common` holds shared errors and request configuration.

Authentication uses BCrypt password hashes and opaque bearer tokens. The server stores token hashes in `auth_sessions`; the browser stores the bearer token in local storage. Board writes require an owner/admin session. System-route APIs return 410; the admin-token bypass is retired.

The editor uses a transaction and a board lock to check the submitted revision before writing. Concurrent saves with the same revision produce one accepted save and one HTTP 409 conflict, rather than silently overwriting changes.

## Data and migration boundaries

PostgreSQL is the application database. Flyway manages schema changes; Hibernate validates the application schema. Fast backend tests use an H2-generated schema, and separate PostgreSQL tests cover migrations and real-database behavior.

V37 archives legacy cards and system settings, detaches their foreign keys, and namespaces historical click targets. New clicks use link widget IDs. Historical totals remain available. See [API reference](API-Reference).

[Project structure](Project-Structure) · [API reference](API-Reference) · [Database and backups](Dev-Data-Safety)

## Backend review — October 9, 2026

Session validation and widget request mapping are consolidated; unused queries/DTOs and the live system-route subsystem are removed. Public board listing uses bounded database pagination and joined owner data. Click duplicate suppression is atomic, expires old entries, and has a fixed capacity.

Legacy cards and mappings are retained as archives by V37. The frontend route picker and old API callers are removed; old clients receive 410 responses. Migration tests cover fresh installs, upgrades, archived data, historical clicks, and detached constraints. Authorization, pagination, click permissions, and concurrent throttling have regression tests.

Two deployment boundaries remain: click suppression is per instance, and V37 needs the matching backend/frontend release. Historical migrations remain untouched.

## 1.6.0 permission enforcement

Controllers declare `@ApiAccess` policies. The interceptor checks the matched handler and resolved path variables; it no longer parses raw URI strings to infer access. Undeclared application handlers are denied. `BoardAccessService` centralizes owner/admin checks, while event controllers check validated body-supplied board IDs before recording events. Tests cover declarations and allowed/denied access. See [Permissions](Permissions).

Frontend permissions reset on route/account changes. Board libraries, insights, and user/board stores cancel stale loads and clear old account data. The auth interceptor attaches bearer headers only to recognized same-origin API routes.
