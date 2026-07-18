# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.55] - 2026-07-18

### Changed

- Export rating text map: 2½★ Normal, 3★ Good, 3½★ Great, 4★/4½★ Excellent, 5★ Amazing

## [0.7.54] - 2026-07-18

### Added

- Settings → Game: **Show export button** (off by default)

### Changed

- Export dialog: JSON format preview renders as pretty-printed JSON

## [0.7.53] - 2026-07-18

### Added

- Export formats: Markdown (Notion-style title + property lines) and JSON (same fields as CSV)

## [0.7.52] - 2026-07-18

### Changed

- Export buttons match the Plus nav control (`btn btn-main` accent, no icon)

## [0.7.51] - 2026-07-18

### Changed

- Export dialog: Rating / Status format options moved into a collapsed “Additional settings” section

## [0.7.50] - 2026-07-18

### Added

- Export dialog: status format switch (Notion mapped statuses vs original Backloggd labels)

## [0.7.49] - 2026-07-18

### Added

- Export dialog: Copy button next to Download (CSV to clipboard)

## [0.7.48] - 2026-07-18

### Changed

- Export preview: ~2× wider on desktop; lists every CSV column in export order (including `Date start` / `Date end`)

## [0.7.47] - 2026-07-18

### Changed

- Export dialog: richer preview panel — top on small screens, right side on large screens

## [0.7.46] - 2026-07-18

### Removed

- `ID` column from Notion CSV export

## [0.7.45] - 2026-07-18

### Added

- Export button in the full log editor footer (platform, dates, rating, time from the modal)
- CSV fields `Date start`, `Date end`, and `Is DLC` (from `.game-parent-category`); Windows PC → PC

## [0.7.44] - 2026-07-18

### Fixed

- Export button icon (inline SVG; `fa-download` is missing from Backloggd’s Font Awesome kit)
- Export / Download primary buttons: teal accent instead of near-black fill

## [0.7.43] - 2026-07-18

### Changed

- Export rating text map: Amazing is only a full 5★; 4★ / 4½★ export as Excellent

### Added

- Export modal option for rating as text labels or numeric stars out of 5

## [0.7.42] - 2026-07-18

### Added

- Game page export button under the Steam header banner, with a format modal (CSV first)
- Notion-compatible CSV export: page metadata, Steam tags/source, and your Backloggd rating mapped to text labels (Terrible → Amazing)

## [0.7.41] - 2026-07-17

### Changed

- Steam sale price row: Steam-style green `-n%` badge, strikethrough original price, highlighted sale price, and clearer end-date chip

## [0.7.40] - 2026-07-17

### Added

- Per-type toggles for cover badges (price, Steam review %, Owned, Wishlist, GameStatus) under Settings → Lists
- Cover badges on Similar games cards (same chips as list grids; known Steam App ID path)

## [0.7.39] - 2026-07-17

### Added

- Toast notifications for settings save, cache clear, Fix match, and script-version cache reset

## [0.7.38] - 2026-07-17

### Added

- Country flags next to languages in the Interface language settings select

## [0.7.37] - 2026-07-17

### Fixed

- Opening Settings locks page scroll until the panel closes

## [0.7.36] - 2026-07-17

### Changed

- Settings tabs: dark-themed horizontal scrollbar and clearer active/hover states

## [0.7.35] - 2026-07-17

### Added

- Settings panel tabs (General / Game page / Lists / Links / Cache / Debug)

### Changed

- Navbar **Plus** and settings ON toggles use the solid accent green (same as Save)

## [0.7.34] - 2026-07-17

### Added

- GitHub Actions CI: build userscript, verify committed artifacts match `dist/`, upload build artifacts
- `npm run ci` / `npm run verify:artifacts`; Dependabot for npm and Actions

### Documentation

- Greasy Fork / ScriptCat listing links; note that catalog versions may lag behind the repo (prefer GitHub raw)

## [0.7.33] - 2026-07-17

### Changed

- Production build minifies JS and CSS (terser) — smaller installable userscript (~30% vs unminified)

## [0.7.32] - 2026-07-17

### Changed

- Source split into ESM modules under `src/` (`api/`, `features/`, `i18n/`, `styles/`, `utils/`) for easier maintenance

## [0.7.31] - 2026-07-17

### Changed

- Development toolchain: Vite + vite-plugin-monkey (`src/` → built `backloggd-plus.user.js` / `.meta.js`)

## [0.7.30] - 2026-07-17

### Added

- Settings toggle to hide the native Backloggd game stats block (`#game-stats`)

## [0.7.29] - 2026-07-17

### Changed

- Plus rating: per-source cell skeletons while scores load; score number and meter animate as averages update

## [0.7.28] - 2026-07-17

### Fixed

- Backloggd slugs collapse dotted acronyms (`S.T.A.L.K.E.R.` → `stalker`, not `s-t-a-l-k-e-r`)

## [0.7.27] - 2026-07-17

### Fixed

- Screenshots and Similar games strips scroll horizontally inside the column (no page-wide overflow); mouse wheel over the strip scrolls sideways

## [0.7.26] - 2026-07-17

### Changed

- Debug panel is collapsible and starts collapsed (keeps open state across in-page refreshes)

## [0.7.25] - 2026-07-17

### Changed

- Online player count is never cached — always fetched live from GetNumberOfCurrentPlayers

## [0.7.24] - 2026-07-17

### Added

- Debug mode: each enrichment section (and Similar games) gets hatch styling plus a Cache / Network / Mixed badge

### Changed

- Debug mode no longer skips the lookup cache, so cache-source badges reflect real hits

## [0.7.23] - 2026-07-17

### Fixed

- Player count cache now respects its 10-minute TTL (no longer reused for the full cache duration)

### Changed

- Unified lookup cache TTL handling (per-entry `ttlMs`, system keys for players / userdata / tag map)
- Cache persist prunes expired entries and LRU-evicts toward the soft 5 MB budget

### Added

- Settings cache hint documents all lookup sources and that `0` only disables the long lookup cache

## [0.7.22] - 2026-07-17

### Added

- Similar games strip under Screenshots (Steam More Like This) with tag match % and Backloggd links

## [0.7.21] - 2026-07-16

### Fixed

- Plus rating: OpenCritic numeric score is included again (HTML parse + legacy cache bust)
- Plus rating is hidden when Backloggd is the only available source

### Changed

- Plus rating loading state mirrors the final layout (score, meter, four source cells)

## [0.7.20] - 2026-07-16

### Changed

- Plus rating restored to full-width card with stretched score + source grid (less empty space)

## [0.7.19] - 2026-07-16

### Changed

- Plus rating tile matches native Avg Rating card size/style (compact column + source bars)

## [0.7.18] - 2026-07-16

### Changed

- Plus rating is a standalone tile before `#game-stats` (Steam / Metacritic / OpenCritic / Backloggd breakdown)

## [0.7.17] - 2026-07-16

### Added

- Game page: new «Avg rating» widget — average from Steam reviews, Metacritic, OpenCritic, and Backloggd

## [0.7.16] - 2026-07-16

### Changed

- GameStatus UI copy and internal CSS/status identifiers use neutral labels (ready / partial / pending)

## [0.7.15] - 2026-07-16

### Added

- Game cover in `#interaction-sidebar` opens the image viewer (prefers hi-res `data-src`; includes Steam gallery frames when available)

## [0.7.14] - 2026-07-16

### Fixed

- Image viewer: pan/drag works at 1× zoom (grab the image itself)

## [0.7.13] - 2026-07-16

### Changed

- Image viewer shows a spinner while switching images and prefetches nearby full-size frames

## [0.7.12] - 2026-07-16

### Changed

- Image viewer uses Backloggd CSS variables (`--back-field-selected`, `--back-interact`, …); filmstrip centered; click empty backdrop (not the image) closes the viewer

## [0.7.11] - 2026-07-16

### Changed

- Image viewer: reusable `openBlpImageViewer` with zoom/pan, keyboard shortcuts, and a highlighted filmstrip of the current group

## [0.7.10] - 2026-07-16

### Changed

- Screenshots gallery SteamDB link points to `/app/{id}/screenshots/`
- SteamDB cover is included in the gallery strip and opens the lightbox on click

## [0.7.9] - 2026-07-16

### Added

- Game page: Steam screenshots gallery after `#game-stats` (horizontal strip + lightbox; Steam store assets, same as SteamDB), with settings toggle

## [0.7.8] - 2026-07-16

### Fixed

- SteamDB title icon fade-in: `is-ready` opacity no longer loses to `#game-profile h1` CSS specificity

## [0.7.7] - 2026-07-16

### Changed

- SteamDB icon and cover show shimmer skeletons immediately on game pages, then fade in when assets load

## [0.7.6] - 2026-07-16

### Changed

- OpenCritic row: spacing between tier badge and score

## [0.7.5] - 2026-07-16

### Fixed

- OpenCritic row: when `api.opencritic.com` fails, resolve the game via DuckDuckGo HTML search and parse the OpenCritic game page (tier + Top Critic score)

## [0.7.4] - 2026-07-16

### Fixed

- Game page enrichment no longer remounts on every DOM mutation while skeletons load (OpenCritic / HLTB rows stopped flickering)

## [0.7.3] - 2026-07-16

### Added

- Game page Steam row: store categories from `appdetails` (Single-player, Multi-player, …) with settings toggle

## [0.7.2] - 2026-07-16

### Changed

- List/card badges fade to 25% opacity on cover hover (instead of fully hiding)

## [0.7.1] - 2026-07-16

### Changed

- List/card badges hide on cover hover so the artwork stays readable

## [0.7.0] - 2026-07-16

### Added

- Game page rows for **OpenCritic** (tier + Top Critic score) and **HowLongToBeat** (Main / Extra / Complete)
- **Steam Deck / ProtonDB** row — Deck Verified/Playable (from Steam GetItems) plus ProtonDB tier by App ID
- Steam sale **end date** and **recent low** price when Steam Store exposes them on the purchase option
- Quick links: **PCGamingWiki**, **IsThereAnyDeal**, **GOG DB** (same per-link toggles as IGDB / HLTB)

### Changed

- `@connect` expanded for HowLongToBeat, OpenCritic, and ProtonDB
- Settings toggles for OpenCritic, HLTB, and Deck/Proton rows

## [0.6.10] - 2026-07-16

### Changed

- SteamDB cover under Change cover is no longer a clickable link

## [0.6.9] - 2026-07-16

### Changed

- Settings: sticky header and footer; only the middle sections scroll

## [0.6.8] - 2026-07-16

### Fixed

- List/card lite Steam results are cached again as partial (`tagsLoaded=false`) without overwriting a valid full entry

## [0.6.7] - 2026-07-16

### Added

- Settings: stacked cache usage meter (full / partial / free) against a soft 5 MB budget

## [0.6.6] - 2026-07-16

### Added

- Settings: show current cache entry count in the Cache section (updates after Clear cache)

## [0.6.5] - 2026-07-16

### Fixed

- Steam title matching equates Roman and Arabic numerals (e.g. Baldur's Gate III ↔ Baldur's Gate 3)

## [0.6.4] - 2026-07-16

### Fixed

- Steam title matching no longer accepts spin-offs that only share a prefix (e.g. Minecraft → Minecraft Dungeons); drops weak `startsWith` / first-result fallbacks — use **Fix match** when needed

## [0.6.3] - 2026-07-16

### Fixed

- Steam tags missing on game pages after visiting a list card first (lite card fetch no longer overwrites cache without tags; full load backfills `tagsLoaded`)

## [0.6.2] - 2026-07-16

### Fixed

- List card badges no longer flicker/reload forever for games with no Steam match (empty result marked settled; session miss memory)

## [0.6.1] - 2026-07-16

### Added

- List/card badges: Steam review % (color-tiered; Metacritic score fallback when reviews are missing)

## [0.6.0] - 2026-07-16

### Added

- List/card badges on browse, search, journal, and other cover grids: Steam price, Owned, Wishlist, GameStatus (viewport-lazy, rate-limited)
- Manual Steam App ID override via **Fix match** on game pages (persisted per Backloggd slug)
- Steam Wishlist badge next to Owned (from `dynamicstore/userdata` `rgWishlist`; hidden when owned)
- Settings: Wishlist toggle, Lists & cards → cover badges

### Changed

- Steam userdata cache now stores owned + wishlist together (`steam:userdata`)

## [0.5.15] - 2026-07-16

### Changed

- Dropped SteamDB HTML scrape (no public API; Cloudflare blocks it). Icon/cover from Steam GetItems, players from GetNumberOfCurrentPlayers only

## [0.5.14] - 2026-07-16

### Changed

- Players online: read from SteamDB `#js-charts-button` first; call Steam `GetNumberOfCurrentPlayers` only if the page scrape misses

## [0.5.13] - 2026-07-16

### Changed

- SteamDB cover image no longer forces a 2:3 aspect-ratio

## [0.5.12] - 2026-07-16

### Fixed

- SteamDB icon/cover: use Steam GetItems `community_icon` + `header` (same CDN URLs as SteamDB) instead of search capsules / Cloudflare-blocked HTML scrape

## [0.5.11] - 2026-07-16

### Fixed

- SteamDB scrape uses current page selectors: `.pagehead-title img`, `.js-open-screenshot-viewer img`, `#js-charts-button`

## [0.5.10] - 2026-07-16

### Fixed

- Hide the GameStatus row when the game is not in the GameStatus database (including debug mode)

## [0.5.9] - 2026-07-16

### Changed

- Enrichment renders progressively: Steam price/reviews first, then tags, owned, SteamDB media/players, and GameStatus as each response arrives (no wait for the full batch)

## [0.5.8] - 2026-07-16

### Fixed

- GameStatus: Backloggd slugs ending in `--1` (e.g. `resident-evil-2--1`) try `-remake` first

## [0.5.7] - 2026-07-16

### Changed

- Debug Sources grouped by module (Page, Steam, SteamDB / players, GameStatus)

## [0.5.6] - 2026-07-16

### Changed

- Debug Sources marks URLs that the script actually requests (badge + yellow edge); requested entries listed first

## [0.5.5] - 2026-07-16

### Changed

- Debug Sources list shows what each URL is for (search, price, tags, ownership, SteamDB scrape, etc.)

## [0.5.4] - 2026-07-16

### Changed

- Debug mode shows a single panel with clickable source URLs and a full (untruncated) dump

## [0.5.3] - 2026-07-16

### Changed

- SteamDB title icon size is 32?32px

## [0.5.2] - 2026-07-16

### Fixed

- SteamDB app-icon goes into desktop `.game-title-section` `h1`; app-logo appends to `#logging-sidebar-section > div > div`

## [0.5.1] - 2026-07-16

### Fixed

- SteamDB icon injects into both desktop and mobile title `h1`s
- Cover mounts under `.game-cover` with library portrait fallback (logo.png alone was often invisible)
- Re-apply icon/cover after enrichment so MutationObserver does not wipe them

## [0.5.0] - 2026-07-16

### Added

- SteamDB extras on game pages: app icon before the title (`.app-icon`), logo under **Change cover** (`.app-logo`), and online players (`.header-thing-number` / Steam API)
- Settings toggles for icon, logo, and players
- `@connect steamdb.info` (HTML scrape with Steam CDN / players API fallback)

## [0.4.16] - 2026-07-16

### Fixed

- Metacritic `/game/{slug}/` strips Backloggd disambiguators (`--1`, `--2`, …)

## [0.4.15] - 2026-07-16

### Changed

- Metacritic score badge uses the same `/game/{slug}/` URL as quick links (no Steam metacritic URL)

## [0.4.14] - 2026-07-16

### Removed

- Wikipedia from quick links and settings toggles

## [0.4.13] - 2026-07-16

### Changed

- Metacritic score rendered as a color-tier badge (green / yellow / red)

## [0.4.12] - 2026-07-16

### Changed

- Metacritic quick link uses `/game/{slug}/` (from page slug or title) instead of search

## [0.4.11] - 2026-07-16

### Fixed

- Navbar **Plus** button height matches **Log a Game**; icon uses `fa-gear` (available in Backloggd’s Font Awesome set)

## [0.4.10] - 2026-07-16

### Changed

- Navbar settings control matches native **Log a Game** (`btn btn-main mb-2 my-sm-0 py-0`)

## [0.4.9] - 2026-07-16

### Fixed

- Do not cache Steam / GameStatus misses, request failures, or empty owned/tags error fallbacks

## [0.4.8] - 2026-07-16

### Changed

- Lookup cache is cleared automatically when `SCRIPT_VERSION` changes

## [0.4.7] - 2026-07-16

### Added

- Steam row: popular community tags (via `IStoreBrowseService/GetItems`, up to 12 chips)
- Settings toggle: show Steam tags
- `@connect api.steampowered.com`

## [0.4.6] - 2026-07-16

### Fixed

- GameStatus chips: strip quotes/brackets from protection and group labels; parse JSON-array payloads

### Changed

- Protection chips use a distinct highlight for known anti-tamper labels

## [0.4.5] - 2026-07-16

### Changed

- GameStatus badge no longer shows a favicon

## [0.4.4] - 2026-07-16

### Changed

- Steam search: session + guest requests run in parallel and results are merged
- If both miss and store region ≠ US, retry search with US and show a note on the Steam row

## [0.4.3] - 2026-07-16

### Changed

- Settings: Debug section moved to the bottom; Clear cache button uses panel button styles

## [0.4.2] - 2026-07-16

### Added

- Settings: **Debug mode** — under Steam / GameStatus rows shows match/fail reason and a truncated response dump (skips cache while enabled)

## [0.4.1] - 2026-07-16

### Added

- Settings panel shows the script version (`SCRIPT_VERSION`) next to the title

### Changed

- `AGENTS.md`: release checklist includes bumping `SCRIPT_VERSION`

## [0.4.0] - 2026-07-16

### Added

- Game pages: **GameStatus** row (status badge + protection chips), resolved via Steam App ID
- Settings toggle: show GameStatus
- `@connect gamestatus.info`

## [0.3.7] - 2026-07-16

### Changed

- Steam price no longer shows the Steam favicon

## [0.3.6] - 2026-07-16

### Changed

- Hide the Steam row entirely when the game is not found on Steam (no “Not found” message)

## [0.3.5] - 2026-07-16

### Fixed

- Steam lookup: if the session search finds nothing, retry as guest (no cookies) before showing “Not found”

## [0.3.4] - 2026-07-16

### Changed

- Steam row: owned badge, price, and reviews each on their own line

## [0.3.3] - 2026-07-16

### Changed

- Steam **Owned** status rendered as a compact green badge with checkmark

## [0.3.2] - 2026-07-16

### Added

- Game pages: Steam row shows **Owned** when the game is in your Steam library (session via `dynamicstore/userdata`)
- Settings toggle: show Steam owned status (requires Steam login in the same browser)

## [0.3.1] - 2026-07-16

### Added

- SteamDB app pages: Backloggd button in `nav.app-links` (next to Store / IGDB)
- Settings toggle: show Backloggd button on SteamDB

## [0.3.0] - 2026-07-16

### Added

- Steam Store / Community app pages: Backloggd button in `.apphub_OtherSiteInfo` (SteamDB-style `btnv6_blue_hoverfade`)
- Settings toggle: show Backloggd button on Steam

## [0.2.7] - 2026-07-16

### Added

- Settings: interface language (Auto / 10 locales)

## [0.2.6] - 2026-07-16

### Changed

- Navbar Plus button uses the same `gradient-btn` / `gradient-blue` style as **Log a Game** (`#add-a-game`)

## [0.2.5] - 2026-07-16

### Added

- Navbar **Plus** button (sliders icon) opens the settings panel
- Settings: per-link toggles for IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, Wikipedia

## [0.2.4] - 2026-07-16

### Added

- Quick links: SteamDB (`/app/{id}/` when resolved, otherwise search)

## [0.2.3] - 2026-07-16

### Changed

- Price and Reviews merged into one native **Steam** row (`$59.99 • Very Positive (93%)`)

## [0.2.2] - 2026-07-16

### Added

- Steam Reviews row: color by Steam review tier (blue positive / yellow mixed / orange-red negative)

## [0.2.1] - 2026-07-16

### Changed

- Game page enrichment uses native Backloggd detail rows (Price, Reviews, Metacritic, Links) instead of a single “Plus” dump
- Loading state uses shimmer skeletons; external links use site favicons and `•` separators like Genres

## [0.2.0] - 2026-07-16

### Added

- Game page **Plus** panel (after Platforms): Steam price, review summary, Metacritic score, and quick links
- Steam Store lookup via public APIs (`storesearch`, `appdetails`, `appreviews`) — no API keys required
- Quick links: IGDB (from page), Steam, Metacritic, OpenCritic, HowLongToBeat, Wikipedia
- Settings panel: Steam region, feature toggles, cache duration, clear cache
- Local cache for Steam lookups; Turbo / SPA re-scan on Backloggd navigation

## [0.1.0] - 2026-07-16

### Added

- Project scaffold: installable userscript, metadata companion, docs, and MIT license
- Bootstrap on `backloggd.com` / `www.backloggd.com` with styles, locale strings, settings stub, DOM scan, and MutationObserver
- Userscript manager menu entry for settings (opens GitHub until the settings panel lands)
