# Backloggd Plus

[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.1-green?style=for-the-badge)](CHANGELOG.md)

A userscript that extends [Backloggd](https://www.backloggd.com) with extra game information, richer UI, and quality-of-life improvements — without leaving the site.

Compatible with [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), ScriptCat, and other managers that support the `// ==UserScript==` metadata block.

> **Status:** early (`0.3.1`). Backloggd enrichment + Steam / SteamDB → Backloggd buttons.

## Quick install

1. Install a userscript manager (Tampermonkey or Violentmonkey recommended).
2. Click the install link below — your manager should open an installation prompt.

**Install URL:**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-Backloggd_Plus-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)

### Install from URL (dashboard)

| Manager | Path |
|---------|------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Add-on menu → **New User Script** → paste the raw URL |

Paste the [install URL](#quick-install) above.

### Manual install

1. Open [`backloggd-plus.user.js`](backloggd-plus.user.js) in this repository.
2. Copy the entire file contents.
3. In your userscript manager, create a new script and paste the code.
4. Save and enable the script.

## Updates

The script includes `@updateURL` and `@downloadURL` metadata pointing to the raw GitHub file. Supported managers check for updates automatically.

**To release a new version:**

1. Bump `@version` in `backloggd-plus.user.js` and `backloggd-plus.meta.js`.
2. Add an entry to [`CHANGELOG.md`](CHANGELOG.md).
3. Push to `main` (or create a GitHub Release).

## Features

**Game pages (`/games/{slug}/`):**

- Native detail rows under Platforms — **Steam** (price + reviews), **Metacritic**, **Links** (same layout as Genres/Platforms)
- Skeleton placeholders while Steam data loads
- Quick links with favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, Wikipedia)
- Works without API keys (Steam Store public endpoints)

**Steam app pages** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Backloggd icon button in `.apphub_OtherSiteInfo` (same style as SteamDB / Community Hub)
- Link built from the Steam URL slug or game title

**SteamDB app pages** (`steamdb.info/app/*`):

- Backloggd button in `nav.app-links` (same `.btn` style as Store / IGDB)
- Prefers IGDB slug from the page when available

**Settings** (navbar **Plus** on Backloggd / userscript manager menu):

- Interface language (Auto or fixed locale)
- Steam store region (price currency)
- Toggles for Steam / Metacritic / links row / Steam-page & SteamDB Backloggd buttons
- Per-site link visibility (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, Wikipedia)
- Cache duration + clear cache

Planned: list/card badges, deeper IGDB enrichment, more QoL tweaks.

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
├── backloggd-plus.user.js   # Installable userscript (canonical distribution file)
├── backloggd-plus.meta.js   # Metadata-only companion for faster update checks
├── README.md                # Documentation and install instructions
├── CHANGELOG.md             # Version history
├── LICENSE                  # MIT license
└── .gitattributes           # GitHub linguist overrides
```

| File | Purpose |
|------|---------|
| `backloggd-plus.user.js` | Full script served at `@downloadURL` / `@updateURL` |
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
| `@connect` | `store.steampowered.com` |
| `@match` | Backloggd `/*`, Steam Store/Community `/app/*`, SteamDB `/app/*` |

Localized `@name` and `@description` tags are provided for en, ru, zh-CN, es, pt-BR, de, fr, ja, ko, and pl.

## Required permissions

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Fetch external data when features need it (bypasses CORS) |
| `GM_getValue` / `GM_setValue` | Persist settings and cache between sessions |
| `GM_addStyle` | Inject UI styles |
| `GM_registerMenuCommand` | Open settings from the manager menu |

`@connect` is limited to `store.steampowered.com`.

## Development

### Local workflow (Violentmonkey)

1. Clone this repository.
2. In Violentmonkey, install from the local `backloggd-plus.user.js` file.
3. Enable **Track local file** before closing the install dialog.
4. Edit the file in your IDE — changes apply after a page reload.

### Local workflow (Tampermonkey)

Tampermonkey does not track local files natively. Options:

- Reinstall from URL after each change, or
- Use a local HTTP server and temporarily point `@updateURL` / `@downloadURL` to `http://localhost:...` during development (do not commit local URLs).

### Configuration

Constants near the top of `backloggd-plus.user.js` can be adjusted as features land (cache keys, debounce intervals, API bases, etc.).

## Affiliation

This project is **not affiliated** with Backloggd. It is an independent community userscript.

## License

[MIT](LICENSE) — Copyright (c) 2026 NemoKing
