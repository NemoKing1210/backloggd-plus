# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- Game pages: **GameStatus** row (crack / DRM status badge + protection chips), resolved via Steam App ID like [steam-gamestatus](https://github.com/NemoKing1210/steam-gamestatus)
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
