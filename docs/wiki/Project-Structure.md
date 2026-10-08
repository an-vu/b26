# Where to find things

```text
b26/
├── frontend/
│   ├── src/app/
│   │   ├── pages/board-page/      Board rendering, editing, menus, navigation
│   │   ├── widgets/               Widget components, registry, dynamic host
│   │   ├── services/              API clients and board/user stores
│   │   ├── models/                TypeScript API/data types
│   │   ├── interceptors/          Bearer-token request handling
│   │   ├── components/            Header and legacy card components
│   │   └── app.routes.ts          Browser routes and navigation guards
│   ├── angular.json              Build/test configuration and output path
│   ├── proxy.conf.json           Local API proxy
│   ├── nginx.conf                Docker API proxy and SPA fallback
│   ├── vercel.json               Hosted API rewrites and SPA fallback
│   └── Dockerfile
├── backend/
│   ├── src/main/java/com/b26/backend/
│   │   ├── auth/                 Signup, sign-in, sessions
│   │   ├── board/                Board ownership, identity, atomic editing
│   │   ├── widget/               Widget validation and persistence
│   │   ├── user/                 Profiles and main-board preferences
│   │   ├── system/               Global page-to-board mappings
│   │   ├── insights/             Views and legacy card-click analytics
│   │   └── common/               Authorization, CORS, error responses
│   ├── src/main/resources/
│   │   ├── application*.properties
│   │   └── db/migration/         Flyway SQL, including fresh-install baseline
│   ├── src/test/                 API, migration, and PostgreSQL tests
│   ├── .env.example              Tracked template; .env.dev is local/ignored
│   ├── pom.xml                   Java dependencies and build
│   ├── mvnw                      Maven wrapper
│   └── Dockerfile
├── scripts/                      PostgreSQL backup/restore helpers
├── .github/workflows/ci.yml       Tests, PostgreSQL service, frontend build
├── setup.sh                      One-command local Docker preview
├── docker-compose.local.yml      Self-contained preview, loopback-only frontend
├── docker-compose.yml            Backend and frontend containers
├── docker-compose.db.yml         Optional local PostgreSQL container
├── package.json                  Workspace startup and database commands
└── README.md                     Short local setup guide
```

## Start reading here

| Task | Starting file |
|---|---|
| Understand URLs | `frontend/src/app/app.routes.ts` |
| Change the board editor | `frontend/src/app/pages/board-page/board-page.ts` and its template/helpers |
| Add a widget renderer | `frontend/src/app/widgets/widget-registry.ts` |
| Understand saving/conflicts | `BoardService.java`, `SaveBoardEditRequest.java`, `board-page.save-flow.ts` |
| Understand signup/dev login | `AuthService.java`, `backend/.env.example` |
| Understand permissions | `ApiWriteAuthorizationInterceptor.java` |
| Change the database | `backend/src/main/resources/db/migration/` |

The old wiki listed `docker/` and `docs/` directories; those are not part of the current tracked layout. This wiki itself is stored in GitHub's separate `b26.wiki.git` repository.
