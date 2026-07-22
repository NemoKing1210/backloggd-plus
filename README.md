# Backloggd Plus

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.80-green?style=for-the-badge)](CHANGELOG.md)

A userscript that extends [Backloggd](https://www.backloggd.com) with extra game information, richer UI, and quality-of-life improvements — without leaving the site.

Compatible with [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/), and other managers that support the `// ==UserScript==` metadata block.

Also listed on [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) and [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Note:** Catalog pages on Greasy Fork / ScriptCat may lag behind this repository — I don’t always manage to push every release there right away. Sorry about that. For the newest build, prefer the [GitHub raw install URL](#quick-install) (or clone and `npm run build`). The script’s `@updateURL` / `@downloadURL` also point at GitHub `main`.

> **Status:** early (`0.7.55`). Backloggd enrichment + list badges + Steam / SteamDB → Backloggd buttons.

## Screenshots

<p align="center">
  <img src="docs/screenshots/game-page-steam.png" alt="Game page — Steam enrichment, Deck/Proton, GameStatus, and quick links" width="900" />
  <br />
  <em>Game page — Steam (owned · price · reviews · tags), Metacritic, Deck/Proton, players, GameStatus, links</em>
</p>

<p align="center">
  <img src="docs/screenshots/game-page-stats.png" alt="Game page — Plus rating, screenshots gallery, and similar games" width="900" />
  <br />
  <em>Game page — Plus rating average, Steam screenshots gallery, similar games with cover badges</em>
</p>

<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings panel — Game page toggles" width="700" />
  <br />
  <em>Settings — Game page toggles</em>
</p>

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

Release steps for maintainers: see [DEVELOPMENT.md § Releases](DEVELOPMENT.md#releases).

## Features

**Game pages (`/games/{slug}/`):**

- Native detail rows under Platforms — **Steam** (owned · wishlist · price · sale end / recent low · reviews · tags), **SteamDB** (franchise · systems · technologies · last record update), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Players**, **GameStatus**, **Links**
- **Fix match** — override the automatic Steam App ID when store search is wrong (saved per slug)
- SteamDB visuals: app icon before the title, logo under **Change cover**, online player count
- SteamDB details row: franchise / OS from Steam store APIs; technologies & last record update from SteamDB when reachable
- Export button under the Steam header and in the log editor (optional; Settings → Game; Notion CSV / Markdown / JSON)
- Optional Backloggd game ID after the title (Settings → Game; click to copy)
- Translate buttons on the game description and review cards (Settings → Translation; Google Translate)
- Steam header / community icon on game pages; screenshot gallery after game stats
- Similar games under screenshots (Steam More Like This) with tag match %; cards link to Backloggd and can show the same cover badges as list grids
- Skeleton placeholders while Steam / GameStatus / score data loads
- Quick links with favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Steam **Owned** / **Wishlist** badges when you are logged into Steam in the same browser (no API key)
- GameStatus status badges on game pages and cover grids
- Works without API keys (Steam Store public endpoints + session userdata + GameStatus / HLTB / OpenCritic / ProtonDB public APIs)

**Lists / search / journal (cover grids):**

- Compact badges on `.game-cover` cards — price, Steam review %, Owned, Wishlist, GameStatus (lazy-loaded in viewport; per-type toggles in Settings → Game card)
- Same cover badges on Similar games cards (game page strip)

**Steam app pages** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Backloggd icon button in `.apphub_OtherSiteInfo` (same style as SteamDB / Community Hub)
- Link built from the Steam URL slug or game title

**SteamDB app pages** (`steamdb.info/app/*`):

- Backloggd button in `nav.app-links` (same `.btn` style as Store / IGDB)
- Prefers IGDB slug from the page when available

**Settings** (navbar **Plus** on Backloggd / userscript manager menu):

- Tabbed panel: General · User profile · Game page · Game card · Translation · Cache · Debug · About
- Interface language (Auto or fixed locale)
- User profile: mini-profile hover cards (optional viewport preload); profile-page tier chrome with per-block toggles (header, tier chip, stats, nav, favorites)
- Steam store region (price currency)
- Toggles for Steam / owned / wishlist / tags / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / players / SteamDB icon & logo / screenshots gallery / similar games / native game stats block / game ID / translation (description & reviews) / list cover badges (per type) / links / Steam & SteamDB Backloggd buttons
- Debug mode: one panel with clickable source links and a full response dump
- Per-site link visibility (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Cache duration + clear cache (expired prune + LRU soft limit; library/tag map keep short TTLs; online players are live)

## Supported pages

| Site | URL pattern |
|------|-------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (apex) | `https://backloggd.com/*` |
| Steam Store (app) | `https://store.steampowered.com/app/*` |
| Steam Community (app) | `https://steamcommunity.com/app/*` |
| SteamDB (app) | `https://steamdb.info/app/*` |

## Development & contributing

- [DEVELOPMENT.md](DEVELOPMENT.md) — local setup, repo layout, metadata, permissions, releases
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR guidelines, conventions, localization, contributors
- [AGENTS.md](AGENTS.md) — architecture notes for AI coding agents

```bash
npm install
npm run dev      # Vite serve — install the generated "dev:" userscript
npm run build    # Production → dist/ + copy to repo root
npm run ci       # Same checks as GitHub Actions
```

## Affiliation

This project is **not affiliated** with Backloggd. It is an independent community userscript.

## License

[MIT](LICENSE) — Copyright (c) 2026 NemoKing
