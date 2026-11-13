# Backloggd Plus

[English](README.md) · [Русский](README.ru.md) · [中文](README.zh.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md)

[![CI](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/NemoKing1210/backloggd-plus/actions/workflows/ci.yml)
[![Install userscript](https://img.shields.io/badge/Install-userscript-7c5cff?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Greasy Fork](https://img.shields.io/badge/Greasy_Fork-587296-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-7077-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-0.7.101-green?style=for-the-badge)](https://github.com/NemoKing1210/backloggd-plus/blob/main/CHANGELOG.md)

Юзерскрипт, который расширяет [Backloggd](https://www.backloggd.com) дополнительной информацией об играх, более богатым интерфейсом и улучшениями — не покидая сайт.

Совместим с [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), [ScriptCat](https://scriptcat.org/) и другими менеджерами, поддерживающими блок метаданных `// ==UserScript==`.

Также опубликован на [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) и [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

> **Примечание:** страницы каталогов на Greasy Fork / ScriptCat могут отставать от этого репозитория — не всегда получается выкладывать каждый релиз сразу. Извините. Для самой новой сборки используйте [raw-URL установки с GitHub](#быстрая-установка) (или клонируйте репозиторий и выполните `npm run build`). `@updateURL` / `@downloadURL` скрипта также указывают на ветку `main` в GitHub.

> **Статус:** ранний (`0.7.101`). Обогащение Backloggd + бейджи в списках + кнопки Steam / SteamDB → Backloggd.

## Скриншоты

Настоящий юзерскрипт на живой странице игры Backloggd.

![Панель настроек Backloggd Plus с вкладками «Общие», «Профиль», «Страница игры», «Карточка игры», «Перевод», «Кэш», «Отладка» и «О скрипте»](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-panel.png)

| | |
|---|---|
| ![Строки Steam на странице игры Backloggd](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-steam.png)<br>**Строки на странице игры** — Steam: в библиотеке · цена · обзоры · теги и категории, данные SteamDB, Metacritic, Deck/Proton, игроки, GameStatus | ![Оценка Plus, галерея скриншотов и похожие игры](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/game-page-stats.png)<br>**Оценки и дополнения** — средняя оценка Plus, галерея скриншотов Steam, похожие игры с бейджами на обложках |
| ![Поиск по настройкам фильтрует все вкладки](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/settings-search.png)<br>**Поиск по настройкам** — фильтрует все вкладки сразу; совпадения подсвечены, результаты сгруппированы по вкладкам | ![Строка быстрых ссылок со встроенными и своими ссылками](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/docs/screenshots/quick-links.png)<br>**Быстрые ссылки** — встроенные сайты плюс ваши собственные шаблоны URL, в виде ссылок или кнопок |

Также на страницах игр: скелетоны во время загрузки данных, кнопки перевода, Fix match, ID игры, иконка и обложка SteamDB, экспорт (Notion CSV / Markdown / JSON) и мини-профили при наведении на обложки.

## Быстрая установка

1. Установите менеджер юзерскриптов (рекомендуются [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) или [ScriptCat](https://scriptcat.org/)).
2. Установите скрипт с GitHub (raw-URL ниже), с [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) или [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

**URL установки (GitHub — самая новая версия):**

```
https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_raw-1a1d24?style=for-the-badge&labelColor=7c5cff)](https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js)
[![Install on Greasy Fork](https://img.shields.io/badge/⬇_Install-Greasy_Fork-1a1d24?style=for-the-badge&labelColor=670000)](https://greasyfork.org/ru/scripts/587296-backloggd-plus)
[![Install on ScriptCat](https://img.shields.io/badge/⬇_Install-ScriptCat-1a1d24?style=for-the-badge&labelColor=f59e0b)](https://scriptcat.org/ru/script-show-page/7077)

### Установка по URL (в панели менеджера)

| Менеджер | Путь |
|---------|------|
| Tampermonkey | Панель → **Utilities** → **Install from URL** |
| Violentmonkey | Панель → **+** → **Install from URL** |
| Greasemonkey | Меню дополнения → **New User Script** → вставьте raw-URL |
| ScriptCat | [Страница скрипта](https://scriptcat.org/ru/script-show-page/7077) → **Установить скрипт**, или установите [расширение](https://scriptcat.org/) и используйте raw-URL с GitHub |

Вставляйте [URL установки с GitHub](#быстрая-установка), когда устанавливаете из панели менеджера. Установка из каталогов: [Greasy Fork](https://greasyfork.org/ru/scripts/587296-backloggd-plus) · [ScriptCat](https://scriptcat.org/ru/script-show-page/7077).

### Ручная установка

1. Откройте собранный [`backloggd-plus.user.js`](https://github.com/NemoKing1210/backloggd-plus/blob/main/backloggd-plus.user.js) в этом репозитории (или выполните `npm run build` после клонирования).
2. Скопируйте всё содержимое файла.
3. В менеджере юзерскриптов создайте новый скрипт и вставьте код.
4. Сохраните и включите скрипт.

## Обновления

Скрипт содержит метаданные `@updateURL` и `@downloadURL`, указывающие на raw-файл в GitHub. Поддерживаемые менеджеры проверяют обновления автоматически.

Шаги релиза для мейнтейнеров: см. [DEVELOPMENT.md § Releases](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md#releases).

## Возможности

**Страницы игр (`/games/{slug}/`):**

- Нативные строки деталей под Platforms — **Steam** (в библиотеке · вишлист · цена · конец распродажи / недавний минимум · обзоры · теги), **SteamDB** (франшиза · поддерживаемые системы · технологии · последнее обновление записи), **Metacritic**, **OpenCritic**, **HLTB**, **Deck / Proton**, **Игроки**, **GameStatus**, **Ссылки**
- **Fix match** — вручную задать Steam App ID, если поиск в магазине ошибся (сохраняется для каждого slug); оставьте App ID пустым, чтобы отметить, что игры нет в Steam
- Визуал SteamDB: иконка приложения перед заголовком, логотип под **Change cover**, число игроков онлайн
- Строка деталей SteamDB: франшиза / ОС из API магазина Steam; технологии и последнее обновление записи из SteamDB, когда он доступен
- Кнопка экспорта под заголовком Steam и в редакторе логов (опционально; Настройки → Страница игры; Notion CSV / Markdown / JSON)
- Опциональный ID игры Backloggd после заголовка (Настройки → Страница игры; нажмите, чтобы скопировать)
- Кнопки перевода описания игры и карточек обзоров (Настройки → Перевод; Google Translate)
- Заголовок / иконка сообщества Steam на страницах игр; галерея скриншотов после статистики игры
- Похожие игры под скриншотами (Steam More Like This) с процентом совпадения по тегам; карточки ведут на Backloggd и могут показывать те же бейджи на обложках, что и сетки списков
- Скелетоны-заглушки, пока загружаются Steam / GameStatus / оценки
- Быстрые ссылки с фавиконами (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike); перетаскивайте их для изменения порядка и добавляйте свои ссылки из шаблона URL (`{title}` в удобном формате, `{slug}`, `{appid}`, `{year}`, `{id}`) с необязательной своей иконкой
- Бейджи Steam **Куплено** / **В вишлисте**, если вы вошли в Steam в этом же браузере (без API-ключа)
- Статусные бейджи GameStatus на страницах игр и сетках обложек
- Работает без API-ключей (публичные эндпоинты Steam Store + userdata сессии + публичные API GameStatus / HLTB / ProtonDB; OpenCritic находится через PCGamingWiki, опционально свой ключ RapidAPI в настройках)

**Списки / поиск / журнал (сетки обложек):**

- Компактные бейджи на карточках `.game-cover` — цена, % обзоров Steam, «Куплено», «В вишлисте», GameStatus (загружаются лениво во вьюпорте; переключатели по типам в Настройки → Карточка игры)
- Мини-профиль на обложках (по наведению; либо правый клик / Shift + клик) — название, оценка Backloggd, платформы, цена/обзоры Steam, GameStatus, быстрые ссылки; уровень карточки (Rookie → Legend) следует за оценкой Backloggd (опциональная предзагрузка во вьюпорте)
- Те же бейджи / мини-профили на карточках похожих игр (полоса на странице игры)

**Страницы приложений Steam** (`store.steampowered.com/app/*`, `steamcommunity.com/app/*`):

- Кнопка-иконка Backloggd в `.apphub_OtherSiteInfo` (в том же стиле, что SteamDB / Community Hub)
- Ссылка строится из slug в URL Steam или из названия игры

**Страницы приложений SteamDB** (`steamdb.info/app/*`):

- Кнопка Backloggd в `nav.app-links` (в том же стиле `.btn`, что Store / IGDB)
- Предпочитает IGDB slug со страницы, когда он доступен

**Настройки** (кнопка **Plus** в навбаре Backloggd / меню менеджера юзерскриптов):

- Панель с вкладками: Общие · Профиль · Страница игры · Карточка игры · Перевод · Кэш · Отладка · О скрипте
- Поиск по настройкам: введите запрос в поле (или нажмите `/` / `Ctrl+K`), чтобы отфильтровать все вкладки сразу — совпадения в подписях и подсказках подсвечиваются, результаты группируются по вкладкам, `Esc` очищает
- Язык интерфейса (авто или фиксированная локаль)
- Профиль: карточки-мини-профили на аватарах и никах (по наведению; либо правый клик / Shift + клик; опциональная предзагрузка во вьюпорте); обложки игр внутри карточки (избранное / недавние) открывают мини-профиль игры; скин уровня по числу игр можно отключить; оформление профиля по блокам (шапка, значок уровня, статистика, навигация, избранное)
- Регион магазина Steam (валюта цен)
- Переключатели для Steam / owned / wishlist / тегов / Metacritic / OpenCritic / HLTB / Deck·Proton / GameStatus / игроков / иконки и логотипа SteamDB / галереи скриншотов / похожих игр / нативного блока статистики игры / ID игры / перевода (описание и обзоры) / бейджей на обложках (по типам) / мини-профилей игр / ссылок / кнопок Backloggd на Steam и SteamDB
- Режим отладки: одна панель с кликабельными ссылками на источники и полным дампом ответов
- Видимость ссылок по сайтам (IGDB, Steam, SteamDB, Metacritic, OpenCritic, HLTB, PCGamingWiki, IsThereAnyDeal, GOG DB, GamesLike)
- Срок жизни кэша + очистка кэша (удаление просроченных записей + мягкий лимит LRU; библиотека и карта тегов живут с короткими TTL; число игроков онлайн всегда актуально)

## Поддерживаемые страницы

| Сайт | Шаблон URL |
|------|------------|
| Backloggd | `https://www.backloggd.com/*` |
| Backloggd (без www) | `https://backloggd.com/*` |
| Steam Store (приложение) | `https://store.steampowered.com/app/*` |
| Steam Community (приложение) | `https://steamcommunity.com/app/*` |
| SteamDB (приложение) | `https://steamdb.info/app/*` |

## Разработка и участие

- [DEVELOPMENT.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/DEVELOPMENT.md) — локальная настройка, структура репозитория, метаданные, разрешения, релизы
- [CONTRIBUTING.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/CONTRIBUTING.md) — правила PR, соглашения, локализация, участники
- [AGENTS.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/AGENTS.md) — заметки по архитектуре для ИИ-агентов
- [SECURITY.md](https://github.com/NemoKing1210/backloggd-plus/blob/main/SECURITY.md) — как приватно сообщить об уязвимости, область действия и как скрипт обращается с вашими данными

```bash
npm install
npm run dev      # Vite serve — установите сгенерированный юзерскрипт с префиксом "dev:"
npm run build    # Production → dist/ + копия в корень репозитория
npm run ci       # Те же проверки, что в GitHub Actions
```

## Связь с Backloggd

Этот проект **не связан** с Backloggd. Это независимый общественный юзерскрипт.

## Лицензия

[MIT](https://github.com/NemoKing1210/backloggd-plus/blob/main/LICENSE) — Copyright (c) 2026 NemoKing
