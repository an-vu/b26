# Find pages and edit boards

Home, Sign In, Settings, and Insights are dedicated application pages. Personal boards use the board renderer. Every page uses the shared bottom navigation: Home, Search, and Account. Home centers its “Home” settings button in that bar and moves BlueBerry to a top-center header with the transparent progressive blur from vHuman Studios, without a white/color wash. Other pages retain BlueBerry at the bottom right.

## Page map

Append these paths to `http://localhost:4200`:

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Visitor introduction/sign-in/signup; signed-in activity empty state |
| Settings | `/settings` | Account settings, board library, visibility, optional public main selection |
| Insights | `/insights` | Owner/admin board analytics |
| Sign in | `/signin` | Existing sign-in form |
| Sign up | `/signin?mode=signup` | Existing signup form; no separate `/signup` route |
| User profile/main board | `/<username>` | Public main board, or minimal profile without a main selection |
| Specific board | `/<username>/<slug>` | Public read, private owner/admin access, and owner/admin editing |

Application routes do not use saved system-board mappings. Legacy mapping endpoints and seeded boards remain for compatibility. Home's publishing/feed features are planned; making a board public does not publish a Home entry.

## Personalize Home

Click the bottom-center **Home** button for the same appearance controls used by board settings: theme, background color, pattern/intensity, light switch, radius (6/12/24px), spacing (8/16/24px), and Reset to default. Settings save automatically to the signed-in viewer's account, independently of all boards and their owners. Home does not inherit the main-board theme; visitors use Berry. V33 stores layout settings and V34 adds independent theme/background/pattern fields.

Feed widgets cannot be rearranged by the viewer. Hiding an item is agreed future behavior; it is not implemented yet. The localhost sample feed remains a layout preview, with fixed widget footprints and placeholder social counts.

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

Use Settings’ board library or the board switcher to select one owned public main board. Selection is optional; removing it leaves a minimal profile at `/<username>`. New boards start private. Making a private board main requires explicit confirmation to make it public.

Delete with the red trash button in Board Settings, then confirm. Owner/admin access is required.

- The owner's only board cannot be deleted.
- Choose another main board before deleting the current main board.
- Remap a system route before deleting its board. Admins follow these safeguards too.
- Failure shows an error and keeps drafts.
- Deleting the current board opens the main board (home fallback); deleting another board keeps the current page.

Appearance is saved automatically. See [Appearance and panels](Board-Appearance-and-Panels) for themes, patterns, profile editing, and panel behavior.
