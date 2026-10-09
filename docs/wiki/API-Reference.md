# API reference

This page describes the implemented API, checked against commit [`b8deab3`](https://github.com/an-vu/b26/commit/b8deab31f1a57628f7e0e570587f83e948ff4360). For setup, start with [Home](Home).

Host-development backend base URL: `http://localhost:8080`. With `./setup.sh`, use `http://localhost:4200/api/...`; the API port stays inside Docker. The frontend sends `/api` requests through its proxy. JSON requests use `Content-Type: application/json`; authenticated requests use `Authorization: Bearer <session-token>`.

## Identifiers: read this first

| Identifier | Where it is used |
|---|---|
| Board URL slug, such as `default` | `/api/board/<slug>` and nested widget/editor routes; browser `/{username}/<slug>` (legacy `/b/<slug>`) |
| Stable board database ID | Analytics `boardId`, user `mainBoardId`, and system route mappings |
| Numeric widget ID | Individual widget updates/deletes |
| Legacy card ID | Click tracking; separate from widget IDs |

Some controller parameters are named `boardId` even when they accept a **slug**. Do not assume that name means the stable ID everywhere. Obtain the stable ID from the returned board's `id` field.

## Accounts and sessions

| Method | Path | Access / purpose |
|---|---|---|
| POST | `/api/auth/signup` | Public; create user, starter board, main-board preference, and session |
| POST | `/api/auth/signin` | Public; sign in |
| GET | `/api/auth/me` | Session; current authenticated user |
| POST | `/api/auth/signout` | Invalidate the supplied session |
| GET / PATCH | `/api/users/me` | Session; read/update own profile |
| GET / PATCH | `/api/users/me/preferences` | Session; read/update preferences, including main board |
| GET / PUT | `/api/users/me/preferences/home` | Session; read/save own Home appearance: theme family, color mode, hex background, pattern/intensity, Corner (`radiusStep`, 1–5) and Gap (`spacingStep`, 1–3) |
| GET | `/api/users/{username}/main-board` | Public; resolve a user's main board |

Signup accepts `email`, `password`, and optional `displayName` / `username`. The password must be 8–72 characters. Signin uses `email` and `password`; local bypass behavior is explained in [Dev login and accounts](Dev-Login-and-Accounts).

## Boards

“Owner/admin” below means a bearer session belonging to the board owner or an administrator. The server enforces authorization; a hidden frontend control is not the access check.

| Method | Path | Access / purpose |
|---|---|---|
| GET | `/api/board` | Public; list boards |
| POST | `/api/board` | Session; create a board owned by the current user |
| GET | `/api/board/mine` | Session; list own boards |
| GET | `/api/board/{slug}` | Public; board metadata |
| GET | `/api/board/by-owner/{username}/{slug}` | Public; resolve board only when the username owns it; otherwise 404 |
| GET | `/api/board/{slug}/permissions` | Optional session; returns `canEdit` |
| GET | `/api/board/{slug}/editor` | Public; board + widgets snapshot |
| PUT | `/api/board/{slug}/editor` | Owner/admin; atomic editor save with required version |
| PATCH | `/api/board/{slug}/identity` | Owner/admin; board name and URL slug |
| PATCH | `/api/board/{slug}/meta` | Owner/admin; display name and headline |
| PATCH | `/api/board/{slug}/url` | Owner/admin; URL slug |
| PUT | `/api/board/{slug}` | Owner/admin; legacy metadata + cards update |
| DELETE | `/api/board/{slug}` | Owner/admin; delete; reject last, main, or system-route boards; success returns 204 |

Board metadata includes `id`, `boardName`, `boardUrl`, `name`, `headline`, `version`, and `ownerUsername`. `boardName` is the internal name; `name` is the displayed heading. `boardUrl` is the slug.

### Atomic editor saves

Use `GET /api/board/{slug}/editor` to load `{ "board": ..., "widgets": [...] }`. Keep `board.version`, edit the snapshot, then send:

```json
{
  "version": 3,
  "name": "My page",
  "headline": "Links and things I am working on",
  "widgets": []
}
```

This example deliberately represents an **empty board**. `widgets` is the complete desired collection: omitted existing widgets are deleted. Preserve IDs for existing widgets and omit IDs for new ones. Widget fields include `type`, `title`, `layout`, `config`, `enabled`, and `order`.

Use the version you actually loaded, not the example value. The response contains the saved board and widgets, including the new version. A stale version returns **409 Conflict**; reload and reconcile changes before retrying. Do not blindly retry with an updated version, which could overwrite someone else's edits. Validation failures roll back the entire save.

`PATCH /identity` accepts `boardName`, `boardUrl`, and an optional `version`; include the loaded version for conflict detection. The legacy board PUT accepts metadata and `cards`; it is not a replacement for the widget editor save.

Username and slug behavior, including reserved names and rename limitations, is described in [Page URLs](Pages-and-Editing).

## Widgets

| Method | Path | Access / purpose |
|---|---|---|
| GET | `/api/board/{slug}/widgets` | Public; list widgets |
| POST | `/api/board/{slug}/widgets` | Owner/admin; create widget |
| PUT | `/api/board/{slug}/widgets/{widgetId}` | Owner/admin; update widget |
| DELETE | `/api/board/{slug}/widgets/{widgetId}` | Owner/admin; delete widget |
| PUT | `/api/board/{slug}/widgets/sync` | Owner/admin; synchronize the complete widget list |

The frontend's board editor uses the atomic editor endpoint to save metadata and widgets together. Individual widget endpoints remain available.

## System routes

| Method | Path | Access / purpose |
|---|---|---|
| GET | `/api/system/routes` | Public; global page-to-board mappings |
| PATCH | `/api/system/routes` | Admin session or configured admin token; update mappings |

Mappings use stable board IDs. The PATCH requires home, insights, and settings board IDs; signin is optional. `APP_ADMIN_TOKEN` is an alternate credential for these system writes, not a board-editing session. See [Configuration](Runtime-Config-%28Dev-vs-Prod%29).

## Analytics

These endpoints currently have public access. They use **stable board IDs**, not URL slugs.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/click/{cardId}` | Record a legacy card click; body `{ "boardId": "..." }` |
| GET | `/api/insights/{boardId}` | Read legacy click insights |
| POST | `/api/insights/view` | Record a view; body includes `boardId` and optional `source` |
| GET | `/api/insights/{boardId}/summary` | Read view/click summary |

There is no implemented `/api/analytics` endpoint. Current link widgets are not wired to legacy card-click tracking, and the insights UI does not yet present the available summary. See [Feature status](Features).

## Errors and source of truth

Common responses: **400** invalid input, **401** missing/invalid session, **403** insufficient permission, **404** missing resource, **409** conflict, and **429** click-rate limit.

For exact request/response fields, use the DTOs beside the controllers:

- [Board API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/board/api)
- [Widget API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/widget/api)
- [Authentication API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/auth/api)
- [User API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/user/api)
- [System API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/system/api)
- [Insights API](https://github.com/an-vu/b26/tree/main/backend/src/main/java/com/b26/backend/insights/api)
