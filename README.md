# BlueBerry 26

Customizable personal boards built from widgets, with five themes: Berry, Aero, Aqua, Omakase, and Kiwi.

Angular · Spring Boot · PostgreSQL

## Run locally

Open Docker Desktop, then run:

```bash
./setup.sh
```

Open [localhost:4200](http://localhost:4200). For the local admin, sign in with `anvu@local` and any placeholder password. Password bypass is local-only.

Frontend changes live-reload. Rerun `./setup.sh` after backend, dependency, or build-config changes. Use `./setup.sh stop` to stop without deleting data, or `./setup.sh logs` to inspect logs.

## Documentation

[Wiki](https://github.com/an-vu/b26/wiki) · [Setup](https://github.com/an-vu/b26/wiki/Docker) · [Roadmap](https://github.com/an-vu/b26/wiki/Release-Roadmap)

Wiki source files live in [`docs/wiki`](docs/wiki) and are committed with the app. Edit them here, then commit and push normally. The **Sync Wiki** GitHub Actions workflow publishes this folder automatically when changes reach `main`, including renamed and deleted pages. It can also be run manually on `main` from the Actions tab.

The separate Wiki checkout exists only temporarily on GitHub's Actions runner; you do not need a second local repository or a manual publishing command. Edit `docs/wiki` instead of the Wiki website, since the next sync replaces website edits.
