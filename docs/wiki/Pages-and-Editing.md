# Find pages and edit boards

Most screens use the same board renderer. Some routes display a board in read-only mode; `/<username>/<slug>` exposes editing controls to the owner or an administrator.

## Default page map

Append these paths to `http://localhost:4200`:

| Page | View route | Editable board route on a fresh database |
|---|---|---|
| Home | `/` | `/anvu/home` |
| Default admin board | `/anvu` | `/anvu/default` |
| Settings | `/settings` | `/anvu/settings` |
| Insights | `/insights` | `/anvu/insights` |
| Sign-in / signup toggle | `/signin` | `/anvu/signin-board` |
| Any user's main board | `/<username>` | `/<username>/<that-board-slug>` |

There is no dedicated `/signup` route. Switch to signup inside the sign-in widget.

Admins can remap the four system routes in settings, and board slugs can change. The table shows initial defaults. `GET /api/system/routes` returns the current system mappings; `GET /api/users/<username>/main-board` resolves a user's current main board.

`/b/<slug>` remains valid; `/u/<slug>` redirects there for compatibility. New links use `/<username>/<slug>`. In URLs and API method names, a parameter sometimes called `boardId` is actually the **slug**; see [API reference](API-Reference).

## URL rules

- The username must own the requested board; a missing or mismatched owner returns not found.
- Slugs remain globally unique, including across different owners.
- Changing a username updates generated links. Old username URLs stop resolving; legacy links still work if the slug is unchanged.
- Changing a slug updates both URL forms. Old slugs are not kept as aliases.
- Main-board preferences use stable IDs and survive a slug change.
- Reserved usernames: `b`, `u`, `api`, `actuator`, `insights`, `settings`, `signin`, `signup`, `assets`.

## Everyday board editing

1. Sign in and open an owned board at `/<username>/<slug>`.
2. Choose Edit. The app loads a fresh board/widget snapshot.
3. Edit the displayed title/description, add or remove widgets, choose tile sizes, and use Up/Down to reorder.
4. Choose Save in the sidebar to save profile details and widgets together. Choose Cancel to discard local widget edits.
5. To change the internal board name or URL, use Board Settings; fields save on blur or Enter, and appearance selections save immediately.

The **board name** labels the board in menus. The owner’s **display name** and the board’s **description** appear in the sidebar. The **slug** is the changeable URL segment; the internal database ID stays stable.

If another tab changed the board, saving returns a conflict and keeps your local drafts. Copy any work you want to retain, then cancel and reopen the editor to load the latest version. Navigation and browser reload warn before discarding unsaved edits.

## Main board and deletion

Use the board switcher in Board Settings to choose the board shown at `/<username>`.

Delete with the red trash button in Board Settings, then confirm. Owner/admin access is required.

- The owner's only board cannot be deleted.
- Choose another main board before deleting the current main board.
- Remap a system route before deleting its board. Admins follow these safeguards too.
- Failure shows an error and keeps drafts.
- Deleting the current board opens the main board (home fallback); deleting another board keeps the current page.

Appearance is saved automatically. See [Appearance and panels](Board-Appearance-and-Panels) for themes, patterns, profile editing, and panel behavior.
