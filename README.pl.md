# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.99-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

Skrypt użytkownika, który rozszerza [Backloggd](https://www.backloggd.com) o dodatkowe informacje o grach, bogatszy interfejs i usprawnienia — bez opuszczania strony.

Zgodny z [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) i innymi menedżerami obsługującymi blok metadanych `// ==UserScript==`.

Dostępny także na [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) i [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Uwaga:** strony katalogów Greasy Fork / ScriptCat mogą być opóźnione względem tego repozytorium — nie zawsze udaje się tam od razu opublikować każde wydanie. Przepraszam. Aby mieć najnowszą wersję, użyj [adresu instalacji raw z GitHub](#szybka-instalacja) (albo sklonuj repozytorium i uruchom `npm run build`). `@updateURL` / `@downloadURL` skryptu również wskazują na `main` w GitHub.

> **Status:** wczesny (`0.7.99`). Wzbogacanie Backloggd + odznaki na listach + przyciski Steam / SteamDB → Backloggd.

## Zrzuty ekranu

Prawdziwy skrypt działający na stronie gry Backloggd.

![Panel ustawień Backloggd Plus z zakładkami Ogólne, Profil, Strona gry, Karta gry, Tłumaczenie, Cache, Debug i O skrypcie](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Wiersze Steam na stronie gry Backloggd](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**Wiersze strony gry** — Steam: posiadane · cena · recenzje · tagi i kategorie, szczegóły SteamDB, Metacritic, Deck/Proton, gracze, GameStatus | ![Ocena Plus, galeria zrzutów i podobne gry](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**Oceny i dodatki** — średnia ocena Plus, galeria zrzutów Steam, podobne gry z odznakami na okładkach |
| ![Wyszukiwanie ustawień filtrujące wszystkie zakładki](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**Wyszukiwanie ustawień** — filtruje wszystkie zakładki naraz; dopasowania podświetlone, wyniki pogrupowane według zakładek | ![Wiersz szybkich linków z wbudowanymi i własnymi linkami](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**Szybkie linki** — wbudowane serwisy plus własne szablony URL, wyświetlane jako linki lub przyciski |

Dodatkowo na stronach gier: szkielety podczas ładowania, przyciski tłumaczenia, Fix match, ID gry, ikona i okładka SteamDB, eksport (Notion CSV / Markdown / JSON) oraz mini-profile po najechaniu na okładkę.

## Szybka instalacja

1. Zainstaluj menedżer skryptów użytkownika ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) lub [ScriptCat](https://scriptcat.org/) — zalecane).
2. Zainstaluj z GitHub (adres raw poniżej), [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) lub [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**Adres instalacji (GitHub — najnowszy):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Instalacja z URL (panel menedżera)

| Menedżer | Ścieżka |
|----------|---------|
| Tampermonkey | Panel → **Utilities** → **Install from URL** |
| Violentmonkey | Panel → **+** → **Install from URL** |
| Greasemonkey | Menu dodatku → **New User Script** → wklej adres raw |
| ScriptCat | [Strona skryptu](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, albo zainstaluj [rozszerzenie](https://scriptcat.org/) i użyj adresu raw z GitHub |

Wklej [adres instalacji z GitHub](#szybka-instalacja) powyżej, instalując z panelu menedżera. Instalacja z katalogów: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Instalacja ręczna

1. Otwórz zbudowany [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) w tym repozytorium (lub uruchom `npm run build` po sklonowaniu).
2. Skopiuj całą zawartość pliku.
3. W menedżerze skryptów użytkownika utwórz nowy skrypt i wklej kod.
4. Zapisz i włącz skrypt.

## Aktualizacje

Skrypt zawiera metadane `@updateURL` i `@downloadURL` wskazujące na plik raw w GitHub. Obsługiwane menedżery sprawdzają aktualizacje automatycznie.

Kroki wydania dla opiekunów: patrz [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases).

## Funkcje

**Strony gier (`/games/{slug}/`):**

- Natywne wiersze szczegółów pod Platforms — **Steam** (posiadane · lista życzeń · cena · koniec promocji / ostatnie minimum · recenzje · tagi), **SteamDB** (franczyza · obsługiwane systemy · technologie · ostatnia aktualizacja rekordu), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Gracze**, **GameStatus**, **Linki**
- **Fix match** — ręcznie nadpisuje automatyczny Steam App ID, gdy wyszukiwanie w sklepie się myli (zapisywane per slug); pozostaw App ID puste, aby oznaczyć grę jako niedostępną na Steam
- Wygląd SteamDB: ikona aplikacji przed tytułem, logo pod **Change cover**, liczba graczy online
- Wiersz szczegółów SteamDB: franczyza / systemy z API sklepu Steam; technologie i ostatnia aktualizacja rekordu ze SteamDB, gdy jest dostępny
- Przycisk eksportu pod nagłówkiem Steam i w edytorze dziennika (opcjonalnie; Ustawienia → Strona gry; Notion CSV / Markdown / JSON)
- Opcjonalny identyfikator gry Backloggd po tytule (Ustawienia → Strona gry; kliknij, aby skopiować)
- Przyciski tłumaczenia opisu gry i kart recenzji (Ustawienia → Tłumaczenie; Google Translate)
- Nagłówek / ikona społeczności Steam na stronach gier; galeria zrzutów ekranu po statystykach gry
- Podobne gry pod zrzutami (Steam More Like This) z % zgodności tagów; karty prowadzą do Backloggd i mogą pokazywać te same odznaki na okładkach co siatki list
- Szkielety zastępcze podczas ładowania Steam / GameStatus / ocen
- Szybkie linki z favikonami (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); przeciągaj, aby zmienić kolejność, i dodawaj własne linki z szablonu URL (`{title}` w wybranym formacie, `{slug}`, `{appid}`, `{year}`, `{id}`) z opcjonalną własną ikoną
- Odznaki Steam **Posiadane** / **Wishlist**, gdy jesteś zalogowany do Steam w tej samej przeglądarce (bez klucza API)
- Odznaki statusu GameStatus na stronach gier i siatkach okładek
- Działa bez kluczy API (publiczne endpointy Steam Store + userdata sesji + publiczne API GameStatus / HLTB / ProtonDB; OpenCritic znajdowany przez PCGamingWiki, opcjonalny własny klucz RapidAPI w Ustawieniach)

**Listy / wyszukiwanie / dziennik (siatki okładek):**

- Kompaktowe odznaki na kartach `.game-cover` — cena, % recenzji Steam, Posiadane, Wishlist, GameStatus (leniwe ładowanie w viewporcie; przełączniki per typ w Ustawienia → Karta gry)
- Mini-profil na okładkach (domyślnie po najechaniu; lub prawy przycisk / Shift + klik) — tytuł, ocena Backloggd, platformy, cena/recenzje Steam, GameStatus, szybkie linki; poziom karty (Rookie → Legend) zależy od oceny Backloggd (opcjonalne wstępne ładowanie w viewporcie)
- Te same odznaki / mini-profile na kartach podobnych gier (pasek na stronie gry)

**Strony aplikacji Steam** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Przycisk z ikoną Backloggd w `.apphub_OtherSiteInfo` (ten sam styl co SteamDB / Community Hub)
- Link budowany ze slug w adresie Steam lub z tytułu gry

**Strony aplikacji SteamDB** (`steamdb.info/app/*`):

- Przycisk Backloggd w `nav.app-links` (ten sam styl `.btn` co Store / IGDB)
- Preferuje slug IGDB ze strony, gdy jest dostępny

**Ustawienia** (przycisk **Plus** w nawigacji Backloggd / menu menedżera skryptów):

- Panel z zakładkami: Ogólne · Profil · Strona gry · Karta gry · Tłumaczenie · Cache · Debug · O skrypcie
- Wyszukiwanie ustawień: wpisz w polu (lub naciśnij `/` / `Ctrl+K`), aby filtrować wszystkie zakładki naraz — dopasowania w etykietach i podpowiedziach są podświetlane, wyniki grupowane według zakładek, `Esc` czyści
- Język interfejsu (automatyczny lub stały locale)
- Profil: karty mini-profilu na awatarach i nazwach użytkownika (domyślnie po najechaniu; lub prawy przycisk / Shift + klik; opcjonalne wstępne ładowanie w viewporcie); okładki gier w karcie (ulubione / ostatnie) otwierają mini-profil gry; skórkę poziomu według rozegranych gier można wyłączyć; ozdoby strony profilu z przełącznikami per blok (nagłówek, chip poziomu, statystyki, nawigacja, ulubione)
- Region sklepu Steam (waluta cen)
- Przełączniki dla Steam / posiadane / lista życzeń / tagi / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / gracze / ikona i logo SteamDB / galeria zrzutów / podobne gry / natywny blok statystyk / ID gry / tłumaczenie (opis i recenzje) / odznaki na okładkach (per typ) / mini-profile gier / linki / przyciski Backloggd na Steam i SteamDB
- Tryb debugowania: jeden panel z klikalnymi linkami źródeł i pełnym zrzutem odpowiedzi
- Widoczność linków per strona (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Czas życia cache + czyszczenie cache (usuwanie wygasłych + miękki limit LRU; biblioteka i mapa tagów z krótkimi TTL; gracze online zawsze na żywo)

## Obsługiwane strony

| Serwis | Wzorzec URL |
|--------|-------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (bez www) | `https://backloggd.com/*` |
| Steam Store (aplikacja) | `https://store.steampowered.com/app/*` |
| Steam Community (aplikacja) | `https://steamcommunity.com/app/*` |
| SteamDB (aplikacja) | `https://steamdb.info/app/*` |

## Rozwój i współpraca

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — konfiguracja lokalna, struktura repozytorium, metadane, uprawnienia, wydania
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — zasady PR, konwencje, lokalizacja, współtwórcy
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — notatki architektoniczne dla agentów AI
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — jak prywatnie zgłosić lukę, zakres i sposób obchodzenia się ze Twoimi danymi

```bash
npm install
npm run dev      # Serwer Vite — zainstaluj wygenerowany skrypt "dev:"
npm run build    # Produkcja → dist/ + kopia do katalogu głównego repozytorium
npm run ci       # Te same sprawdzenia co GitHub Actions
```

## Powiązania z Backloggd

Ten projekt **nie jest powiązany** z Backloggd. To niezależny, społecznościowy skrypt użytkownika.

## Licencja

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
