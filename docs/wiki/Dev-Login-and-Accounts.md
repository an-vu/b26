# Dev login and accounts

## Easiest local admin login

1. Open Docker Desktop and run `./setup.sh` from the repo root.
2. Open [sign-in](http://localhost:4200/signin).
3. Enter `anvu@local` and any placeholder password.
4. Open [the sample board](http://localhost:4200/anvu/default).

The setup script already enables local password bypass. No env-file edit is needed. A fresh database seeds the admin with no password hash; there is no default password to remember.

## Host-development login

For `npm run dev`, set `APP_AUTH_REQUIRE_PASSWORD=false` in `backend/.env.dev`, then restart the backend. The `dev` profile alone does not enable bypass. With the older manual Compose workflow, recreate the backend after changing its env file.

Bypass accepts an existing user's email; it does not create missing users. If the seeded account's email was changed, use its current email.

## Normal accounts

Open Sign In → **Don't Have an Account?** Signup creates an account, session, starter board, and main-board preference together. It opens `/<username>/<board-slug>`; `/<username>` remains the public main-board shortcut.

| Account | Access |
| --- | --- |
| Signed out | Public boards and public read endpoints |
| Signed-in user | Create boards, edit/delete owned boards, edit own profile/preferences |
| Administrator | Edit any board; deletion safeguards still apply |

New accounts have the `USER` role. Sign Out works in the account menu and settings. Password reset/change and account deletion remain unfinished.

## Common confusion

- **No Edit button?** Open `/<username>/<slug>` (or legacy `/b/<slug>`) as owner/admin. `/<username>` is a read-only profile/main-board presentation. Home, Settings, Insights, and Sign In are dedicated pages.
- **Admin token?** Retired with the system-route API; use a bearer session.
- **Remember Me?** The checkbox does not yet alter session behavior. The token is stored in local storage.
- **Phone/LAN or hosted app?** Use normal accounts with `APP_AUTH_REQUIRE_PASSWORD=true`. The setup-script preview is loopback-only.

[Permissions](Permissions) · [Page URLs](Pages-and-Editing) · [Configuration](Runtime-Config-%28Dev-vs-Prod%29) · [Troubleshooting](Troubleshooting)
