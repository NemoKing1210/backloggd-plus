# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
