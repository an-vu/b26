# Release roadmap

**Current release: 1.5.7.** Mustache adds the 2012 Instagram-inspired sixth theme, shared icons are refreshed and centered, and Lava/Bokeh are placeholders. Five sample profiles with public main boards and 25 widgets were added to Neon production. About remains Version 26.1. Hosted deployment status is tracked separately in [Deployment](Deployment).

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
| 1.5.7 | Mustache, shared icons, pattern placeholders, and production samples | Current release |
| 1.6.0 | Admin permissions enforcement | Later |
| 1.7.0 | Widget library expansion I | Later |
| 1.8.0 | Widget library expansion II | Later |
| 1.9.0 | Insights I | Later |
| 1.9.5 | Cleanup checkpoint | Later |

A Git tag or pushed commit does not prove a hosted deployment or a published GitHub Release.

## 1.2.0 implementation notes

Owner-qualified URLs, legacy compatibility, reserved-name validation, and updated navigation are in place. Slugs stay globally unique; renames do not retain historical aliases. No schema migration is required.

See [Pages and editing](Pages-and-Editing), [API reference](API-Reference), [verification record](Testing), and [rollout/rollback](Deployment).

## 1.2.1 documentation notes

README, wiki, and Obsidian tracking now reflect the URL implementation and one-command Docker preview. Existing wiki page names remain so bookmarks work. Search and appearance persistence have since been implemented; permissions and full insights remain unfinished.

## Current work and rollout

The 1.5.0–1.5.7 features are implemented and tested locally. Before the next hosted rollout, verify current provider state, pending migrations, production settings, backups, and the authenticated user journey. See [Development reference](Development-Reference).

Committed in 1.5.3: sidebar profile editing, settings autosave, board switching, Search/Account/About redesigns, Meteor and scroll refinements, shared panel materials, and hidden-tab animation suspension. Details: [Appearance and panels](Board-Appearance-and-Panels).
