# Board appearance and panels

## Site-wide theme

Signed-out visitors always use **Berry**. Signed-in users use their selected main board’s theme family, light/dark mode, and background across Sign In, Settings, Insights, profiles, boards, bottom navigation, and utility panels. With no selected main board, the fallback is Berry. Viewing someone else’s board does not switch the viewer’s theme.

Saved changes to the selected main board update the site theme. Changing another board’s appearance does not replace it. Widget radius, spacing, and atmosphere patterns remain per-board settings. Home is an exception: it uses its own saved theme family, light/dark mode, background, pattern/intensity, radius, and spacing. Home and boards share the same appearance controls and atmosphere renderer; leaving Home restores the normal main-board theme.

`SiteThemeService` resolves the session and main-board preference; `SiteNavigationComponent` contains the common bottom bar, Account, Search, and About panels. Dedicated application pages use `AppPageShellComponent`; board pages project their board settings into the same navigation.

## Board settings

Open the board-name button in the bottom toolbar. Theme, background color, pattern/intensity, light mode, widget radius, and widget spacing save automatically. Board name and URL save on blur or Enter. Reset to default also saves automatically; there are no settings Save/Cancel buttons. Failed saves keep the draft and offer Retry saving; successful-save feedback disappears automatically.

Five themes: **Berry**, **Aero**, **Aqua**, **Omakase**, and **Kiwi**. The Light switch controls light/dark mode independently. Nine background colors blend into the wallpaper, with darker tinting in dark mode. Patterns are None, Stars, Snow, Meteor, Rainfall, Sakura, and Wave. Clicking a selected animated pattern cycles its light/medium/heavy intensity. Visitors see saved appearance; writes remain owner/admin only.

The theme picker uses five previews in one row. Theme, color, and pattern labels reflect the hovered choice, then return to the selection. Reset to default is part of the shared appearance controls. Board switcher and red Delete board remain board-only tools. The switcher selects boards and sets the main board; on smaller screens it occupies the settings panel instead of opening beside it.

## Layout and panels

The footer keeps the brand's cyan Home, blue Search, and purple Account dots. Hover labels are removed. Search, Account, Board Settings, the board switcher, and About share a theme-specific panel surface and a 12px footer gap; layout and content remain specific to each panel.

- **Sidebar:** centered avatar placeholder, owner's display name, @username, placeholder Likes/Followers/Following, description, and optional website/social link. Edit/Save/Cancel live here only, with Save left and Cancel right. Empty links are hidden outside editing; the edit placeholder is “Link in bio.”
- **Search:** bottom-left input, results above it, display name/@username left and Likes right. Likes are currently placeholders, not live social data.
- **Account:** @username heading, transparent notification area with an empty state, then Insights, Settings, and red Sign out. No board list here; notifications are a placeholder.
- **About:** click BlueBerry at bottom right. Compact themed panel with abstract circular icon, Apple Garamond-first BlueBerry wordmark, Version 26.1, and disabled Contact/Legal placeholders. Apple Garamond is not bundled; serif fallbacks apply where unavailable.

CSS animations pause when the page is hidden. Meteor's canvas loop and the widget scroll-bounce animation also stop, then resume without catching up the hidden interval. Reduced motion gives Meteor a static frame with no idle rendering loop. Third-party embeds retain their own playback behavior.

Implementation: shared panel material in `frontend/src/themes/panels.css` plus each theme stylesheet; visibility lifecycle in `frontend/src/app/services/page-activity.service.ts`.

## Fixed widget footprints

Saved layouts use whole-cell footprints: 1×1, 2×1, 3×1, 4×1, 1×2, 2×2, and 3×3. Grid cells are square; content scrolls or truncates inside its tile instead of growing the row. Four-column grids preserve the footprint when the viewport changes. Feed packing never changes widget dimensions.

Home widgets always show an owner avatar at the top-left. Hover/focus scales only that card subtly (1.025×), revealing name/@username next to the avatar, time at the top-right, and heart/comment icons at the bottom corners. Action phrases and counts are absent; icons are placeholders. Neighbors never shrink or move, and grid slots/saved footprints remain unchanged. Touch devices show details without hover. Missing photos use a neutral avatar. User-board widgets do not have this treatment.

## Editing

Edit in the left sidebar loads a consistent board/widget snapshot with its revision. Save submits the owner's display name, description, website, and widgets through `PUT /api/board/{slug}/editor` in one transaction. The display name belongs to the user; the description and website belong to the board. A stale revision returns HTTP 409 and retains drafts. Cancel and reopen the editor to load the latest version. Navigation and browser reload warn about unsaved changes.

Board Settings uses a separate automatic-save flow for board name, URL, and appearance. The board switcher in that panel changes boards and sets the main board after server acceptance. Existing writes advance the board revision.

Deletion requires owner/admin access and confirmation. The last board, main board, and system-route boards are protected. Choose replacements before deleting a main/system board. Failure keeps drafts; deleting the active board redirects to the main board or home fallback.
