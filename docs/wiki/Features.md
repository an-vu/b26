# What works, and what is unfinished

Use this page to distinguish an application problem from an unfinished feature. Status reflects 1.5.9 local implementation and verification; this does not establish a hosted release.

## Implemented

- Owner-checked `/{username}/{boardSlug}` pages, legacy board links, and per-user main-board shortcuts.
- Signup, password sign-in, sign-out, and bearer sessions.
- Signup creates a private owned starter board; choosing a public main board is optional.
- Board creation/deletion, owner/admin checks, confirmation, and predictable post-delete navigation.
- Deletion safeguards for the last board, main board, and concurrent deletes.
- Set Main Board through the board switcher in Board Settings.
- Link, embed, and places-list widgets; tile sizes and manual ordering.
- Dedicated application forms, with saved account/sign-in widgets retained for compatibility. Saved admin route widgets display a retirement message.
- Atomic board-details/widget saving, revision conflict detection, and unsaved-change warnings.
- Automatic saving for board name/URL and appearance; explicit sidebar Save/Cancel for profile and widgets.
- Profile display name, username, and email editing.
- Dedicated Home, Insights, Settings, and Sign In pages; retired mappings are archived.
- View recording and backend analytics endpoints.
- PostgreSQL migrations, backup/restore scripts, tests, and CI.

## Partial or unfinished

| Visible feature | Current limitation |
|---|---|
| Social counts / notifications | Likes, Followers, Following, and the notification area are placeholders. |
| About Contact / Legal | Contact opens email to eve@vhumanstudios.com; legal destinations remain unfinished. |
| Map widget | A list of place names, not an interactive map. |
| Insights page | Basic board selection and visit/click totals work; richer charts remain planned. |
| Link-click analytics | Board link widgets send click events; historical card clicks are preserved. Feed/editor previews do not track clicks. |
| Remember Me | Checkbox does not alter session storage/lifetime. |
| Password field in settings | No password-change behavior. |
| Delete Account inside settings widget | Placeholder. Sign Out works in both settings and the account menu. |
| Widget enabled flag | Stored, but the current display path does not filter disabled widgets. |
| Board visibility | Public/private access is enforced; unlisted is not implemented. |
| Mobile layout | Large tile spans and compact navigation still need refinement. |

## Current local UI

Username search, independent Home appearance, six themes, five corner levels, live sliders, and shared panel animations are implemented. The floating widget picker reuses board-sized previews. See [Appearance and panels](Board-Appearance-and-Panels) and [Pages and editing](Pages-and-Editing).

The 1.5.9 backend uses bounded public board pagination and atomic click throttling. Legacy cards and route mappings are archived by V37, with old APIs returning 410. Future widget types, richer insights, and social interactions remain in the [release roadmap](Release-Roadmap).
