# AGENTS.md — Backloggd Plus

Instructions for AI coding agents working in this repository.

## Project

Userscript that extends [Backloggd](https://www.backloggd.com) with extra game information, richer UI, and quality-of-life features. Compatible with Tampermonkey, Violentmonkey, Greasemonkey, and similar managers.

- **Canonical script:** `backloggd-plus.user.js` (also `@downloadURL` / `@updateURL`)
- **Metadata companion:** `backloggd-plus.meta.js` (must stay in sync with the userscript header)
- **Docs:** `README.md`, `CHANGELOG.md` (Keep a Changelog + SemVer)
- **License:** MIT

No build step, bundler, tests, or package manager. Edit the `.user.js` file directly.

## Repository layout

```text
backloggd-plus/
├── backloggd-plus.user.js   # Full installable userscript
├── backloggd-plus.meta.js   # Metadata-only mirror for update checks
├── README.md
├── CHANGELOG.md
├── LICENSE
├── AGENTS.md                # This file (cross-tool agent instructions)
└── CLAUDE.md                # Claude Code entry → imports AGENTS.md
```

## Architecture (high level)

1. Match Backloggd and Steam app pages at `document-idle`.
2. On **Backloggd:** IIFE bootstraps styles, settings, DOM scan, `MutationObserver`, and Turbo/href SPA hooks.
3. **Game pages:** inject native detail rows after `#game-page-platforms` (`Steam` = owned · wishlist · price · sale end/recent low · reviews · categories · tags, `Metacritic`, `OpenCritic`, `HLTB`, `Deck/Proton`, `Players`, `GameStatus`, `Links`); SteamDB icon before `h1`, logo under **Change cover** (shimmer skeletons first, fade in when assets load); Steam screenshots gallery after `turbo-frame#game-stats` (store `appdetails` screenshots; reusable `openBlpImageViewer` lightbox with zoom/pan/filmstrip); similar games strip under screenshots (`IStoreQueryService/MoreLikeThis` + weighted tag Jaccard %; cards → Backloggd); resolve title + IGDB link from DOM. Skeletons while Steam/GS/scores load; rows paint progressively as each source returns; link favicons via Google s2. **Fix match** stores a per-slug Steam App ID override (`blp_steam_overrides`).
4. **List/cover grids:** viewport-lazy badges on `.game-cover` (price / Steam review % / owned / wishlist / GameStatus) with request concurrency limits; skipped on the game page itself.
5. On **Steam** app pages: inject a SteamDB-style Backloggd button into `.apphub_OtherSiteInfo` (slug from Steam URL or title).
6. On **SteamDB** app pages: inject a `.btn` into `nav.app-links` (prefer IGDB slug from the page).
7. Steam enrichment: optional override App ID, else parallel `storesearch` (session + guest) → merge items → pick best app with strict title scoring (exact / edition-suffix only; reject prefix spin-offs like Minecraft→Dungeons; no first-result fallback) → `appdetails` + `appreviews` + popular tags / platforms / purchase options (`IStoreBrowseService/GetItems` + `tagdata/populartags`) via `GM_xmlhttpRequest` (`@connect store.steampowered.com`, `api.steampowered.com`). If both miss and region ≠ US, retry search with `cc=US` and note it on the Steam row. Ownership + wishlist via `dynamicstore/userdata` (`rgOwnedApps`, `rgWishlist`) using the browser Steam session (no API key).
8. Steam extras (after Steam App ID): icon/cover from Steam `GetItems` (`community_icon` + `header`); players from `GetNumberOfCurrentPlayers`; Deck compat from `platforms.steam_deck_compat_category`; ProtonDB tier from `protondb.com/api/v1/reports/summaries/{appId}.json`. SteamDB has no public API — do not scrape steamdb.info (Cloudflare / private `/api/*`).
9. GameStatus enrichment (after Steam App ID): slug candidates — Backloggd `--1` → `-remake` first, then store URL / title / page slug → `GET gamestatus.info/back/api/gameinfo/game/{slug}/` (match `steam_prod_id`, ≤2 attempts, 404 = miss). Status chips: ready / partial / pending / release-today (`@connect gamestatus.info`).
10. Score enrichment (by title): OpenCritic — `api.opencritic.com` when available, else DuckDuckGo HTML search → OpenCritic game page parse (`@connect api.opencritic.com`, `opencritic.com`, `html.duckduckgo.com`); HowLongToBeat bleed init + search (`@connect howlongtobeat.com`) with title match scoring.
11. Cache in `GM_getValue` / `GM_setValue` (`blp_cache_v1`); settings in `blp_settings` (incl. per-link toggles). Unified `getCached` / `setCached` with per-entry `ttlMs` and access time (`at`) for LRU. Cache successful Steam / GameStatus / SteamDB media / screenshots / similar games / HLTB / OpenCritic / ProtonDB hits only — do not persist misses or request errors. Do **not** cache live player counts. Userdata / tag map use fixed short TTLs (independent of `cacheHours`). Persist debounces, prunes expired entries, and LRU-evicts toward a soft ~5 MB budget (pins userdata + tag map).
12. UI strings in `TRANSLATIONS` / browser locale; settings via navbar **Plus** button (`btn btn-main`, same as **Log a Game**) and `GM_registerMenuCommand`. Debug mode keeps using the lookup cache and marks each enrichment section with hatch + Cache/Network/Mixed badge (`_cache` is ephemeral, not persisted).

Keep rate limits polite: cache TTLs, request dedupe (`inflight`), debounce on DOM rescans. Do not add IGDB/Twitch credentials unless the user asks for API-backed enrichment.

## Conventions

- Single IIFE with `'use strict'`; vanilla JS only (no frameworks).
- Prefer existing patterns: constants at top, locale maps, DOM helpers, cache, feature hooks.
- Match Backloggd’s look where possible when injecting UI.
- Do not expand `@connect` or `@grant` beyond what is needed.
- Do not commit localhost `@updateURL` / `@downloadURL` values.
- Keep `backloggd-plus.meta.js` identical to the `==UserScript==` block in the `.user.js` file (same fields/order/values).

## Releases

When shipping a user-visible change:

1. Bump `@version` in **both** `backloggd-plus.user.js` and `backloggd-plus.meta.js`.
2. Bump `SCRIPT_VERSION` in `backloggd-plus.user.js` to the **same** value (shown in Settings as `v…` next to the panel title). Changing `SCRIPT_VERSION` also clears the lookup cache on next run (`blp_cache_script_version`).
3. Add a Keep a Changelog entry in `CHANGELOG.md`.
4. Update README version badge / docs if they mention the version or new behavior.

## Localization

UI locales: `en`, `ru`, `zh`, `es`, `pt`, `de`, `fr`, `ja`, `ko`, `pl` (plus `auto` = browser).

- Default `uiLocale` is `auto`; users can override in Settings → General.
- Add every new user-facing string to **all** `TRANSLATIONS` locales.
- Keep localized `@name` / `@description` metadata tags aligned when changing the product description.

## Do not

- Add a build toolchain, TypeScript, or npm unless explicitly requested.
- Imply affiliation with Backloggd in docs or UI copy.
- Break Backloggd’s native navigation, forms, or list/infinite-scroll behavior.

## Local testing

- **Violentmonkey:** install local file + enable Track local file; reload Backloggd after edits.
- **Tampermonkey:** reinstall from file/URL, or temporary local server URLs (do not commit them).
