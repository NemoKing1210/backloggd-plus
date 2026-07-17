# Backloggd Plus

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.34-green?style=for-the-badge)](CHANGELOG.md)

A userscript that extends [Backloggd](https://www.backloggd.com) with extra game information, richer UI, and quality-of-life improvements — without leaving the site.

Compatible with [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/), and other managers that support the `// ==UserScript==` metadata block.

Also listed on [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) and [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Note:** Catalog pages on Greasy Fork / ScriptCat may lag behind this repository — I don’t always manage to push every release there right away. Sorry about that. For the newest build, prefer the [GitHub raw install URL](#quick-install) (or clone and `npm run build`). The script’s `@updateURL` / `@downloadURL` also point at GitHub `main`.

> **Status:** early (`0.7.34`). Backloggd enrichment + list badges + Steam / SteamDB → Backloggd buttons.

## Quick install

1. Install a userscript manager ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or [ScriptCat](https://scriptcat.org/) recommended).
2. Install from GitHub (raw URL below), [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus), or [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**Install URL (GitHub — newest):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Install from URL (dashboard)

| Manager | Path |
|---------|------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Add-on menu → **New User Script** → paste the raw URL |
| ScriptCat | [Script page](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, or install the [extension](https://scriptcat.org/) and use the GitHub raw URL |

Paste the [GitHub install URL](#quick-install) above when installing from a manager dashboard. Catalog installs: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Manual install

1. Open the built [`backloggd-plus.user.js`](backloggd-plus.user.js) in this repository (or run `npm run build` after cloning).
2. Copy the entire file contents.
3. In your userscript manager, create a new script and paste the code.
4. Save and enable the script.

## Updates

The script includes `@updateURL` and `@downloadURL` metadata pointing to the raw GitHub file. Supported managers check for updates automatically.

**To release a new version:**

1. Bump `version` in [`package.json`](package.json).
2. Run `npm run build` (regenerates root `backloggd-plus.user.js` / `.meta.js`).
3. Add an entry to [`CHANGELOG.md`](CHANGELOG.md).
4. Push to `main` (or create a GitHub Release).

## Features

**Game pages (`/games/{slug}/`):**

- Native detail rows under Platforms — **Steam** (owned · wishlist · price · sale end / recent low · reviews · tags), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Players**, **GameStatus**, **Links**
- **Fix match** — override the automatic Steam App ID when store search is wrong (saved per slug)
- SteamDB visuals: app icon before the title, logo under **Change cover**, online player count
- Steam header / community icon on game pages; screenshot gallery after game stats
- Similar games under screenshots (Steam More Like This) with tag match %; cards link to Backloggd
- Skeleton placeholders while Steam / GameStatus / score data loads
- Quick links with favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB)
- Steam **Owned** / **Wishlist** badges when you are logged into Steam in the same browser (no API key)
- GameStatus status badges on game pages and cover grids
- Works without API keys (Steam Store public endpoints + session userdata + GameStatus / HLTB / OpenCritic / ProtonDB public APIs)

**Lists / search / journal (cover grids):**

- Compact badges on `.game-cover` cards — price, Steam review %, Owned, Wishlist, GameStatus (lazy-loaded in viewport)

**Steam app pages** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Backloggd icon button in `.apphub_OtherSiteInfo` (same style as SteamDB / Community Hub)
- Link built from the Steam URL slug or game title

**SteamDB app pages** (`steamdb.info/app/*`):

- Backloggd button in `nav.app-links` (same `.btn` style as Store / IGDB)
- Prefers IGDB slug from the page when available

**Settings** (navbar **Plus** on Backloggd / userscript manager menu):

- Interface language (Auto or fixed locale)
- Steam store region (price currency)
- Toggles for Steam / owned / wishlist / tags / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / players / SteamDB icon & logo / screenshots gallery / similar games / native game stats block / list cover badges / links / Steam & SteamDB Backloggd buttons
- Debug mode: one panel with clickable source links and a full response dump
- Per-site link visibility (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB)
- Cache duration + clear cache (expired prune + LRU soft limit; library/tag map keep short TTLs; online players are live)

## Supported pages

| Site | URL pattern |
|------|-------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (apex) | `https://backloggd.com/*` |
| Steam Store (app) | `https://store.steampowered.com/app/*` |
| Steam Community (app) | `https://steamcommunity.com/app/*` |
| SteamDB (app) | `https://steamdb.info/app/*` |

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
│   ├── api/                 # External data fetchers
│   ├── features/            # UI features (enrichment, cards, …)
│   ├── i18n/                # Translations
│   ├── styles/              # CSS
│   └── utils/               # Shared helpers
├── package.json             # Version + npm scripts
├── vite.config.js           # Vite + vite-plugin-monkey metadata
├── backloggd-plus.user.js   # Built installable userscript (committed)
├── backloggd-plus.meta.js   # Built metadata companion (committed)
├── README.md                # Documentation and install instructions
├── CHANGELOG.md             # Version history
├── LICENSE                  # MIT license
└── .gitattributes           # GitHub linguist overrides
```

| File | Purpose |
|------|---------|
| `src/` | Source of truth for script logic (modules) |
| `backloggd-plus.user.js` | Full script served at `@downloadURL` / `@updateURL` (build output) |
| `backloggd-plus.meta.js` | Lightweight metadata mirror; managers may fetch it instead of the full script when checking for updates |

## Script metadata

Key `// ==UserScript==` fields used by managers:

| Field | Value |
|-------|-------|
| `@namespace` | `https://github.com/NemoKing1210/backloggd-plus` |
| `@version` | Semantic version (must be bumped on every release) |
| `@updateURL` / `@downloadURL` | Raw GitHub URL of `backloggd-plus.user.js` |
| `@homepageURL` | This repository |
| `@supportURL` | GitHub Issues |
| `@license` | MIT |
| `@grant` | `GM_xmlhttpRequest`, `GM_getValue`, `GM_setValue`, `GM_addStyle`, `GM_registerMenuCommand` |
| `@connect` | `store.steampowered.com`, `api.steampowered.com`, `gamestatus.info` |
| `@match` | Backloggd `/*`, Steam Store/Community `/app/*`, SteamDB `/app/*` |

Localized `@name` and `@description` tags are provided for en, ru, zh-CN, es, pt-BR, de, fr, ja, ko, and pl.

## Required permissions

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Fetch external data when features need it (bypasses CORS) |
| `GM_getValue` / `GM_setValue` | Persist settings and cache between sessions |
| `GM_addStyle` | Inject UI styles |
| `GM_registerMenuCommand` | Open settings from the manager menu |

`@connect` covers Steam Store / Steam Web API and GameStatus.

## Development

Requires [Node.js](https://nodejs.org/) (npm).

```bash
npm install
npm run dev      # Vite serve — open/install the generated "dev:" userscript
npm run build    # Production → dist/ + copy to repo root
npm run ci       # Same checks as GitHub Actions (build + verify artifacts)
```

Edit files under [`src/`](src/) (entry: [`src/main.js`](src/main.js)). Userscript metadata (`@match`, `@connect`, localized names, …) lives in [`vite.config.js`](vite.config.js). Version is `package.json` → header `@version` and in-script `SCRIPT_VERSION`.

After changes that should ship, run `npm run build` and commit the regenerated root `.user.js` / `.meta.js`. Pull requests run [CI](.github/workflows/ci.yml), which fails if those files are out of date.

### Local workflow notes

- **`npm run dev`:** vite-plugin-monkey serves an installable userscript (name prefixed with `dev:`). Install it once in Tampermonkey, Violentmonkey, or ScriptCat; HMR applies while the server runs.
- **Built file:** after `npm run build`, you can also install the root `backloggd-plus.user.js` (Violentmonkey **Track local file** still works on that artifact).
- Do not commit localhost `@updateURL` / `@downloadURL` values.

### Configuration

Shared constants live in [`src/constants.js`](src/constants.js); feature toggles and UI strings are in settings / `src/i18n/`.

## Affiliation

This project is **not affiliated** with Backloggd. It is an independent community userscript.

## License

[MIT](LICENSE) — Copyright (c) 2026 NemoKing
