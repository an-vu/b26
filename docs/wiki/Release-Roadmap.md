# Release roadmap

**Current release: 1.6.5.** A small follow-up to 1.6.4: correct local setup links, explicit TypeScript source roots for newer editors, and a checker for the Obsidian project map. 1.6.4 and migrations V40–V42 are deployed. About remains Version 26.1; hosted deployment status is tracked separately in [Deployment](Deployment).

| Version | Scope | Status |
| --- | --- | --- |
| 1.0.0 | First official release | Git tag exists |
| 1.1.0 | Modularization, test split, admin UX foundation | Git tag exists |
| 1.1.1 | Board deletion and stability | Implemented; tested locally |
| 1.1.2 | Deployment and security checks | Before release |
| 1.2.0 | User-centric board URLs | Implemented; tested locally |
| 1.2.1 | Documentation and wiki cleanup I | Documentation updated |
| 1.3.0 | Username search | Implemented; tested locally |
| 1.4.0 | Board settings: core persistence | Implemented; tested locally |
| 1.5.0 | Advanced controls and release checks | Committed as `7f4d5c1` |
| 1.5.1 | Aero/Aqua themes, shared controls, Docker live reload | Committed as `e8c4105` |
| 1.5.2 | Five themes and animated backgrounds | Committed as `6d712dd` |
| 1.5.3 | Profiles, settings autosave, panels, and animation performance | Committed as `93a2e2b` |
| 1.5.4 | Board privacy and dedicated pages | Committed |
| 1.5.5 | Home feed, navigation, and appearance controls | Committed |
| 1.5.6 | Frontend consolidation, About, favicons, and responsive panels | Committed |
| 1.5.7 | Mustache (now Valencia), shared icons, pattern placeholders, and production samples | Committed |
| 1.5.8 | Widget picker, panel animations, appearance controls, and editor cleanup | Committed |
| 1.5.9 | Backend consolidation, paginated boards, widget analytics, and legacy retirement | Committed as `edbb620` |
| 1.6.0 | Public/private, owner/admin, and visitor permission enforcement | Implemented and tested locally; committed |
| 1.6.1 | Berry glass/frost materials, Social widgets, and widget editing refinements | Committed as `5d8653d` |
| 1.6.2 | Instagram follower/posts integration and visitor homepage | Committed as `e293ea9` |
| 1.6.3 | Board/editor consolidation, rendering and cache optimization, and Safari measurements | Committed as `45e471d` |
| 1.6.4 | Simplification pass, Stars and Lava rebuilds, per-board themes, and theme id rename | Committed as `ef8d1fd`; deployed |
| 1.6.5 | Local setup links, TypeScript editor config, and project map checker | Committed |
| 1.7.0 | Widget library expansion I | Later |
| 1.8.0 | Widget library expansion II | Later |
| 1.9.0 | Insights I | Later |
| 1.9.5 | Cleanup checkpoint | Later |

A Git tag or pushed commit does not prove a hosted deployment or a published GitHub Release.

## 1.2.0 implementation notes

Owner-qualified URLs, legacy compatibility, reserved-name validation, and updated navigation are in place. Slugs stay globally unique; renames do not retain historical aliases. No schema migration is required.

See [Pages and editing](Pages-and-Editing), [API reference](API-Reference), [verification record](Testing), and [rollout/rollback](Deployment).

## 1.2.1 documentation notes

README, wiki, and Obsidian tracking now reflect the URL implementation and one-command Docker preview. Existing wiki page names remain so bookmarks work. Search and appearance persistence have since been implemented; 1.6.0 completes the current access rules, while richer insights remain planned.

## 1.6.0 scope

- Declare access on API handlers and deny undeclared application endpoints. Resolve matched path variables so reserved-looking slugs, encoded paths, and context paths cannot skip access checks.
- Share owner/admin checks across board reads, writes, widgets, editor snapshots, and insights. Keep account preferences scoped to their owner and main-board selection restricted to owned public boards.
- Clear permissions and personal data when the account or board changes; cancel stale loads and keep edit actions disabled until authorized. Limit automatic bearer headers to same-origin API requests.
- Verify allowed and denied actions, unchanged data after denied writes, and expired/revoked sessions. See [Permissions](Permissions) and [Testing](Testing).

The old configurable page/widget permission matrix belonged to retired system boards. It is outside this release; no new admin page, migration, or permission schema is required.

## Current work and rollout

**Simplification pass (after 1.6.3, not yet released).** Pending migrations, applied at the next backend deploy:

- **V40** drops the theme, pattern, intensity, and color-mode CHECK constraints. `AppearanceRules` is now the only list of allowed values, so a new theme no longer needs a migration.
- **V41** converts `widgets.config_json` to `jsonb`. It rewrites the column (a brief lock on `widgets`), and any unparseable legacy config becomes `{}`.
- **V42** renames theme ids in boards and Home appearances (`default` → `berry`, `frutiger-aero` → `aero`, `omahakase` → `omakase`, `lofi` → `valencia`) and sets both column defaults to `berry`. The old ids are still accepted by the API and frontend and converted to the new ones.

API changes in the same pass:

- The unused `PATCH /meta`, `PATCH /url`, single-widget create/update/delete, `PUT /widgets/sync`, and `GET /api/insights/{boardId}` endpoints are removed.
- Sign-in can now return 429 after repeated failures.
- Profile saves require an email and return 409 when it's taken.
- Client IPs now come from `X-Forwarded-For`.

The 1.6.3 cleanup shares board loading, separates settings draft ownership, improves loading/retry errors, preserves widget render inputs, pauses hidden-tab Instagram polling, and adds bounded image caching. No new migration is required.

Home's local sample activity and suggested profiles are a development preview, gated to localhost outside production. A real community activity API, following, publishing, reactions, and comments remain planned. Instagram counts/recent posts are implemented; other social platforms still use URL-only detection.

The 1.6.0 implementation passed 119 backend tests (including PostgreSQL), 141 frontend tests, and both package/production builds. The release contains these verified changes; hosted rollout is tracked separately. Before the next hosted rollout, verify current provider state, pending migrations, production settings, backups, and the authenticated user journey. See [Deployment](Deployment).

Committed in 1.5.3: sidebar profile editing, settings autosave, board switching, Search/Account/About redesigns, Meteor and scroll refinements, shared panel materials, and hidden-tab animation suspension. Details: [Appearance and panels](Board-Appearance-and-Panels).
