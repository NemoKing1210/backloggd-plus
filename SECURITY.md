# Security Policy

Backloggd Plus is a userscript that runs in your browser on Backloggd, Steam, and SteamDB pages. This page explains how to report a security issue, what is covered, and what the script does with your data.

## Supported versions

Only the latest version is supported. The script ships `@updateURL` / `@downloadURL` metadata pointing at `main`, so userscript managers update it automatically.

| Version | Supported |
|---------|-----------|
| Latest on `main` (see `package.json` / `CHANGELOG.md`) | ✅ |
| Older releases, forks, and catalog builds that lag behind `main` | ❌ — update first |

Please reproduce an issue on the newest build from the [GitHub raw install URL](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js) before reporting it.

## Reporting a vulnerability

**Do not open a public issue for an unfixed vulnerability.**

Use GitHub private vulnerability reporting:

- **<https://github.com/NemoKing1210/backloggd-plus/security/advisories/new>**

If that is unavailable, contact the maintainer ([@NemoKing1210](https://github.com/NemoKing1210)) privately and ask for a secure channel — please keep the details out of public issues, discussions, and social media until a fix is released.

A useful report includes:

- Affected script version (`SCRIPT_VERSION` from the manager's script header) and the source of the build (GitHub `main`, Greasy Fork, ScriptCat, local build)
- Browser and userscript manager (Tampermonkey / Violentmonkey / Greasemonkey / ScriptCat, with versions)
- The page URL and the feature involved
- Reproduction steps, expected vs. actual behavior
- Impact (what an attacker could read, change, or redirect) and any proof of concept
- Whether the issue is already public

### What to expect

- Acknowledgement of the report, usually within a few days
- An assessment and, when confirmed, a fix on `main` with a version bump (which also clears the lookup cache)
- Credit in the advisory and/or `CHANGELOG.md` unless you prefer to stay anonymous

This is a volunteer project, so timelines are best-effort rather than contractual. Please allow reasonable time for a fix before disclosing publicly.

## Scope

**In scope**

- Code in `src/`, `scripts/`, and `vite.config.js`, and the generated `backloggd-plus.user.js` / `.meta.js`
- Cross-site scripting or HTML injection through scraped or API-provided values (game titles, descriptions, review text, tags, URLs, badge and link data) rendered into Backloggd's DOM
- Exposure or leakage of locally stored data, including the optional OpenCritic RapidAPI key
- Permission creep or data exfiltration through `@connect` / `@grant` / `@match`
- Release or build integrity issues (CI workflow, installed artifacts, update URL handling)

**Out of scope**

- Vulnerabilities in Backloggd, Steam, SteamDB, or any other third-party site or API the script reads from — report those to the site owner
- Bugs in userscript managers or browsers
- Issues that require an already-compromised browser profile, manager, or extension, or a malicious script installed alongside this one
- Self-XSS and social engineering
- Denial of service, resource exhaustion, or rate-limit complaints without a concrete exploit path
- Missing hardening headers on the third-party sites the script talks to
- Automated scanner output with no demonstrated impact (actionable findings are still welcome)

## How the script handles your data

- **No telemetry.** There is no analytics, tracking, or author-operated server, and no data is sent to the maintainer.
- **Network access is limited** to the hosts declared in `@connect` in [`vite.config.js`](vite.config.js) (Steam, SteamDB, GameStatus, HLTB, OpenCritic, PCGamingWiki, ProtonDB, DuckDuckGo HTML, and a few static/CDN endpoints used for currency rates, translation, and icons). Requests are made with `GM_xmlhttpRequest`.
- **Settings and caches are stored locally** by your userscript manager (`GM_getValue` / `GM_setValue`). Nothing is uploaded anywhere.
- **No credentials are collected.** On Steam pages, ownership and wishlist data are read from the Steam session your browser already has; no Steam password or API key is requested.
- **The optional OpenCritic RapidAPI key** (Settings → Game → OpenCritic source) is stored only on your device, sent only to `opencritic-api.p.rapidapi.com` for that lookup, and is not included in settings backups or exports.
- **Debug mode** shows enrichment responses in the page for troubleshooting; treat screenshots or pasted dumps like any other browsing data.

## Safe installation

- Install from this repository's raw URL, [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus), or [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).
- A build is only official if it comes from this repository or one of those catalog listings. Forks or re-uploads may contain changes — check `@namespace`, `@downloadURL`, and `@connect` before installing.
- The built `.user.js` and `.meta.js` are generated from `src/` by `npm run build`; CI verifies that committed artifacts match the source build.

## Disclosure policy

Please give the maintainer a chance to fix and release an update before publishing details. Once a fix is available, the advisory and `CHANGELOG.md` will describe the issue in general terms without providing a weaponized exploit.
