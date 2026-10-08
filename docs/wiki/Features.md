# What works, and what is unfinished

Use this page to distinguish an application problem from an unfinished feature. Core status is supplemented by the October 7 local changes below; this does not establish a hosted release.

## Implemented

- Owner-checked `/{username}/{boardSlug}` pages, legacy board links, and per-user main-board shortcuts.
- Signup, password sign-in, sign-out, and bearer sessions.
- Signup creates and selects an owned starter board.
- Board creation/deletion, owner/admin checks, confirmation, and predictable post-delete navigation.
- Deletion safeguards for the last board, main board, system routes, and concurrent deletes.
- Set Main Board through the board switcher in Board Settings.
- Link, embed, and places-list widgets; tile sizes and manual ordering.
- User-settings, admin-settings, sign-in, and signup widgets.
- Atomic board-details/widget saving, revision conflict detection, and unsaved-change warnings.
- Automatic saving for board name/URL and appearance; explicit sidebar Save/Cancel for profile and widgets.
- Profile display name, username, and email editing.
- Admin-configurable home, insights, settings, and sign-in board mappings.
- View recording and backend analytics endpoints.
- PostgreSQL migrations, backup/restore scripts, tests, and CI.

## Partial or unfinished

| Visible feature | Current limitation |
|---|---|
| Social counts / notifications | Likes, Followers, Following, and the notification area are placeholders. |
| About Contact / Legal | Disabled placeholders; no destinations configured. |
| Map widget | A list of place names, not an interactive map. |
| Insights page | Board route and APIs exist, but no completed summary dashboard is wired to the UI. |
| Link-click analytics | Backend tracks legacy card IDs; current link widgets do not send those events. |
| Remember Me | Checkbox does not alter session storage/lifetime. |
| Password field in settings | No password-change behavior. |
| Delete Account inside settings widget | Placeholder. Sign Out works in both settings and the account menu. |
| Widget enabled flag | Stored, but the current display path does not filter disabled widgets. |
| Private/unlisted boards | No visibility model; board read/list endpoints are public. |
| Mobile layout | Large tile spans and compact navigation still need refinement. |

## Current local UI

Username search and appearance persistence are implemented. Five themes, automatic settings, sidebar editing, unified panels, and visibility-aware animations are covered in [Appearance and panels](Board-Appearance-and-Panels). Latest local release commit: 1.5.3 (`93a2e2b`); these UI changes are committed.

Keep unfinished controls visible and tracked. Permissions, widget expansion, and insights follow later in the [release roadmap](Release-Roadmap). These are planned features, not shipped functionality.
