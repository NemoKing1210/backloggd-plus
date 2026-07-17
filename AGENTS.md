# AGENTS.md — Backloggd Plus

Instructions for AI coding agents working in this repository.

## Project

Userscript that extends [Backloggd](https://www.backloggd.com) with extra game information, richer UI, and quality-of-life features. Compatible with Tampermonkey, Violentmonkey, Greasemonkey, [ScriptCat](https://scriptcat.org/), and similar managers.

Listed on:
- Greasy Fork: https://greasyfork.org/ru/scripts/587296-backloggd-plus
- ScriptCat: https://scriptcat.org/ru/script-show-page/7077

Catalog mirrors may lag behind `main`; GitHub raw / `@updateURL` is the source of truth for the newest version.

Built with [Vite](https://vitejs.dev/) + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey).

- **Source:** `src/main.js`
- **Canonical install artifacts (committed):** `backloggd-plus.user.js`, `backloggd-plus.meta.js` (also `@downloadURL` / `@updateURL`)
- **Version source of truth:** `package.json` `version` (userscript header + `SCRIPT_VERSION`)
- **Docs:** `README.md`, `CHANGELOG.md` (Keep a Changelog + SemVer)
- **License:** MIT

Edit source under `src/`, then run `npm run build` to refresh the root install files. Do not hand-edit the built `.user.js` / `.meta.js`.

## Repository layout

```text
backloggd-plus/
├── src/
│   ├── main.js              # Bootstrap / init
│   ├── constants.js         # Keys, URLs, DEFAULT_SETTINGS
│   ├── state.js             # Mutable settings / locale / cache handles
│   ├── settings.js          # load/save settings, link helpers
│   ├── cache.js             # GM lookup cache + overrides
│   ├── gm.js                # GM_xmlhttpRequest wrapper
│   ├── i18n/                # TRANSLATIONS + locale helpers
│   ├── utils/               # html, title match, debounce, slug
│   ├── styles/              # CSS (injected via vite-plugin-monkey)
│   ├── api/                 # Steam, HLTB, OpenCritic, ProtonDB, GameStatus
│   └── features/            # Enrichment, gallery, cards, settings UI, host pages
├── scripts/
│   ├── copy-dist.mjs        # Copies dist → root after build
│   ├── verify-artifacts.mjs # CI: dist ↔ root + git freshness
│   └── lib/artifacts.mjs    # Shared artifact filenames
├── .github/
│   ├── workflows/ci.yml     # Build + verify committed artifacts
│   └── dependabot.yml
├── dist/                    # Vite output (gitignored)
├── backloggd-plus.user.js   # Built installable userscript
├── backloggd-plus.meta.js   # Built metadata-only mirror for update checks
├── package.json
├── vite.config.js
├── README.md
├── CHANGELOG.md
├── LICENSE
├── AGENTS.md                # This file (cross-tool agent instructions)
└── CLAUDE.md                # Claude Code entry → imports AGENTS.md
```

## Architecture (high level)

1. Match Backloggd and Steam app pages at `document-idle`.
2. On **Backloggd:** bootstrap styles, settings, DOM scan, `MutationObserver`, and Turbo/href SPA hooks.
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

- Vanilla JS ESM modules under `src/`; no frameworks. Import GM APIs from `$` (`vite-plugin-monkey/dist/client`).
- Prefer existing patterns: put shared constants in `constants.js`, locale strings in `i18n/`, APIs in `api/`, UI hooks in `features/`. Mutable runtime state lives in `state.js` (`export let` live bindings). Keep locale maps, DOM helpers, and cache helpers close to their callers.
- Match Backloggd’s look where possible when injecting UI.
- Do not expand `@connect` or `@grant` beyond what is needed (declare in `vite.config.js` `userscript`; grants also auto-detected from `$` imports).
- Userscript metadata lives in `vite.config.js` — not hand-written in built files.
- Do not commit localhost `@updateURL` / `@downloadURL` values.
- After changing source or metadata, run `npm run build` so root `.user.js` / `.meta.js` stay in sync.
- Production builds minify JS/CSS (`vite.config.js` → terser); edit `src/` for readable code, not the committed bundle.

## Releases

When shipping a user-visible change:

1. Bump `version` in `package.json` (single source of truth for `@version` and `SCRIPT_VERSION`).
2. Run `npm run build` to regenerate `backloggd-plus.user.js` and `backloggd-plus.meta.js`.
3. Add a Keep a Changelog entry in `CHANGELOG.md`.
4. Update README version badge / docs if they mention the version or new behavior.

Changing `SCRIPT_VERSION` (via `package.json`) also clears the lookup cache on next run (`blp_cache_script_version`).

## Localization

UI locales: `en`, `ru`, `zh`, `es`, `pt`, `de`, `fr`, `ja`, `ko`, `pl` (plus `auto` = browser).

- Default `uiLocale` is `auto`; users can override in Settings → General.
- Add every new user-facing string to **all** `TRANSLATIONS` locales.
- Keep localized `@name` / `@description` in `vite.config.js` aligned when changing the product description.

## Do not

- Hand-edit committed `backloggd-plus.user.js` / `backloggd-plus.meta.js` (always rebuild).
- Add TypeScript or a frontend framework unless explicitly requested.
- Imply affiliation with Backloggd in docs or UI copy.
- Break Backloggd’s native navigation, forms, or list/infinite-scroll behavior.

## Local testing

```bash
npm install
npm run dev      # Vite serve — install the generated server userscript (prefix "dev:")
npm run build    # Production bundle → dist/ + copy to repo root
npm run ci       # build + verify committed artifacts match (same as GitHub Actions)
```

- **Violentmonkey / Tampermonkey / ScriptCat:** install from the Vite open URL during `npm run dev`, or from the built root `backloggd-plus.user.js` after `npm run build`.
- Do not commit temporary localhost `@updateURL` / `@downloadURL` values.
- CI (`.github/workflows/ci.yml`) runs `npm ci` → `npm run ci` on pushes/PRs to `main` (`CI=true` enables the git freshness check). If it fails, rebuild and commit the root `.user.js` / `.meta.js`. Locally, `npm run ci` checks `dist` ↔ root; pass `--git` to `verify:artifacts` (or set `CI=true`) to also require a clean working tree vs HEAD.