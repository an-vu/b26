# Board appearance and panels

As of October 8, 2026, the latest local release commit is **1.5.3** (`93a2e2b`), following 1.5.2 (`6d712dd`). Profile/sidebar editing, automatic board settings, panel redesigns, and performance refinements are **committed in 1.5.3**. The About panel displays **Version 26.1**; this display label is not a Git tag or deployment identifier.

Hosting checked October 8, 2026: Vercel production is Ready on 1.5.3; Render’s retry of 1.5.3 is live; Neon production has successful V30/V31 migrations. See deployment notes for evidence. The October 6 audit below remains historical evidence. Permission matrices, full insights, and social counts remain unfinished.

## Board settings

Open the board-name button in the bottom toolbar. Theme, background color, pattern/intensity, light mode, widget radius, and widget spacing save automatically. Board name and URL save on blur or Enter. Reset to default also saves automatically; there are no settings Save/Cancel buttons. Failed saves keep the draft and offer Retry saving; successful-save feedback disappears automatically.

Five themes: **Berry**, **Aero**, **Aqua**, **Omakase**, and **Kiwi**. The Light switch controls light/dark mode independently. Nine background colors blend into the wallpaper, with darker tinting in dark mode. Patterns are None, Stars, Snow, Meteor, Rainfall, Sakura, and Wave. Clicking a selected animated pattern cycles its light/medium/heavy intensity. Visitors see saved appearance; writes remain owner/admin only.

The theme picker uses five previews in one row. Theme, color, and pattern labels reflect the hovered choice, then return to the selection. Settings tools run left to right: board switcher, Reset to default, red Delete board. The switcher selects boards and sets the main board; on smaller screens it occupies the settings panel instead of opening beside it.

## Layout and panels

The footer keeps the brand's cyan Home, blue Search, and purple Account dots. Hover labels are removed. Search, Account, Board Settings, the board switcher, and About share a theme-specific panel surface and a 12px footer gap; layout and content remain specific to each panel.

- **Sidebar:** centered avatar placeholder, owner's display name, @username, placeholder Likes/Followers/Following, description, and optional website/social link. Edit/Save/Cancel live here only, with Save left and Cancel right. Empty links are hidden outside editing; the edit placeholder is “Link in bio.”
- **Search:** bottom-left input, results above it, display name/@username left and Likes right. Likes are currently placeholders, not live social data.
- **Account:** @username heading, transparent notification area with an empty state, then Insights, Settings, and red Sign out. No board list here; notifications are a placeholder.
- **About:** click BlueBerry at bottom right. Compact themed panel with abstract circular icon, Apple Garamond-first BlueBerry wordmark, Version 26.1, and disabled Contact/Legal placeholders. Apple Garamond is not bundled; serif fallbacks apply where unavailable.

CSS animations pause when the page is hidden. Meteor's canvas loop and the widget scroll-bounce animation also stop, then resume without catching up the hidden interval. Reduced motion gives Meteor a static frame with no idle rendering loop. Third-party embeds retain their own playback behavior.

Implementation: shared panel material in `frontend/src/themes/panels.css` plus each theme stylesheet; visibility lifecycle in `frontend/src/app/services/page-activity.service.ts`.

## Editing

Edit in the left sidebar loads a consistent board/widget snapshot with its revision. Save submits the owner's display name, description, website, and widgets through `PUT /api/board/{slug}/editor` in one transaction. The display name belongs to the user; the description and website belong to the board. A stale revision returns HTTP 409 and retains drafts. Cancel and reopen the editor to load the latest version. Navigation and browser reload warn about unsaved changes.

Board Settings uses a separate automatic-save flow for board name, URL, and appearance. The board switcher in that panel changes boards and sets the main board after server acceptance. Existing writes advance the board revision.

Deletion requires owner/admin access and confirmation. The last board, main board, and system-route boards are protected. Choose replacements before deleting a main/system board. Failure keeps drafts; deleting the active board redirects to the main board or home fallback.
