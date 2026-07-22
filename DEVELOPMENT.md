# Development

Local setup, repository layout, and release notes for Backloggd Plus.

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). Agent-oriented architecture notes live in [AGENTS.md](AGENTS.md).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (see `engines` in `package.json`)
- npm
- A userscript manager for browser testing ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or [ScriptCat](https://scriptcat.org/))

## Scripts

```bash
npm install
npm run dev      # Vite serve — open/install the generated "dev:" userscript
npm run build    # Production → dist/ + copy to repo root
npm run ci       # Same checks as GitHub Actions (build + verify artifacts)
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + vite-plugin-monkey; installable userscript prefixed with `dev:` |
| `npm run build` | Production bundle → `dist/`, then copy to root install artifacts |
| `npm run ci` | `build` + verify `dist` ↔ root artifacts (set `CI=true` or pass `--git` for freshness vs HEAD) |

## Local workflow

1. Edit source under [`src/`](src/) (entry: [`src/main.js`](src/main.js)).
2. Userscript metadata (`@match`, `@connect`, localized `@name` / `@description`, …) lives in [`vite.config.js`](vite.config.js) — not in the built files.
3. Version is `package.json` → header `@version` and in-script `SCRIPT_VERSION`.
4. After changes that should ship, run `npm run build` and commit the regenerated root `backloggd-plus.user.js` / `backloggd-plus.meta.js`.
5. Pull requests run [CI](.github/workflows/ci.yml), which fails if those files are out of date.

### Notes

- **`npm run dev`:** install the served userscript once in your manager; HMR applies while the server runs.
- **Built file:** after `npm run build`, you can install the root `backloggd-plus.user.js` (Violentmonkey **Track local file** works on that artifact).
- Do **not** hand-edit committed `.user.js` / `.meta.js`.
- Do **not** commit localhost `@updateURL` / `@downloadURL` values.

### Configuration

Shared constants live in [`src/constants.js`](src/constants.js); feature toggles and UI strings are in settings / [`src/i18n/`](src/i18n/).

## How it works

```
Backloggd game page                    Steam / SteamDB app page
       │                                      │
       ▼                                      ▼
Enrichment rows (Steam/MC/Links)     Steam: .apphub_OtherSiteInfo
       │                             SteamDB: nav.app-links → .btn
       ▼
storesearch → appdetails
```

SPA navigations on Backloggd use Turbo events, `MutationObserver`, and an href poll.

## Repository layout

```text
backloggd-plus/
├── src/                     # ESM source (edit here)
│   ├── main.js              # Bootstrap / init
│   ├── constants.js         # Keys, URLs, DEFAULT_SETTINGS
│   ├── state.js             # Mutable settings / locale / cache handles
│   ├── settings.js          # load/save settings, link helpers
│   ├── cache.js             # GM lookup cache + overrides
│   ├── gm.js                # GM_xmlhttpRequest wrapper
│   ├── api/                 # External data fetchers
│   ├── features/            # UI features (enrichment, cards, …)
│   ├── i18n/                # Translations (locales/ per language)
│   ├── styles/              # CSS
│   └── utils/               # Shared helpers
├── scripts/                 # Build / CI helpers
├── docs/screenshots/        # README preview images
├── package.json             # Version + npm scripts
├── vite.config.js           # Vite + vite-plugin-monkey metadata
├── backloggd-plus.user.js   # Built installable userscript (committed)
├── backloggd-plus.meta.js   # Built metadata companion (committed)
├── README.md
├── DEVELOPMENT.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

| File | Purpose |
|------|---------|
| `src/` | Source of truth for script logic (modules) |
| `backloggd-plus.user.js` | Full script served at `@downloadURL` / `@updateURL` (build output) |
| `backloggd-plus.meta.js` | Lightweight metadata mirror; managers may fetch it for update checks |

## Script metadata

Key `// ==UserScript==` fields used by managers (declared in `vite.config.js`):

| Field | Value |
|-------|-------|
| `@namespace` | `https://github.com/NemoKing1210/backloggd-plus` |
| `@version` | Semantic version (must be bumped on every release) |
| `@updateURL` / `@downloadURL` | Raw GitHub URL of `backloggd-plus.user.js` |
| `@homepageURL` | This repository |
| `@supportURL` | GitHub Issues |
| `@license` | MIT |
| `@grant` | `GM_xmlhttpRequest`, `GM_getValue`, `GM_setValue`, `GM_addStyle`, `GM_registerMenuCommand` |
| `@connect` | `store.steampowered.com`, `api.steampowered.com`, `steamdb.info`, `gamestatus.info`, … |
| `@match` | Backloggd `/*`, Steam Store/Community `/app/*`, SteamDB `/app/*` |

Localized `@name` and `@description` tags are provided for en, ru, zh-CN, es, pt-BR, de, fr, ja, ko, and pl.

## Required permissions

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Fetch external data when features need it (bypasses CORS) |
| `GM_getValue` / `GM_setValue` | Persist settings and cache between sessions |
| `GM_addStyle` | Inject UI styles |
| `GM_registerMenuCommand` | Open settings from the manager menu |

`@connect` covers Steam Store / Steam Web API, SteamDB (optional HTML meta), and GameStatus / HLTB / OpenCritic / ProtonDB. Do not expand `@connect` or `@grant` beyond what is needed.

## Releases

1. Bump `version` in [`package.json`](package.json) (single source of truth for `@version` and `SCRIPT_VERSION`).
2. Run `npm run build` to regenerate root `backloggd-plus.user.js` / `.meta.js`.
3. Add a Keep a Changelog entry in [`CHANGELOG.md`](CHANGELOG.md).
4. Update the README version badge / docs if they mention the version or new behavior.
5. Push to `main` (or create a GitHub Release).

Changing `SCRIPT_VERSION` also clears the lookup cache on next run (`blp_cache_script_version`).

Catalog pages on Greasy Fork / ScriptCat may lag behind GitHub; `@updateURL` / `@downloadURL` point at GitHub `main`.
