# Board appearance and panels

## Site-wide theme

Signed-out visitors always use **Berry**. Signed-in users use their selected main board’s theme family, light/dark mode, and background across Sign In, Settings, Insights, profiles, boards, bottom navigation, and utility panels. With no selected main board, the fallback is Berry. Viewing someone else’s board does not switch the viewer’s theme.

Saved changes to the selected main board update the site theme. Changing another board’s appearance does not replace it. Widget radius, spacing, and atmosphere patterns remain per-board settings. Home is an exception: it uses its own saved theme family, light/dark mode, background, pattern/intensity, radius, and spacing. Home and boards share the same appearance controls and atmosphere renderer; leaving Home restores the normal main-board theme.

`SiteThemeService` resolves the session and main-board preference; `SiteNavigationComponent` contains the common bottom bar, Account, Search, and About panels. Dedicated application pages use `AppPageShellComponent`; board pages project their board settings into the same navigation.

## Board settings

Open the board-name button in the bottom toolbar. Theme, background color, pattern/intensity, light mode, widget radius, and widget spacing save automatically. Board name and URL save on blur or Enter. Reset to default also saves automatically; there are no settings Save/Cancel buttons. Failed saves keep the draft and offer Retry saving; successful-save feedback disappears automatically.

Six themes: **Berry**, **Aero**, **Aqua**, **Omakase**, **Kiwi**, and **Mustache**. Mustache uses 2012 Instagram-inspired blue enamel chrome, silver photo panels, and charcoal camera controls. The Light switch controls light/dark mode independently. Nine background colors blend into the wallpaper, with darker tinting in dark mode. Patterns are None, Stars, Snow, Meteor, Rainfall, Sakura, and Wave. Lava and Bokeh are non-saving placeholders with hover labels. Clicking a selected animated pattern cycles its light/medium/heavy intensity. Visitors see saved appearance; writes remain owner/admin only.

The theme picker uses five previews in one row. Theme, color, and pattern labels reflect the hovered choice, then return to the selection. Reset to default is part of the shared appearance controls. Board switcher and red Delete board remain board-only tools. The switcher selects boards and sets the main board inside Board Settings. Switcher and delete-confirmation views keep the panel height and bottom action row, with their content centered.

## Layout and panels

The footer keeps the brand's cyan Home, blue Search, and purple Account dots. Hover labels are removed. Home Settings, Account, Board Settings, Search, and About share a theme-specific panel surface. Toolbar settings and Search use a 12px gap from the footer; About centers in the viewport. Shared responsive tokens control panel width and padding. Content-specific dimensions remain explicit.

- **Sidebar:** centered avatar placeholder, owner's display name, @username, placeholder Likes/Followers/Following, description, and optional website/social link. Edit/Save/Cancel live here only, with Save left and Cancel right. Empty links are hidden outside editing; the edit placeholder is “Link in bio.”
- **Search:** bottom-left input, results above it, display name/@username left and Likes right. Likes are currently placeholders, not live social data.
- **Account:** @username heading, transparent notification area with an empty state, then Insights, My Board, and Settings. Settings replaces the notification content with centered Settings and Sign Out buttons while retaining the action row and panel height. No board list here; notifications are a placeholder.
- **About:** click BlueBerry at bottom right. Viewport-centered compact themed panel with abstract circular icon, Apple Garamond-first BlueBerry wordmark, Version 26.1, and disabled Contact/Legal placeholders. Apple Garamond is not bundled; serif fallbacks apply where unavailable.

CSS animations pause when the page is hidden. Meteor's canvas loop and the widget scroll-bounce animation also stop, then resume without catching up the hidden interval. Reduced motion gives Meteor a static frame with no idle rendering loop. Third-party embeds retain their own playback behavior.

Implementation: shared panel material in `frontend/src/themes/panels.css` plus each theme stylesheet; visibility lifecycle in `frontend/src/app/services/page-activity.service.ts`.

## Fixed widget footprints

Saved layouts use whole-cell footprints: 1×1, 2×1, 3×1, 4×1, 1×2, 2×2, and 3×3. Grid cells are square; content scrolls or truncates inside its tile instead of growing the row. Four-column grids preserve the footprint when the viewport changes. Feed packing never changes widget dimensions.

Home widgets always show an owner avatar at the bottom-left. Hover/focus scales only that card subtly (1.025×), revealing name/@username next to the avatar, time with “ago” at the bottom-right, and heart/comment icons at the bottom-center. A disabled top-right menu is a report/hide placeholder. Action phrases and counts are absent; icons are placeholders. Neighbors never shrink or move, and grid slots/saved footprints remain unchanged. Touch devices show details without hover. Missing photos use a neutral avatar. User-board widgets do not have this treatment.

## Editing

Edit in the left sidebar loads a consistent board/widget snapshot with its revision. Save submits the owner's display name, description, website, and widgets through `PUT /api/board/{slug}/editor` in one transaction. The display name belongs to the user; the description and website belong to the board. A stale revision returns HTTP 409 and retains drafts. Cancel and reopen the editor to load the latest version. Navigation and browser reload warn about unsaved changes.

Board Settings uses a separate automatic-save flow for board name, URL, and appearance. The board switcher in that panel changes boards and sets the main board after server acceptance. Existing writes advance the board revision.

Deletion requires owner/admin access and confirmation. The last board, main board, and system-route boards are protected. Choose replacements before deleting a main/system board. Failure keeps drafts; deleting the active board redirects to the main board or home fallback.

## Styling ownership

- `themes/panels.css`: shared panel surface, toolbar layout, content alignment, and action rows. Compact dialogs retain content-specific sizes.
- `themes/buttons.css`: the common button foundation and hover/pressed behavior for both buttons and links, including icon sizing. Theme files provide interaction material tokens.
- `themes/controls.css`: shared picker/danger tokens, browser-specific range geometry, input spacing, and quiet focus. Range material tokens live in the theme files; Berry retains its native slider.
- `themes/forms.css`: shared authentication and settings form rows, sections, and status messages.
- `themes/surfaces.css`: square-grid sizing shared by Home and Board; packing and editing remain local.
- `themes/chrome.css`: shared toolbar, signature navigation dots, wordmark, and theme transition behavior.
- `themes/theme-previews.css`: all five picker preview palettes; the appearance component owns preview geometry.
- Theme files supply materials and intentional visual differences. Component styles own content-specific layouts. Account styles belong to SiteNavigation, rather than importing a Board page stylesheet.

All toolbar panels and compact dialogs use `PanelBehaviorDirective` for dismissal. Internal views preserve height and Escape returns to their main view before closing; busy confirmations stay open. Search uses `ToolbarPanelAnchor` for footer positioning and resize observation; About centers through CSS and fits short viewports. Avoid appending corrective rules: update the owning rule or theme token.

## Frontend component boundaries

`BoardPageComponent` coordinates loading, draft state, permissions, and transactional saves. Its visible features live in `BoardProfileComponent` (profile fields and edit actions), `BoardSettingsComponent` (settings, switcher, confirmation, and footer tools), and `WidgetEditorComponent` (the shared new/existing widget form). Inputs and outputs keep these views separate from persistence.

`IconComponent` owns common navigation, action, reaction, and pattern SVGs. Labels belong to the surrounding button; the SVG is decorative. Unique artwork remains local. `appearance-values.ts` shares paper-color normalization, night tinting, and foreground contrast between Board and the site theme.

Routes use `loadComponent` so page code is fetched on demand. Board aliases retain their existing ordering and unsaved-edit guards.

## Responsive layout and browser icons

`themes/responsive.css` owns viewport gutters, panel dimensions, touch targets, and proportional square-grid spacing. Four grid columns remain intact on phones. Touch inputs use 16px text to avoid focus zoom; signature navigation dots keep their artwork size inside larger targets. Short panels can scroll when the viewport cannot fit their controls. Aqua title insets follow the shared panel padding.

All browser icons live in `frontend/public/favicons/`. PNGs render the Apple Color Emoji 🍱 glyph directly; ICO contains 16px and 32px variants. The HTML uses absolute, versioned icon URLs so nested routes and stale icon caches do not point to the old artwork. Touch and manifest icons use the same bento artwork.

Mustache persistence is enabled for boards and Home by V35, keeping the internal `lofi` ID for saved-appearance compatibility. Its sixth preview remains on the same row; the preview grid follows the theme count. Its visual reference is the [2012 Instagram interface](https://es.wired.com/galerias/si-crees-que-recuerdas-el-instagram-de-hace-15-anos-mira-dos-veces).
