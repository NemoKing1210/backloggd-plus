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

1. Match `https://www.backloggd.com/*` and `https://backloggd.com/*` at `document-idle`.
2. Single IIFE bootstraps styles, settings, DOM scan, `MutationObserver`, and Turbo/href SPA hooks.
3. **Game pages:** inject native detail rows after `#game-page-platforms` (`Price`, `Reviews`, `Metacritic`, `Links`); resolve title + IGDB link from DOM. Skeletons while Steam loads; link favicons via Google s2.
4. Steam enrichment: `storesearch` → pick best app → `appdetails` + `appreviews` via `GM_xmlhttpRequest` (`@connect store.steampowered.com`).
5. Cache in `GM_getValue` / `GM_setValue` (`blp_cache_v1`); settings in `blp_settings`.
6. UI strings in `TRANSLATIONS` / browser locale; settings modal via `GM_registerMenuCommand`.

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
2. Add a Keep a Changelog entry in `CHANGELOG.md`.
3. Update README version badge / docs if they mention the version or new behavior.

## Localization

UI locales: `en`, `ru`, `zh`, `es`, `pt`, `de`, `fr`, `ja`, `ko`, `pl`.

- Add every new user-facing string to **all** `TRANSLATIONS` locales.
- Keep localized `@name` / `@description` metadata tags aligned when changing the product description.

## Do not

- Add a build toolchain, TypeScript, or npm unless explicitly requested.
- Imply affiliation with Backloggd in docs or UI copy.
- Break Backloggd’s native navigation, forms, or list/infinite-scroll behavior.

## Local testing

- **Violentmonkey:** install local file + enable Track local file; reload Backloggd after edits.
- **Tampermonkey:** reinstall from file/URL, or temporary local server URLs (do not commit them).
