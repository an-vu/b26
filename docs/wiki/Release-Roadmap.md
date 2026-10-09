# Release roadmap

**Current release: 1.6.0.** This pass completes the existing public/private and owner/admin permission rules, including matching frontend state. About remains Version 26.1. Hosted deployment status is tracked separately in [Deployment](Deployment).

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
| 1.5.7 | Mustache, shared icons, pattern placeholders, and production samples | Committed |
| 1.5.8 | Widget picker, panel animations, appearance controls, and editor cleanup | Committed |
| 1.5.9 | Backend consolidation, paginated boards, widget analytics, and legacy retirement | Committed as `edbb620` |
| 1.6.0 | Public/private, owner/admin, and visitor permission enforcement | Implemented and tested locally; committed |
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

The 1.6.0 implementation passed 119 backend tests (including PostgreSQL), 141 frontend tests, and both package/production builds. The release contains these verified changes; hosted rollout is tracked separately. Before the next hosted rollout, verify current provider state, pending migrations, production settings, backups, and the authenticated user journey. See [Development reference](Development-Reference).

Committed in 1.5.3: sidebar profile editing, settings autosave, board switching, Search/Account/About redesigns, Meteor and scroll refinements, shared panel materials, and hidden-tab animation suspension. Details: [Appearance and panels](Board-Appearance-and-Panels).
