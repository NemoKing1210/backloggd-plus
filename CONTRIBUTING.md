# Contributing

Thanks for your interest in improving Backloggd Plus.

## Ways to help

- Report bugs and suggest features via [GitHub Issues](https://github.com/NemoKing1210/backloggd-plus/issues)
- Open pull requests for fixes, features, docs, or translations
- Test on different userscript managers and browsers

## Before you start

1. Read [DEVELOPMENT.md](DEVELOPMENT.md) for setup, scripts, and release notes.
2. Skim [AGENTS.md](AGENTS.md) for architecture and project conventions (also useful for humans).
3. Check [CHANGELOG.md](CHANGELOG.md) and open issues/PRs to avoid duplicate work.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Edit source under `src/` (and `vite.config.js` for userscript metadata). Do **not** hand-edit root `backloggd-plus.user.js` / `.meta.js`.
3. Run `npm run build` so committed install artifacts stay in sync.
4. Run `npm run ci` locally when practical (same checks as GitHub Actions).
5. Keep PRs focused: one concern per PR when possible.
6. For user-visible changes, bump `version` in `package.json` and add a [Keep a Changelog](https://keepachangelog.com/) entry in `CHANGELOG.md` (maintainers may do this on merge if you prefer).

### What CI checks

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs `npm ci` → `npm run ci`. It fails if `dist/` and the root `.user.js` / `.meta.js` are out of sync.

## Conventions

- Vanilla JS ESM modules under `src/`; no frameworks unless explicitly agreed.
- Prefer existing patterns: constants in `constants.js`, strings in `i18n/`, APIs in `api/`, UI in `features/`.
- Match Backloggd’s look where possible when injecting UI.
- Do not expand `@connect` or `@grant` beyond what is needed (`vite.config.js`).
- Do not commit localhost `@updateURL` / `@downloadURL` values.
- Do not imply affiliation with Backloggd in docs or UI copy.
- Do not break Backloggd’s native navigation, forms, or list/infinite-scroll behavior.

## Localization

UI locales: `en`, `ru`, `zh`, `es`, `pt`, `de`, `fr`, `ja`, `ko`, `pl` (plus `auto` = browser).

- Add every new user-facing string to **all** locale files in [`src/i18n/locales/`](src/i18n/locales/).

### Site language (Backloggd itself)

Dictionaries live in [`src/i18n/site/`](src/i18n/site/). `en.json` is the key list: each key is the English phrase as it appears on Backloggd, and the value is the same English phrase. A translation file uses those same keys.

To add a language:

1. Copy `src/i18n/site/en.json` to `src/i18n/site/<code>.json` (`de.json`, `es.json`, …). Use a two-letter code.
2. Translate the values. Leave the keys unchanged.
3. An empty string hides that fragment (used when a sentence is split by a link).
4. Open a pull request. The new file shows up in Settings → General → Site language. No registry edit is required.

Reviews, game descriptions, and game titles are not part of these files. Russian grammar for dates and counters lives in `src/features/site-locale.js` and applies only when the site language is Russian. Other languages use exact phrases from their JSON file.
- Keep localized `@name` / `@description` in `vite.config.js` aligned when changing the product description.

## Contributors

Thanks to everyone who helps improve Backloggd Plus:

- [Nikitamce](https://github.com/Nikitamce)
- [MaksVolkov7863](https://github.com/MaksVolkov7863)

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
