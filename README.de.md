# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.100-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

Ein Userscript, das [Backloggd](https://www.backloggd.com) um zusätzliche Spielinformationen, eine reichere Oberfläche und Komfortverbesserungen erweitert – ohne die Seite zu verlassen.

Kompatibel mit [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) und anderen Managern, die den Metadatenblock `// ==UserScript==` unterstützen.

Auch gelistet auf [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) und [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Hinweis:** Die Katalogseiten auf Greasy Fork / ScriptCat können hinter diesem Repository zurückliegen – nicht jedes Release schaffe ich sofort dorthin. Entschuldigung. Für den neuesten Build nutze die [GitHub-Raw-Installations-URL](#schnellinstallation) (oder klone das Repo und führe `npm run build` aus). `@updateURL` / `@downloadURL` des Skripts zeigen ebenfalls auf `main` bei GitHub.

> **Status:** früh (`0.7.100`). Backloggd-Anreicherung + Listen-Badges + Steam-/SteamDB-→-Backloggd-Buttons.

## Screenshots

Das echte Userscript auf einer Live-Spielseite von Backloggd.

![Backloggd-Plus-Einstellungen mit den Tabs Allgemein, Profil, Spieleseite, Spielkarte, Übersetzung, Cache, Debug und Über](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Steam-Zeilen auf einer Backloggd-Spielseite](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**Zeilen auf der Spielseite** — Steam: im Besitz · Preis · Bewertungen · Tags und Kategorien, SteamDB-Details, Metacritic, Deck/Proton, Spieler, GameStatus | ![Plus-Wertung, Screenshot-Galerie und ähnliche Spiele](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**Wertungen & Extras** — Plus-Durchschnitt, Steam-Screenshot-Galerie, ähnliche Spiele mit Cover-Badges |
| ![Einstellungssuche filtert alle Tabs](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**Einstellungssuche** — filtert alle Tabs gleichzeitig; Treffer hervorgehoben, Ergebnisse nach Tab gruppiert | ![Quick-Links-Zeile mit integrierten und eigenen Links](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**Quick Links** — integrierte Seiten plus eigene URL-Vorlagen, als Links oder Buttons |

Außerdem auf Spielseiten: Skeletons während des Ladens, Übersetzen-Buttons, Fix match, Spiel-ID, SteamDB-Icon und -Cover, Export (Notion CSV / Markdown / JSON) und Mini-Profile beim Hovern über Cover.

## Schnellinstallation

1. Installiere einen Userscript-Manager ([Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) oder [ScriptCat](https://scriptcat.org/) empfohlen).
2. Installiere von GitHub (Raw-URL unten), [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) oder [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**Installations-URL (GitHub — neueste Version):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Installation per URL (Manager-Dashboard)

| Manager | Pfad |
|---------|------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Add-on-Menü → **New User Script** → Raw-URL einfügen |
| ScriptCat | [Skriptseite](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, oder die [Erweiterung](https://scriptcat.org/) installieren und die GitHub-Raw-URL verwenden |

Füge die [GitHub-Installations-URL](#schnellinstallation) oben ein, wenn du über das Manager-Dashboard installierst. Katalog-Installationen: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Manuelle Installation

1. Öffne die gebaute [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) in diesem Repository (oder führe nach dem Klonen `npm run build` aus).
2. Kopiere den gesamten Dateiinhalt.
3. Erstelle im Userscript-Manager ein neues Skript und füge den Code ein.
4. Speichere und aktiviere das Skript.

## Updates

Das Skript enthält `@updateURL`- und `@downloadURL`-Metadaten, die auf die Raw-Datei bei GitHub zeigen. Unterstützte Manager prüfen automatisch auf Updates.

Release-Schritte für Maintainer: siehe [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases).

## Funktionen

**Spielseiten (`/games/{slug}/`):**

- Native Detailzeilen unter Platforms — **Steam** (im Besitz · Wunschliste · Preis · Sale-Ende / letzter Tiefstpreis · Bewertungen · Tags), **SteamDB** (Franchise · unterstützte Systeme · Technologien · letzte Datensatz-Aktualisierung), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Spieler**, **GameStatus**, **Links**
- **Fix match** — überschreibt die automatische Steam-App-ID, wenn die Store-Suche falsch liegt (pro Slug gespeichert); App-ID leer lassen, um ein Spiel als nicht auf Steam zu markieren
- SteamDB-Optik: App-Icon vor dem Titel, Logo unter **Change cover**, Online-Spielerzahl
- SteamDB-Detailzeile: Franchise / Betriebssysteme aus den Steam-Store-APIs; Technologien und letzte Datensatz-Aktualisierung aus SteamDB, wenn erreichbar
- Export-Button unter dem Steam-Header und im Log-Editor (optional; Einstellungen → Spieleseite; Notion CSV / Markdown / JSON)
- Optionale Backloggd-Spiel-ID nach dem Titel (Einstellungen → Spieleseite; klicken zum Kopieren)
- Übersetzen-Buttons für Spielbeschreibung und Review-Karten (Einstellungen → Übersetzung; Google Translate)
- Steam-Header / Community-Icon auf Spielseiten; Screenshot-Galerie nach den Spielstatistiken
- Ähnliche Spiele unter den Screenshots (Steam More Like This) mit Tag-Übereinstimmung in %; Karten führen zu Backloggd und können dieselben Cover-Badges wie Listengrids zeigen
- Skeleton-Platzhalter, während Steam / GameStatus / Wertungen laden
- Quick Links mit Favicons (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); per Drag & Drop sortieren und eigene Links aus einer URL-Vorlage hinzufügen (`{title}` in einem Format deiner Wahl, `{slug}`, `{appid}`, `{year}`, `{id}`) mit optionalem eigenen Icon
- Steam-**Owned**- / **Wishlist**-Badges, wenn du im selben Browser bei Steam angemeldet bist (kein API-Key)
- GameStatus-Status-Badges auf Spielseiten und Cover-Grids
- Funktioniert ohne API-Keys (öffentliche Steam-Store-Endpunkte + Session-Userdata + öffentliche GameStatus-/HLTB-/ProtonDB-APIs; OpenCritic wird über PCGamingWiki gefunden, optional eigener RapidAPI-Key in den Einstellungen)

**Listen / Suche / Journal (Cover-Grids):**

- Kompakte Badges auf `.game-cover`-Karten — Preis, Steam-Bewertung %, Owned, Wishlist, GameStatus (lazy im Viewport; Schalter pro Typ unter Einstellungen → Spielkarte)
- Mini-Profil auf Covern (standardmäßig beim Hovern; oder Rechtsklick / Shift + Klick) — Titel, Backloggd-Wertung, Plattformen, Steam-Preis/Bewertungen, GameStatus, Quick Links; Karten-Tier (Rookie → Legend) folgt der Backloggd-Wertung (optionales Vorladen im Viewport)
- Dieselben Cover-Badges / Mini-Profile auf Karten ähnlicher Spiele (Leiste auf der Spielseite)

**Steam-App-Seiten** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Backloggd-Icon-Button in `.apphub_OtherSiteInfo` (gleicher Stil wie SteamDB / Community Hub)
- Link aus dem Steam-URL-Slug oder dem Spieltitel gebaut

**SteamDB-App-Seiten** (`steamdb.info/app/*`):

- Backloggd-Button in `nav.app-links` (gleicher `.btn`-Stil wie Store / IGDB)
- Bevorzugt den IGDB-Slug der Seite, wenn vorhanden

**Einstellungen** (Navbar **Plus** auf Backloggd / Menü des Userscript-Managers):

- Tab-Panel: Allgemein · Profil · Spieleseite · Spielkarte · Übersetzung · Cache · Debug · Über
- Einstellungssuche: in das Feld tippen (oder `/` / `Ctrl+K` drücken), um alle Tabs gleichzeitig zu filtern — Treffer in Labels und Hinweisen werden hervorgehoben, Ergebnisse nach Tab gruppiert, `Esc` leert
- Oberflächensprache (Auto oder feste Locale)
- Profil: Mini-Profil-Karten auf Avataren und Benutzernamen (standardmäßig beim Hovern; oder Rechtsklick / Shift + Klick; optionales Vorladen im Viewport); Spielcover in der Karte (Favoriten / zuletzt) öffnen das Spiel-Mini-Profil; Tier-Skin nach gespielten Spielen abschaltbar; Profilseiten-Tier-Chrome mit Schaltern pro Block (Header, Tier-Chip, Statistiken, Navigation, Favoriten)
- Steam-Store-Region (Preiswährung)
- Schalter für Steam / Owned / Wishlist / Tags / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / Spieler / SteamDB-Icon & -Logo / Screenshot-Galerie / ähnliche Spiele / nativer Statistikblock / Spiel-ID / Übersetzung (Beschreibung & Reviews) / Cover-Badges (pro Typ) / Spiel-Mini-Profile / Links / Backloggd-Buttons auf Steam & SteamDB
- Debug-Modus: ein Panel mit klickbaren Quelllinks und vollständigem Response-Dump
- Link-Sichtbarkeit pro Seite (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Cache-Dauer + Cache leeren (abgelaufene Einträge löschen + weiches LRU-Limit; Bibliothek/Tag-Map mit kurzen TTLs; Online-Spieler live)

## Unterstützte Seiten

| Seite | URL-Muster |
|-------|-----------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (ohne www) | `https://backloggd.com/*` |
| Steam Store (App) | `https://store.steampowered.com/app/*` |
| Steam Community (App) | `https://steamcommunity.com/app/*` |
| SteamDB (App) | `https://steamdb.info/app/*` |

## Entwicklung & Mitwirken

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — lokales Setup, Repo-Struktur, Metadaten, Berechtigungen, Releases
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — PR-Richtlinien, Konventionen, Lokalisierung, Mitwirkende
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — Architekturhinweise für KI-Coding-Agents
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — wie man eine Schwachstelle privat meldet, Umfang und wie das Skript mit deinen Daten umgeht

```bash
npm install
npm run dev      # Vite-Server — installiere das generierte "dev:"-Userscript
npm run build    # Produktion → dist/ + Kopie ins Repo-Root
npm run ci       # Dieselben Checks wie GitHub Actions
```

## Keine Verbindung zu Backloggd

Dieses Projekt ist **nicht mit Backloggd verbunden**. Es ist ein unabhängiges Community-Userscript.

## Lizenz

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
