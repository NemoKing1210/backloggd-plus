// ==UserScript==
// @name              Backloggd Plus
// @name:ru           Backloggd Plus
// @name:zh-CN        Backloggd Plus
// @name:es           Backloggd Plus
// @name:pt-BR        Backloggd Plus
// @name:de           Backloggd Plus
// @name:fr           Backloggd Plus
// @name:ja           Backloggd Plus
// @name:ko           Backloggd Plus
// @name:pl           Backloggd Plus
// @namespace         https://github.com/NemoKing1210/backloggd-plus
// @version           0.6.8
// @description       Extends Backloggd and adds a Backloggd button on Steam game pages
// @description:ru    Расширяет Backloggd и добавляет кнопку Backloggd на страницах игр Steam
// @description:zh-CN 扩展 Backloggd：更多游戏信息、更丰富的界面与使用体验
// @description:es    Amplía Backloggd con más información de juegos, UI enriquecida y mejoras QoL
// @description:pt-BR  Amplia o Backloggd com mais info de jogos, UI enriquecida e melhorias QoL
// @description:de     Erweitert Backloggd um mehr Spielinfos, reichere UI und QoL-Features
// @description:fr     Enrichit Backloggd avec plus d’infos jeux, une UI améliorée et des QoL
// @description:ja     Backloggdを拡張：追加のゲーム情報、UI強化、QoL機能
// @description:ko     Backloggd 확장: 추가 게임 정보, 풍부한 UI, QoL 기능
// @description:pl     Rozszerza Backloggd o więcej informacji, bogatsze UI i usprawnienia QoL
// @author             NemoKing1210
// @tag                backloggd
// @tag                games
// @homepageURL        https://github.com/NemoKing1210/backloggd-plus
// @supportURL         https://github.com/NemoKing1210/backloggd-plus/issues
// @updateURL          https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
// @downloadURL        https://raw.githubusercontent.com/NemoKing1210/backloggd-plus/main/backloggd-plus.user.js
// @license            MIT
// @icon               https://www.backloggd.com/favicon.ico
// @match              https://www.backloggd.com/*
// @match              https://backloggd.com/*
// @match              https://store.steampowered.com/app/*
// @match              https://steamcommunity.com/app/*
// @match              https://steamdb.info/app/*
// @grant              GM_xmlhttpRequest
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addStyle
// @grant              GM_registerMenuCommand
// @connect            store.steampowered.com
// @connect            api.steampowered.com
// @connect            gamestatus.info
// @run-at             document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const REPO_URL = 'https://github.com/NemoKing1210/backloggd-plus';
  /** Keep in sync with `@version` in the userscript header (and `.meta.js`). */
  const SCRIPT_VERSION = '0.6.8';
  const SETTINGS_KEY = 'blp_settings';
  const CACHE_KEY = 'blp_cache_v1';
  const CACHE_VERSION_KEY = 'blp_cache_script_version';
  const STEAM_OVERRIDES_KEY = 'blp_steam_overrides';
  const ROOT_ATTR = 'data-blp-root';
  const ENRICH_ATTR = 'data-blp-enrich';
  const STEAMDB_ATTR = 'data-blp-steamdb';
  const CARD_ATTR = 'data-blp-card';
  const CARD_STATE_ATTR = 'data-blp-card-state';
  const FAVICON_URL = 'https://www.google.com/s2/favicons?domain={domain}&sz=32';
  const SCAN_DEBOUNCE_MS = 400;
  const CARD_CONCURRENCY = 3;
  const CARD_ROOT_MARGIN = '240px 0px';
  const CARD_SKIP_ANCESTOR =
    '#game-profile, #game-body, #logging-sidebar-section, .blp-settings-backdrop, .blp-fix-match-backdrop';
  const CACHE_HOURS_MAX = 168;
  /** Soft advisory budget for the settings meter (GM storage has no fixed quota). */
  const CACHE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;
  const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/';
  const STEAM_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';
  const STEAM_REVIEWS_URL = 'https://store.steampowered.com/appreviews';
  const STEAM_USERDATA_URL = 'https://store.steampowered.com/dynamicstore/userdata/';
  const STEAM_POPULAR_TAGS_URL = 'https://store.steampowered.com/tagdata/populartags/english';
  const STEAM_STORE_ITEMS_URL = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';
  const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/';
  const STEAM_CDN_APPS = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps';
  const STEAM_CDN_STORE_ASSETS = 'https://shared.fastly.steamstatic.com/store_item_assets';
  const STEAM_CDN_COMMUNITY_ICONS = 'https://shared.fastly.steamstatic.com/community_assets/images/apps';
  const STEAMDB_APP_URL = 'https://steamdb.info/app';
  const STEAM_TAGS_MAX = 12;
  const PLAYERS_CACHE_TTL_MS = 10 * 60 * 1000;
  const GAMESTATUS_API_BASE = 'https://gamestatus.info/back/api/gameinfo/game';
  const GAMESTATUS_SITE_BASE = 'https://gamestatus.info';
  const GAMESTATUS_MAX_SLUG_ATTEMPTS = 2;
  const USERDATA_CACHE_KEY = 'steam:userdata';
  const USERDATA_EMPTY_TTL_MS = 5 * 60 * 1000;
  const USERDATA_FALLBACK_TTL_MS = 60 * 60 * 1000;
  const TAG_MAP_CACHE_KEY = 'steam:tagmap:english';
  const TAG_MAP_TTL_MS = 7 * 24 * 3600 * 1000;
  const GS_INVALID_SLUG_RE =
    /^(https?-)?(store-)?steam(powered|static)?(-[a-z0-9]+)*(-com)?$|steampowered|steamstatic|akamaihd|^(on-)?wishlist$|^gamestatus$|^(soon-)?on-game-pass$/;

  const LINK_KEYS = ['igdb', 'steam', 'steamdb', 'metacritic', 'opencritic', 'hltb'];
  const LINK_DOMAINS = {
    igdb: 'igdb.com',
    steam: 'store.steampowered.com',
    steamdb: 'steamdb.info',
    metacritic: 'metacritic.com',
    opencritic: 'opencritic.com',
    hltb: 'howlongtobeat.com',
  };

  const DEFAULT_SETTINGS = {
    cacheHours: 12,
    uiLocale: 'auto',
    steamCountry: 'US',
    showSteam: true,
    showMetacritic: true,
    showGameStatus: true,
    showLinks: true,
    showSteamOwned: true,
    showSteamWishlist: true,
    showSteamTags: true,
    showSteamPageLink: true,
    showSteamDbPageLink: true,
    showSteamDbIcon: true,
    showSteamDbCover: true,
    showSteamPlayers: true,
    showCardBadges: true,
    debugMode: false,
    links: {
      igdb: true,
      steam: true,
      steamdb: true,
      metacritic: true,
      opencritic: true,
      hltb: true,
    },
  };

  const SUPPORTED_LOCALES = ['en', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'ja', 'ko', 'pl'];

  const TRANSLATIONS = {
    en: {
      menuSettings: 'Backloggd Plus — Settings',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · scores · list badges · quick links',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      saveReload: 'Save & Reload page',
      repoLink: 'GitHub',
      repoAbout: 'Source code, updates, and issue reports',
      sectionGame: 'Game page',
      sectionLists: 'Lists & cards',
      sectionGeneral: 'General',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Debug mode',
      debugModeHint:
        'Show one debug panel on the game page with sources (what each URL is for) and a full response dump.',
      debugReason: 'Reason',
      debugResponse: 'Response',
      debugPanelTitle: 'Debug',
      debugSources: 'Sources',
      debugDump: 'Full dump',
      debugSectionPage: 'Page',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / players',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Owned',
      debugSrcRequest: 'request',
      debugSrcBackloggd: 'Current Backloggd game page',
      debugSrcIgdb: 'Game slug / Links row (IGDB)',
      debugSrcMetacritic: 'Links row — Metacritic URL (slug guess)',
      debugSrcSteamStore: 'Steam store page — Links row + Steam row link',
      debugSrcSteamDb: 'Links row — SteamDB app page',
      debugSrcSteamDbCharts: 'SteamDB charts (reference; not scraped)',
      debugSrcSteamDbInfo: 'SteamDB info (reference; not scraped)',
      debugSrcSteamTiny: 'Tiny capsule — icon fallback',
      debugSrcSteamHeader: 'Header image from appdetails',
      debugSrcSteamSearch: 'storesearch — resolve Steam App ID',
      debugSrcSteamDetails: 'appdetails — price, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — review summary for Steam row',
      debugSrcSteamTags: 'GetItems — popular tags for Steam row',
      debugSrcSteamTagMap: 'populartags — tag id → name map',
      debugSrcSteamOwned: 'dynamicstore/userdata — owned library check',
      debugSrcSteamDbPage: 'SteamDB HTML scrape — icon, logo, players',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — players fallback',
      debugSrcIcon: 'Title icon (SteamDB / CDN)',
      debugSrcLogo: 'Cover logo under Change cover',
      debugSrcGameStatusApi: 'GameStatus API — crack / DRM status',
      debugSrcGameStatusPage: 'GameStatus site page for matched slug',
      uiLanguage: 'Interface language',
      uiLanguageHint: 'Auto follows your browser language. Saved choice applies after reload.',
      uiLanguageAuto: 'Auto (browser)',
      steamCountry: 'Steam store region',
      steamCountryHint: 'Affects price currency from the Steam Store API.',
      showSteam: 'Show Steam price & reviews',
      showMetacritic: 'Show Metacritic score',
      showGameStatus: 'Show GameStatus crack status',
      showGameStatusHint: 'Crack / DRM status from GameStatus.info (needs a Steam match).',
      showLinks: 'Show quick links row',
      showSteamOwned: 'Show Steam owned status',
      showSteamOwnedHint:
        'Shows “Owned” when the game is in your Steam library. Requires being logged into Steam in this browser.',
      showSteamWishlist: 'Show Steam wishlist status',
      showSteamWishlistHint:
        'Shows “Wishlist” when the game is on your Steam wishlist (hidden if already owned). Requires Steam login in this browser.',
      showSteamTags: 'Show Steam tags',
      showSteamTagsHint: 'Popular community tags from the Steam store (Open World, RPG, …).',
      showSteamPageLink: 'Show Backloggd button on Steam',
      showSteamPageLinkHint: 'Adds a SteamDB-style button in Other site info on Steam app pages.',
      showSteamDbPageLink: 'Show Backloggd button on SteamDB',
      showSteamDbPageLinkHint: 'Adds a Backloggd button next to Store / IGDB in SteamDB app links.',
      showSteamDbIcon: 'Show SteamDB icon before title',
      showSteamDbIconHint: 'App icon from Steam store assets (community_icon), same CDN as SteamDB.',
      showSteamDbCover: 'Show SteamDB logo under Change cover',
      showSteamDbCoverHint: 'Steam header image under the cover / Change cover control.',
      showSteamPlayers: 'Show online players',
      showSteamPlayersHint: 'Current players from Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Show badges on list covers',
      showCardBadgesHint:
        'Price, Steam review %, Owned / Wishlist, and GameStatus chips on browse, search, journal, and other cover grids (not the game page).',
      steamBackloggdTooltip: 'View on Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Owned',
      steamWishlist: 'Wishlist',
      steamFixMatch: 'Fix match',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Override the automatic Steam store search for this Backloggd page. Paste the numeric App ID from the Steam store URL.',
      steamFixMatchPlaceholder: 'e.g. 1245620',
      steamFixMatchClear: 'Use automatic match',
      steamFixMatchInvalid: 'Enter a valid numeric Steam App ID',
      steamMatchManual: 'manual',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Quick links',
      sectionLinksHint: 'Choose which sites appear in the Links row on game pages.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus settings',
      cacheHours: 'Cache duration (hours)',
      cacheHoursHint: 'How long to reuse Steam / GameStatus lookups. 0 disables cache.',
      clearCache: 'Clear cache',
      cacheCleared: 'Cache cleared ({count})',
      cacheEmpty: 'Cache is empty',
      cacheBarFull: 'Full',
      cacheBarPartial: 'Partial',
      cacheBarFree: 'Free',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Soft storage budget. Full = game-page Steam resolves (with tags); partial = list/card lite or expired entries.',
      cacheBarAria: 'Cache usage: {full} full, {partial} partial, {free} free',
      cacheClearHint: 'Removes stored Steam / GameStatus lookups from this browser profile.',
      on: 'ON',
      off: 'OFF',
      loading: 'Loading…',
      notOnSteam: 'Not found on Steam',
      loadError: 'Could not load Steam data',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Ready',
      gsNotCracked: 'Pending',
      gsBypass: 'Protection bypass',
      gsReleaseToday: 'Release today',
      gsUnknown: 'Unknown',
      gsNotInDatabase: 'Not in database',
      reviews: 'Reviews',
      price: 'Price',
      free: 'Free',
      discount: '-{n}%',
      steamUsFallback: 'Found via US store ({cc} search returned nothing)',
      recommendations: '{n} recommendations',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Players',
      playersOnline: '{n} playing',
    },
    ru: {
      menuSettings: 'Backloggd Plus — Настройки',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · оценки · бейджи в списках · быстрые ссылки',
      close: 'Закрыть',
      cancel: 'Отмена',
      save: 'Сохранить',
      saveReload: 'Сохранить и перезагрузить',
      repoLink: 'GitHub',
      repoAbout: 'Исходники, обновления и баг-репорты',
      sectionGame: 'Страница игры',
      sectionLists: 'Списки и карточки',
      sectionGeneral: 'Общие',
      sectionCache: 'Кэш',
      sectionDebug: 'Отладка',
      debugMode: 'Режим отладки',
      debugModeHint:
        'Одна панель отладки на странице игры: источники (за что отвечает каждая ссылка) и полный дамп ответов.',
      debugReason: 'Причина',
      debugResponse: 'Ответ',
      debugPanelTitle: 'Отладка',
      debugSources: 'Источники',
      debugDump: 'Полный дамп',
      debugSectionPage: 'Страница',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / игроки',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Куплено',
      debugSrcRequest: 'запрос',
      debugSrcBackloggd: 'Текущая страница игры на Backloggd',
      debugSrcIgdb: 'Слаг игры / ряд Links (IGDB)',
      debugSrcMetacritic: 'Ряд Links — URL Metacritic (по слагу)',
      debugSrcSteamStore: 'Страница в Steam — Links + ссылка в ряду Steam',
      debugSrcSteamDb: 'Ряд Links — страница приложения SteamDB',
      debugSrcSteamDbCharts: 'SteamDB charts (справочно; не скрапится)',
      debugSrcSteamDbInfo: 'SteamDB info (справочно; не скрапится)',
      debugSrcSteamTiny: 'Маленькая капсула — запасной icon',
      debugSrcSteamHeader: 'Header-картинка из appdetails',
      debugSrcSteamSearch: 'storesearch — поиск Steam App ID',
      debugSrcSteamDetails: 'appdetails — цена, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — сводка отзывов для ряда Steam',
      debugSrcSteamTags: 'GetItems — популярные теги для ряда Steam',
      debugSrcSteamTagMap: 'populartags — карта id тега → имя',
      debugSrcSteamOwned: 'dynamicstore/userdata — проверка библиотеки',
      debugSrcSteamDbPage: 'HTML SteamDB — icon, logo, игроки',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — запасной онлайн',
      debugSrcIcon: 'Иконка у заголовка (SteamDB / CDN)',
      debugSrcLogo: 'Логотип обложки под Change cover',
      debugSrcGameStatusApi: 'API GameStatus — статус взлома / DRM',
      debugSrcGameStatusPage: 'Страница GameStatus для найденного слага',
      uiLanguage: 'Язык интерфейса',
      uiLanguageHint: 'Авто — язык браузера. Выбор применится после перезагрузки.',
      uiLanguageAuto: 'Авто (браузер)',
      steamCountry: 'Регион Steam Store',
      steamCountryHint: 'Влияет на валюту цены из Steam Store API.',
      showSteam: 'Показывать цену и отзывы Steam',
      showMetacritic: 'Показывать оценку Metacritic',
      showGameStatus: 'Показывать статус GameStatus',
      showGameStatusHint: 'Статус взлома / DRM с GameStatus.info (нужно совпадение со Steam).',
      showLinks: 'Показывать ряд ссылок',
      showSteamOwned: 'Показывать «Куплено» в Steam',
      showSteamOwnedHint:
        'Показывает «Куплено», если игра в вашей библиотеке Steam. Нужен вход в Steam в этом браузере.',
      showSteamWishlist: 'Показывать «В вишлисте» Steam',
      showSteamWishlistHint:
        'Показывает «В вишлисте», если игра в списке желаний Steam (скрывается, если уже куплена). Нужен вход в Steam.',
      showSteamTags: 'Показывать теги Steam',
      showSteamTagsHint: 'Популярные пользовательские теги из Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Кнопка Backloggd на Steam',
      showSteamPageLinkHint: 'Кнопка в стиле SteamDB в блоке Other site info на страницах игр Steam.',
      showSteamDbPageLink: 'Кнопка Backloggd на SteamDB',
      showSteamDbPageLinkHint: 'Кнопка рядом со Store / IGDB в блоке app-links на SteamDB.',
      showSteamDbIcon: 'Иконка SteamDB перед названием',
      showSteamDbIconHint: 'Иконка из Steam store assets (community_icon), тот же CDN, что у SteamDB.',
      showSteamDbCover: 'Логотип SteamDB под Change cover',
      showSteamDbCoverHint: 'Steam header под обложкой / кнопкой Change cover.',
      showSteamPlayers: 'Показывать онлайн игроков',
      showSteamPlayersHint: 'Текущие игроки через Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Бейджи на обложках в списках',
      showCardBadgesHint:
        'Цена, рейтинг Steam %, Куплено / Вишлист и GameStatus на browse, поиске, journal и других сетках обложек (не на странице игры).',
      steamBackloggdTooltip: 'Открыть на Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Куплено',
      steamWishlist: 'В вишлисте',
      steamFixMatch: 'Исправить матч',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Переопределить автоматический поиск в Steam Store для этой страницы Backloggd. Вставьте числовой App ID из URL магазина Steam.',
      steamFixMatchPlaceholder: 'например 1245620',
      steamFixMatchClear: 'Автоматический матч',
      steamFixMatchInvalid: 'Введите корректный числовой Steam App ID',
      steamMatchManual: 'вручную',
      steamMatchAuto: 'авто',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Быстрые ссылки',
      sectionLinksHint: 'Какие сайты показывать в ряду Links на странице игры.',
      navSettings: 'Plus',
      navSettingsTitle: 'Настройки Backloggd Plus',
      cacheHours: 'Время кэша (часы)',
      cacheHoursHint: 'Как долго переиспользовать ответы Steam / GameStatus. 0 отключает кэш.',
      clearCache: 'Очистить кэш',
      cacheCleared: 'Кэш очищен ({count})',
      cacheEmpty: 'Кэш пуст',
      cacheBarFull: 'Полный',
      cacheBarPartial: 'Частичный',
      cacheBarFree: 'Свободно',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Мягкий лимит хранилища. Полный — резолвы со страницы игры (с тегами); частичный — lite с карточек или просроченные.',
      cacheBarAria: 'Использование кэша: {full} полный, {partial} частичный, {free} свободно',
      cacheClearHint: 'Удаляет сохранённые запросы Steam / GameStatus из этого профиля браузера.',
      on: 'ВКЛ',
      off: 'ВЫКЛ',
      loading: 'Загрузка…',
      notOnSteam: 'Не найдено в Steam',
      loadError: 'Не удалось загрузить данные Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Готово',
      gsNotCracked: 'Ожидание',
      gsBypass: 'Обход защиты',
      gsReleaseToday: 'Релиз сегодня',
      gsUnknown: 'Неизвестно',
      gsNotInDatabase: 'Нет в базе',
      reviews: 'Отзывы',
      price: 'Цена',
      free: 'Бесплатно',
      discount: '-{n}%',
      steamUsFallback: 'Найдено через магазин US (в {cc} ничего не нашлось)',
      recommendations: '{n} рекомендаций',
      links: 'Ссылки',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Игроки',
      playersOnline: '{n} в игре',

    },
    zh: {
      menuSettings: 'Backloggd Plus — 设置',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · 评分 · 列表徽章 · 快捷链接',
      close: '关闭',
      cancel: '取消',
      save: '保存',
      saveReload: '保存并刷新页面',
      repoLink: 'GitHub',
      repoAbout: '源码、更新与问题反馈',
      sectionGame: '游戏页',
      sectionLists: '列表与卡片',
      sectionGeneral: '通用',
      sectionCache: '缓存',
      sectionDebug: '调试',
      debugMode: '调试模式',
      debugModeHint:
        '在游戏页显示单个调试面板，含来源用途说明和完整响应转储。',
      debugReason: '原因',
      debugResponse: '响应',
      debugPanelTitle: '调试',
      debugSources: '来源',
      debugDump: '完整转储',
      debugSectionPage: '页面',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / 玩家',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: '已拥有',
      debugSrcRequest: '请求',
      debugSrcBackloggd: '当前 Backloggd 游戏页',
      debugSrcIgdb: '游戏 slug / Links 行（IGDB）',
      debugSrcMetacritic: 'Links 行 — Metacritic URL（按 slug 猜测）',
      debugSrcSteamStore: 'Steam 商店页 — Links + Steam 行链接',
      debugSrcSteamDb: 'Links 行 — SteamDB 应用页',
      debugSrcSteamDbCharts: 'SteamDB charts（参考；不抓取）',
      debugSrcSteamDbInfo: 'SteamDB info（参考；不抓取）',
      debugSrcSteamTiny: '小胶囊图 — 图标回退',
      debugSrcSteamHeader: '来自 appdetails 的 header 图',
      debugSrcSteamSearch: 'storesearch — 解析 Steam App ID',
      debugSrcSteamDetails: 'appdetails — 价格、免费、Metacritic、header',
      debugSrcSteamReviews: 'appreviews — Steam 行评价摘要',
      debugSrcSteamTags: 'GetItems — Steam 行热门标签',
      debugSrcSteamTagMap: 'populartags — 标签 id → 名称',
      debugSrcSteamOwned: 'dynamicstore/userdata — 库拥有检查',
      debugSrcSteamDbPage: 'SteamDB HTML — icon、logo、玩家数',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — 玩家数回退',
      debugSrcIcon: '标题图标（SteamDB / CDN）',
      debugSrcLogo: 'Change cover 下的封面 logo',
      debugSrcGameStatusApi: 'GameStatus API — 破解 / DRM 状态',
      debugSrcGameStatusPage: '匹配 slug 的 GameStatus 页面',
      uiLanguage: '界面语言',
      uiLanguageHint: '自动跟随浏览器语言。保存后刷新生效。',
      uiLanguageAuto: '自动（浏览器）',
      steamCountry: 'Steam 商店地区',
      steamCountryHint: '影响 Steam Store API 返回的货币。',
      showSteam: '显示 Steam 价格与评价',
      showMetacritic: '显示 Metacritic 分数',
      showGameStatus: '显示 GameStatus 破解状态',
      showGameStatusHint: '来自 GameStatus.info 的破解/DRM 状态（需要匹配到 Steam）。',
      showLinks: '显示快捷链接行',
      showSteamOwned: '显示 Steam 已拥有状态',
      showSteamOwnedHint: '若游戏在您的 Steam 库中则显示“已拥有”。需要在此浏览器登录 Steam。',
      showSteamWishlist: '显示 Steam 愿望单状态',
      showSteamWishlistHint: '若游戏在您的 Steam 愿望单中则显示“愿望单”（已拥有时隐藏）。需要在此浏览器登录 Steam。',
      showSteamTags: '显示 Steam 标签',
      showSteamTagsHint: '来自 Steam 商店的热门社区标签（Open World、RPG 等）。',
      showSteamPageLink: '在 Steam 显示 Backloggd 按钮',
      showSteamPageLinkHint: '在 Steam 游戏页 Other site info 中添加类似 SteamDB 的按钮。',
      showSteamDbPageLink: '在 SteamDB 显示 Backloggd 按钮',
      showSteamDbPageLinkHint: '在 SteamDB app-links 中、Store / IGDB 旁添加 Backloggd 按钮。',
      showSteamDbIcon: '在标题前显示 SteamDB 图标',
      showSteamDbIconHint: '来自 SteamDB 页面标题的应用图标，失败时回退到 Steam 胶囊图。',
      showSteamDbCover: '在 Change cover 下显示 SteamDB Logo',
      showSteamDbCoverHint: '在封面 / Change cover 下方显示 SteamDB 封面图。',
      showSteamPlayers: '显示在线玩家数',
      showSteamPlayersHint: '当前玩家来自 Steam GetNumberOfCurrentPlayers。',
      showCardBadges: '在列表封面显示徽章',
      showCardBadgesHint: '在浏览、搜索、日志等封面网格上显示价格、Steam 好%、已拥有/愿望单与 GameStatus（游戏页除外）。',
      steamBackloggdTooltip: '在 Backloggd 查看',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '已拥有',
      steamWishlist: '愿望单',
      steamFixMatch: '修正匹配',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint: '覆盖此 Backloggd 页面的自动 Steam 商店搜索。粘贴 Steam 商店 URL 中的数字 App ID。',
      steamFixMatchPlaceholder: '例如 1245620',
      steamFixMatchClear: '使用自动匹配',
      steamFixMatchInvalid: '请输入有效的数字 Steam App ID',
      steamMatchManual: '手动',
      steamMatchAuto: '自动',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: '快捷链接',
      sectionLinksHint: '选择游戏页 Links 行中显示的站点。',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 设置',
      cacheHours: '缓存时长（小时）',
      cacheHoursHint: '复用 Steam / GameStatus 查询的时间。0 禁用缓存。',
      clearCache: '清除缓存',
      cacheCleared: '已清除缓存（{count}）',
      cacheEmpty: '缓存为空',
      cacheBarFull: '完整',
      cacheBarPartial: '部分',
      cacheBarFree: '可用',
      cacheBarLegend: '{label}：{count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint: '软性存储上限。完整 = 可用查询；部分 = 不完整或已过期但仍占用空间的条目。',
      cacheBarAria: '缓存用量：完整 {full}，部分 {partial}，可用 {free}',
      cacheClearHint: '删除此浏览器配置中的 Steam / GameStatus 查询缓存。',
      on: '开',
      off: '关',
      loading: '加载中…',
      notOnSteam: '在 Steam 未找到',
      loadError: '无法加载 Steam 数据',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: '已破解',
      gsNotCracked: '未破解',
      gsBypass: '保护绕过',
      gsReleaseToday: '今日发售',
      gsUnknown: '未知',
      gsNotInDatabase: '不在数据库',
      reviews: '评价',
      price: '价格',
      free: '免费',
      discount: '-{n}%',
      steamUsFallback: '通过 US 商店找到（{cc} 搜索无结果）',
      recommendations: '{n} 条推荐',
      links: '链接',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: '玩家',
      playersOnline: '{n} 在玩',

    },
    es: {
      menuSettings: 'Backloggd Plus — Ajustes',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notas · insignias en listas · enlaces rápidos',
      close: 'Cerrar',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveReload: 'Guardar y recargar',
      repoLink: 'GitHub',
      repoAbout: 'Código, actualizaciones e informes',
      sectionGame: 'Página del juego',
      sectionLists: 'Listas y tarjetas',
      sectionGeneral: 'General',
      sectionCache: 'Caché',
      sectionDebug: 'Depuración',
      debugMode: 'Modo depuración',
      debugModeHint:
        'Una sola panel de depuración en la página del juego con fuentes (para qué sirve cada URL) y volcado completo.',
      debugReason: 'Motivo',
      debugResponse: 'Respuesta',
      debugPanelTitle: 'Depuración',
      debugSources: 'Fuentes',
      debugDump: 'Volcado completo',
      debugSectionPage: 'Página',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / jugadores',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'En biblioteca',
      debugSrcRequest: 'petición',
      debugSrcBackloggd: 'Página actual del juego en Backloggd',
      debugSrcIgdb: 'Slug del juego / fila Links (IGDB)',
      debugSrcMetacritic: 'Fila Links — URL Metacritic (por slug)',
      debugSrcSteamStore: 'Página Steam — Links + enlace en la fila Steam',
      debugSrcSteamDb: 'Fila Links — página de app SteamDB',
      debugSrcSteamDbCharts: 'SteamDB charts (referencia; no se scrapea)',
      debugSrcSteamDbInfo: 'SteamDB info (referencia; no se scrapea)',
      debugSrcSteamTiny: 'Cápsula pequeña — fallback de icono',
      debugSrcSteamHeader: 'Imagen header de appdetails',
      debugSrcSteamSearch: 'storesearch — resolver Steam App ID',
      debugSrcSteamDetails: 'appdetails — precio, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — resumen de reseñas para Steam',
      debugSrcSteamTags: 'GetItems — etiquetas populares para Steam',
      debugSrcSteamTagMap: 'populartags — mapa id → nombre',
      debugSrcSteamOwned: 'dynamicstore/userdata — comprobar biblioteca',
      debugSrcSteamDbPage: 'HTML SteamDB — icono, logo, jugadores',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — fallback de jugadores',
      debugSrcIcon: 'Icono del título (SteamDB / CDN)',
      debugSrcLogo: 'Logo de portada bajo Change cover',
      debugSrcGameStatusApi: 'API GameStatus — estado crack / DRM',
      debugSrcGameStatusPage: 'Página GameStatus del slug encontrado',
      uiLanguage: 'Idioma de la interfaz',
      uiLanguageHint: 'Auto sigue el idioma del navegador. Se aplica al recargar.',
      uiLanguageAuto: 'Auto (navegador)',
      steamCountry: 'Región de Steam Store',
      steamCountryHint: 'Afecta la moneda del precio de la API de Steam.',
      showSteam: 'Mostrar precio y reseñas de Steam',
      showMetacritic: 'Mostrar puntuación de Metacritic',
      showGameStatus: 'Mostrar estado GameStatus',
      showGameStatusHint: 'Estado de crack / DRM de GameStatus.info (requiere coincidencia con Steam).',
      showLinks: 'Mostrar fila de enlaces',
      showSteamOwned: 'Mostrar si está en tu biblioteca Steam',
      showSteamOwnedHint:
        'Muestra “En propiedad” si el juego está en tu biblioteca de Steam. Requiere estar conectado a Steam en este navegador.',
      showSteamWishlist: 'Mostrar estado de wishlist de Steam',
      showSteamWishlistHint:
        'Muestra “Wishlist” si el juego está en tu lista de deseos de Steam (oculto si ya lo tienes). Requiere sesión de Steam.',
      showSteamTags: 'Mostrar etiquetas de Steam',
      showSteamTagsHint: 'Etiquetas populares de la tienda Steam (Open World, RPG, …).',
      showSteamPageLink: 'Botón Backloggd en Steam',
      showSteamPageLinkHint: 'Añade un botón estilo SteamDB en Other site info en páginas de Steam.',
      showSteamDbPageLink: 'Botón Backloggd en SteamDB',
      showSteamDbPageLinkHint: 'Añade un botón junto a Store / IGDB en app-links de SteamDB.',
      showSteamDbIcon: 'Icono SteamDB antes del título',
      showSteamDbIconHint: 'Icono de la app desde la cabecera de SteamDB; reserva: cápsula de Steam.',
      showSteamDbCover: 'Logo SteamDB bajo Change cover',
      showSteamDbCoverHint: 'Portada de SteamDB debajo de la portada / Change cover.',
      showSteamPlayers: 'Mostrar jugadores en línea',
      showSteamPlayersHint: 'Jugadores actuales desde Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Mostrar insignias en portadas de listas',
      showCardBadgesHint:
        'Precio, % de reseñas Steam, En propiedad / Wishlist y GameStatus en browse, búsqueda, journal y otras rejillas (no en la página del juego).',
      steamBackloggdTooltip: 'Ver en Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'En propiedad',
      steamWishlist: 'Wishlist',
      steamFixMatch: 'Corregir coincidencia',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Anula la búsqueda automática en Steam Store para esta página de Backloggd. Pega el App ID numérico de la URL de Steam.',
      steamFixMatchPlaceholder: 'p. ej. 1245620',
      steamFixMatchClear: 'Usar coincidencia automática',
      steamFixMatchInvalid: 'Introduce un Steam App ID numérico válido',
      steamMatchManual: 'manual',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Enlaces rápidos',
      sectionLinksHint: 'Elige qué sitios aparecen en la fila Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Ajustes de Backloggd Plus',
      cacheHours: 'Duración de caché (horas)',
      cacheHoursHint: 'Cuánto reutilizar búsquedas de Steam / GameStatus. 0 desactiva la caché.',
      clearCache: 'Vaciar caché',
      cacheCleared: 'Caché vaciada ({count})',
      cacheEmpty: 'La caché está vacía',
      cacheBarFull: 'Completo',
      cacheBarPartial: 'Parcial',
      cacheBarFree: 'Libre',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Límite blando de almacenamiento. Completo = consultas útiles; parcial = incompletas o caducadas que aún ocupan espacio.',
      cacheBarAria: 'Uso de caché: {full} completo, {partial} parcial, {free} libre',
      cacheClearHint: 'Elimina las búsquedas de Steam / GameStatus de este perfil.',
      on: 'ON',
      off: 'OFF',
      loading: 'Cargando…',
      notOnSteam: 'No encontrado en Steam',
      loadError: 'No se pudieron cargar datos de Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Listo',
      gsNotCracked: 'Pendiente',
      gsBypass: 'Bypass de protección',
      gsReleaseToday: 'Lanzamiento hoy',
      gsUnknown: 'Desconocido',
      gsNotInDatabase: 'No está en la base',
      reviews: 'Reseñas',
      price: 'Precio',
      free: 'Gratis',
      discount: '-{n}%',
      steamUsFallback: 'Encontrado en tienda US (la búsqueda en {cc} no dio resultados)',
      recommendations: '{n} recomendaciones',
      links: 'Enlaces',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Jugadores',
      playersOnline: '{n} jugando',

    },
    pt: {
      menuSettings: 'Backloggd Plus — Configurações',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notas · badges em listas · links rápidos',
      close: 'Fechar',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveReload: 'Salvar e recarregar',
      repoLink: 'GitHub',
      repoAbout: 'Código, atualizações e relatórios',
      sectionGame: 'Página do jogo',
      sectionLists: 'Listas e cartões',
      sectionGeneral: 'Geral',
      sectionCache: 'Cache',
      sectionDebug: 'Depuração',
      debugMode: 'Modo debug',
      debugModeHint:
        'Um único painel de debug na página do jogo com fontes (para que serve cada URL) e dump completo.',
      debugReason: 'Motivo',
      debugResponse: 'Resposta',
      debugPanelTitle: 'Debug',
      debugSources: 'Fontes',
      debugDump: 'Dump completo',
      debugSectionPage: 'Página',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / jogadores',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Na biblioteca',
      debugSrcRequest: 'requisição',
      debugSrcBackloggd: 'Página atual do jogo no Backloggd',
      debugSrcIgdb: 'Slug do jogo / linha Links (IGDB)',
      debugSrcMetacritic: 'Linha Links — URL Metacritic (por slug)',
      debugSrcSteamStore: 'Página Steam — Links + link na linha Steam',
      debugSrcSteamDb: 'Linha Links — página do app SteamDB',
      debugSrcSteamDbCharts: 'SteamDB charts (referência; não é scrape)',
      debugSrcSteamDbInfo: 'SteamDB info (referência; não é scrape)',
      debugSrcSteamTiny: 'Cápsula pequena — fallback de ícone',
      debugSrcSteamHeader: 'Imagem header do appdetails',
      debugSrcSteamSearch: 'storesearch — resolver Steam App ID',
      debugSrcSteamDetails: 'appdetails — preço, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — resumo de reviews para Steam',
      debugSrcSteamTags: 'GetItems — tags populares para Steam',
      debugSrcSteamTagMap: 'populartags — mapa id → nome',
      debugSrcSteamOwned: 'dynamicstore/userdata — checagem da biblioteca',
      debugSrcSteamDbPage: 'HTML SteamDB — ícone, logo, jogadores',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — fallback de jogadores',
      debugSrcIcon: 'Ícone do título (SteamDB / CDN)',
      debugSrcLogo: 'Logo da capa sob Change cover',
      debugSrcGameStatusApi: 'API GameStatus — status crack / DRM',
      debugSrcGameStatusPage: 'Página GameStatus do slug encontrado',
      uiLanguage: 'Idioma da interface',
      uiLanguageHint: 'Auto segue o idioma do navegador. Aplica ao recarregar.',
      uiLanguageAuto: 'Auto (navegador)',
      steamCountry: 'Região da Steam Store',
      steamCountryHint: 'Afeta a moeda do preço da API da Steam.',
      showSteam: 'Mostrar preço e avaliações Steam',
      showMetacritic: 'Mostrar nota Metacritic',
      showGameStatus: 'Mostrar status GameStatus',
      showGameStatusHint: 'Status de crack / DRM do GameStatus.info (precisa bater com a Steam).',
      showLinks: 'Mostrar linha de links',
      showSteamOwned: 'Mostrar se está na biblioteca Steam',
      showSteamOwnedHint:
        'Mostra “Possui” se o jogo estiver na sua biblioteca Steam. É preciso estar logado na Steam neste navegador.',
      showSteamWishlist: 'Mostrar status da wishlist Steam',
      showSteamWishlistHint:
        'Mostra “Wishlist” se o jogo estiver na lista de desejos Steam (oculto se já possuir). Requer login Steam.',
      showSteamTags: 'Mostrar tags da Steam',
      showSteamTagsHint: 'Tags populares da Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Botão Backloggd no Steam',
      showSteamPageLinkHint: 'Adiciona um botão estilo SteamDB em Other site info nas páginas da Steam.',
      showSteamDbPageLink: 'Botão Backloggd no SteamDB',
      showSteamDbPageLinkHint: 'Adiciona um botão ao lado de Store / IGDB em app-links do SteamDB.',
      showSteamDbIcon: 'Ícone SteamDB antes do título',
      showSteamDbIconHint: 'Ícone do app no cabeçalho do SteamDB; fallback: cápsula da Steam.',
      showSteamDbCover: 'Logo SteamDB sob Change cover',
      showSteamDbCoverHint: 'Capa do SteamDB abaixo da capa / Change cover.',
      showSteamPlayers: 'Mostrar jogadores online',
      showSteamPlayersHint: 'Jogadores atuais via Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Mostrar badges nas capas das listas',
      showCardBadgesHint:
        'Preço, % de avaliações Steam, Possui / Wishlist e GameStatus em browse, busca, journal e outras grades (não na página do jogo).',
      steamBackloggdTooltip: 'Ver no Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Possui',
      steamWishlist: 'Wishlist',
      steamFixMatch: 'Corrigir correspondência',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Substitui a busca automática na Steam Store nesta página do Backloggd. Cole o App ID numérico da URL da Steam.',
      steamFixMatchPlaceholder: 'ex. 1245620',
      steamFixMatchClear: 'Usar correspondência automática',
      steamFixMatchInvalid: 'Digite um Steam App ID numérico válido',
      steamMatchManual: 'manual',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Links rápidos',
      sectionLinksHint: 'Escolha quais sites aparecem na linha Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Configurações do Backloggd Plus',
      cacheHours: 'Duração do cache (horas)',
      cacheHoursHint: 'Por quanto tempo reutilizar buscas Steam / GameStatus. 0 desativa o cache.',
      clearCache: 'Limpar cache',
      cacheCleared: 'Cache limpo ({count})',
      cacheEmpty: 'Cache vazio',
      cacheBarFull: 'Completo',
      cacheBarPartial: 'Parcial',
      cacheBarFree: 'Livre',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Limite suave de armazenamento. Completo = consultas úteis; parcial = incompletas ou expiradas ainda armazenadas.',
      cacheBarAria: 'Uso do cache: {full} completo, {partial} parcial, {free} livre',
      cacheClearHint: 'Remove buscas Steam / GameStatus deste perfil do navegador.',
      on: 'ON',
      off: 'OFF',
      loading: 'Carregando…',
      notOnSteam: 'Não encontrado na Steam',
      loadError: 'Falha ao carregar dados da Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Pronto',
      gsNotCracked: 'Pendente',
      gsBypass: 'Bypass de proteção',
      gsReleaseToday: 'Lançamento hoje',
      gsUnknown: 'Desconhecido',
      gsNotInDatabase: 'Não está na base',
      reviews: 'Avaliações',
      price: 'Preço',
      free: 'Grátis',
      discount: '-{n}%',
      steamUsFallback: 'Encontrado na loja US (busca em {cc} sem resultados)',
      recommendations: '{n} recomendações',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Jogadores',
      playersOnline: '{n} jogando',

    },
    de: {
      menuSettings: 'Backloggd Plus — Einstellungen',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · Wertungen · Listen-Badges · Schnelllinks',
      close: 'Schließen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      saveReload: 'Speichern & neu laden',
      repoLink: 'GitHub',
      repoAbout: 'Quellcode, Updates und Issue-Reports',
      sectionGame: 'Spieleseite',
      sectionLists: 'Listen & Karten',
      sectionGeneral: 'Allgemein',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Debug-Modus',
      debugModeHint:
        'Ein Debug-Panel auf der Spieleseite mit Quellen (wofür jede URL dient) und vollständigem Dump.',
      debugReason: 'Grund',
      debugResponse: 'Antwort',
      debugPanelTitle: 'Debug',
      debugSources: 'Quellen',
      debugDump: 'Vollständiger Dump',
      debugSectionPage: 'Seite',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / Spieler',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Im Besitz',
      debugSrcRequest: 'Anfrage',
      debugSrcBackloggd: 'Aktuelle Backloggd-Spieleseite',
      debugSrcIgdb: 'Spiel-Slug / Links-Zeile (IGDB)',
      debugSrcMetacritic: 'Links-Zeile — Metacritic-URL (Slug-Schätzung)',
      debugSrcSteamStore: 'Steam-Store-Seite — Links + Steam-Zeilenlink',
      debugSrcSteamDb: 'Links-Zeile — SteamDB-App-Seite',
      debugSrcSteamDbCharts: 'SteamDB charts (Referenz; kein Scraping)',
      debugSrcSteamDbInfo: 'SteamDB info (Referenz; kein Scraping)',
      debugSrcSteamTiny: 'Kleine Capsule — Icon-Fallback',
      debugSrcSteamHeader: 'Header-Bild aus appdetails',
      debugSrcSteamSearch: 'storesearch — Steam App ID auflösen',
      debugSrcSteamDetails: 'appdetails — Preis, free, Metacritic, Header',
      debugSrcSteamReviews: 'appreviews — Review-Zusammenfassung für Steam',
      debugSrcSteamTags: 'GetItems — beliebte Tags für Steam',
      debugSrcSteamTagMap: 'populartags — Tag-id → Name',
      debugSrcSteamOwned: 'dynamicstore/userdata — Bibliotheksprüfung',
      debugSrcSteamDbPage: 'SteamDB-HTML — Icon, Logo, Spieler',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — Spieler-Fallback',
      debugSrcIcon: 'Titel-Icon (SteamDB / CDN)',
      debugSrcLogo: 'Cover-Logo unter Change cover',
      debugSrcGameStatusApi: 'GameStatus-API — Crack-/DRM-Status',
      debugSrcGameStatusPage: 'GameStatus-Seite für gefundenen Slug',
      uiLanguage: 'Oberflächensprache',
      uiLanguageHint: 'Auto folgt der Browsersprache. Gilt nach dem Neuladen.',
      uiLanguageAuto: 'Auto (Browser)',
      steamCountry: 'Steam-Store-Region',
      steamCountryHint: 'Beeinflusst die Währung der Steam-Store-API.',
      showSteam: 'Steam-Preis & Bewertungen anzeigen',
      showMetacritic: 'Metacritic-Wertung anzeigen',
      showGameStatus: 'GameStatus-Status anzeigen',
      showGameStatusHint: 'Crack-/DRM-Status von GameStatus.info (Steam-Treffer erforderlich).',
      showLinks: 'Link-Zeile anzeigen',
      showSteamOwned: 'Steam-Besitz anzeigen',
      showSteamOwnedHint:
        'Zeigt „Im Besitz“, wenn das Spiel in Ihrer Steam-Bibliothek ist. Erfordert eine Steam-Anmeldung in diesem Browser.',
      showSteamWishlist: 'Steam-Wunschliste anzeigen',
      showSteamWishlistHint:
        'Zeigt „Wunschliste“, wenn das Spiel auf Ihrer Steam-Wunschliste steht (ausgeblendet bei Besitz). Steam-Login nötig.',
      showSteamTags: 'Steam-Tags anzeigen',
      showSteamTagsHint: 'Beliebte Community-Tags aus dem Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Backloggd-Button auf Steam',
      showSteamPageLinkHint: 'SteamDB-ähnlicher Button in Other site info auf Steam-Spieleseiten.',
      showSteamDbPageLink: 'Backloggd-Button auf SteamDB',
      showSteamDbPageLinkHint: 'Button neben Store / IGDB in den SteamDB app-links.',
      showSteamDbIcon: 'SteamDB-Icon vor dem Titel',
      showSteamDbIconHint: 'App-Icon aus dem SteamDB-Seitenkopf, Fallback: Steam-Kapsel.',
      showSteamDbCover: 'SteamDB-Logo unter Change cover',
      showSteamDbCoverHint: 'Cover-Bild von SteamDB unter Cover / Change cover.',
      showSteamPlayers: 'Online-Spieler anzeigen',
      showSteamPlayersHint: 'Aktuelle Spieler über Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Badges auf Listen-Covers anzeigen',
      showCardBadgesHint:
        'Preis, Steam-Bewertung %, Besitz / Wunschliste und GameStatus auf Browse, Suche, Journal und anderen Grids (nicht auf der Spieleseite).',
      steamBackloggdTooltip: 'Auf Backloggd ansehen',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Im Besitz',
      steamWishlist: 'Wunschliste',
      steamFixMatch: 'Treffer korrigieren',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Überschreibt die automatische Steam-Store-Suche für diese Backloggd-Seite. Numerische App-ID aus der Steam-URL einfügen.',
      steamFixMatchPlaceholder: 'z. B. 1245620',
      steamFixMatchClear: 'Automatischen Treffer verwenden',
      steamFixMatchInvalid: 'Gültige numerische Steam App ID eingeben',
      steamMatchManual: 'manuell',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Schnelllinks',
      sectionLinksHint: 'Welche Seiten in der Links-Zeile erscheinen.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus Einstellungen',
      cacheHours: 'Cache-Dauer (Stunden)',
      cacheHoursHint: 'Wie lange Steam-/GameStatus-Abfragen wiederverwendet werden. 0 deaktiviert den Cache.',
      clearCache: 'Cache leeren',
      cacheCleared: 'Cache geleert ({count})',
      cacheEmpty: 'Cache ist leer',
      cacheBarFull: 'Voll',
      cacheBarPartial: 'Teilweise',
      cacheBarFree: 'Frei',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Weiches Speicherbudget. Voll = nutzbare Einträge; teilweise = unvollständig oder abgelaufen, aber noch gespeichert.',
      cacheBarAria: 'Cache-Nutzung: {full} voll, {partial} teilweise, {free} frei',
      cacheClearHint: 'Entfernt gespeicherte Steam-/GameStatus-Abfragen aus diesem Profil.',
      on: 'AN',
      off: 'AUS',
      loading: 'Lädt…',
      notOnSteam: 'Nicht auf Steam gefunden',
      loadError: 'Steam-Daten konnten nicht geladen werden',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Bereit',
      gsNotCracked: 'Ausstehend',
      gsBypass: 'Schutz-Bypass',
      gsReleaseToday: 'Release heute',
      gsUnknown: 'Unbekannt',
      gsNotInDatabase: 'Nicht in der Datenbank',
      reviews: 'Bewertungen',
      price: 'Preis',
      free: 'Kostenlos',
      discount: '-{n}%',
      steamUsFallback: 'Über US-Store gefunden (Suche in {cc} ohne Treffer)',
      recommendations: '{n} Empfehlungen',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Spieler',
      playersOnline: '{n} spielen',

    },
    fr: {
      menuSettings: 'Backloggd Plus — Réglages',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notes · badges listes · liens rapides',
      close: 'Fermer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saveReload: 'Enregistrer et recharger',
      repoLink: 'GitHub',
      repoAbout: 'Code source, mises à jour et signalements',
      sectionGame: 'Page jeu',
      sectionLists: 'Listes et cartes',
      sectionGeneral: 'Général',
      sectionCache: 'Cache',
      sectionDebug: 'Débogage',
      debugMode: 'Mode debug',
      debugModeHint:
        'Un seul panneau debug sur la page jeu avec sources (rôle de chaque URL) et dump complet.',
      debugReason: 'Raison',
      debugResponse: 'Réponse',
      debugPanelTitle: 'Debug',
      debugSources: 'Sources',
      debugDump: 'Dump complet',
      debugSectionPage: 'Page',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / joueurs',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Possédé',
      debugSrcRequest: 'requête',
      debugSrcBackloggd: 'Page jeu Backloggd actuelle',
      debugSrcIgdb: 'Slug du jeu / rangée Links (IGDB)',
      debugSrcMetacritic: 'Rangée Links — URL Metacritic (slug)',
      debugSrcSteamStore: 'Page Steam — Links + lien rangée Steam',
      debugSrcSteamDb: 'Rangée Links — page app SteamDB',
      debugSrcSteamDbCharts: 'SteamDB charts (référence ; non scrapé)',
      debugSrcSteamDbInfo: 'SteamDB info (référence ; non scrapé)',
      debugSrcSteamTiny: 'Petite capsule — fallback icône',
      debugSrcSteamHeader: 'Image header depuis appdetails',
      debugSrcSteamSearch: 'storesearch — résoudre le Steam App ID',
      debugSrcSteamDetails: 'appdetails — prix, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — résumé des avis pour Steam',
      debugSrcSteamTags: 'GetItems — tags populaires pour Steam',
      debugSrcSteamTagMap: 'populartags — carte id → nom',
      debugSrcSteamOwned: 'dynamicstore/userdata — contrôle bibliothèque',
      debugSrcSteamDbPage: 'HTML SteamDB — icône, logo, joueurs',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — fallback joueurs',
      debugSrcIcon: 'Icône du titre (SteamDB / CDN)',
      debugSrcLogo: 'Logo couverture sous Change cover',
      debugSrcGameStatusApi: 'API GameStatus — statut crack / DRM',
      debugSrcGameStatusPage: 'Page GameStatus du slug trouvé',
      uiLanguage: 'Langue de l’interface',
      uiLanguageHint: 'Auto suit la langue du navigateur. Appliqué après rechargement.',
      uiLanguageAuto: 'Auto (navigateur)',
      steamCountry: 'Région Steam Store',
      steamCountryHint: 'Affecte la devise du prix via l’API Steam Store.',
      showSteam: 'Afficher prix et avis Steam',
      showMetacritic: 'Afficher le score Metacritic',
      showGameStatus: 'Afficher le statut GameStatus',
      showGameStatusHint: 'Statut crack / DRM via GameStatus.info (correspondance Steam requise).',
      showLinks: 'Afficher la rangée de liens',
      showSteamOwned: 'Afficher le statut possédé Steam',
      showSteamOwnedHint:
        'Affiche « Possédé » si le jeu est dans votre bibliothèque Steam. Connexion Steam requise dans ce navigateur.',
      showSteamWishlist: 'Afficher le statut wishlist Steam',
      showSteamWishlistHint:
        'Affiche « Wishlist » si le jeu est dans votre liste de souhaits Steam (masqué si déjà possédé). Connexion Steam requise.',
      showSteamTags: 'Afficher les tags Steam',
      showSteamTagsHint: 'Tags communautaires populaires du Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Bouton Backloggd sur Steam',
      showSteamPageLinkHint: 'Ajoute un bouton style SteamDB dans Other site info sur les pages Steam.',
      showSteamDbPageLink: 'Bouton Backloggd sur SteamDB',
      showSteamDbPageLinkHint: 'Ajoute un bouton à côté de Store / IGDB dans app-links SteamDB.',
      showSteamDbIcon: 'Icône SteamDB avant le titre',
      showSteamDbIconHint: 'Icône app dans l’en-tête SteamDB, repli : capsule Steam.',
      showSteamDbCover: 'Logo SteamDB sous Change cover',
      showSteamDbCoverHint: 'Jaquette SteamDB sous la jaquette / Change cover.',
      showSteamPlayers: 'Afficher les joueurs en ligne',
      showSteamPlayersHint: 'Joueurs actuels via Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Afficher les badges sur les jaquettes des listes',
      showCardBadgesHint:
        'Prix, % d’avis Steam, Possédé / Wishlist et GameStatus sur browse, recherche, journal et autres grilles (pas sur la page jeu).',
      steamBackloggdTooltip: 'Voir sur Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Possédé',
      steamWishlist: 'Wishlist',
      steamFixMatch: 'Corriger la correspondance',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Remplace la recherche automatique Steam Store pour cette page Backloggd. Collez l’App ID numérique de l’URL Steam.',
      steamFixMatchPlaceholder: 'ex. 1245620',
      steamFixMatchClear: 'Utiliser la correspondance auto',
      steamFixMatchInvalid: 'Entrez un Steam App ID numérique valide',
      steamMatchManual: 'manuel',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Liens rapides',
      sectionLinksHint: 'Choisissez les sites affichés dans la rangée Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Réglages Backloggd Plus',
      cacheHours: 'Durée du cache (heures)',
      cacheHoursHint: 'Durée de réutilisation des requêtes Steam / GameStatus. 0 désactive le cache.',
      clearCache: 'Vider le cache',
      cacheCleared: 'Cache vidé ({count})',
      cacheEmpty: 'Le cache est vide',
      cacheBarFull: 'Complet',
      cacheBarPartial: 'Partiel',
      cacheBarFree: 'Libre',
      cacheBarLegend: '{label} : {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Budget de stockage indicatif. Complet = requêtes utiles ; partiel = incomplètes ou expirées encore stockées.',
      cacheBarAria: 'Utilisation du cache : {full} complet, {partial} partiel, {free} libre',
      cacheClearHint: 'Supprime les requêtes Steam / GameStatus de ce profil navigateur.',
      on: 'ON',
      off: 'OFF',
      loading: 'Chargement…',
      notOnSteam: 'Introuvable sur Steam',
      loadError: 'Impossible de charger les données Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Prêt',
      gsNotCracked: 'En attente',
      gsBypass: 'Contournement',
      gsReleaseToday: 'Sortie aujourd’hui',
      gsUnknown: 'Inconnu',
      gsNotInDatabase: 'Absent de la base',
      reviews: 'Avis',
      price: 'Prix',
      free: 'Gratuit',
      discount: '-{n}%',
      steamUsFallback: 'Trouvé via le magasin US (aucune réponse pour {cc})',
      recommendations: '{n} recommandations',
      links: 'Liens',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Joueurs',
      playersOnline: '{n} en jeu',

    },
    ja: {
      menuSettings: 'Backloggd Plus — 設定',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · スコア · リストバッジ · クイックリンク',
      close: '閉じる',
      cancel: 'キャンセル',
      save: '保存',
      saveReload: '保存して再読み込み',
      repoLink: 'GitHub',
      repoAbout: 'ソースコード、更新、Issue報告',
      sectionGame: 'ゲームページ',
      sectionLists: 'リストとカード',
      sectionGeneral: '一般',
      sectionCache: 'キャッシュ',
      sectionDebug: 'デバッグ',
      debugMode: 'デバッグモード',
      debugModeHint:
        'ゲームページにデバッグパネルを1つ表示。各URLの用途と完全なダンプ。',
      debugReason: '理由',
      debugResponse: 'レスポンス',
      debugPanelTitle: 'デバッグ',
      debugSources: 'ソース',
      debugDump: '完全ダンプ',
      debugSectionPage: 'ページ',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / プレイヤー',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: '所持',
      debugSrcRequest: 'リクエスト',
      debugSrcBackloggd: '現在の Backloggd ゲームページ',
      debugSrcIgdb: 'ゲーム slug / Links 行（IGDB）',
      debugSrcMetacritic: 'Links 行 — Metacritic URL（slug 推定）',
      debugSrcSteamStore: 'Steam ストアページ — Links + Steam 行リンク',
      debugSrcSteamDb: 'Links 行 — SteamDB アプリページ',
      debugSrcSteamDbCharts: 'SteamDB charts（参考；スクレイプしない）',
      debugSrcSteamDbInfo: 'SteamDB info（参考；スクレイプしない）',
      debugSrcSteamTiny: '小さいカプセル — アイコン用フォールバック',
      debugSrcSteamHeader: 'appdetails のヘッダー画像',
      debugSrcSteamSearch: 'storesearch — Steam App ID の解決',
      debugSrcSteamDetails: 'appdetails — 価格・無料・Metacritic・header',
      debugSrcSteamReviews: 'appreviews — Steam 行のレビュー概要',
      debugSrcSteamTags: 'GetItems — Steam 行の人気タグ',
      debugSrcSteamTagMap: 'populartags — タグ id → 名前',
      debugSrcSteamOwned: 'dynamicstore/userdata — ライブラリ所持確認',
      debugSrcSteamDbPage: 'SteamDB HTML — icon / logo / プレイヤー',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — プレイヤー数フォールバック',
      debugSrcIcon: 'タイトル横アイコン（SteamDB / CDN）',
      debugSrcLogo: 'Change cover 下のカバー logo',
      debugSrcGameStatusApi: 'GameStatus API — クラック / DRM 状態',
      debugSrcGameStatusPage: '一致した slug の GameStatus ページ',
      uiLanguage: '表示言語',
      uiLanguageHint: '自動はブラウザ言語に従います。保存後の再読み込みで反映。',
      uiLanguageAuto: '自動（ブラウザ）',
      steamCountry: 'Steamストア地域',
      steamCountryHint: 'Steam Store APIの価格通貨に影響します。',
      showSteam: 'Steamの価格とレビューを表示',
      showMetacritic: 'Metacriticスコアを表示',
      showGameStatus: 'GameStatusの状態を表示',
      showGameStatusHint: 'GameStatus.info のクラック/DRM状態（Steam一致が必要）。',
      showLinks: 'リンク行を表示',
      showSteamOwned: 'Steam所持を表示',
      showSteamOwnedHint:
        'ライブラリにある場合「所持」を表示します。このブラウザでSteamにログインしている必要があります。',
      showSteamWishlist: 'Steamウィッシュリストを表示',
      showSteamWishlistHint:
        'ウィッシュリストにある場合「ウィッシュリスト」を表示（所持中は非表示）。このブラウザでSteamログインが必要です。',
      showSteamTags: 'Steamタグを表示',
      showSteamTagsHint: 'Steamストアの人気コミュニティタグ（Open World、RPG など）。',
      showSteamPageLink: 'SteamにBackloggdボタン',
      showSteamPageLinkHint: 'Steamのゲームページ Other site info にSteamDB風ボタンを追加します。',
      showSteamDbPageLink: 'SteamDBにBackloggdボタン',
      showSteamDbPageLinkHint: 'SteamDBのapp-linksでStore / IGDBの横にボタンを追加します。',
      showSteamDbIcon: 'タイトル前に SteamDB アイコン',
      showSteamDbIconHint: 'SteamDB ページ見出しのアプリアイコン。失敗時は Steam カプセル。',
      showSteamDbCover: 'Change cover の下に SteamDB ロゴ',
      showSteamDbCoverHint: 'カバー / Change cover の下に SteamDB のカバー画像。',
      showSteamPlayers: 'オンラインプレイヤー数を表示',
      showSteamPlayersHint: 'Steam GetNumberOfCurrentPlayers の現在のプレイヤー数。',
      showCardBadges: 'リストのカバーにバッジを表示',
      showCardBadgesHint:
        'browse / 検索 / journal などのカバーに価格・Steam評価%・所持 / ウィッシュリスト・GameStatusを表示（ゲームページ以外）。',
      steamBackloggdTooltip: 'Backloggdで見る',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '所持',
      steamWishlist: 'ウィッシュリスト',
      steamFixMatch: '一致を修正',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'このBackloggdページの自動Steamストア検索を上書きします。Steam URLの数字App IDを貼り付けてください。',
      steamFixMatchPlaceholder: '例: 1245620',
      steamFixMatchClear: '自動一致を使う',
      steamFixMatchInvalid: '有効な数字のSteam App IDを入力してください',
      steamMatchManual: '手動',
      steamMatchAuto: '自動',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'クイックリンク',
      sectionLinksHint: 'Links行に表示するサイトを選択します。',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 設定',
      cacheHours: 'キャッシュ時間（時間）',
      cacheHoursHint: 'Steam / GameStatus照会の再利用時間。0で無効。',
      clearCache: 'キャッシュを消去',
      cacheCleared: 'キャッシュを消去しました（{count}）',
      cacheEmpty: 'キャッシュは空です',
      cacheBarFull: '完全',
      cacheBarPartial: '部分',
      cacheBarFree: '空き',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        '目安の容量上限。完全＝利用可能な照会、部分＝不完全または期限切れでまだ残っている項目。',
      cacheBarAria: 'キャッシュ使用量: 完全 {full}、部分 {partial}、空き {free}',
      cacheClearHint: 'このブラウザプロファイルのSteam / GameStatus照会を削除します。',
      on: 'ON',
      off: 'OFF',
      loading: '読み込み中…',
      notOnSteam: 'Steamで見つかりません',
      loadError: 'Steamデータを読み込めませんでした',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: '対応済み',
      gsNotCracked: '未対応',
      gsBypass: '保護バイパス',
      gsReleaseToday: '本日リリース',
      gsUnknown: '不明',
      gsNotInDatabase: 'データベースになし',
      reviews: 'レビュー',
      price: '価格',
      free: '無料',
      discount: '-{n}%',
      steamUsFallback: 'USストア経由で検出（{cc} の検索は結果なし）',
      recommendations: 'おすすめ {n}',
      links: 'リンク',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'プレイヤー',
      playersOnline: '{n} 人がプレイ中',

    },
    ko: {
      menuSettings: 'Backloggd Plus — 설정',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · 점수 · 목록 배지 · 빠른 링크',
      close: '닫기',
      cancel: '취소',
      save: '저장',
      saveReload: '저장 후 새로고침',
      repoLink: 'GitHub',
      repoAbout: '소스 코드, 업데이트, 이슈 보고',
      sectionGame: '게임 페이지',
      sectionLists: '목록 및 카드',
      sectionGeneral: '일반',
      sectionCache: '캐시',
      sectionDebug: '디버그',
      debugMode: '디버그 모드',
      debugModeHint:
        '게임 페이지에 디버그 패널 하나: 각 URL 용도와 전체 덤프.',
      debugReason: '이유',
      debugResponse: '응답',
      debugPanelTitle: '디버그',
      debugSources: '소스',
      debugDump: '전체 덤프',
      debugSectionPage: '페이지',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / 플레이어',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: '보유',
      debugSrcRequest: '요청',
      debugSrcBackloggd: '현재 Backloggd 게임 페이지',
      debugSrcIgdb: '게임 slug / Links 행 (IGDB)',
      debugSrcMetacritic: 'Links 행 — Metacritic URL (slug 추정)',
      debugSrcSteamStore: 'Steam 스토어 페이지 — Links + Steam 행 링크',
      debugSrcSteamDb: 'Links 행 — SteamDB 앱 페이지',
      debugSrcSteamDbCharts: 'SteamDB charts (참고; 스크래핑 안 함)',
      debugSrcSteamDbInfo: 'SteamDB info (참고; 스크래핑 안 함)',
      debugSrcSteamTiny: '작은 캡슐 — 아이콘 폴백',
      debugSrcSteamHeader: 'appdetails 헤더 이미지',
      debugSrcSteamSearch: 'storesearch — Steam App ID 해석',
      debugSrcSteamDetails: 'appdetails — 가격, 무료, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — Steam 행 리뷰 요약',
      debugSrcSteamTags: 'GetItems — Steam 행 인기 태그',
      debugSrcSteamTagMap: 'populartags — 태그 id → 이름',
      debugSrcSteamOwned: 'dynamicstore/userdata — 라이브러리 보유 확인',
      debugSrcSteamDbPage: 'SteamDB HTML — icon, logo, 플레이어',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — 플레이어 폴백',
      debugSrcIcon: '제목 아이콘 (SteamDB / CDN)',
      debugSrcLogo: 'Change cover 아래 커버 logo',
      debugSrcGameStatusApi: 'GameStatus API — 크랙 / DRM 상태',
      debugSrcGameStatusPage: '일치한 slug의 GameStatus 페이지',
      uiLanguage: '인터페이스 언어',
      uiLanguageHint: '자동은 브라우저 언어를 따릅니다. 저장 후 새로고침 시 적용.',
      uiLanguageAuto: '자동 (브라우저)',
      steamCountry: 'Steam 스토어 지역',
      steamCountryHint: 'Steam Store API 가격 통화에 영향을 줍니다.',
      showSteam: 'Steam 가격 및 리뷰 표시',
      showMetacritic: 'Metacritic 점수 표시',
      showGameStatus: 'GameStatus 상태 표시',
      showGameStatusHint: 'GameStatus.info의 크랙/DRM 상태(Steam 일치 필요).',
      showLinks: '링크 행 표시',
      showSteamOwned: 'Steam 보유 표시',
      showSteamOwnedHint:
        '라이브러리에 있으면 “보유”를 표시합니다. 이 브라우저에서 Steam 로그인이 필요합니다.',
      showSteamWishlist: 'Steam 위시리스트 상태 표시',
      showSteamWishlistHint:
        '위시리스트에 있으면 “위시리스트”를 표시합니다(보유 중이면 숨김). 이 브라우저에서 Steam 로그인이 필요합니다.',
      showSteamTags: 'Steam 태그 표시',
      showSteamTagsHint: 'Steam 스토어의 인기 커뮤니티 태그(Open World, RPG 등).',
      showSteamPageLink: 'Steam에 Backloggd 버튼',
      showSteamPageLinkHint: 'Steam 게임 페이지 Other site info에 SteamDB 스타일 버튼을 추가합니다.',
      showSteamDbPageLink: 'SteamDB에 Backloggd 버튼',
      showSteamDbPageLinkHint: 'SteamDB app-links에서 Store / IGDB 옆에 버튼을 추가합니다.',
      showSteamDbIcon: '제목 앞에 SteamDB 아이콘',
      showSteamDbIconHint: 'SteamDB 페이지 헤더 앱 아이콘. 실패 시 Steam 캡슐.',
      showSteamDbCover: 'Change cover 아래 SteamDB 로고',
      showSteamDbCoverHint: '커버 / Change cover 아래 SteamDB 커버 이미지.',
      showSteamPlayers: '온라인 플레이어 수 표시',
      showSteamPlayersHint: 'Steam GetNumberOfCurrentPlayers의 현재 플레이어 수.',
      showCardBadges: '목록 커버에 배지 표시',
      showCardBadgesHint:
        'browse, 검색, journal 등 커버 그리드에 가격, Steam 평가 %, 보유/위시리스트, GameStatus 표시(게임 페이지 제외).',
      steamBackloggdTooltip: 'Backloggd에서 보기',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '보유',
      steamWishlist: '위시리스트',
      steamFixMatch: '매치 수정',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        '이 Backloggd 페이지의 자동 Steam 스토어 검색을 덮어씁니다. Steam URL의 숫자 App ID를 붙여넣으세요.',
      steamFixMatchPlaceholder: '예: 1245620',
      steamFixMatchClear: '자동 매치 사용',
      steamFixMatchInvalid: '유효한 숫자 Steam App ID를 입력하세요',
      steamMatchManual: '수동',
      steamMatchAuto: '자동',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: '빠른 링크',
      sectionLinksHint: 'Links 행에 표시할 사이트를 선택합니다.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 설정',
      cacheHours: '캐시 시간(시간)',
      cacheHoursHint: 'Steam / GameStatus 조회 재사용 시간. 0은 캐시 비활성.',
      clearCache: '캐시 비우기',
      cacheCleared: '캐시 비움 ({count})',
      cacheEmpty: '캐시가 비어 있음',
      cacheBarFull: '완전',
      cacheBarPartial: '부분',
      cacheBarFree: '여유',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        '소프트 저장 한도. 완전 = 사용 가능한 조회, 부분 = 불완전하거나 만료됐지만 아직 남아 있는 항목.',
      cacheBarAria: '캐시 사용량: 완전 {full}, 부분 {partial}, 여유 {free}',
      cacheClearHint: '이 브라우저 프로필의 Steam / GameStatus 조회를 삭제합니다.',
      on: '켜짐',
      off: '꺼짐',
      loading: '로딩 중…',
      notOnSteam: 'Steam에서 찾을 수 없음',
      loadError: 'Steam 데이터를 불러오지 못함',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: '준비됨',
      gsNotCracked: '대기',
      gsBypass: '보호 우회',
      gsReleaseToday: '오늘 출시',
      gsUnknown: '알 수 없음',
      gsNotInDatabase: '데이터베이스 없음',
      reviews: '리뷰',
      price: '가격',
      free: '무료',
      discount: '-{n}%',
      steamUsFallback: 'US 스토어로 찾음 ({cc} 검색 결과 없음)',
      recommendations: '추천 {n}',
      links: '링크',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: '플레이어',
      playersOnline: '{n}명 플레이 중',

    },
    pl: {
      menuSettings: 'Backloggd Plus — Ustawienia',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · oceny · odznaki na listach · szybkie linki',
      close: 'Zamknij',
      cancel: 'Anuluj',
      save: 'Zapisz',
      saveReload: 'Zapisz i przeładuj',
      repoLink: 'GitHub',
      repoAbout: 'Kod źródłowy, aktualizacje i zgłoszenia',
      sectionGame: 'Strona gry',
      sectionLists: 'Listy i karty',
      sectionGeneral: 'Ogólne',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Tryb debug',
      debugModeHint:
        'Jeden panel debug na stronie gry: źródła (do czego służy każdy URL) i pełny dump.',
      debugReason: 'Powód',
      debugResponse: 'Odpowiedź',
      debugPanelTitle: 'Debug',
      debugSources: 'Źródła',
      debugDump: 'Pełny dump',
      debugSectionPage: 'Strona',
      debugSectionSteam: 'Steam',
      debugSectionSteamDb: 'SteamDB / gracze',
      debugSectionGameStatus: 'GameStatus',
      debugOwned: 'Posiadane',
      debugSrcRequest: 'żądanie',
      debugSrcBackloggd: 'Bieżąca strona gry na Backloggd',
      debugSrcIgdb: 'Slug gry / wiersz Links (IGDB)',
      debugSrcMetacritic: 'Wiersz Links — URL Metacritic (po slugu)',
      debugSrcSteamStore: 'Strona Steam — Links + link w wierszu Steam',
      debugSrcSteamDb: 'Wiersz Links — strona aplikacji SteamDB',
      debugSrcSteamDbCharts: 'SteamDB charts (referencja; bez scrapowania)',
      debugSrcSteamDbInfo: 'SteamDB info (referencja; bez scrapowania)',
      debugSrcSteamTiny: 'Mała kapsuła — fallback ikony',
      debugSrcSteamHeader: 'Obraz header z appdetails',
      debugSrcSteamSearch: 'storesearch — rozwiązanie Steam App ID',
      debugSrcSteamDetails: 'appdetails — cena, free, Metacritic, header',
      debugSrcSteamReviews: 'appreviews — podsumowanie recenzji dla Steam',
      debugSrcSteamTags: 'GetItems — popularne tagi dla Steam',
      debugSrcSteamTagMap: 'populartags — mapa id → nazwa',
      debugSrcSteamOwned: 'dynamicstore/userdata — sprawdzenie biblioteki',
      debugSrcSteamDbPage: 'HTML SteamDB — ikona, logo, gracze',
      debugSrcSteamPlayersApi: 'GetNumberOfCurrentPlayers — fallback graczy',
      debugSrcIcon: 'Ikona tytułu (SteamDB / CDN)',
      debugSrcLogo: 'Logo okładki pod Change cover',
      debugSrcGameStatusApi: 'API GameStatus — status crack / DRM',
      debugSrcGameStatusPage: 'Strona GameStatus dla znalezionego sluga',
      uiLanguage: 'Język interfejsu',
      uiLanguageHint: 'Auto podąża za językiem przeglądarki. Działa po przeładowaniu.',
      uiLanguageAuto: 'Auto (przeglądarka)',
      steamCountry: 'Region Steam Store',
      steamCountryHint: 'Wpływa na walutę ceny z API Steam Store.',
      showSteam: 'Pokaż cenę i opinie Steam',
      showMetacritic: 'Pokaż wynik Metacritic',
      showGameStatus: 'Pokaż status GameStatus',
      showGameStatusHint: 'Status crack / DRM z GameStatus.info (wymaga dopasowania Steam).',
      showLinks: 'Pokaż wiersz linków',
      showSteamOwned: 'Pokaż status posiadania Steam',
      showSteamOwnedHint:
        'Pokazuje „Posiadane”, jeśli gra jest w bibliotece Steam. Wymaga zalogowania do Steam w tej przeglądarce.',
      showSteamWishlist: 'Pokaż status wishlisty Steam',
      showSteamWishlistHint:
        'Pokazuje „Wishlist”, jeśli gra jest na liście życzeń Steam (ukryte, gdy już posiadane). Wymaga logowania Steam.',
      showSteamTags: 'Pokaż tagi Steam',
      showSteamTagsHint: 'Popularne tagi społeczności ze Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Przycisk Backloggd na Steam',
      showSteamPageLinkHint: 'Dodaje przycisk w stylu SteamDB w Other site info na stronach Steam.',
      showSteamDbPageLink: 'Przycisk Backloggd na SteamDB',
      showSteamDbPageLinkHint: 'Dodaje przycisk obok Store / IGDB w app-links na SteamDB.',
      showSteamDbIcon: 'Ikona SteamDB przed tytułem',
      showSteamDbIconHint: 'Ikona aplikacji z nagłówka SteamDB; zapasowo kapsuła Steam.',
      showSteamDbCover: 'Logo SteamDB pod Change cover',
      showSteamDbCoverHint: 'Okładka ze SteamDB pod okładką / Change cover.',
      showSteamPlayers: 'Pokaż graczy online',
      showSteamPlayersHint: 'Bieżąca liczba graczy z Steam GetNumberOfCurrentPlayers.',
      showCardBadges: 'Pokaż odznaki na okładkach list',
      showCardBadgesHint:
        'Cena, % recenzji Steam, Posiadane / Wishlist i GameStatus na browse, wyszukiwaniu, journal i innych siatkach (nie na stronie gry).',
      steamBackloggdTooltip: 'Zobacz na Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Posiadane',
      steamWishlist: 'Wishlist',
      steamFixMatch: 'Popraw dopasowanie',
      steamFixMatchTitle: 'Steam App ID',
      steamFixMatchHint:
        'Nadpisuje automatyczne wyszukiwanie Steam Store dla tej strony Backloggd. Wklej liczbowe App ID z URL Steam.',
      steamFixMatchPlaceholder: 'np. 1245620',
      steamFixMatchClear: 'Użyj automatycznego dopasowania',
      steamFixMatchInvalid: 'Podaj prawidłowe liczbowe Steam App ID',
      steamMatchManual: 'ręcznie',
      steamMatchAuto: 'auto',
      steamMatchLabel: 'App {id} · {source}',
      sectionLinks: 'Szybkie linki',
      sectionLinksHint: 'Wybierz witryny widoczne w wierszu Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Ustawienia Backloggd Plus',
      cacheHours: 'Czas cache (godziny)',
      cacheHoursHint: 'Jak długo ponownie używać zapytań Steam / GameStatus. 0 wyłącza cache.',
      clearCache: 'Wyczyść cache',
      cacheCleared: 'Cache wyczyszczony ({count})',
      cacheEmpty: 'Cache jest pusty',
      cacheBarFull: 'Pełny',
      cacheBarPartial: 'Częściowy',
      cacheBarFree: 'Wolne',
      cacheBarLegend: '{label}: {count} · {size}',
      cacheBarUsed: '{used} / {limit}',
      cacheBarHint:
        'Miękki limit pamięci. Pełny = użyteczne wpisy; częściowy = niekompletne lub wygasłe, nadal zapisane.',
      cacheBarAria: 'Użycie cache: {full} pełny, {partial} częściowy, {free} wolne',
      cacheClearHint: 'Usuwa zapisane zapytania Steam / GameStatus z tego profilu.',
      on: 'WŁ',
      off: 'WYŁ',
      loading: 'Ładowanie…',
      notOnSteam: 'Nie znaleziono na Steam',
      loadError: 'Nie udało się wczytać danych Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      gameStatus: 'GameStatus',
      gsCracked: 'Gotowe',
      gsNotCracked: 'Oczekuje',
      gsBypass: 'Bypass ochrony',
      gsReleaseToday: 'Premiera dziś',
      gsUnknown: 'Nieznany',
      gsNotInDatabase: 'Brak w bazie',
      reviews: 'Opinie',
      price: 'Cena',
      free: 'Za darmo',
      discount: '-{n}%',
      steamUsFallback: 'Znaleziono przez sklep US (wyszukiwanie {cc} bez wyników)',
      recommendations: '{n} rekomendacji',
      links: 'Linki',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkSteamDb: 'SteamDB',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      players: 'Gracze',
      playersOnline: '{n} gra',

    },
  };

  const LOCALE_NATIVE_NAMES = {
    en: 'English',
    ru: 'Русский',
    zh: '中文',
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    fr: 'Français',
    ja: '日本語',
    ko: '한국어',
    pl: 'Polski',
  };

  function detectLocale() {
    const raw = String(navigator.language || 'en').toLowerCase();
    const short = raw.slice(0, 2);
    return SUPPORTED_LOCALES.includes(short) ? short : 'en';
  }

  function resolveLocale(pref) {
    const value = pref || 'auto';
    if (value !== 'auto' && SUPPORTED_LOCALES.includes(value)) return value;
    return detectLocale();
  }

  function fmt(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, (_, k) =>
      vars[k] == null ? '' : String(vars[k])
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function loadSettings() {
    try {
      const raw = GM_getValue(SETTINGS_KEY, null);
      if (!raw || typeof raw !== 'object') {
        return {
          ...DEFAULT_SETTINGS,
          links: { ...DEFAULT_SETTINGS.links },
        };
      }
      return {
        ...DEFAULT_SETTINGS,
        ...raw,
        links: { ...DEFAULT_SETTINGS.links, ...(raw.links || {}) },
      };
    } catch (_) {
      return {
        ...DEFAULT_SETTINGS,
        links: { ...DEFAULT_SETTINGS.links },
      };
    }
  }

  function saveSettings(next) {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...next,
      links: { ...DEFAULT_SETTINGS.links, ...(next.links || {}) },
    };
    GM_setValue(SETTINGS_KEY, merged);
  }

  function isLinkEnabled(key) {
    return Boolean(settings.showLinks && settings.links && settings.links[key] !== false);
  }

  function linkLabelKey(key) {
    const map = {
      igdb: 'linkIgdb',
      steam: 'linkSteam',
      steamdb: 'linkSteamDb',
      metacritic: 'linkMetacritic',
      opencritic: 'linkOpencritic',
      hltb: 'linkHltb',
    };
    return map[key] || key;
  }

  let settings = loadSettings();
  let locale = resolveLocale(settings.uiLocale);
  let t = TRANSLATIONS[locale] || TRANSLATIONS.en;
  let cacheStore = null;
  let cachePersistTimer = 0;
  const inflight = new Map();
  /** In-memory Steam resolve misses for this page session (do not persist to GM cache). */
  const steamResolveMissMemory = new Set();

  function readCacheStore() {
    if (cacheStore) return cacheStore;
    try {
      const raw = GM_getValue(CACHE_KEY, null);
      cacheStore = raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      cacheStore = {};
    }
    return cacheStore;
  }

  function persistCacheSoon() {
    clearTimeout(cachePersistTimer);
    cachePersistTimer = setTimeout(() => {
      try {
        GM_setValue(CACHE_KEY, readCacheStore());
      } catch (_) {
        /* ignore */
      }
    }, 400);
  }

  function cacheTtlMs() {
    const hours = Number(settings.cacheHours);
    if (!Number.isFinite(hours) || hours <= 0) return 0;
    return Math.min(hours, CACHE_HOURS_MAX) * 3600 * 1000;
  }

  function getCached(key) {
    const ttl = cacheTtlMs();
    if (!ttl) return null;
    const entry = readCacheStore()[key];
    if (!entry || !entry.ts) return null;
    if (Date.now() - entry.ts > ttl) return null;
    return entry.data;
  }

  function setCached(key, data) {
    if (!cacheTtlMs()) return;
    readCacheStore()[key] = { ts: Date.now(), data };
    persistCacheSoon();
  }

  function userdataCacheTtlMs(empty) {
    if (empty) return USERDATA_EMPTY_TTL_MS;
    const ttl = cacheTtlMs();
    return ttl > 0 ? ttl : USERDATA_FALLBACK_TTL_MS;
  }

  function getUserdataCached() {
    const entry = readCacheStore()[USERDATA_CACHE_KEY];
    if (!entry?.ts || !entry.data) return null;
    if (!Array.isArray(entry.data.appIds) || !Array.isArray(entry.data.wishlistAppIds)) {
      return null;
    }
    const empty = entry.data.appIds.length === 0 && entry.data.wishlistAppIds.length === 0;
    if (Date.now() - entry.ts > userdataCacheTtlMs(empty)) return null;
    return entry.data;
  }

  function setUserdataCached(data) {
    readCacheStore()[USERDATA_CACHE_KEY] = { ts: Date.now(), data };
    persistCacheSoon();
  }

  function loadSteamOverrides() {
    try {
      const raw = GM_getValue(STEAM_OVERRIDES_KEY, null);
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function saveSteamOverrides(map) {
    try {
      GM_setValue(STEAM_OVERRIDES_KEY, map && typeof map === 'object' ? map : {});
    } catch (_) {
      /* ignore */
    }
  }

  function getSteamOverride(slug) {
    const key = String(slug || '')
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '');
    if (!key) return null;
    const id = Number(loadSteamOverrides()[key]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  function setSteamOverride(slug, appId) {
    const key = String(slug || '')
      .toLowerCase()
      .replace(/^\/+|\/+$/g, '');
    if (!key) return;
    const id = Number(appId);
    const map = loadSteamOverrides();
    if (Number.isFinite(id) && id > 0) map[key] = id;
    else delete map[key];
    saveSteamOverrides(map);
    steamResolveMissMemory.clear();
  }

  function clearSteamOverride(slug) {
    setSteamOverride(slug, null);
  }

  function getLongCached(key, ttlMs) {
    const entry = readCacheStore()[key];
    if (!entry?.ts || entry.data == null) return null;
    if (Date.now() - entry.ts > ttlMs) return null;
    return entry.data;
  }

  function setLongCached(key, data) {
    readCacheStore()[key] = { ts: Date.now(), data };
    persistCacheSoon();
  }

  async function fetchSteamPopularTagMap() {
    const cached = getLongCached(TAG_MAP_CACHE_KEY, TAG_MAP_TTL_MS);
    if (cached && typeof cached === 'object') return cached;

    if (inflight.has(TAG_MAP_CACHE_KEY)) return inflight.get(TAG_MAP_CACHE_KEY);

    const task = (async () => {
      const list = await gmRequest({ url: STEAM_POPULAR_TAGS_URL });
      const map = {};
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.tagid != null && item.name) map[item.tagid] = item.name;
        }
      }
      setLongCached(TAG_MAP_CACHE_KEY, map);
      return map;
    })();

    inflight.set(TAG_MAP_CACHE_KEY, task);
    try {
      return await task;
    } finally {
      inflight.delete(TAG_MAP_CACHE_KEY);
    }
  }

  function parseSteamStoreAssets(appId, assets) {
    if (!assets || typeof assets !== 'object') return null;
    const id = Number(appId);
    const hash = String(assets.community_icon || '').trim();
    const iconUrl = hash ? `${STEAM_CDN_COMMUNITY_ICONS}/${id}/${hash}.jpg` : '';
    const headerFile = String(assets.header || 'header.jpg').trim();
    let logoUrl = '';
    if (assets.asset_url_format && headerFile) {
      logoUrl = `${STEAM_CDN_STORE_ASSETS}/${String(assets.asset_url_format).replace(
        '${FILENAME}',
        headerFile
      )}`;
    }
    if (!logoUrl && headerFile) logoUrl = steamCdnAsset(id, headerFile);
    if (!iconUrl && !logoUrl) return null;
    return { iconUrl, logoUrl, source: 'steam-assets' };
  }

  async function fetchSteamStoreItem(appId, country) {
    const id = Number(appId);
    const cc = String(country || 'US').toUpperCase();
    const inflightKey = `steam:storeitem:${id}:${cc}`;
    const tagsKey = `steam:tags:${id}`;
    const assetsKey = `steam:assets:${id}`;
    const debugOn = Boolean(settings.debugMode);

    const cachedTags = !debugOn ? getCached(tagsKey) : null;
    const cachedAssets = !debugOn ? getCached(assetsKey) : null;
    if (cachedTags && cachedAssets) {
      return { tags: cachedTags, assets: cachedAssets };
    }

    if (inflight.has(inflightKey)) return inflight.get(inflightKey);

    const task = (async () => {
      try {
        const input = JSON.stringify({
          ids: [{ appid: id }],
          context: {
            language: 'english',
            country_code: cc,
            steam_realm: 1,
          },
          data_request: {
            include_tag_count: STEAM_TAGS_MAX,
            include_assets: true,
          },
        });
        const [root, map] = await Promise.all([
          gmRequest({
            url: `${STEAM_STORE_ITEMS_URL}?input_json=${encodeURIComponent(input)}`,
          }),
          fetchSteamPopularTagMap(),
        ]);
        const item = root?.response?.store_items?.[0];
        const rawTags = Array.isArray(item?.tags) ? item.tags : [];
        const tags = rawTags
          .slice()
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .map((tag) => ({
            id: tag.tagid,
            name: map[tag.tagid] || null,
            weight: tag.weight || 0,
          }))
          .filter((tag) => tag.name)
          .slice(0, STEAM_TAGS_MAX);
        const assets = parseSteamStoreAssets(id, item?.assets);
        if (!debugOn) {
          setCached(tagsKey, tags);
          if (assets) setCached(assetsKey, assets);
        }
        return {
          tags: tags.length ? tags : cachedTags || [],
          assets: assets || cachedAssets || null,
        };
      } catch (_) {
        return { tags: cachedTags || [], assets: cachedAssets || null };
      }
    })();

    inflight.set(inflightKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(inflightKey);
    }
  }

  async function fetchSteamAppTags(appId, country) {
    const { tags } = await fetchSteamStoreItem(appId, country);
    return tags;
  }

  async function fetchSteamStoreAssets(appId, country) {
    const { assets } = await fetchSteamStoreItem(appId, country);
    return assets;
  }

  function steamTagUrl(name) {
    return `https://store.steampowered.com/tags/en/${encodeURIComponent(name)}/`;
  }

  function parseSteamIdList(list) {
    return (Array.isArray(list) ? list : [])
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  async function fetchSteamUserdata() {
    const cached = getUserdataCached();
    if (cached) {
      return {
        owned: new Set(cached.appIds),
        wishlist: new Set(cached.wishlistAppIds),
      };
    }

    if (inflight.has(USERDATA_CACHE_KEY)) return inflight.get(USERDATA_CACHE_KEY);

    const task = (async () => {
      try {
        const data = await gmRequest({
          url: `${STEAM_USERDATA_URL}?t=${Date.now()}`,
          anonymous: false,
          headers: { 'Cache-Control': 'no-cache' },
        });
        const appIds = parseSteamIdList(data?.rgOwnedApps);
        const wishlistAppIds = parseSteamIdList(data?.rgWishlist);
        setUserdataCached({ appIds, wishlistAppIds });
        return {
          owned: new Set(appIds),
          wishlist: new Set(wishlistAppIds),
        };
      } catch (_) {
        return { owned: new Set(), wishlist: new Set() };
      }
    })();

    inflight.set(USERDATA_CACHE_KEY, task);
    try {
      return await task;
    } finally {
      inflight.delete(USERDATA_CACHE_KEY);
    }
  }

  async function fetchSteamOwnedSet() {
    const data = await fetchSteamUserdata();
    return data.owned;
  }

  function isSteamGameResolveKey(key) {
    return key.startsWith('steam:id:') || /^steam:[A-Z]{2}:/.test(key);
  }

  function cacheEntryTtlMs(key, entry) {
    if (Number(entry?.ttlMs) > 0) return Number(entry.ttlMs);
    if (key === TAG_MAP_CACHE_KEY) return TAG_MAP_TTL_MS;
    if (key === USERDATA_CACHE_KEY) {
      const data = entry?.data;
      const empty =
        !data ||
        ((!Array.isArray(data.appIds) || data.appIds.length === 0) &&
          (!Array.isArray(data.wishlistAppIds) || data.wishlistAppIds.length === 0));
      return userdataCacheTtlMs(empty);
    }
    return cacheTtlMs();
  }

  function isCacheEntryExpired(key, entry) {
    if (!entry?.ts) return true;
    const ttl = cacheEntryTtlMs(key, entry);
    if (!ttl) return true;
    return Date.now() - entry.ts > ttl;
  }

  function isCacheEntryPartial(key, entry) {
    if (isCacheEntryExpired(key, entry)) return true;
    if (!isSteamGameResolveKey(key)) return false;
    const data = entry?.data;
    if (!data?.found) return true;
    // Lite list/card resolves are stored without tags.
    return data.tagsLoaded !== true;
  }

  function cacheEntryByteSize(key, entry) {
    try {
      const raw = JSON.stringify(entry);
      if (typeof TextEncoder !== 'undefined') {
        const enc = new TextEncoder();
        return enc.encode(String(key)).length + enc.encode(raw).length;
      }
      return String(key).length + String(raw).length;
    } catch (_) {
      return 0;
    }
  }

  function formatCacheBytes(n) {
    const bytes = Math.max(0, Number(n) || 0);
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function getCacheUsageStats() {
    const store = readCacheStore();
    let fullBytes = 0;
    let partialBytes = 0;
    let fullCount = 0;
    let partialCount = 0;
    for (const key of Object.keys(store)) {
      const entry = store[key];
      const bytes = cacheEntryByteSize(key, entry);
      if (isCacheEntryPartial(key, entry)) {
        partialBytes += bytes;
        partialCount += 1;
      } else {
        fullBytes += bytes;
        fullCount += 1;
      }
    }
    const usedBytes = fullBytes + partialBytes;
    const limitBytes = CACHE_SOFT_LIMIT_BYTES;
    const freeBytes = Math.max(0, limitBytes - usedBytes);
    return {
      fullBytes,
      partialBytes,
      freeBytes,
      usedBytes,
      limitBytes,
      fullCount,
      partialCount,
      totalCount: fullCount + partialCount,
    };
  }

  function getCacheEntryCount() {
    return getCacheUsageStats().totalCount;
  }

  function cacheMeterPct(part, denom) {
    if (!denom) return 0;
    return Math.max(0, Math.min(100, (part / denom) * 100));
  }

  function buildCacheMeterHtml(stats) {
    const s = stats || getCacheUsageStats();
    const denom = Math.max(s.usedBytes, s.limitBytes, 1);
    const fullPct = cacheMeterPct(s.fullBytes, denom);
    const partialPct = cacheMeterPct(s.partialBytes, denom);
    const freePct = cacheMeterPct(s.freeBytes, denom);
    const aria = fmt(t.cacheBarAria, {
      full: formatCacheBytes(s.fullBytes),
      partial: formatCacheBytes(s.partialBytes),
      free: formatCacheBytes(s.freeBytes),
    });
    const legendFull = fmt(t.cacheBarLegend, {
      label: t.cacheBarFull,
      count: s.fullCount,
      size: formatCacheBytes(s.fullBytes),
    });
    const legendPartial = fmt(t.cacheBarLegend, {
      label: t.cacheBarPartial,
      count: s.partialCount,
      size: formatCacheBytes(s.partialBytes),
    });
    const freeLabel = `${t.cacheBarFree}: ${formatCacheBytes(s.freeBytes)}`;
    return `
      <div class="blp-cache-meter" data-blp-cache-meter>
        <div class="blp-cache-meter__head">
          <span class="blp-cache-meter__used">${escapeHtml(
            fmt(t.cacheBarUsed, {
              used: formatCacheBytes(s.usedBytes),
              limit: formatCacheBytes(s.limitBytes),
            })
          )}</span>
        </div>
        <div class="blp-cache-meter__bar" role="img" aria-label="${escapeAttr(aria)}">
          <span class="blp-cache-meter__seg blp-cache-meter__seg--full" style="width:${fullPct}%"></span>
          <span class="blp-cache-meter__seg blp-cache-meter__seg--partial" style="width:${partialPct}%"></span>
          <span class="blp-cache-meter__seg blp-cache-meter__seg--free" style="width:${freePct}%"></span>
        </div>
        <ul class="blp-cache-meter__legend">
          <li><span class="blp-cache-meter__swatch blp-cache-meter__swatch--full"></span>${escapeHtml(legendFull)}</li>
          <li><span class="blp-cache-meter__swatch blp-cache-meter__swatch--partial"></span>${escapeHtml(legendPartial)}</li>
          <li><span class="blp-cache-meter__swatch blp-cache-meter__swatch--free"></span>${escapeHtml(freeLabel)}</li>
        </ul>
        <p class="blp-hint">${escapeHtml(t.cacheBarHint)}</p>
      </div>
    `;
  }

  function paintCacheMeter(root) {
    const current = root?.querySelector?.('[data-blp-cache-meter]');
    if (!current) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = buildCacheMeterHtml(getCacheUsageStats()).trim();
    const next = wrap.firstElementChild;
    if (next) current.replaceWith(next);
  }

  function clearCache() {
    const count = getCacheEntryCount();
    cacheStore = {};
    try {
      GM_setValue(CACHE_KEY, {});
    } catch (_) {
      /* ignore */
    }
    return count;
  }

  /** Wipe lookup cache when the userscript version changes (stale payloads / schema). */
  function migrateCacheForScriptVersion() {
    let stored = null;
    try {
      stored = GM_getValue(CACHE_VERSION_KEY, null);
    } catch (_) {
      stored = null;
    }
    if (stored === SCRIPT_VERSION) return false;
    clearCache();
    try {
      GM_setValue(CACHE_VERSION_KEY, SCRIPT_VERSION);
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      const req = {
        method: options.method || 'GET',
        url: options.url,
        headers: options.headers || {},
        responseType: options.responseType || 'json',
        timeout: options.timeout || 20000,
        onload(res) {
          if (options.allow404 && res.status === 404) {
            resolve(null);
            return;
          }
          if (res.status >= 200 && res.status < 300) {
            const type = options.responseType || 'json';
            // Tampermonkey/Violentmonkey: text bodies are reliable on responseText.
            if (type === 'text') {
              resolve(
                res.responseText != null && res.responseText !== ''
                  ? res.responseText
                  : res.response
              );
            } else {
              resolve(res.response);
            }
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout')),
      };
      if (typeof options.anonymous === 'boolean') {
        req.anonymous = options.anonymous;
      }
      GM_xmlhttpRequest(req);
    });
  }

  function injectStyles() {
    GM_addStyle(`
      :root {
        --blp-accent: #3db89a;
        --blp-text: #e8eaed;
        --blp-muted: #9aa0a6;
        --blp-border: rgba(255, 255, 255, 0.08);
        --blp-mc-high: #6c3;
        --blp-mc-mid: #fc3;
        --blp-mc-low: #f67;
        --blp-rev-overwhelming: #66c0f4;
        --blp-rev-positive: #66c0f4;
        --blp-rev-mixed: #b9a404;
        --blp-rev-negative: #c35c2c;
        --blp-owned: #beee11;
        --blp-owned-bg: #3d4f1a;
        --blp-owned-border: rgba(190, 238, 17, 0.35);
        --blp-wishlist: #67c1f5;
        --blp-wishlist-bg: #2a4a63;
        --blp-wishlist-border: rgba(103, 193, 245, 0.4);
        --blp-gs-cracked: #beee11;
        --blp-gs-cracked-bg: #4c6b22;
        --blp-gs-bypass: #ffb321;
        --blp-gs-bypass-bg: #5a4630;
        --blp-gs-pending: #ffb321;
        --blp-gs-pending-bg: #5a4630;
        --blp-gs-old: #fecaca;
        --blp-gs-old-bg: #5a3030;
        --blp-gs-today: #67c1f5;
        --blp-gs-today-bg: #2a4a63;
        --blp-gs-unknown: #b0aeac;
        --blp-gs-unknown-bg: #3a4149;
        --blp-skel: rgba(128, 128, 128, 0.22);
        --blp-skel-shine: rgba(255, 255, 255, 0.18);
      }

      [${ENRICH_ATTR}] .blp-ext-link,
      .blp-settings .blp-toggle__label {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        vertical-align: middle;
      }

      [${ENRICH_ATTR}] .blp-favicon,
      .blp-settings .blp-favicon {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        flex: 0 0 auto;
        object-fit: contain;
      }

      #blp-steam-backloggd-btn {
        margin-right: 2px;
      }

      #blp-steam-backloggd-btn img.ico16 {
        width: 16px;
        height: 16px;
        vertical-align: middle;
        border-radius: 2px;
      }

      #blp-nav-settings {
        white-space: nowrap;
        vertical-align: middle;
      }

      #add-a-game + #blp-nav-settings {
        min-height: var(--blp-nav-btn-h, unset);
      }

      #blp-nav-settings.nav-item,
      li.nav-item > #blp-nav-settings {
        margin-left: 0.5rem;
      }

      #game-profile h1 .blp-title-icon,
      .game-title-section h1 .blp-title-icon,
      h1 .blp-title-icon {
        width: 32px;
        height: 32px;
        vertical-align: middle;
        margin-right: 0.45em;
        border-radius: 5px;
        object-fit: cover;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
      }

      .col-cover .blp-steamdb-cover,
      #logging-sidebar-section .blp-steamdb-cover,
      .blp-steamdb-cover {
        margin-top: 0.75rem;
        width: 100%;
        max-width: 100%;
      }

      .blp-steamdb-cover a {
        display: block;
        line-height: 0;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.25);
      }

      .blp-steamdb-cover img {
        display: block;
        width: 100%;
        height: auto;
        max-height: none;
        object-fit: cover;
        object-position: center top;
        background: #1a1d24;
      }

      .blp-steamdb-cover img.blp-steamdb-cover__logo {
        max-height: 110px;
        object-fit: contain;
        object-position: center;
        padding: 0.65rem 0.5rem;
        background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06), transparent 65%);
      }

      [${ENRICH_ATTR}="players"] .blp-players-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        padding: 0.12em 0.55em 0.14em;
        border-radius: 4px;
        font-size: 0.82em;
        font-weight: 700;
        line-height: 1.45;
        text-decoration: none !important;
        color: #67c1f5 !important;
        background: linear-gradient(180deg, #355a78 0%, #2a4a63 100%);
        border: 1px solid rgba(103, 193, 245, 0.35);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        width: fit-content;
        white-space: nowrap;
      }

      [${ENRICH_ATTR}="players"] .blp-players-badge__dot {
        width: 0.45em;
        height: 0.45em;
        border-radius: 50%;
        background: currentColor;
        flex: 0 0 auto;
        box-shadow: 0 0 6px currentColor;
      }

      [${ENRICH_ATTR}] .blp-mc-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.85em;
        padding: 0.18em 0.42em;
        border-radius: 3px;
        font-size: 0.88em;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.01em;
        line-height: 1.2;
        text-decoration: none !important;
        vertical-align: middle;
        white-space: nowrap;
        width: fit-content;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
      }

      [${ENRICH_ATTR}] .blp-mc-badge--high {
        background: var(--blp-mc-high);
        color: #14200a !important;
        border: 1px solid rgba(102, 204, 51, 0.55);
      }

      [${ENRICH_ATTR}] .blp-mc-badge--mid {
        background: var(--blp-mc-mid);
        color: #2a2200 !important;
        border: 1px solid rgba(255, 204, 51, 0.55);
      }

      [${ENRICH_ATTR}] .blp-mc-badge--low {
        background: var(--blp-mc-low);
        color: #2a0a12 !important;
        border: 1px solid rgba(255, 102, 119, 0.5);
      }

      [${ENRICH_ATTR}] .blp-review--overwhelming,
      [${ENRICH_ATTR}] .blp-review--very-positive { color: var(--blp-rev-overwhelming) !important; font-weight: 600; }
      [${ENRICH_ATTR}] .blp-review--positive,
      [${ENRICH_ATTR}] .blp-review--mostly-positive { color: var(--blp-rev-positive) !important; font-weight: 600; }
      [${ENRICH_ATTR}] .blp-review--mixed { color: var(--blp-rev-mixed) !important; font-weight: 600; }
      [${ENRICH_ATTR}] .blp-review--mostly-negative,
      [${ENRICH_ATTR}] .blp-review--negative,
      [${ENRICH_ATTR}] .blp-review--very-negative,
      [${ENRICH_ATTR}] .blp-review--overwhelmingly-negative { color: var(--blp-rev-negative) !important; font-weight: 600; }

      [${ENRICH_ATTR}] .blp-discount {
        opacity: 0.75;
        margin-left: 0.15em;
      }

      [${ENRICH_ATTR}] .blp-steam-note {
        opacity: 0.65;
        font-size: 0.85em;
      }

      [${ENRICH_ATTR}] .blp-steam-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        justify-content: flex-end;
      }

      @media (min-width: 768px) {
        [${ENRICH_ATTR}] .blp-steam-tags {
          justify-content: flex-start;
        }
      }

      [${ENRICH_ATTR}] .blp-steam-tag {
        background: #1b2838;
        color: #66c0f4 !important;
        border: 1px solid rgba(102, 192, 244, 0.28);
        text-decoration: none !important;
      }

      [${ENRICH_ATTR}] .blp-steam-tag:hover {
        background: #2a475e;
        color: #fff !important;
      }

      [${ENRICH_ATTR}="steam"] {
        align-items: flex-start;
      }

      [${ENRICH_ATTR}="steam"] > [class*="col"] {
        margin-top: 0.35rem !important;
        margin-bottom: 0.35rem !important;
      }

      [${ENRICH_ATTR}="steam"] [data-blp-values] {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.4rem;
      }

      @media (min-width: 768px) {
        [${ENRICH_ATTR}="steam"] [data-blp-values] {
          align-items: flex-start;
        }
      }

      [${ENRICH_ATTR}="steam"] .blp-steam-line {
        display: block;
        line-height: 1.35;
      }

      [${ENRICH_ATTR}] .blp-owned-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.28em;
        padding: 0.1em 0.5em 0.12em;
        border-radius: 4px;
        border: 1px solid var(--blp-owned-border);
        background: linear-gradient(180deg, #4c6b22 0%, var(--blp-owned-bg) 100%);
        color: var(--blp-owned) !important;
        font-size: 0.78em;
        font-weight: 700;
        letter-spacing: 0.03em;
        line-height: 1.45;
        vertical-align: middle;
        white-space: nowrap;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        width: fit-content;
      }

      [${ENRICH_ATTR}] .blp-owned-badge__icon {
        width: 0.85em;
        height: 0.85em;
        flex: 0 0 auto;
      }

      [${ENRICH_ATTR}] .blp-wishlist-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.28em;
        padding: 0.1em 0.5em 0.12em;
        border-radius: 4px;
        border: 1px solid var(--blp-wishlist-border);
        background: linear-gradient(180deg, #3a5f7d 0%, var(--blp-wishlist-bg) 100%);
        color: var(--blp-wishlist) !important;
        font-size: 0.78em;
        font-weight: 700;
        letter-spacing: 0.03em;
        line-height: 1.45;
        vertical-align: middle;
        white-space: nowrap;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        width: fit-content;
      }

      [${ENRICH_ATTR}] .blp-steam-match {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem 0.55rem;
        margin-top: 0.15rem;
        font-size: 0.72rem;
        color: var(--blp-muted);
      }

      [${ENRICH_ATTR}] .blp-steam-match__btn,
      .blp-fix-match-backdrop .blp-btn {
        appearance: none;
        border: 1px solid var(--blp-border);
        background: rgba(255, 255, 255, 0.06);
        color: var(--blp-text);
        border-radius: 4px;
        padding: 0.15rem 0.45rem;
        font-size: 0.72rem;
        line-height: 1.3;
        cursor: pointer;
      }

      [${ENRICH_ATTR}] .blp-steam-match__btn:hover,
      .blp-fix-match-backdrop .blp-btn:hover {
        border-color: rgba(61, 184, 154, 0.45);
        color: #fff;
      }

      .blp-fix-match-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.55);
      }

      .blp-fix-match-dialog {
        width: min(420px, 100%);
        background: #1a1d24;
        border: 1px solid var(--blp-border);
        border-radius: 8px;
        padding: 1rem 1.1rem;
        color: var(--blp-text);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      }

      .blp-fix-match-dialog h3 {
        margin: 0 0 0.35rem;
        font-size: 1rem;
      }

      .blp-fix-match-dialog .blp-hint {
        margin: 0 0 0.75rem;
        color: var(--blp-muted);
        font-size: 0.78rem;
        line-height: 1.4;
      }

      .blp-fix-match-dialog input {
        width: 100%;
        margin-bottom: 0.65rem;
        padding: 0.4rem 0.5rem;
        border-radius: 4px;
        border: 1px solid var(--blp-border);
        background: #12151b;
        color: var(--blp-text);
      }

      .blp-fix-match-dialog .blp-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        justify-content: flex-end;
      }

      .blp-fix-match-dialog .blp-error {
        color: #f67;
        font-size: 0.75rem;
        margin: 0 0 0.5rem;
      }

      .game-cover {
        position: relative;
      }

      .game-cover .blp-card-badges {
        position: absolute;
        top: 0.28rem;
        left: 0.28rem;
        right: 0.28rem;
        z-index: 6;
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem;
        pointer-events: none;
      }

      .game-cover .blp-card-badges a,
      .game-cover .blp-card-badges button {
        pointer-events: auto;
      }

      .blp-card-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.2em;
        max-width: 100%;
        padding: 0.08em 0.38em;
        border-radius: 3px;
        font-size: 0.62rem;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: 0.02em;
        white-space: nowrap;
        text-decoration: none !important;
        color: #fff !important;
        background: rgba(20, 24, 30, 0.82);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }

      .blp-card-badge--price {
        background: rgba(26, 40, 56, 0.9);
      }

      .blp-card-badge--discount {
        color: #beee11 !important;
        border-color: rgba(190, 238, 17, 0.35);
      }

      .blp-card-badge--review {
        font-variant-numeric: tabular-nums;
      }

      .blp-card-badge--review.blp-review--overwhelming,
      .blp-card-badge--review.blp-review--very-positive,
      .blp-card-badge--review.blp-review--positive,
      .blp-card-badge--review.blp-review--mostly-positive {
        color: var(--blp-rev-overwhelming) !important;
        border-color: rgba(102, 192, 244, 0.4);
        background: rgba(42, 74, 99, 0.92);
      }

      .blp-card-badge--review.blp-review--mixed {
        color: var(--blp-rev-mixed) !important;
        border-color: rgba(185, 164, 4, 0.4);
        background: rgba(74, 64, 24, 0.92);
      }

      .blp-card-badge--review.blp-review--mostly-negative,
      .blp-card-badge--review.blp-review--negative,
      .blp-card-badge--review.blp-review--very-negative,
      .blp-card-badge--review.blp-review--overwhelmingly-negative {
        color: #fecaca !important;
        border-color: rgba(195, 92, 44, 0.45);
        background: rgba(90, 48, 40, 0.92);
      }

      .blp-card-badge--mc {
        font-variant-numeric: tabular-nums;
        font-weight: 800;
      }

      .blp-card-badge--mc-high {
        color: #1a1d24 !important;
        background: var(--blp-mc-high);
        border-color: transparent;
      }

      .blp-card-badge--mc-mid {
        color: #1a1d24 !important;
        background: var(--blp-mc-mid);
        border-color: transparent;
      }

      .blp-card-badge--mc-low {
        color: #fff !important;
        background: var(--blp-mc-low);
        border-color: transparent;
      }

      .blp-card-badge--owned {
        color: var(--blp-owned) !important;
        background: rgba(61, 79, 26, 0.92);
        border-color: var(--blp-owned-border);
      }

      .blp-card-badge--wishlist {
        color: var(--blp-wishlist) !important;
        background: rgba(42, 74, 99, 0.92);
        border-color: var(--blp-wishlist-border);
      }

      .blp-card-badge--gs {
        text-transform: none;
      }

      .blp-card-badge--gs.blp-gs-badge--cracked {
        color: var(--blp-gs-cracked) !important;
        background: rgba(76, 107, 34, 0.92);
      }

      .blp-card-badge--gs.blp-gs-badge--bypass,
      .blp-card-badge--gs.blp-gs-badge--not-cracked-recent {
        color: var(--blp-gs-pending) !important;
        background: rgba(90, 70, 48, 0.92);
      }

      .blp-card-badge--gs.blp-gs-badge--not-cracked-old {
        color: var(--blp-gs-old) !important;
        background: rgba(90, 48, 48, 0.92);
      }

      .blp-card-badge--gs.blp-gs-badge--release-today {
        color: var(--blp-gs-today) !important;
        background: rgba(42, 74, 99, 0.92);
      }

      .blp-card-badges.is-loading .blp-card-badge {
        min-width: 2.4rem;
        min-height: 0.95rem;
        background: linear-gradient(
          90deg,
          var(--blp-skel),
          var(--blp-skel-shine),
          var(--blp-skel)
        );
        background-size: 200% 100%;
        animation: blp-shimmer 1.1s ease-in-out infinite;
        border: 0;
      }

      [${ENRICH_ATTR}="gamestatus"] {
        align-items: flex-start;
      }

      [${ENRICH_ATTR}="gamestatus"] > [class*="col"] {
        margin-top: 0.35rem !important;
        margin-bottom: 0.35rem !important;
      }

      [${ENRICH_ATTR}="gamestatus"] [data-blp-values] {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.4rem;
      }

      @media (min-width: 768px) {
        [${ENRICH_ATTR}="gamestatus"] [data-blp-values] {
          align-items: flex-start;
        }
      }

      [${ENRICH_ATTR}] .blp-gs-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        padding: 0.12em 0.55em 0.14em;
        border-radius: 4px;
        font-size: 0.82em;
        font-weight: 700;
        line-height: 1.45;
        text-decoration: none !important;
        width: fit-content;
        white-space: nowrap;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      [${ENRICH_ATTR}] .blp-gs-badge__dot {
        width: 0.45em;
        height: 0.45em;
        border-radius: 50%;
        background: currentColor;
        flex: 0 0 auto;
      }

      [${ENRICH_ATTR}] .blp-gs-badge--cracked {
        color: var(--blp-gs-cracked) !important;
        background: linear-gradient(180deg, #5a7d28 0%, var(--blp-gs-cracked-bg) 100%);
        border: 1px solid rgba(190, 238, 17, 0.35);
      }

      [${ENRICH_ATTR}] .blp-gs-badge--bypass,
      [${ENRICH_ATTR}] .blp-gs-badge--not-cracked-recent {
        color: var(--blp-gs-bypass) !important;
        background: linear-gradient(180deg, #6a5538 0%, var(--blp-gs-bypass-bg) 100%);
        border: 1px solid rgba(255, 179, 33, 0.35);
      }

      [${ENRICH_ATTR}] .blp-gs-badge--not-cracked-old {
        color: var(--blp-gs-old) !important;
        background: linear-gradient(180deg, #6a3838 0%, var(--blp-gs-old-bg) 100%);
        border: 1px solid rgba(254, 202, 202, 0.3);
      }

      [${ENRICH_ATTR}] .blp-gs-badge--release-today {
        color: var(--blp-gs-today) !important;
        background: linear-gradient(180deg, #355a78 0%, var(--blp-gs-today-bg) 100%);
        border: 1px solid rgba(103, 193, 245, 0.35);
      }

      [${ENRICH_ATTR}] .blp-gs-badge--unknown,
      [${ENRICH_ATTR}] .blp-gs-badge--missing {
        color: var(--blp-gs-unknown) !important;
        background: linear-gradient(180deg, #4a5158 0%, var(--blp-gs-unknown-bg) 100%);
        border: 1px solid rgba(176, 174, 172, 0.25);
      }

      [${ENRICH_ATTR}] .blp-gs-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        justify-content: flex-end;
      }

      @media (min-width: 768px) {
        [${ENRICH_ATTR}] .blp-gs-chips {
          justify-content: flex-start;
        }
      }

      [${ENRICH_ATTR}] .blp-gs-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.08em 0.45em;
        border-radius: 3px;
        font-size: 0.72em;
        font-weight: 600;
        line-height: 1.4;
        white-space: nowrap;
      }

      [${ENRICH_ATTR}] .blp-gs-chip--protection {
        background: #2a3644;
        color: #acb2b8;
      }

      [${ENRICH_ATTR}] .blp-gs-chip--denuvo {
        background: #6b1f1f;
        color: #ff6b6b;
        border: 1px solid rgba(255, 107, 107, 0.35);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--cracked {
        background: var(--blp-gs-cracked-bg);
        color: var(--blp-gs-cracked);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--bypass,
      [${ENRICH_ATTR}] .blp-gs-chip--not-cracked-recent {
        background: var(--blp-gs-bypass-bg);
        color: var(--blp-gs-bypass);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--not-cracked-old {
        background: var(--blp-gs-old-bg);
        color: var(--blp-gs-old);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--release-today {
        background: var(--blp-gs-today-bg);
        color: var(--blp-gs-today);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--unknown {
        background: var(--blp-gs-unknown-bg);
        color: var(--blp-gs-unknown);
      }

      [${ENRICH_ATTR}] .blp-gs-chip--aaa {
        background: linear-gradient(to bottom, #66c0f4 5%, #417a9b 95%);
        color: #fff;
        font-weight: 700;
      }

      [${ENRICH_ATTR}] .blp-empty {
        opacity: 0.55;
      }

      [${ENRICH_ATTR}] .blp-skeleton {
        display: inline-block;
        height: 0.95em;
        border-radius: 4px;
        vertical-align: middle;
        background: linear-gradient(
          90deg,
          var(--blp-skel) 0%,
          var(--blp-skel-shine) 45%,
          var(--blp-skel) 90%
        );
        background-size: 200% 100%;
        animation: blp-shimmer 1.1s ease-in-out infinite;
      }

      [${ENRICH_ATTR}] .blp-skeleton--sm { width: 4.5rem; }
      [${ENRICH_ATTR}] .blp-skeleton--md { width: 8rem; }
      [${ENRICH_ATTR}] .blp-skeleton--lg { width: 12rem; }
      [${ENRICH_ATTR}] .blp-skeleton--link {
        width: 4.25rem;
        height: 1.1em;
        margin-right: 0.35rem;
      }

      @keyframes blp-shimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }

      .blp-settings-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000000;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }

      .blp-settings {
        width: min(440px, 100%);
        max-height: min(90vh, 720px);
        overflow: auto;
        background: #151921;
        color: var(--blp-text);
        border: 1px solid var(--blp-border);
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
        padding: 18px 18px 14px;
        font: 14px/1.45 system-ui, sans-serif;
      }

      .blp-settings h2 {
        margin: 0 0 4px;
        font-size: 18px;
      }

      .blp-settings__sub {
        margin: 0 0 16px;
        color: var(--blp-muted);
        font-size: 13px;
      }

      .blp-settings section {
        margin-bottom: 14px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--blp-border);
      }

      .blp-settings section:last-of-type {
        border-bottom: none;
      }

      .blp-settings h3 {
        margin: 0 0 10px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--blp-muted);
      }

      .blp-field {
        margin-bottom: 10px;
      }

      .blp-field label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
      }

      .blp-field select,
      .blp-field input[type="number"] {
        width: 100%;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--blp-border);
        background: #0f1319;
        color: var(--blp-text);
      }

      .blp-hint {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--blp-muted);
      }

      .blp-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--blp-border);
        background: #0f1319;
        color: var(--blp-text);
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.2;
      }

      .blp-btn:hover {
        border-color: rgba(61, 184, 154, 0.45);
        color: var(--blp-accent);
      }

      .blp-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
      }

      .blp-toggle button {
        min-width: 52px;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid var(--blp-border);
        background: #0f1319;
        color: var(--blp-text);
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }

      .blp-toggle button.is-on {
        border-color: rgba(61, 184, 154, 0.6);
        color: var(--blp-accent);
      }

      .blp-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .blp-actions button {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--blp-border);
        background: #0f1319;
        color: var(--blp-text);
        cursor: pointer;
        font: inherit;
        font-size: 13px;
      }

      .blp-actions button.blp-primary {
        background: var(--blp-accent);
        border-color: transparent;
        color: #0b1210;
        font-weight: 600;
      }

      .blp-settings__ver {
        margin-left: 0.4em;
        font-size: 0.72em;
        font-weight: 500;
        color: var(--blp-muted);
        vertical-align: middle;
      }

      .blp-settings__footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--blp-border);
        font-size: 12px;
        color: var(--blp-muted);
      }

      .blp-settings__footer a {
        color: var(--blp-accent);
      }

      .blp-cache-msg {
        margin-top: 6px;
        font-size: 12px;
        color: var(--blp-accent);
      }

      .blp-cache-meter {
        margin: 0 0 12px;
      }

      .blp-cache-meter__head {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 6px;
      }

      .blp-cache-meter__used {
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        color: var(--blp-muted);
      }

      .blp-cache-meter__bar {
        display: flex;
        height: 10px;
        border-radius: 6px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--blp-border);
      }

      .blp-cache-meter__seg {
        display: block;
        height: 100%;
        min-width: 0;
        transition: width 0.2s ease;
      }

      .blp-cache-meter__seg--full {
        background: var(--blp-accent);
      }

      .blp-cache-meter__seg--partial {
        background: var(--blp-gs-bypass);
      }

      .blp-cache-meter__seg--free {
        background: transparent;
      }

      .blp-cache-meter__legend {
        list-style: none;
        margin: 8px 0 0;
        padding: 0;
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: var(--blp-muted);
        font-variant-numeric: tabular-nums;
      }

      .blp-cache-meter__legend li {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .blp-cache-meter__swatch {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex: 0 0 auto;
      }

      .blp-cache-meter__swatch--full {
        background: var(--blp-accent);
      }

      .blp-cache-meter__swatch--partial {
        background: var(--blp-gs-bypass);
      }

      .blp-cache-meter__swatch--free {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid var(--blp-border);
      }

      .blp-debug-panel {
        margin: 1rem 0 1.25rem;
        padding: 0.75rem 0.85rem;
        border-radius: 8px;
        border: 1px dashed rgba(255, 179, 33, 0.45);
        background: rgba(0, 0, 0, 0.32);
        text-align: left;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .blp-debug-panel__title {
        margin: 0 0 0.55rem;
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #ffb321;
      }

      .blp-debug-panel__section {
        margin-bottom: 0.65rem;
      }

      .blp-debug-panel__label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #ffb321;
        margin-bottom: 0.25rem;
      }

      .blp-debug-panel__reason {
        display: block;
        font-size: 0.82rem;
        color: var(--blp-text);
        margin-bottom: 0.35rem;
        word-break: break-word;
      }

      .blp-debug-panel__sources {
        list-style: none;
        margin: 0 0 0.45rem;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .blp-debug-panel__source-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .blp-debug-panel__source-group-title {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #c9a227;
        margin: 0;
      }

      .blp-debug-panel__source-group-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .blp-debug-panel__source-group-list li {
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
      }

      .blp-debug-panel__source-group-list li.is-request {
        padding-left: 0.4rem;
        border-left: 2px solid #ffb321;
      }

      .blp-debug-panel__source-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.25rem 0.45rem;
        font-size: 0.78rem;
        line-height: 1.35;
        color: var(--blp-text);
      }

      .blp-debug-panel__source-head strong {
        color: #ffb321;
        font-weight: 700;
      }

      .blp-debug-panel__source-badge {
        display: inline-block;
        flex-shrink: 0;
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #1a1d24;
        background: #ffb321;
        padding: 0.08rem 0.32rem;
        border-radius: 3px;
        line-height: 1.2;
      }

      .blp-debug-panel__source-purpose {
        color: var(--blp-muted);
        font-size: 0.74rem;
      }

      .blp-debug-panel__sources a {
        color: #67c1f5 !important;
        text-decoration: underline !important;
        word-break: break-all;
        font-size: 0.74rem;
        line-height: 1.35;
      }

      .blp-debug-panel__sources a:hover {
        color: #9ad4f8 !important;
      }

      .blp-debug-panel__meta {
        font-size: 0.75rem;
        color: var(--blp-muted);
        margin-bottom: 0.35rem;
      }

      .blp-debug-panel__pre {
        margin: 0;
        padding: 0.5rem 0.55rem;
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.4);
        color: #b0aeac;
        font-size: 0.68rem;
        line-height: 1.35;
        overflow: auto;
        max-height: 28rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `);
  }

  function getPageContext() {
    const path = location.pathname || '/';
    const gameMatch = path.match(/^\/games\/([^/]+)\/?/i);
    return {
      path,
      isGamePage: Boolean(gameMatch) && !!document.getElementById('game-body'),
      slug: gameMatch ? gameMatch[1].toLowerCase() : '',
      isProfile: /^\/u\/[^/]+\/?/.test(path),
      isSearch: path.startsWith('/search'),
    };
  }

  function getGameTitle() {
    const h1 = document.querySelector('#game-profile h1, #center-content h1, main h1');
    return (h1?.textContent || '').trim();
  }

  function getIgdbUrl(slug) {
    const link = document.querySelector('a[href*="igdb.com/games/"]');
    if (link?.href) return link.href.split('?')[0];
    if (slug) return `https://www.igdb.com/games/${encodeURIComponent(slug)}`;
    return '';
  }

  /**
   * Valid roman numeral token (1–3999). Used so "Baldur's Gate III" ≈ "Baldur's Gate 3".
   * Bare "i" is only converted when it is not the first token (avoids "I Am Alive" → "1 am alive").
   */
  const ROMAN_TOKEN_RE =
    /^(?=.*[ivxlcdm])(?=[mdclxvi]+$)m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

  function romanTokenToArabic(token, { allowLoneI = false } = {}) {
    const t = String(token || '').toLowerCase();
    if (!ROMAN_TOKEN_RE.test(t)) return null;
    if (t === 'i' && !allowLoneI) return null;
    const map = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    let total = 0;
    for (let i = 0; i < t.length; i += 1) {
      const value = map[t[i]];
      const next = map[t[i + 1]];
      total += next > value ? -value : value;
    }
    return total > 0 ? total : null;
  }

  function normalizeTitle(name) {
    const base = String(name || '')
      .toLowerCase()
      .replace(/[™®©]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!base) return '';
    const parts = base.split(/\s+/).filter(Boolean);
    return parts
      .map((tok, idx) => {
        const arabic = romanTokenToArabic(tok, { allowLoneI: idx > 0 });
        return arabic != null ? String(arabic) : tok;
      })
      .join(' ');
  }

  function titleTokens(name) {
    return normalizeTitle(name).split(/\s+/).filter(Boolean);
  }

  function isLikelyExtra(name) {
    return /\b(dlc|soundtrack|ost|bundle|pack|edition upgrade|cosmetic)\b/i.test(name);
  }

  function isBenignTitlePrefixToken(token) {
    return /^(the|a|an|official|new)$/i.test(token);
  }

  /** Tokens/phrases that are editions or platforms — not a different game. */
  const EDITION_SUFFIX_RE =
    /^(game of the year|goty|definitive( edition)?|complete( edition)?|remastered|remake|deluxe( edition)?|ultimate( edition)?|gold( edition)?|standard( edition)?|premium( edition)?|collector'?s?( edition)?|anniversary( edition)?|enhanced( edition)?|director'?s cut|redux|legacy( edition)?|hd|vr|launcher|for windows( 10)?|pc( edition)?|windows|edition|collection)$/i;

  function isEditionOnlySuffix(text) {
    const raw = normalizeTitle(text);
    if (!raw) return true;
    if (EDITION_SUFFIX_RE.test(raw)) return true;
    // Allow chained edition words: "goty edition", "definitive edition"
    const parts = raw.split(/\s+/);
    let i = 0;
    while (i < parts.length) {
      let matched = false;
      for (let len = Math.min(4, parts.length - i); len >= 1; len -= 1) {
        const chunk = parts.slice(i, i + len).join(' ');
        if (EDITION_SUFFIX_RE.test(chunk)) {
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }

  function stripEditionSuffix(normalized) {
    const tokens = String(normalized || '')
      .split(/\s+/)
      .filter(Boolean);
    while (tokens.length) {
      let stripped = false;
      for (let len = Math.min(4, tokens.length); len >= 1; len -= 1) {
        const chunk = tokens.slice(tokens.length - len).join(' ');
        if (EDITION_SUFFIX_RE.test(chunk)) {
          tokens.splice(tokens.length - len, len);
          stripped = true;
          break;
        }
      }
      if (!stripped) break;
    }
    return tokens.join(' ');
  }

  function indexOfTokenSequence(haystack, needle) {
    if (!needle.length || needle.length > haystack.length) return -1;
    for (let i = 0; i <= haystack.length - needle.length; i += 1) {
      let ok = true;
      for (let j = 0; j < needle.length; j += 1) {
        if (haystack[i + j] !== needle[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    return -1;
  }

  /**
   * Score how well a Steam app title matches the Backloggd title.
   * Rejects spin-offs that merely start with the name (Minecraft → Minecraft Dungeons).
   */
  function scoreSteamTitleMatch(steamName, targetTitle) {
    const steam = normalizeTitle(steamName);
    const target = normalizeTitle(targetTitle);
    if (!steam || !target) return 0;
    if (steam === target) return 100;

    const steamCore = stripEditionSuffix(steam);
    const targetCore = stripEditionSuffix(target);
    if (steamCore && targetCore && steamCore === targetCore) return 95;

    // "Celeste" + "goty" / "definitive edition" — OK. "Minecraft" + "dungeons" — not OK.
    if (steam.startsWith(`${target} `) && isEditionOnlySuffix(steam.slice(target.length).trim())) {
      return 90;
    }
    if (
      steamCore &&
      targetCore &&
      steamCore.startsWith(`${targetCore} `) &&
      isEditionOnlySuffix(steamCore.slice(targetCore.length).trim())
    ) {
      return 88;
    }

    const st = titleTokens(steamCore || steam);
    const tt = titleTokens(targetCore || target);
    // Multi-word titles: allow leading "the"/"a" and trailing edition-only tokens.
    if (tt.length >= 2) {
      const idx = indexOfTokenSequence(st, tt);
      if (idx >= 0) {
        const before = st.slice(0, idx);
        const after = st.slice(idx + tt.length);
        if (before.every(isBenignTitlePrefixToken) && isEditionOnlySuffix(after.join(' '))) {
          return 85;
        }
      }
    }

    return 0;
  }

  const STEAM_TITLE_MATCH_MIN_SCORE = 85;

  function pickSteamSearchItem(items, title) {
    const list = (items || []).filter((i) => i && i.type === 'app' && i.id);
    if (!list.length) return null;

    const nonExtra = list.filter((i) => !isLikelyExtra(i.name));
    const pool = nonExtra.length ? nonExtra : list;

    let best = null;
    let bestScore = 0;
    for (const item of pool) {
      const score = scoreSteamTitleMatch(item.name, title);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return bestScore >= STEAM_TITLE_MATCH_MIN_SCORE ? best : null;
  }

  function mcScoreTier(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return '';
    if (n >= 75) return 'high';
    if (n >= 50) return 'mid';
    return 'low';
  }

  function renderMetacriticBadge(score, url) {
    const tier = mcScoreTier(score);
    const cls = `blp-mc-badge${tier ? ` blp-mc-badge--${tier}` : ''}`;
    const label = escapeHtml(String(score));
    if (url) {
      return `<a class="${cls} blp-ext-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    return `<span class="${cls}">${label}</span>`;
  }

  /** Steam review_score: 1..9 (Overwhelmingly Negative → Overwhelmingly Positive). */
  function reviewScoreClass(summary) {
    const score = Number(summary?.review_score);
    if (!Number.isFinite(score) || score <= 0) {
      // Fallback from positive % when score is missing
      if (!summary?.total_reviews) return '';
      const pct = (summary.total_positive / summary.total_reviews) * 100;
      if (pct >= 80) return 'blp-review--very-positive';
      if (pct >= 70) return 'blp-review--mostly-positive';
      if (pct >= 40) return 'blp-review--mixed';
      return 'blp-review--mostly-negative';
    }
    const map = {
      1: 'blp-review--overwhelmingly-negative',
      2: 'blp-review--very-negative',
      3: 'blp-review--negative',
      4: 'blp-review--mostly-negative',
      5: 'blp-review--mixed',
      6: 'blp-review--mostly-positive',
      7: 'blp-review--positive',
      8: 'blp-review--very-positive',
      9: 'blp-review--overwhelming',
    };
    return map[score] || '';
  }

  function formatReviewPercent(summary) {
    if (!summary || !summary.total_reviews) return null;
    const pct = Math.round((summary.total_positive / summary.total_reviews) * 100);
    const desc = summary.review_score_desc || '';
    return desc ? `${desc} (${pct}%)` : `${pct}%`;
  }

  function formatReviewPercentCompact(summary) {
    if (!summary || !summary.total_reviews) return null;
    return `${Math.round((summary.total_positive / summary.total_reviews) * 100)}%`;
  }

  function faviconForUrl(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return FAVICON_URL.replace('{domain}', encodeURIComponent(host));
    } catch (_) {
      return '';
    }
  }

  function formatPriceText(steam) {
    if (!steam?.found) return null;
    if (steam.isFree) return t.free;
    if (!steam.price) return null;
    let priceText = steam.price.final_formatted || '';
    if (!priceText && Number.isFinite(steam.price.final)) {
      priceText = (steam.price.final / 100).toFixed(2);
      if (steam.price.currency) priceText = `${priceText} ${steam.price.currency}`;
    }
    return priceText || null;
  }

  async function hydrateSteamApp({
    appId,
    country,
    hit = null,
    anonymous = true,
    usedUsFallback = false,
    requestedCountry,
    onPartial,
    includeTags = true,
    debugBase = null,
    cacheKey = '',
    manualOverride = false,
  }) {
    const id = Number(appId);
    const detailsCountry = String(country || 'US').toUpperCase();
    const reqCountry = String(requestedCountry || detailsCountry).toUpperCase();
    const debugOn = Boolean(settings.debugMode);
    const debug = debugBase || {
      appId: id,
      country: reqCountry,
      cacheKey,
      cacheSkipped: debugOn,
      manualOverride,
    };

    const detailsUrl =
      `${STEAM_DETAILS_URL}?appids=${id}` +
      `&cc=${encodeURIComponent(detailsCountry)}&l=english`;
    const reviewsUrl =
      `${STEAM_REVIEWS_URL}/${id}?json=1&language=all` +
      `&purchase_type=all&num_per_page=0`;
    debug.detailsUrl = detailsUrl;
    debug.reviewsUrl = reviewsUrl;
    debug.manualOverride = Boolean(manualOverride);

    const needTags = includeTags && settings.showSteamTags !== false;
    if (needTags) {
      const tagsInput = JSON.stringify({
        ids: [{ appid: id }],
        context: {
          language: 'english',
          country_code: detailsCountry,
          steam_realm: 1,
        },
        data_request: { include_tag_count: STEAM_TAGS_MAX },
      });
      debug.tagsUrl = `${STEAM_STORE_ITEMS_URL}?input_json=${encodeURIComponent(tagsInput)}`;
      debug.tagMapUrl = STEAM_POPULAR_TAGS_URL;
    }

    const detailsPromise = gmRequest({ url: detailsUrl, anonymous });
    const reviewsPromise = gmRequest({ url: reviewsUrl, anonymous }).catch((err) => {
      debug.reviewsError = String(err?.message || err);
      return null;
    });
    const tagsPromise = needTags
      ? fetchSteamAppTags(id, detailsCountry).catch((err) => {
          debug.tagsError = String(err?.message || err);
          return [];
        })
      : Promise.resolve([]);

    let detailsRoot = null;
    try {
      detailsRoot = await detailsPromise;
    } catch (err) {
      debug.reason = `Steam details failed: ${err?.message || err}`;
      return { found: false, manualOverride: Boolean(manualOverride), _debug: debug };
    }

    let reviews = null;
    let tags = [];
    let canEmit = false;

    const buildPayload = () => {
      const details = detailsRoot?.[id]?.success ? detailsRoot[id].data : null;
      const sourceBits = manualOverride
        ? ['manual App ID', detailsCountry]
        : [
            anonymous ? 'guest items' : 'session items',
            usedUsFallback ? `US fallback (requested ${reqCountry})` : detailsCountry,
          ];
      debug.reason = details
        ? `Matched Steam app ${id} (${sourceBits.join(', ')})`
        : `App ${id} resolved, but appdetails success=false`;
      debug.detailsSuccess = Boolean(detailsRoot?.[id]?.success);
      debug.detailsCountry = detailsCountry;
      debug.reviews = reviews?.query_summary || null;
      debug.tags = tags;
      return {
        found: Boolean(details) || Boolean(hit),
        appId: id,
        name: details?.name || hit?.name || `App ${id}`,
        storeUrl: `https://store.steampowered.com/app/${id}/`,
        isFree: Boolean(details?.is_free),
        price: details?.price_overview || hit?.price || null,
        metacritic:
          details?.metacritic || (hit?.metascore ? { score: Number(hit.metascore) } : null),
        recommendations: details?.recommendations?.total || null,
        reviews: reviews?.query_summary || null,
        tags,
        tinyImage: hit?.tiny_image || hit?.small_capsule || null,
        headerImage: details?.header_image || null,
        usedUsFallback: Boolean(usedUsFallback),
        requestedCountry: reqCountry,
        searchCountry: detailsCountry,
        manualOverride: Boolean(manualOverride),
        _debug: debug,
      };
    };

    const emitPartial = () => {
      if (!canEmit || typeof onPartial !== 'function') return;
      onPartial(buildPayload());
    };

    const reviewsReady = reviewsPromise.then((value) => {
      reviews = value;
      emitPartial();
      return value;
    });
    const tagsReady = tagsPromise.then((value) => {
      tags = value || [];
      emitPartial();
      return tags;
    });

    canEmit = true;
    emitPartial();
    await Promise.all([reviewsReady, tagsReady]);

    const payload = buildPayload();
    if (!detailsRoot?.[id]?.success && !hit) {
      payload.found = false;
    }
    // Persist Steam resolves. Lite (list cards) may write tagsLoaded=false, but must not
    // overwrite a still-valid full entry (tagsLoaded=true) — that caused missing tags after
    // visiting a list before the game page.
    if (!debugOn && cacheKey && payload.found) {
      persistSteamResolveCache(cacheKey, payload, includeTags);
    }
    return payload;
  }

  function persistSteamResolveCache(cacheKey, payload, includeTags) {
    if (!cacheKey || !payload?.found || !cacheTtlMs()) return;
    const { _debug, ...store } = payload;
    if (includeTags) {
      store.tagsLoaded = true;
      setCached(cacheKey, store);
      return;
    }
    store.tagsLoaded = false;
    const existing = readCacheStore()[cacheKey];
    if (
      existing?.data?.found &&
      existing.data.tagsLoaded === true &&
      !isCacheEntryExpired(cacheKey, existing)
    ) {
      return;
    }
    setCached(cacheKey, store);
  }

  function cachedSteamNeedsTagBackfill(cached, includeTags) {
    if (!includeTags || settings.showSteamTags === false) return false;
    if (!cached?.found || cached.appId == null) return false;
    return cached.tagsLoaded !== true;
  }

  async function backfillSteamTags(cached, country) {
    const tags = await fetchSteamAppTags(cached.appId, country).catch(() => []);
    return {
      ...cached,
      tags: Array.isArray(tags) ? tags : [],
      tagsLoaded: true,
    };
  }

  async function readSteamCacheOrBackfill(cacheKey, { includeTags, country, manualOverride }) {
    const cached = getCached(cacheKey);
    if (!cached) return null;
    let result = {
      ...cached,
      manualOverride: Boolean(manualOverride || cached.manualOverride),
    };
    if (cachedSteamNeedsTagBackfill(result, includeTags)) {
      result = await backfillSteamTags(result, country);
      const { _debug, ...store } = result;
      setCached(cacheKey, store);
    }
    return result;
  }

  async function fetchSteamByAppId(appId, country, { onPartial, includeTags = true, manualOverride = false } = {}) {
    const id = Number(appId);
    if (!Number.isFinite(id) || id <= 0) {
      return { found: false, _debug: { reason: 'Invalid Steam App ID' } };
    }
    const requestedCountry = String(country || 'US').toUpperCase();
    const cacheKey = `steam:id:${requestedCountry}:${id}`;
    const inflightKey = includeTags ? cacheKey : `${cacheKey}:lite`;
    const debugOn = Boolean(settings.debugMode);
    if (!debugOn) {
      const cached = await readSteamCacheOrBackfill(cacheKey, {
        includeTags,
        country: requestedCountry,
        manualOverride,
      });
      if (cached) return cached;
    }
    if (inflight.has(inflightKey)) return inflight.get(inflightKey);

    const task = hydrateSteamApp({
      appId: id,
      country: requestedCountry,
      requestedCountry,
      anonymous: true,
      onPartial,
      includeTags,
      cacheKey,
      manualOverride,
      debugBase: {
        appId: id,
        country: requestedCountry,
        cacheKey,
        cacheSkipped: debugOn,
        manualOverride: Boolean(manualOverride),
        searches: [],
      },
    });

    inflight.set(inflightKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(inflightKey);
    }
  }

  function steamMissKey(title, slug, country) {
    const cc = String(country || 'US').toUpperCase();
    const overrideId = getSteamOverride(slug);
    if (overrideId) return `id:${cc}:${overrideId}`;
    return `title:${cc}:${normalizeTitle(title)}`;
  }

  async function resolveSteamForGame({ title, slug, country, onPartial, includeTags = true }) {
    const missKey = steamMissKey(title, slug, country);
    if (steamResolveMissMemory.has(missKey)) {
      return {
        found: false,
        _debug: { reason: 'Steam miss (session memory)', missKey },
      };
    }

    const overrideId = getSteamOverride(slug);
    let result;
    if (overrideId) {
      result = await fetchSteamByAppId(overrideId, country, {
        onPartial,
        includeTags,
        manualOverride: true,
      });
    } else {
      result = await fetchSteamBundle(title, country, { onPartial, includeTags });
    }

    if (!result?.found) steamResolveMissMemory.add(missKey);
    else steamResolveMissMemory.delete(missKey);
    return result;
  }

  async function fetchSteamBundle(title, country, { onPartial, includeTags = true } = {}) {
    const requestedCountry = String(country || 'US').toUpperCase();
    const cacheKey = `steam:${requestedCountry}:${normalizeTitle(title)}`;
    const inflightKey = includeTags ? cacheKey : `${cacheKey}:lite`;
    const debugOn = Boolean(settings.debugMode);
    if (!debugOn) {
      const cached = await readSteamCacheOrBackfill(cacheKey, {
        includeTags,
        country: requestedCountry,
        manualOverride: false,
      });
      if (cached) return cached;
    }

    if (inflight.has(inflightKey)) return inflight.get(inflightKey);

    const task = (async () => {
      const debug = {
        title,
        country: requestedCountry,
        cacheKey,
        cacheSkipped: debugOn,
        searches: [],
      };

      const buildSearchUrl = (cc) =>
        `${STEAM_SEARCH_URL}?term=${encodeURIComponent(title)}` +
        `&l=english&cc=${encodeURIComponent(cc)}`;

      const searchAs = async (cc, anonymous) => {
        const url = buildSearchUrl(cc);
        try {
          const search = await gmRequest({ url, anonymous });
          const items = Array.isArray(search?.items) ? search.items : [];
          return {
            ok: true,
            anonymous,
            country: cc,
            url,
            total: search?.total ?? items.length,
            items,
            summary: {
              anonymous,
              country: cc,
              url,
              total: search?.total ?? items.length,
              items: items.slice(0, 8).map((i) => ({
                id: i.id,
                name: i.name,
                type: i.type,
              })),
            },
          };
        } catch (err) {
          return {
            ok: false,
            anonymous,
            country: cc,
            url,
            items: [],
            summary: {
              anonymous,
              country: cc,
              url,
              error: String(err?.message || err),
            },
          };
        }
      };

      const mergeSearchResults = (sessionResult, guestResult) => {
        const byId = new Map();
        for (const item of [...(sessionResult.items || []), ...(guestResult.items || [])]) {
          if (!item?.id) continue;
          if (!byId.has(item.id)) byId.set(item.id, item);
        }
        const mergedItems = [...byId.values()];
        const hit = pickSteamSearchItem(mergedItems, title) || null;
        const sessionIds = new Set(
          (sessionResult.items || []).map((i) => i?.id).filter(Boolean)
        );
        const anonymous = hit
          ? !sessionIds.has(hit.id)
          : Boolean(guestResult.ok && !sessionResult.ok);
        return { hit, mergedItems, anonymous };
      };

      const runParallelSearch = async (cc) => {
        const [sessionResult, guestResult] = await Promise.all([
          searchAs(cc, false),
          searchAs(cc, true),
        ]);
        debug.searches.push(sessionResult.summary, guestResult.summary);
        return {
          ...mergeSearchResults(sessionResult, guestResult),
          sessionResult,
          guestResult,
          country: cc,
        };
      };

      let searchCountry = requestedCountry;
      let usedUsFallback = false;
      let round = await runParallelSearch(searchCountry);

      if (!round.hit && searchCountry !== 'US') {
        usedUsFallback = true;
        searchCountry = 'US';
        debug.usFallback = {
          from: requestedCountry,
          to: 'US',
          reason: `No matches for ${requestedCountry}; retrying US`,
        };
        round = await runParallelSearch('US');
      }

      const { hit, anonymous } = round;
      debug.searchCountry = searchCountry;
      debug.usedUsFallback = usedUsFallback;
      debug.anonymous = anonymous;

      if (!hit) {
        debug.reason = usedUsFallback
          ? `No Steam search match for ${requestedCountry} or US (session + guest, parallel)`
          : 'No Steam search match (session + guest, parallel)';
        return { found: false, _debug: debug };
      }

      debug.picked = { id: hit.id, name: hit.name, type: hit.type };

      return hydrateSteamApp({
        appId: hit.id,
        country: searchCountry,
        hit,
        anonymous,
        usedUsFallback,
        requestedCountry,
        onPartial,
        includeTags,
        debugBase: debug,
        cacheKey,
        manualOverride: false,
      });
    })();

    inflight.set(inflightKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(inflightKey);
    }
  }

  function steamCdnAsset(appId, file) {
    return `${STEAM_CDN_APPS}/${Number(appId)}/${file}`;
  }

  async function fetchSteamPlayers(appId) {
    const cacheKey = `steam:players:${appId}`;
    const cached = getCached(cacheKey);
    if (cached && typeof cached.players === 'number') return cached.players;
    try {
      const data = await gmRequest({
        url: `${STEAM_PLAYERS_URL}?appid=${encodeURIComponent(appId)}`,
        anonymous: true,
      });
      const players = Number(data?.response?.player_count);
      if (!Number.isFinite(players)) return null;
      const store = readCacheStore();
      store[cacheKey] = { ts: Date.now(), data: { players }, ttlMs: PLAYERS_CACHE_TTL_MS };
      persistCacheSoon();
      return players;
    } catch (_) {
      return null;
    }
  }

  /**
   * Icon / cover / players via Steam APIs only.
   * SteamDB has no public JSON API (internal /api/* is extension-only + Cloudflare).
   * Media: GetItems community_icon + header. Players: GetNumberOfCurrentPlayers.
   */
  async function fetchSteamDbExtras(appId, { onPartial, country } = {}) {
    const id = Number(appId);
    if (!Number.isFinite(id) || id <= 0) return null;

    const needMedia = settings.showSteamDbIcon || settings.showSteamDbCover;
    const needPlayers = settings.showSteamPlayers;
    if (!needMedia && !needPlayers) return null;

    const mediaKey = `steamdb:media:${id}`;
    const debugOn = Boolean(settings.debugMode);
    let media = !debugOn ? getCached(mediaKey) : null;
    let latestPlayers = null;
    let latestPlayersSource = null;
    let playersApiUrl = null;
    const cc = country || settings.steamCountry || 'US';

    const emit = (payload) => {
      if (typeof onPartial === 'function') onPartial(payload);
    };

    const resolveMediaUrls = () => {
      const iconUrl = media?.iconUrl || '';
      const logoUrl =
        media?.logoUrl || steamCdnAsset(id, 'header.jpg') || steamCdnAsset(id, 'library_600x900.jpg');
      const logoIsPortrait = Boolean(logoUrl && /library_600x900/i.test(logoUrl) && !media?.logoUrl);
      return { iconUrl, logoUrl, logoIsPortrait };
    };

    const buildResult = () => {
      const { iconUrl, logoUrl, logoIsPortrait } = resolveMediaUrls();
      return {
        appId: id,
        iconUrl: needMedia && settings.showSteamDbIcon ? iconUrl : '',
        logoUrl: needMedia && settings.showSteamDbCover ? logoUrl : '',
        logoIsPortrait: Boolean(logoIsPortrait),
        players: needPlayers ? latestPlayers : null,
        source: media?.source || 'steam',
        _debug: debugOn
          ? {
              reason: [
                media?.source === 'steam-assets'
                  ? 'Steam GetItems (community_icon + header)'
                  : media?.source
                    ? `Media: ${media.source}`
                    : needMedia
                      ? 'Waiting for Steam assets'
                      : null,
                latestPlayersSource === 'steam-api'
                  ? 'Players from GetNumberOfCurrentPlayers'
                  : latestPlayersSource === 'cache'
                    ? 'Players from cache'
                    : needPlayers
                      ? 'Players pending'
                      : null,
              ]
                .filter(Boolean)
                .join(' · '),
              chartsUrl: `${STEAMDB_APP_URL}/${id}/charts/`,
              playersApiUrl,
              playersSource: latestPlayersSource,
              media,
              players: latestPlayers,
              iconUrl,
              logoUrl,
            }
          : undefined,
      };
    };

    if (needMedia && !media) {
      media = {
        iconUrl: '',
        logoUrl: steamCdnAsset(id, 'header.jpg'),
        source: 'steam-cdn-early',
      };
      emit(buildResult());
    } else if (needMedia) {
      emit(buildResult());
    }

    if (needPlayers) {
      const entry = readCacheStore()[`steam:players:${id}`];
      if (entry?.ts && typeof entry.data?.players === 'number') {
        const ttl = entry.ttlMs || PLAYERS_CACHE_TTL_MS;
        if (Date.now() - entry.ts <= ttl) {
          latestPlayers = entry.data.players;
          latestPlayersSource = 'cache';
          emit(buildResult());
        }
      }
    }

    const assetsPromise = needMedia
      ? fetchSteamStoreAssets(id, cc).catch(() => null)
      : Promise.resolve(null);

    const playersPromise =
      needPlayers && latestPlayers == null
        ? (async () => {
            playersApiUrl = `${STEAM_PLAYERS_URL}?appid=${encodeURIComponent(id)}`;
            const players = await fetchSteamPlayers(id);
            if (players != null) {
              latestPlayers = players;
              latestPlayersSource = 'steam-api';
              emit(buildResult());
            }
          })()
        : Promise.resolve();

    const [storeAssets] = await Promise.all([assetsPromise, playersPromise]);
    if (storeAssets && (storeAssets.iconUrl || storeAssets.logoUrl)) {
      media = {
        iconUrl: storeAssets.iconUrl || media?.iconUrl || '',
        logoUrl: storeAssets.logoUrl || media?.logoUrl || '',
        source: 'steam-assets',
      };
      if (!debugOn) setCached(mediaKey, media);
      emit(buildResult());
    }

    if (needMedia && settings.showSteamDbIcon && media && !media.iconUrl) {
      media = { ...media, iconUrl: steamCdnAsset(id, 'capsule_sm_120.jpg') };
    }

    const result = buildResult();
    emit(result);
    return result;
  }

  function removeSteamDbUi() {
    document.querySelectorAll(`[${STEAMDB_ATTR}]`).forEach((el) => el.remove());
  }

  function desktopTitleHeading() {
    return (
      document.querySelector(
        '#game-body > div:nth-child(2) > div.row.d-none.d-sm-flex.mx-n1.game-title-section h1'
      ) ||
      document.querySelector(
        '#game-body .row.d-none.d-sm-flex.game-title-section h1'
      ) ||
      document.querySelector('#game-body .game-title-section.d-none.d-sm-flex h1')
    );
  }

  function loggingSidebarMount() {
    return (
      document.querySelector('#logging-sidebar-section > div > div') ||
      document.querySelector('#logging-sidebar-section .col.col-md-5') ||
      document.querySelector('#logging-sidebar-section .col-md-5') ||
      document.querySelector('#logging-sidebar-section .col')
    );
  }

  function injectSteamDbTitleIcon(url, appId) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="icon"]`).forEach((el) => el.remove());
    if (!settings.showSteamDbIcon || !url) return;
    const h1 = desktopTitleHeading();
    if (!h1) return;
    const img = document.createElement('img');
    img.setAttribute(STEAMDB_ATTR, 'icon');
    if (appId) img.setAttribute('data-blp-appid', String(appId));
    img.className = 'blp-title-icon';
    img.width = 32;
    img.height = 32;
    img.src = url;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      if (img.dataset.blpFallback === '1') {
        img.remove();
        return;
      }
      img.dataset.blpFallback = '1';
      const id = img.getAttribute('data-blp-appid');
      if (id) img.src = steamCdnAsset(id, 'capsule_sm_120.jpg');
      else img.remove();
    });
    h1.insertAdjacentElement('afterbegin', img);
  }

  function injectSteamDbCover(url, appId, { logoIsPortrait = false } = {}) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="cover"]`).forEach((el) => el.remove());
    if (!settings.showSteamDbCover || !url) return;
    const mount = loggingSidebarMount();
    if (!mount) return;

    const fallbacks = [];
    const push = (u) => {
      if (u && !fallbacks.includes(u)) fallbacks.push(u);
    };
    // Prefer SteamDB / Steam header cover, then library art, then logo.
    push(url);
    push(steamCdnAsset(appId, 'header.jpg'));
    push(steamCdnAsset(appId, 'library_600x900.jpg'));
    push(steamCdnAsset(appId, 'logo.png'));

    const box = document.createElement('div');
    box.setAttribute(STEAMDB_ATTR, 'cover');
    box.className = 'blp-steamdb-cover';
    const href = `${STEAMDB_APP_URL}/${Number(appId)}/`;
    const isLogoAsset = (u) => /(?:^|\/)logo\.(png|jpe?g)(?:$|\?)/i.test(String(u || ''));
    const firstIsLogo = isLogoAsset(fallbacks[0]) && !logoIsPortrait;
    box.innerHTML = `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" title="SteamDB"><img class="${firstIsLogo ? 'blp-steamdb-cover__logo' : ''}" src="${escapeAttr(fallbacks[0])}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></a>`;
    const img = box.querySelector('img');
    let idx = 0;
    if (img) {
      img.addEventListener('error', () => {
        idx += 1;
        if (idx < fallbacks.length) {
          const next = fallbacks[idx];
          img.classList.toggle('blp-steamdb-cover__logo', isLogoAsset(next));
          img.src = next;
          return;
        }
        box.remove();
      });
    }
    mount.appendChild(box);
  }

  function applySteamDbUi(steamDb, token = '') {
    removeSteamDbUi();
    if (!steamDb) return;
    injectSteamDbTitleIcon(steamDb.iconUrl, steamDb.appId);
    injectSteamDbCover(steamDb.logoUrl, steamDb.appId, {
      logoIsPortrait: Boolean(steamDb.logoIsPortrait),
    });
    if (
      steamDb.source === 'steamdb' &&
      steamDb.logoUrl &&
      /(?:^|\/)logo\.(png|jpe?g)(?:$|\?)/i.test(steamDb.logoUrl)
    ) {
      document
        .querySelector(`[${STEAMDB_ATTR}="cover"] img`)
        ?.classList.add('blp-steamdb-cover__logo');
    }
    if (token) {
      document.querySelectorAll(`[${STEAMDB_ATTR}]`).forEach((el) => {
        el.setAttribute('data-blp-token', token);
      });
    }
  }

  function getApiLanguage() {
    if (locale === 'zh') return 'zh-CN';
    if (locale === 'pt') return 'pt-BR';
    if (locale === 'en') return 'en-US';
    return locale || 'en-US';
  }

  function gsSlugify(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[™®©'’":]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function extractSteamSlugFromHref(href) {
    const match = String(href || '').match(/\/app\/\d+\/([^/?#]+)/i);
    if (!match) return null;
    return gsSlugify(match[1].replace(/_/g, '-'));
  }

  function isValidGsSlug(slug) {
    if (!slug || slug.length < 2) return false;
    if (!/[a-z]/.test(slug)) return false;
    if (GS_INVALID_SLUG_RE.test(slug)) return false;
    if (/^\d+(-\d+)+$/.test(slug)) return false;
    const segments = slug.split('-').filter(Boolean);
    if (!segments.length) return false;
    if (segments.every((part) => /^\d+$/.test(part))) return false;
    const numericParts = segments.filter((part) => /^\d+$/.test(part)).length;
    return numericParts / segments.length <= 0.5;
  }

  /**
   * Backloggd remake disambiguator: resident-evil-2--1 → resident-evil-2-remake
   * (GameStatus uses -remake; plain gsSlugify would yield -1).
   */
  function gsRemakeSlugFromPageSlug(pageSlug) {
    const raw = String(pageSlug || '').replace(/^\/+|\/+$/g, '');
    if (!/--1$/i.test(raw)) return null;
    return gsSlugify(raw.replace(/--1$/i, '-remake'));
  }

  function buildGsSlugCandidates({ storeUrl, name, title, pageSlug }) {
    const candidates = [];
    const addSlug = (slug) => {
      if (slug && isValidGsSlug(slug) && !candidates.includes(slug)) {
        candidates.push(slug);
      }
    };
    const addFromText = (text) => {
      const normalized = String(text || '').replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      addSlug(gsSlugify(normalized));
      addSlug(gsSlugify(normalized.replace(/\s*[-–—:|].*$/, '')));
    };

    // Prefer Backloggd --1 → -remake before store/title fallbacks.
    addSlug(gsRemakeSlugFromPageSlug(pageSlug));
    addSlug(extractSteamSlugFromHref(storeUrl));
    addFromText(name);
    addFromText(title);
    addSlug(gsSlugify(pageSlug));
    return candidates;
  }

  function isMatchingGsGame(data, appId) {
    if (!data) return false;
    if (!data.steam_prod_id) return true;
    return String(data.steam_prod_id) === String(appId);
  }

  function buildGsApiUrl(slug) {
    return `${GAMESTATUS_API_BASE}/${encodeURIComponent(slug)}/`;
  }

  async function fetchGsBySlug(slug, appId) {
    const data = await gmRequest({
      url: buildGsApiUrl(slug),
      allow404: true,
      headers: {
        Accept: 'application/json',
        'Accept-Language': getApiLanguage(),
      },
      timeout: 15000,
    });
    if (!data) {
      return { data: null, match: false, outcome: '404' };
    }
    const match = isMatchingGsGame(data, appId);
    return {
      data,
      match,
      outcome: match ? 'match' : 'steam_prod_id_mismatch',
      steam_prod_id: data.steam_prod_id ?? null,
      readable_status: data.readable_status || null,
      title: data.title || null,
      slug: data.slug || slug,
    };
  }

  async function fetchGameStatus({ appId, storeUrl, name, title, pageSlug }) {
    const debugOn = Boolean(settings.debugMode);
    if (!appId) {
      return {
        missing: true,
        data: null,
        slug: null,
        _debug: { reason: 'No Steam appId — GameStatus skipped', appId: null },
      };
    }

    const cacheKey = `gs:${appId}`;
    if (!debugOn) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    if (inflight.has(cacheKey)) return inflight.get(cacheKey);

    const task = (async () => {
      const slugs = buildGsSlugCandidates({ storeUrl, name, title, pageSlug });
      const tried = slugs.slice(0, GAMESTATUS_MAX_SLUG_ATTEMPTS);
      const debug = {
        appId,
        cacheKey,
        cacheSkipped: debugOn,
        candidates: slugs,
        tried,
        attempts: [],
      };

      for (const slug of tried) {
        try {
          const result = await fetchGsBySlug(slug, appId);
          debug.attempts.push({
            slug,
            url: buildGsApiUrl(slug),
            outcome: result.outcome,
            steam_prod_id: result.steam_prod_id,
            title: result.title,
            readable_status: result.readable_status,
          });
          if (result.match && result.data) {
            debug.reason = `Matched slug "${result.slug || slug}" (steam_prod_id=${result.steam_prod_id ?? 'empty'})`;
            const entry = {
              missing: false,
              data: result.data,
              slug: result.data.slug || slug,
              _debug: debug,
            };
            if (!debugOn) {
              const { _debug, ...store } = entry;
              setCached(cacheKey, store);
            }
            return entry;
          }
        } catch (err) {
          debug.attempts.push({
            slug,
            url: buildGsApiUrl(slug),
            outcome: 'error',
            error: String(err?.message || err),
          });
        }
      }

      debug.reason = tried.length
        ? 'No GameStatus match for tried slugs'
        : 'No valid GameStatus slug candidates';
      const miss = { missing: true, data: null, slug: tried[0] || null, _debug: debug };
      return miss;
    })();

    inflight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(cacheKey);
    }
  }

  function parseGsDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getGsNotCrackedVariant(game) {
    const release = parseGsDate(game.release_date);
    if (!release) return 'not-cracked-recent';
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return release > monthAgo ? 'not-cracked-recent' : 'not-cracked-old';
  }

  function getGsStatusType(game) {
    if (!game) return 'missing';
    const status = String(game.readable_status || '').toLowerCase();
    const groups = String(game.hacked_groups_en || game.hacked_groups || '').toLowerCase();
    if (/release today|релиз сегодня|выходит сегодня/.test(status)) return 'release-today';
    if (/bypass|обход|hypervisor/.test(groups) || /bypass|обход/.test(status)) return 'bypass';
    if (/not cracked|не взлом|не взломан|unbroken|unreleased crack/.test(status)) {
      return getGsNotCrackedVariant(game);
    }
    if (game.crack_date || /cracked|взлом/.test(status)) return 'cracked';
    return 'unknown';
  }

  function getGsStatusLabel(game, type) {
    if (!game) return t.gsNotInDatabase;
    if (game.readable_status) return game.readable_status;
    if (type === 'cracked') return t.gsCracked;
    if (type === 'not-cracked-recent' || type === 'not-cracked-old') return t.gsNotCracked;
    if (type === 'bypass') return t.gsBypass;
    if (type === 'release-today') return t.gsReleaseToday;
    return t.gsUnknown;
  }

  function cleanGsChipToken(value) {
    return String(value || '')
      .replace(/^[\s\[\(\{"'`]+|[\]\)\}"'`\s]+$/g, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim();
  }

  function splitGsChipValues(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) {
      return value.map(cleanGsChipToken).filter(Boolean);
    }

    const raw = String(value).trim();
    if (!raw) return [];

    if (/^[\[{"]/.test(raw)) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(cleanGsChipToken).filter(Boolean);
        }
        if (typeof parsed === 'string') {
          return [cleanGsChipToken(parsed)].filter(Boolean);
        }
      } catch (_) {
        /* fall through to delimiter split */
      }
    }

    return raw
      .split(/[,;/|]+/)
      .map(cleanGsChipToken)
      .filter(Boolean);
  }

  function gsProtectionChipClass(name) {
    return /denuvo/i.test(name) ? 'blp-gs-chip--denuvo' : 'blp-gs-chip--protection';
  }

  function renderGameStatusValues(entry) {
    const game = entry?.data;
    if (!game) return '';

    const type = getGsStatusType(game);
    const label = getGsStatusLabel(game, type);
    const slug = game.slug || entry.slug;
    const href = slug ? `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(slug)}` : GAMESTATUS_SITE_BASE;

    const chips = [];
    for (const prot of splitGsChipValues(game.protections)) {
      chips.push(
        `<span class="blp-gs-chip ${gsProtectionChipClass(prot)}">${escapeHtml(prot)}</span>`
      );
    }
    for (const group of splitGsChipValues(game.hacked_groups_en || game.hacked_groups)) {
      const groupType = /bypass|обход|hypervisor/i.test(group) ? 'bypass' : type;
      chips.push(
        `<span class="blp-gs-chip blp-gs-chip--${escapeAttr(groupType)}">${escapeHtml(group)}</span>`
      );
    }
    if (game.is_AAA) {
      chips.push(`<span class="blp-gs-chip blp-gs-chip--aaa">AAA</span>`);
    }

    const lines = [
      `<span class="blp-steam-line"><a class="blp-gs-badge blp-gs-badge--${escapeAttr(type)} blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="blp-gs-badge__dot" aria-hidden="true"></span>${escapeHtml(label)}</a></span>`,
    ];
    if (chips.length) {
      lines.push(`<span class="blp-steam-line blp-gs-chips">${chips.join('')}</span>`);
    }
    return lines.join('');
  }

  function buildExternalLinks({ title, slug, igdbUrl, steam }) {
    const q = encodeURIComponent(title || slug || '');
    const links = [];
    if (igdbUrl) links.push({ key: 'igdb', label: t.linkIgdb, url: igdbUrl });
    if (steam?.storeUrl) {
      links.push({ key: 'steam', label: t.linkSteam, url: steam.storeUrl });
    } else if (q) {
      links.push({
        key: 'steam',
        label: t.linkSteam,
        url: `https://store.steampowered.com/search/?term=${q}`,
      });
    }
    if (steam?.appId) {
      links.push({
        key: 'steamdb',
        label: t.linkSteamDb,
        url: `https://steamdb.info/app/${steam.appId}/`,
      });
    } else if (q) {
      links.push({
        key: 'steamdb',
        label: t.linkSteamDb,
        url: `https://steamdb.info/search/?a=app&q=${q}`,
      });
    }
    const mcUrl = metacriticGameUrl(title, slug);
    if (mcUrl) {
      links.push({ key: 'metacritic', label: t.linkMetacritic, url: mcUrl });
    }
    if (q) {
      links.push({
        key: 'opencritic',
        label: t.linkOpencritic,
        url: `https://opencritic.com/search?q=${q}`,
      });
      links.push({
        key: 'hltb',
        label: t.linkHltb,
        url: `https://howlongtobeat.com/?q=${q}`,
      });
    }
    return links.filter((l) => isLinkEnabled(l.key));
  }

  function removeEnrichment() {
    document.querySelectorAll(`[${ENRICH_ATTR}]`).forEach((el) => el.remove());
    document.querySelectorAll('[data-blp-debug]').forEach((el) => el.remove());
    removeSteamDbUi();
  }

  function makeDetailRow(key, headerText) {
    const row = document.createElement('div');
    row.className = 'row mt-2';
    row.setAttribute(ENRICH_ATTR, key);
    row.innerHTML = `
      <div class="col-3 col-md-2 my-auto">
        <p class="game-details-header">${escapeHtml(headerText)}</p>
      </div>
      <div class="col-auto col-md ml-auto my-auto text-right text-md-left" data-blp-values></div>
    `;
    return row;
  }

  function skeletonHtml(kind) {
    if (kind === 'links') {
      return [0, 1, 2, 3, 4]
        .map(() => '<span class="blp-skeleton blp-skeleton--link"></span>')
        .join('');
    }
    if (kind === 'steam') {
      return `
        <span class="blp-skeleton blp-skeleton--sm"></span>
        <span class="blp-skeleton blp-skeleton--md"></span>
        <span class="blp-skeleton blp-skeleton--lg"></span>
      `;
    }
    if (kind === 'metacritic') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
    if (kind === 'players') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
    if (kind === 'gamestatus') {
      return `
        <span class="blp-skeleton blp-skeleton--md"></span>
        <span class="blp-skeleton blp-skeleton--sm"></span>
      `;
    }
    return '<span class="blp-skeleton blp-skeleton--md"></span>';
  }

  function ensureEnrichmentRows() {
    const platforms = document.querySelector('#game-body #game-page-platforms, #game-page-platforms');
    if (!platforms) return null;

    let anchor = platforms;
    const existing = document.querySelector(`[${ENRICH_ATTR}]`);
    if (existing) {
      return {
        steam: document.querySelector(`[${ENRICH_ATTR}="steam"]`),
        metacritic: document.querySelector(`[${ENRICH_ATTR}="metacritic"]`),
        players: document.querySelector(`[${ENRICH_ATTR}="players"]`),
        gamestatus: document.querySelector(`[${ENRICH_ATTR}="gamestatus"]`),
        links: document.querySelector(`[${ENRICH_ATTR}="links"]`),
      };
    }

    const rows = {};
    const plan = [];
    if (settings.showSteam) plan.push(['steam', t.steam]);
    if (settings.showMetacritic) plan.push(['metacritic', t.metacritic]);
    if (settings.showSteamPlayers) plan.push(['players', t.players]);
    if (settings.showGameStatus) plan.push(['gamestatus', t.gameStatus]);
    if (settings.showLinks) plan.push(['links', t.links]);

    for (const [key, label] of plan) {
      const row = makeDetailRow(key, label);
      row.querySelector('[data-blp-values]').innerHTML = skeletonHtml(key);
      anchor.insertAdjacentElement('afterend', row);
      anchor = row;
      rows[key] = row;
    }
    return rows;
  }

  function setRowValues(row, html) {
    const slot = row?.querySelector('[data-blp-values]');
    if (slot) slot.innerHTML = html;
  }

  function hideRow(row) {
    if (row) row.hidden = true;
  }

  function showRow(row) {
    if (row) row.hidden = false;
  }

  function renderExtLink(link, { last = false } = {}) {
    const icon = faviconForUrl(link.url);
    const img = icon
      ? `<img class="blp-favicon" src="${escapeAttr(icon)}" alt="" width="14" height="14" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
      : '';
    const sep = last ? '' : '<span class="separator">•</span>';
    return `
      <span class="game-detail">
        <a class="game-details-value blp-ext-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
          ${img}${escapeHtml(link.label)}
        </a>${sep}
      </span>
    `;
  }

  function renderLibraryBadge(kind) {
    if (kind === 'owned') {
      return `<span class="blp-owned-badge" title="${escapeAttr(t.steamOwned)}"><svg class="blp-owned-badge__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 11.3 2.9 7.8l1.2-1.2 2.3 2.3 5-5.1 1.2 1.2z"/></svg>${escapeHtml(t.steamOwned)}</span>`;
    }
    if (kind === 'wishlist') {
      return `<span class="blp-wishlist-badge" title="${escapeAttr(t.steamWishlist)}"><svg class="blp-owned-badge__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 2.2 9.7 6l4 .3-3.1 2.6 1 3.9L8 10.6 4.4 12.8l1-3.9L2.3 6.3l4-.3z"/></svg>${escapeHtml(t.steamWishlist)}</span>`;
    }
    return '';
  }

  function renderSteamMatchControl(steam, slug) {
    if (!slug) return '';
    const overrideId = getSteamOverride(slug);
    const appId = steam?.appId || overrideId || '';
    if (!appId && !settings.showSteam) return '';
    const source = overrideId || steam?.manualOverride ? t.steamMatchManual : t.steamMatchAuto;
    const label = appId
      ? fmt(t.steamMatchLabel, { id: appId, source })
      : t.steamFixMatch;
    return `<span class="blp-steam-match">
      <span class="blp-steam-match__label">${escapeHtml(label)}</span>
      <button type="button" class="blp-steam-match__btn" data-blp-fix-match data-blp-slug="${escapeAttr(slug)}" data-blp-appid="${escapeAttr(appId || '')}">${escapeHtml(t.steamFixMatch)}</button>
    </span>`;
  }

  function renderSteamValues(steam, { owned = false, wishlist = false, slug = '' } = {}) {
    const parts = [];

    if (owned) {
      parts.push({ html: renderLibraryBadge('owned') });
    } else if (wishlist) {
      parts.push({ html: renderLibraryBadge('wishlist') });
    }

    const priceText = formatPriceText(steam);
    const discount =
      steam.price?.discount_percent > 0
        ? ` <span class="blp-discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
        : '';

    if (priceText) {
      parts.push({
        html: `<a class="game-details-value blp-ext-link" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}${discount}</a>`,
      });
    }

    const reviewText = formatReviewPercent(steam.reviews);
    const reviewClass = reviewScoreClass(steam.reviews);
    if (reviewText) {
      parts.push({
        html: `<a class="game-details-value ${reviewClass}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer">${escapeHtml(reviewText)}</a>`,
      });
    } else if (steam.recommendations) {
      parts.push({
        html: `<span class="game-details-value ${reviewClass}">${escapeHtml(fmt(t.recommendations, { n: steam.recommendations.toLocaleString() }))}</span>`,
      });
    }

    if (steam.usedUsFallback) {
      parts.push({
        html: `<span class="game-details-value blp-steam-note">${escapeHtml(fmt(t.steamUsFallback, { cc: steam.requestedCountry || '' }))}</span>`,
      });
    }

    if (settings.showSteamTags !== false && steam.tags?.length) {
      const chips = steam.tags
        .map(
          (tag) =>
            `<a class="blp-gs-chip blp-steam-tag" href="${escapeAttr(steamTagUrl(tag.name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(tag.name)}</a>`
        )
        .join('');
      parts.push({
        html: `<span class="blp-steam-tags">${chips}</span>`,
      });
    }

    const matchHtml = renderSteamMatchControl(steam, slug);
    if (matchHtml) parts.push({ html: matchHtml });

    if (!parts.length) {
      return `<a class="game-details-value blp-ext-link" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.steam)}</a>`;
    }

    return parts.map((part) => `<span class="blp-steam-line">${part.html}</span>`).join('');
  }

  function debugLink(label, url, purpose, request) {
    if (!url) return '';
    const badge = request
      ? `<span class="blp-debug-panel__source-badge">${escapeHtml(t.debugSrcRequest)}</span>`
      : '';
    const purposeHtml = purpose
      ? `<span class="blp-debug-panel__source-purpose">${escapeHtml(purpose)}</span>`
      : '';
    return `<li class="${request ? 'is-request' : ''}">
      <div class="blp-debug-panel__source-head">
        ${badge}<strong>${escapeHtml(label)}</strong>${purposeHtml}
      </div>
      <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
    </li>`;
  }

  function collectDebugSources({ steam, steamDb, gamestatus, title, slug }) {
    const items = [];
    const add = (module, label, url, purpose, request = false) => {
      if (!url || items.some((x) => x.url === url && x.label === label && x.module === module)) {
        return;
      }
      items.push({
        module,
        label,
        url,
        purpose: purpose || '',
        request: Boolean(request),
      });
    };

    add('page', 'Backloggd', location.href, t.debugSrcBackloggd);
    if (slug) add('page', 'IGDB', getIgdbUrl(slug), t.debugSrcIgdb);
    const mc = metacriticGameUrl(title, slug);
    if (mc) add('page', 'Metacritic', mc, t.debugSrcMetacritic);

    if (steam?.storeUrl) add('steam', 'Steam Store', steam.storeUrl, t.debugSrcSteamStore);
    if (steam?.tinyImage) {
      add('steam', 'Steam tiny image', steam.tinyImage, t.debugSrcSteamTiny);
    }
    if (steam?.headerImage) {
      add('steam', 'Steam header image', steam.headerImage, t.debugSrcSteamHeader);
    }
    if (settings.showSteamOwned || settings.showSteamWishlist) {
      add('steam', 'Steam userdata', STEAM_USERDATA_URL, t.debugSrcSteamOwned, true);
    }

    const steamDbg = steam?._debug || {};
    for (const search of steamDbg.searches || []) {
      if (!search?.url) continue;
      const kind = search.anonymous ? 'guest' : 'session';
      add(
        'steam',
        `Steam search (${kind}, ${search.country || '?'})`,
        search.url,
        t.debugSrcSteamSearch,
        true
      );
    }
    if (steamDbg.detailsUrl) {
      add('steam', 'Steam appdetails', steamDbg.detailsUrl, t.debugSrcSteamDetails, true);
    }
    if (steamDbg.reviewsUrl) {
      add('steam', 'Steam appreviews', steamDbg.reviewsUrl, t.debugSrcSteamReviews, true);
    }
    if (steamDbg.tagsUrl) {
      add('steam', 'Steam GetItems (tags)', steamDbg.tagsUrl, t.debugSrcSteamTags, true);
    }
    if (steamDbg.tagMapUrl) {
      add('steam', 'Steam populartags', steamDbg.tagMapUrl, t.debugSrcSteamTagMap, true);
    }

    if (steam?.appId) {
      add('steamdb', 'SteamDB', `${STEAMDB_APP_URL}/${steam.appId}/`, t.debugSrcSteamDb);
      add(
        'steamdb',
        'SteamDB charts',
        `${STEAMDB_APP_URL}/${steam.appId}/charts/`,
        t.debugSrcSteamDbCharts
      );
      add(
        'steamdb',
        'SteamDB info',
        `${STEAMDB_APP_URL}/${steam.appId}/info/`,
        t.debugSrcSteamDbInfo
      );
    }

    const sdb = steamDb?._debug || {};
    if (sdb.chartsUrl) {
      add('steamdb', 'SteamDB charts', sdb.chartsUrl, t.debugSrcSteamDbCharts);
    }
    if (sdb.playersApiUrl) {
      add('steamdb', 'Steam players API', sdb.playersApiUrl, t.debugSrcSteamPlayersApi, true);
    }
    if (sdb.iconUrl || steamDb?.iconUrl) {
      add('steamdb', 'Icon URL', sdb.iconUrl || steamDb.iconUrl, t.debugSrcIcon);
    }
    if (sdb.logoUrl || steamDb?.logoUrl) {
      add('steamdb', 'Logo URL', sdb.logoUrl || steamDb.logoUrl, t.debugSrcLogo);
    }

    const gs = gamestatus?._debug || {};
    for (const attempt of gs.attempts || []) {
      if (attempt?.url) {
        add(
          'gamestatus',
          `GameStatus API (${attempt.slug || '?'})`,
          attempt.url,
          t.debugSrcGameStatusApi,
          true
        );
      }
    }
    if (gamestatus?.slug) {
      add(
        'gamestatus',
        'GameStatus page',
        `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(gamestatus.slug)}`,
        t.debugSrcGameStatusPage
      );
    }

    return items;
  }

  function renderDebugSourcesHtml(sources) {
    const groups = [
      { key: 'page', label: t.debugSectionPage },
      { key: 'steam', label: t.debugSectionSteam },
      { key: 'steamdb', label: t.debugSectionSteamDb },
      { key: 'gamestatus', label: t.debugSectionGameStatus },
    ];
    const blocks = [];
    for (const group of groups) {
      const list = sources
        .filter((s) => s.module === group.key)
        .sort((a, b) => Number(b.request) - Number(a.request));
      if (!list.length) continue;
      const itemsHtml = list.map((s) => debugLink(s.label, s.url, s.purpose, s.request)).join('');
      blocks.push(`
        <div class="blp-debug-panel__source-group">
          <div class="blp-debug-panel__source-group-title">${escapeHtml(group.label)}</div>
          <ul class="blp-debug-panel__source-group-list">${itemsHtml}</ul>
        </div>
      `);
    }
    return blocks.join('') || `<div>${escapeHtml('—')}</div>`;
  }

  function renderUnifiedDebugPanel({
    steam,
    steamDb,
    gamestatus,
    owned = false,
    wishlist = false,
    error = false,
    title = '',
    slug = '',
  }) {
    document.querySelectorAll('[data-blp-debug]').forEach((el) => el.remove());
    if (!settings.debugMode) return;

    const sources = collectDebugSources({ steam, steamDb, gamestatus, title, slug });
    const sourcesHtml = renderDebugSourcesHtml(sources);

    const sections = [];
    const pushSection = (label, reason, dumpObj) => {
      let dump = '';
      try {
        dump = JSON.stringify(dumpObj, null, 2);
      } catch (_) {
        dump = String(dumpObj);
      }
      sections.push(`
        <div class="blp-debug-panel__section">
          <span class="blp-debug-panel__label">${escapeHtml(label)}</span>
          <span class="blp-debug-panel__reason">${escapeHtml(reason || '—')}</span>
          <pre class="blp-debug-panel__pre">${escapeHtml(dump)}</pre>
        </div>
      `);
    };

    pushSection(t.debugSectionPage, `${title || '—'} / ${slug || '—'}`, {
      href: location.href,
      title,
      slug,
      settings: {
        steamCountry: settings.steamCountry,
        showSteam: settings.showSteam,
        showSteamOwned: settings.showSteamOwned,
        showSteamWishlist: settings.showSteamWishlist,
        showSteamTags: settings.showSteamTags,
        showMetacritic: settings.showMetacritic,
        showGameStatus: settings.showGameStatus,
        showSteamDbIcon: settings.showSteamDbIcon,
        showSteamDbCover: settings.showSteamDbCover,
        showSteamPlayers: settings.showSteamPlayers,
        showCardBadges: settings.showCardBadges,
        showLinks: settings.showLinks,
        links: settings.links,
        steamOverride: getSteamOverride(slug),
      },
      owned,
      wishlist,
      error,
      SCRIPT_VERSION,
    });

    pushSection(
      t.debugSectionSteam,
      steam?._debug?.reason || (steam?.found ? `appId=${steam.appId}` : t.notOnSteam),
      steam?._debug || steam || { reason: 'Steam payload missing' }
    );

    pushSection(
      t.debugSectionSteamDb,
      steamDb?._debug?.reason || (steamDb ? `source=${steamDb.source}` : 'SteamDB extras not fetched'),
      steamDb?._debug || steamDb || { reason: 'SteamDB payload missing' }
    );

    pushSection(
      t.debugSectionGameStatus,
      gamestatus?._debug?.reason ||
        (gamestatus && !gamestatus.missing
          ? `slug=${gamestatus.slug}`
          : t.gsNotInDatabase),
      gamestatus?._debug || gamestatus || { reason: 'GameStatus payload missing' }
    );

    const fullDump = {
      page: { href: location.href, title, slug, owned, wishlist, error, SCRIPT_VERSION },
      steam: steam?._debug || steam || null,
      steamDb: steamDb?._debug || steamDb || null,
      gamestatus: gamestatus?._debug || gamestatus || null,
      sources,
    };
    let fullJson = '';
    try {
      fullJson = JSON.stringify(fullDump, null, 2);
    } catch (_) {
      fullJson = String(fullDump);
    }

    const panel = document.createElement('div');
    panel.className = 'blp-debug-panel';
    panel.setAttribute('data-blp-debug', '1');
    panel.innerHTML = `
      <h3 class="blp-debug-panel__title">${escapeHtml(t.debugPanelTitle)} · v${escapeHtml(SCRIPT_VERSION)}</h3>
      <div class="blp-debug-panel__meta">${escapeHtml(t.debugOwned)}: ${owned ? t.on : t.off}</div>
      <div class="blp-debug-panel__section">
        <span class="blp-debug-panel__label">${escapeHtml(t.debugSources)}</span>
        <div class="blp-debug-panel__sources">${sourcesHtml}</div>
      </div>
      ${sections.join('')}
      <div class="blp-debug-panel__section">
        <span class="blp-debug-panel__label">${escapeHtml(t.debugDump)}</span>
        <pre class="blp-debug-panel__pre">${escapeHtml(fullJson)}</pre>
      </div>
    `;

    const lastRow = document.querySelector(`[${ENRICH_ATTR}]:last-of-type`);
    const platforms = document.querySelector('#game-body #game-page-platforms, #game-page-platforms');
    const anchor = lastRow || platforms;
    if (anchor) anchor.insertAdjacentElement('afterend', panel);
    else document.querySelector('#game-body')?.appendChild(panel);
  }

  function renderEnrichment(rows, { steam, links, error, owned = false, wishlist = false, gamestatus = null, title = '', slug = '', steamDb = null, skipDebug = false }) {
    const debugOn = Boolean(settings.debugMode);

    if (rows.steam) {
      if (error) {
        setRowValues(
          rows.steam,
          `<span class="game-details-value blp-empty">${escapeHtml(t.loadError)}</span>${renderSteamMatchControl(steam, slug)}`
        );
        showRow(rows.steam);
      } else if (!steam?.found) {
        const missHtml = debugOn
          ? `<span class="game-details-value blp-empty">${escapeHtml(t.notOnSteam)}</span>`
          : '';
        const matchHtml = renderSteamMatchControl(steam, slug);
        if (missHtml || matchHtml) {
          setRowValues(
            rows.steam,
            `${missHtml}${missHtml && matchHtml ? '' : ''}${matchHtml ? `<span class="blp-steam-line">${matchHtml}</span>` : ''}`
          );
          showRow(rows.steam);
        } else {
          hideRow(rows.steam);
        }
      } else {
        setRowValues(rows.steam, renderSteamValues(steam, { owned, wishlist, slug }));
        showRow(rows.steam);
      }
    }

    if (rows.metacritic) {
      const score = steam?.metacritic?.score;
      if (score != null && !error) {
        setRowValues(rows.metacritic, renderMetacriticBadge(score, metacriticGameUrl(title, slug)));
        showRow(rows.metacritic);
      } else {
        hideRow(rows.metacritic);
      }
    }

    if (rows.players) {
      const count = steamDb?.players;
      if (count != null && !error) {
        const href = steamDb?.appId
          ? `${STEAMDB_APP_URL}/${steamDb.appId}/charts/`
          : `${STEAMDB_APP_URL}/`;
        const label = fmt(t.playersOnline, { n: Number(count).toLocaleString() });
        setRowValues(
          rows.players,
          `<a class="blp-players-badge blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="blp-players-badge__dot" aria-hidden="true"></span>${escapeHtml(label)}</a>`
        );
        showRow(rows.players);
      } else if (debugOn) {
        setRowValues(rows.players, `<span class="game-details-value blp-empty">—</span>`);
        showRow(rows.players);
      } else {
        hideRow(rows.players);
      }
    }

    if (rows.gamestatus) {
      if (gamestatus && !gamestatus.missing && gamestatus.data) {
        setRowValues(rows.gamestatus, renderGameStatusValues(gamestatus));
        showRow(rows.gamestatus);
      } else {
        hideRow(rows.gamestatus);
      }
    }

    if (rows.links) {
      if (links?.length) {
        const html = links
          .map((l, i) => renderExtLink(l, { last: i === links.length - 1 }))
          .join('');
        setRowValues(rows.links, html);
        showRow(rows.links);
      } else {
        hideRow(rows.links);
      }
    }

    if (!skipDebug) {
      renderUnifiedDebugPanel({ steam, steamDb, gamestatus, owned, wishlist, error, title, slug });
    }
  }

  let gamePageToken = 0;

  async function enrichGamePage() {
    const ctx = getPageContext();
    if (!ctx.isGamePage || !ctx.slug) {
      removeEnrichment();
      return;
    }

    const title = getGameTitle();
    if (!title) return;

    const token = `${ctx.slug}|${title}|${settings.steamCountry}|${settings.showSteam}|${settings.showSteamOwned}|${settings.showSteamWishlist}|${settings.showSteamTags}|${settings.showMetacritic}|${settings.showGameStatus}|${settings.showLinks}|${settings.showSteamDbIcon}|${settings.showSteamDbCover}|${settings.showSteamPlayers}|${getSteamOverride(ctx.slug) || ''}|${settings.debugMode}|${JSON.stringify(settings.links)}`;
    const marker = document.querySelector(`[${ENRICH_ATTR}]`);
    if (marker?.getAttribute('data-blp-token') === token && !marker.querySelector('.blp-skeleton')) {
      const needSteamDbUi = settings.showSteamDbIcon || settings.showSteamDbCover;
      if (!needSteamDbUi || document.querySelector(`[${STEAMDB_ATTR}]`)) return;
    }

    removeEnrichment();
    const rows = ensureEnrichmentRows();
    if (!rows) return;

    Object.values(rows).forEach((row) => row?.setAttribute('data-blp-token', token));

    const runId = ++gamePageToken;
    const igdbUrl = getIgdbUrl(ctx.slug);
    const stillHere = () => runId === gamePageToken && getPageContext().isGamePage;

    const needSteamDb =
      settings.showSteamDbIcon || settings.showSteamDbCover || settings.showSteamPlayers;
    const needSteam =
      settings.showSteam ||
      settings.showMetacritic ||
      settings.showGameStatus ||
      needSteamDb;
    const needUserdata =
      settings.showSteam && (settings.showSteamOwned || settings.showSteamWishlist);

    const state = {
      steam: null,
      owned: false,
      wishlist: false,
      userdata: null,
      gamestatus: null,
      steamDb: null,
      error: false,
    };

    const paintLinks = (steam) => {
      if (!stillHere() || !rows.links) return;
      const links = buildExternalLinks({ title, slug: ctx.slug, igdbUrl, steam });
      renderEnrichment(
        { links: rows.links },
        { steam, links, error: state.error, skipDebug: true }
      );
    };

    const syncLibrary = () => {
      if (state.userdata && state.steam?.found && state.steam.appId != null) {
        const id = Number(state.steam.appId);
        state.owned = settings.showSteamOwned !== false && state.userdata.owned.has(id);
        state.wishlist =
          !state.owned &&
          settings.showSteamWishlist !== false &&
          state.userdata.wishlist.has(id);
      } else {
        state.owned = false;
        state.wishlist = false;
      }
    };

    const paintSteamBlock = () => {
      if (!stillHere() || state.steam == null) return;
      syncLibrary();
      renderEnrichment(
        { steam: rows.steam, metacritic: rows.metacritic },
        {
          steam: state.steam,
          error: state.error,
          owned: state.owned,
          wishlist: state.wishlist,
          title,
          slug: ctx.slug,
          skipDebug: true,
        }
      );
      paintLinks(state.steam);
    };

    const paintPlayers = () => {
      if (!stillHere() || !rows.players) return;
      renderEnrichment(
        { players: rows.players },
        { steamDb: state.steamDb, error: state.error, skipDebug: true }
      );
    };

    const paintGameStatus = () => {
      if (!stillHere() || !rows.gamestatus) return;
      renderEnrichment(
        { gamestatus: rows.gamestatus },
        { gamestatus: state.gamestatus, skipDebug: true }
      );
    };

    const paintFinal = () => {
      if (!stillHere()) return;
      syncLibrary();
      const links = buildExternalLinks({
        title,
        slug: ctx.slug,
        igdbUrl,
        steam: state.steam,
      });
      renderEnrichment(rows, {
        steam: state.steam,
        links,
        error: state.error,
        owned: state.owned,
        wishlist: state.wishlist,
        gamestatus: state.gamestatus,
        title,
        slug: ctx.slug,
        steamDb: state.steamDb,
      });
      if (state.steamDb) applySteamDbUi(state.steamDb, token);
    };

    // Links that don't depend on Steam can appear immediately.
    paintLinks(null);

    let dependentsStarted = false;
    let dependentsPromise = Promise.resolve();

    const gsSkippedPayload = (steam, reason) => ({
      missing: true,
      data: null,
      slug: null,
      _debug: settings.debugMode
        ? {
            reason,
            steamFound: Boolean(steam?.found),
            steamDebug: steam?._debug || null,
          }
        : undefined,
    });

    const startDependents = (steam) => {
      if (dependentsStarted || !steam?.found || steam.appId == null) return;
      dependentsStarted = true;
      const jobs = [];

      if (needSteamDb) {
        jobs.push(
          fetchSteamDbExtras(steam.appId, {
            country: settings.steamCountry || 'US',
            onPartial: (partial) => {
              if (!stillHere()) return;
              state.steamDb = partial;
              applySteamDbUi(partial, token);
              // Keep players skeleton until a count arrives (final paint clears misses).
              if (partial?.players != null) paintPlayers();
            },
          })
            .then((full) => {
              if (!stillHere() || !full) return;
              state.steamDb = full;
              applySteamDbUi(full, token);
              paintPlayers();
            })
            .catch((err) => {
              if (!stillHere()) return;
              state.steamDb = {
                appId: steam.appId,
                iconUrl: '',
                logoUrl: '',
                players: null,
                _debug: settings.debugMode
                  ? { reason: `SteamDB error: ${err?.message || err}` }
                  : undefined,
              };
              paintPlayers();
            })
        );
      }

      if (settings.showGameStatus) {
        jobs.push(
          fetchGameStatus({
            appId: steam.appId,
            storeUrl: steam.storeUrl,
            name: steam.name,
            title,
            pageSlug: ctx.slug,
          })
            .then((gs) => {
              if (!stillHere()) return;
              state.gamestatus = gs;
              paintGameStatus();
            })
            .catch((err) => {
              if (!stillHere()) return;
              state.gamestatus = gsSkippedPayload(
                steam,
                `GameStatus error: ${err?.message || err}`
              );
              paintGameStatus();
            })
        );
      }

      dependentsPromise = Promise.all(jobs);
    };

    try {
      const userdataPromise = needUserdata
        ? fetchSteamUserdata()
            .then((data) => {
              if (!stillHere()) return null;
              state.userdata = data;
              if (state.steam) paintSteamBlock();
              return data;
            })
            .catch(() => null)
        : Promise.resolve(null);

      const steamPromise = needSteam
        ? resolveSteamForGame({
            title,
            slug: ctx.slug,
            country: settings.steamCountry || 'US',
            onPartial: (partial) => {
              if (!stillHere()) return;
              state.steam = partial;
              paintSteamBlock();
              startDependents(partial);
            },
          })
        : Promise.resolve(null);

      const [steamResult] = await Promise.all([steamPromise, userdataPromise]);
      if (!stillHere()) return;

      state.steam = steamResult;
      if (steamResult) {
        paintSteamBlock();
        startDependents(steamResult);
      } else if (needSteam) {
        state.steam = { found: false };
        paintSteamBlock();
      }

      if (settings.showGameStatus && !dependentsStarted) {
        state.gamestatus = gsSkippedPayload(
          state.steam,
          state.steam?.found
            ? 'GameStatus enabled but Steam appId missing'
            : 'GameStatus skipped — Steam app not found'
        );
        paintGameStatus();
      }

      await dependentsPromise;
    } catch (err) {
      state.error = true;
      state.steam = state.steam || {
        found: false,
        _debug: { reason: `Enrichment error: ${err?.message || err}` },
      };
      state.owned = false;
      state.wishlist = false;
      state.gamestatus = state.gamestatus || {
        missing: true,
        data: null,
        slug: null,
        _debug: { reason: `Enrichment error: ${err?.message || err}` },
      };
      paintSteamBlock();
      paintGameStatus();
      paintPlayers();
    }

    if (!stillHere()) return;
    paintFinal();
  }

  function openSettings() {
    if (document.querySelector('.blp-settings-backdrop')) return;

    const draft = {
      ...settings,
      links: { ...DEFAULT_SETTINGS.links, ...(settings.links || {}) },
    };
    const linkToggles = LINK_KEYS.map((key) => {
      const on = draft.links[key] !== false;
      const label = t[linkLabelKey(key)] || key;
      const domain = LINK_DOMAINS[key] || key;
      const icon = FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
      return `
        <div class="blp-toggle">
          <span class="blp-toggle__label">
            <img class="blp-favicon" src="${escapeAttr(icon)}" alt="" width="14" height="14" />
            ${escapeHtml(label)}
          </span>
          <button type="button" data-blp-link="${escapeAttr(key)}" class="${on ? 'is-on' : ''}">${on ? t.on : t.off}</button>
        </div>
      `;
    }).join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'blp-settings-backdrop';
    backdrop.innerHTML = `
      <div class="blp-settings" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.panelTitle)}">
        <h2>${escapeHtml(t.panelTitle)} <span class="blp-settings__ver">v${escapeHtml(SCRIPT_VERSION)}</span></h2>
        <p class="blp-settings__sub">${escapeHtml(t.panelSubtitle)}</p>
        <section>
          <h3>${escapeHtml(t.sectionGeneral)}</h3>
          <div class="blp-field">
            <label for="blp-ui-locale">${escapeHtml(t.uiLanguage)}</label>
            <select id="blp-ui-locale">
              <option value="auto" ${(draft.uiLocale || 'auto') === 'auto' ? 'selected' : ''}>${escapeHtml(t.uiLanguageAuto)}</option>
              ${SUPPORTED_LOCALES.map((code) => {
                const selected = draft.uiLocale === code ? 'selected' : '';
                const name = LOCALE_NATIVE_NAMES[code] || code;
                return `<option value="${code}" ${selected}>${escapeHtml(name)}</option>`;
              }).join('')}
            </select>
            <p class="blp-hint">${escapeHtml(t.uiLanguageHint)}</p>
          </div>
        </section>
        <section>
          <h3>${escapeHtml(t.sectionGame)}</h3>
          <div class="blp-field">
            <label for="blp-steam-cc">${escapeHtml(t.steamCountry)}</label>
            <select id="blp-steam-cc">
              ${['US', 'GB', 'DE', 'FR', 'RU', 'BR', 'JP', 'KR', 'CN', 'AU', 'CA', 'PL', 'ES', 'IT', 'TR', 'UA']
                .map(
                  (cc) =>
                    `<option value="${cc}" ${draft.steamCountry === cc ? 'selected' : ''}>${cc}</option>`
                )
                .join('')}
            </select>
            <p class="blp-hint">${escapeHtml(t.steamCountryHint)}</p>
          </div>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteam)}</span>
            <button type="button" data-blp-toggle="showSteam" class="${draft.showSteam ? 'is-on' : ''}">${draft.showSteam ? t.on : t.off}</button>
          </div>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamOwned)}</span>
            <button type="button" data-blp-toggle="showSteamOwned" class="${draft.showSteamOwned ? 'is-on' : ''}">${draft.showSteamOwned ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamOwnedHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamWishlist)}</span>
            <button type="button" data-blp-toggle="showSteamWishlist" class="${draft.showSteamWishlist ? 'is-on' : ''}">${draft.showSteamWishlist ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamWishlistHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamTags)}</span>
            <button type="button" data-blp-toggle="showSteamTags" class="${draft.showSteamTags ? 'is-on' : ''}">${draft.showSteamTags ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamTagsHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showMetacritic)}</span>
            <button type="button" data-blp-toggle="showMetacritic" class="${draft.showMetacritic ? 'is-on' : ''}">${draft.showMetacritic ? t.on : t.off}</button>
          </div>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showGameStatus)}</span>
            <button type="button" data-blp-toggle="showGameStatus" class="${draft.showGameStatus ? 'is-on' : ''}">${draft.showGameStatus ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showGameStatusHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showLinks)}</span>
            <button type="button" data-blp-toggle="showLinks" class="${draft.showLinks ? 'is-on' : ''}">${draft.showLinks ? t.on : t.off}</button>
          </div>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamPageLink)}</span>
            <button type="button" data-blp-toggle="showSteamPageLink" class="${draft.showSteamPageLink ? 'is-on' : ''}">${draft.showSteamPageLink ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamPageLinkHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamDbPageLink)}</span>
            <button type="button" data-blp-toggle="showSteamDbPageLink" class="${draft.showSteamDbPageLink ? 'is-on' : ''}">${draft.showSteamDbPageLink ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamDbPageLinkHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamDbIcon)}</span>
            <button type="button" data-blp-toggle="showSteamDbIcon" class="${draft.showSteamDbIcon ? 'is-on' : ''}">${draft.showSteamDbIcon ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamDbIconHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamDbCover)}</span>
            <button type="button" data-blp-toggle="showSteamDbCover" class="${draft.showSteamDbCover ? 'is-on' : ''}">${draft.showSteamDbCover ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamDbCoverHint)}</p>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showSteamPlayers)}</span>
            <button type="button" data-blp-toggle="showSteamPlayers" class="${draft.showSteamPlayers ? 'is-on' : ''}">${draft.showSteamPlayers ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showSteamPlayersHint)}</p>
        </section>
        <section>
          <h3>${escapeHtml(t.sectionLists)}</h3>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showCardBadges)}</span>
            <button type="button" data-blp-toggle="showCardBadges" class="${draft.showCardBadges ? 'is-on' : ''}">${draft.showCardBadges ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.showCardBadgesHint)}</p>
        </section>
        <section>
          <h3>${escapeHtml(t.sectionLinks)}</h3>
          <p class="blp-hint" style="margin-bottom:10px">${escapeHtml(t.sectionLinksHint)}</p>
          ${linkToggles}
        </section>
        <section>
          <h3>${escapeHtml(t.sectionCache)}</h3>
          ${buildCacheMeterHtml()}
          <div class="blp-field">
            <label for="blp-cache-hours">${escapeHtml(t.cacheHours)}</label>
            <input id="blp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${Number(draft.cacheHours) || 0}" />
            <p class="blp-hint">${escapeHtml(t.cacheHoursHint)}</p>
          </div>
          <button type="button" class="blp-btn" data-blp-clear>${escapeHtml(t.clearCache)}</button>
          <p class="blp-hint">${escapeHtml(t.cacheClearHint)}</p>
          <div class="blp-cache-msg" data-blp-cache-msg hidden></div>
        </section>
        <section>
          <h3>${escapeHtml(t.sectionDebug)}</h3>
          <div class="blp-toggle">
            <span>${escapeHtml(t.debugMode)}</span>
            <button type="button" data-blp-toggle="debugMode" class="${draft.debugMode ? 'is-on' : ''}">${draft.debugMode ? t.on : t.off}</button>
          </div>
          <p class="blp-hint">${escapeHtml(t.debugModeHint)}</p>
        </section>
        <div class="blp-actions">
          <button type="button" data-blp-cancel>${escapeHtml(t.cancel)}</button>
          <button type="button" class="blp-primary" data-blp-save>${escapeHtml(t.saveReload)}</button>
        </div>
        <div class="blp-settings__footer">
          <a href="${escapeAttr(REPO_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.repoLink)}</a>
          — ${escapeHtml(t.repoAbout)}
        </div>
      </div>
    `;

    const close = () => backdrop.remove();

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('[data-blp-cancel]')?.addEventListener('click', close);

    backdrop.querySelectorAll('[data-blp-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-blp-toggle');
        draft[key] = !draft[key];
        btn.classList.toggle('is-on', draft[key]);
        btn.textContent = draft[key] ? t.on : t.off;
      });
    });

    backdrop.querySelectorAll('[data-blp-link]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-blp-link');
        draft.links[key] = !draft.links[key];
        btn.classList.toggle('is-on', draft.links[key]);
        btn.textContent = draft.links[key] ? t.on : t.off;
      });
    });

    backdrop.querySelector('[data-blp-clear]')?.addEventListener('click', () => {
      const count = clearCache();
      const msg = backdrop.querySelector('[data-blp-cache-msg]');
      if (msg) {
        msg.hidden = false;
        msg.textContent = count
          ? fmt(t.cacheCleared, { count })
          : t.cacheEmpty;
      }
      paintCacheMeter(backdrop);
    });

    backdrop.querySelector('[data-blp-save]')?.addEventListener('click', () => {
      const cc = backdrop.querySelector('#blp-steam-cc')?.value || 'US';
      const hours = Number(backdrop.querySelector('#blp-cache-hours')?.value);
      const uiLocale = backdrop.querySelector('#blp-ui-locale')?.value || 'auto';
      draft.uiLocale =
        uiLocale === 'auto' || SUPPORTED_LOCALES.includes(uiLocale) ? uiLocale : 'auto';
      draft.steamCountry = String(cc).toUpperCase();
      draft.cacheHours = Number.isFinite(hours)
        ? Math.max(0, Math.min(CACHE_HOURS_MAX, hours))
        : DEFAULT_SETTINGS.cacheHours;
      saveSettings(draft);
      settings = loadSettings();
      location.reload();
    });

    document.body.appendChild(backdrop);
  }

  const NAV_BTN_ID = 'blp-nav-settings';

  function ensureNavSettingsButton() {
    if (document.getElementById(NAV_BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = NAV_BTN_ID;
    btn.type = 'button';
    btn.className = 'btn btn-main mb-2 my-sm-0 py-0';
    btn.title = t.navSettingsTitle;
    // fa-gear is in Backloggd’s FA set (fa-sliders often is not → empty icon + short button)
    btn.innerHTML = `<i class="fa-solid fa-gear fa-xs" aria-hidden="true"></i> ${escapeHtml(t.navSettings)}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSettings();
    });

    // Same slot as native #add-a-game ("Log a Game")
    const logGame = document.getElementById('add-a-game');
    if (logGame?.parentElement) {
      btn.classList.add('ml-2');
      const h = logGame.getBoundingClientRect().height;
      if (h > 0) document.documentElement.style.setProperty('--blp-nav-btn-h', `${Math.round(h)}px`);
      logGame.insertAdjacentElement('afterend', btn);
      return;
    }

    const logSlot = document.querySelector(
      '#navbarSupportedContent .col.my-auto, #primary-nav .col.my-auto'
    );
    if (logSlot) {
      btn.classList.add('ml-2');
      logSlot.appendChild(btn);
      return;
    }

    const nav =
      document.querySelector('#navbarSupportedContent > ul.navbar-nav') ||
      document.querySelector('#primary-nav ul.navbar-nav.ml-auto');
    if (!nav) return;

    const li = document.createElement('li');
    li.className = 'nav-item my-auto';
    li.appendChild(btn);
    nav.appendChild(li);
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function openFixMatchDialog(slug, currentAppId) {
    if (!slug || document.querySelector('.blp-fix-match-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'blp-fix-match-backdrop';
    backdrop.innerHTML = `
      <div class="blp-fix-match-dialog" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.steamFixMatchTitle)}">
        <h3>${escapeHtml(t.steamFixMatchTitle)}</h3>
        <p class="blp-hint">${escapeHtml(t.steamFixMatchHint)}</p>
        <div class="blp-error" data-blp-fix-error hidden></div>
        <input id="blp-fix-appid" type="text" inputmode="numeric" placeholder="${escapeAttr(t.steamFixMatchPlaceholder)}" value="${escapeAttr(currentAppId || getSteamOverride(slug) || '')}" />
        <div class="blp-actions">
          <button type="button" class="blp-btn" data-blp-fix-clear>${escapeHtml(t.steamFixMatchClear)}</button>
          <button type="button" class="blp-btn" data-blp-fix-cancel>${escapeHtml(t.cancel)}</button>
          <button type="button" class="blp-btn blp-primary" data-blp-fix-save>${escapeHtml(t.save)}</button>
        </div>
      </div>
    `;

    const close = () => backdrop.remove();
    const errEl = () => backdrop.querySelector('[data-blp-fix-error]');
    const input = () => backdrop.querySelector('#blp-fix-appid');

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-blp-fix-cancel]')?.addEventListener('click', close);
    backdrop.querySelector('[data-blp-fix-clear]')?.addEventListener('click', () => {
      clearSteamOverride(slug);
      close();
      removeEnrichment();
      enrichGamePage();
      scheduleCardBadges(true);
    });
    backdrop.querySelector('[data-blp-fix-save]')?.addEventListener('click', () => {
      const raw = String(input()?.value || '').trim();
      const id = Number(raw.replace(/[^\d]/g, ''));
      if (!Number.isFinite(id) || id <= 0) {
        const box = errEl();
        if (box) {
          box.hidden = false;
          box.textContent = t.steamFixMatchInvalid;
        }
        return;
      }
      setSteamOverride(slug, id);
      close();
      removeEnrichment();
      enrichGamePage();
      scheduleCardBadges(true);
    });

    document.body.appendChild(backdrop);
    input()?.focus();
    input()?.select();
  }

  function bindFixMatchClicks() {
    if (document.documentElement.hasAttribute('data-blp-fix-bound')) return;
    document.documentElement.setAttribute('data-blp-fix-bound', '1');
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target?.closest?.('[data-blp-fix-match]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        openFixMatchDialog(
          btn.getAttribute('data-blp-slug') || getPageContext().slug,
          btn.getAttribute('data-blp-appid') || ''
        );
      },
      true
    );
  }

  function cardBadgeToken() {
    return [
      settings.steamCountry || 'US',
      settings.showSteam ? 1 : 0,
      settings.showSteamOwned ? 1 : 0,
      settings.showSteamWishlist ? 1 : 0,
      settings.showGameStatus ? 1 : 0,
      settings.showCardBadges ? 1 : 0,
    ].join('|');
  }

  function parseCardSlug(cover) {
    const roots = [
      cover,
      cover.parentElement,
      cover.closest('a[href*="/games/"]'),
      cover.closest('[game_id], .result, .col, .row'),
    ].filter(Boolean);
    for (const root of roots) {
      const link =
        root.matches?.('a[href*="/games/"]')
          ? root
          : root.querySelector?.('a[href*="/games/"]');
      const href = link?.getAttribute?.('href') || '';
      const m = href.match(/\/games\/([^/?#]+)/i);
      if (m) return m[1].toLowerCase();
    }
    return '';
  }

  function parseCardTitle(cover, slug) {
    const img = cover.querySelector('img[alt]');
    if (img?.alt) return img.alt.trim();
    const nearby = cover
      .closest('.result, .row, .col, [game_id]')
      ?.querySelector('.game-name h3, h3, .game-name a');
    if (nearby?.textContent) {
      return nearby.textContent.replace(/\s+\d{4}\s*$/, '').trim();
    }
    return slug ? slug.replace(/-/g, ' ') : '';
  }

  function ensureCardBadgeMount(cover) {
    let mount = cover.querySelector('.blp-card-badges');
    if (mount) return mount;
    const host = cover.querySelector('.overflow-wrapper') || cover;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    mount = document.createElement('div');
    mount.className = 'blp-card-badges is-loading';
    mount.innerHTML = '<span class="blp-card-badge"></span><span class="blp-card-badge"></span>';
    host.appendChild(mount);
    return mount;
  }

  function renderCardBadgesHtml({ steam, owned, wishlist, gamestatus }) {
    const chips = [];
    if (settings.showSteam !== false && steam?.found) {
      const priceText = formatPriceText(steam);
      if (priceText) {
        const discount =
          steam.price?.discount_percent > 0
            ? ` <span class="blp-card-badge--discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
            : '';
        chips.push(
          `<a class="blp-card-badge blp-card-badge--price" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}${discount}</a>`
        );
      }

      const reviewCompact = formatReviewPercentCompact(steam.reviews);
      const reviewFull = formatReviewPercent(steam.reviews);
      const reviewClass = reviewScoreClass(steam.reviews);
      if (reviewCompact) {
        chips.push(
          `<a class="blp-card-badge blp-card-badge--review ${escapeAttr(reviewClass)}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer" title="${escapeAttr(reviewFull || reviewCompact)}">${escapeHtml(reviewCompact)}</a>`
        );
      } else if (steam.metacritic?.score != null) {
        const mc = steam.metacritic.score;
        const tier = mcScoreTier(mc);
        chips.push(
          `<a class="blp-card-badge blp-card-badge--mc${tier ? ` blp-card-badge--mc-${tier}` : ''}" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(t.metacritic)}">${escapeHtml(String(mc))}</a>`
        );
      }
    }
    if (owned) {
      chips.push(`<span class="blp-card-badge blp-card-badge--owned">${escapeHtml(t.steamOwned)}</span>`);
    } else if (wishlist) {
      chips.push(
        `<span class="blp-card-badge blp-card-badge--wishlist">${escapeHtml(t.steamWishlist)}</span>`
      );
    }
    if (settings.showGameStatus && gamestatus && !gamestatus.missing && gamestatus.data) {
      const type = getGsStatusType(gamestatus.data);
      const label = getGsStatusLabel(gamestatus.data, type);
      const gsSlug = gamestatus.data.slug || gamestatus.slug;
      const href = gsSlug
        ? `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(gsSlug)}`
        : GAMESTATUS_SITE_BASE;
      chips.push(
        `<a class="blp-card-badge blp-card-badge--gs blp-gs-badge--${escapeAttr(type)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
      );
    }
    return chips.join('');
  }

  const cardQueue = [];
  let cardActive = 0;
  let cardObserver = null;

  function pumpCardQueue() {
    while (cardActive < CARD_CONCURRENCY && cardQueue.length) {
      const job = cardQueue.shift();
      cardActive += 1;
      Promise.resolve()
        .then(job.fn)
        .then(job.resolve, job.reject)
        .finally(() => {
          cardActive -= 1;
          pumpCardQueue();
        });
    }
  }

  function enqueueCardJob(fn) {
    return new Promise((resolve, reject) => {
      cardQueue.push({ fn, resolve, reject });
      pumpCardQueue();
    });
  }

  function cardIsSettled(cover, token) {
    if (cover.getAttribute(CARD_ATTR) !== token) return false;
    const state = cover.getAttribute(CARD_STATE_ATTR);
    return state === 'done' || state === 'empty' || state === 'loading';
  }

  function markCardState(cover, token, state) {
    cover.setAttribute(CARD_ATTR, token);
    cover.setAttribute(CARD_STATE_ATTR, state);
  }

  function clearCardMarkers(cover) {
    cover.removeAttribute(CARD_ATTR);
    cover.removeAttribute(CARD_STATE_ATTR);
    cover.querySelector('.blp-card-badges')?.remove();
  }

  async function enrichGameCard(cover) {
    const token = cardBadgeToken();
    if (cardIsSettled(cover, token)) return;

    const slug = parseCardSlug(cover);
    const title = parseCardTitle(cover, slug);
    if (!slug || !title) {
      clearCardMarkers(cover);
      markCardState(cover, token, 'empty');
      return;
    }

    markCardState(cover, token, 'loading');
    const mount = ensureCardBadgeMount(cover);
    mount.classList.add('is-loading');

    await enqueueCardJob(async () => {
      if (cover.getAttribute(CARD_ATTR) !== token) return;

      const needUserdata = settings.showSteamOwned || settings.showSteamWishlist;
      const [steam, userdata] = await Promise.all([
        resolveSteamForGame({
          title,
          slug,
          country: settings.steamCountry || 'US',
          includeTags: false,
        }).catch(() => ({ found: false })),
        needUserdata ? fetchSteamUserdata().catch(() => null) : Promise.resolve(null),
      ]);

      let gamestatus = null;
      if (settings.showGameStatus && steam?.found && steam.appId != null) {
        gamestatus = await fetchGameStatus({
          appId: steam.appId,
          storeUrl: steam.storeUrl,
          name: steam.name,
          title,
          pageSlug: slug,
        }).catch(() => null);
      }

      if (cover.getAttribute(CARD_ATTR) !== token) return;

      let owned = false;
      let wishlist = false;
      if (userdata && steam?.found && steam.appId != null) {
        const id = Number(steam.appId);
        owned = settings.showSteamOwned !== false && userdata.owned.has(id);
        wishlist =
          !owned &&
          settings.showSteamWishlist !== false &&
          userdata.wishlist.has(id);
      }

      const html = renderCardBadgesHtml({ steam, owned, wishlist, gamestatus });
      mount.classList.remove('is-loading');
      if (!html) {
        // Mark empty before DOM remove so MutationObserver → scanPage does not re-queue.
        markCardState(cover, token, 'empty');
        mount.remove();
        return;
      }
      mount.innerHTML = html;
      markCardState(cover, token, 'done');
    });
  }

  function scheduleCardBadges(force = false) {
    if (!settings.showCardBadges) {
      document.querySelectorAll('.blp-card-badges').forEach((el) => el.remove());
      document.querySelectorAll(`[${CARD_ATTR}]`).forEach((el) => {
        el.removeAttribute(CARD_ATTR);
        el.removeAttribute(CARD_STATE_ATTR);
      });
      cardObserver?.disconnect();
      cardObserver = null;
      return;
    }

    const ctx = getPageContext();
    if (ctx.isGamePage) return;

    const token = cardBadgeToken();
    if (!cardObserver) {
      cardObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const cover = entry.target;
            cardObserver.unobserve(cover);
            enrichGameCard(cover);
          }
        },
        { rootMargin: CARD_ROOT_MARGIN }
      );
    }

    document.querySelectorAll('.game-cover').forEach((cover) => {
      if (cover.closest(CARD_SKIP_ANCESTOR)) return;
      if (!force && cardIsSettled(cover, token)) return;
      if (force) clearCardMarkers(cover);
      cardObserver.observe(cover);
    });
  }

  function scanPage() {
    ensureNavSettingsButton();
    bindFixMatchClicks();
    enrichGamePage();
    scheduleCardBadges();
  }

  function observeDom(onChange) {
    const scheduled = debounce(onChange, SCAN_DEBOUNCE_MS);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          scheduled();
          return;
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return observer;
  }

  function bindSpaNavigation(onNavigate) {
    const run = debounce(onNavigate, 50);
    ['turbo:load', 'turbo:render', 'turbo:frame-load', 'popstate'].forEach((evt) => {
      document.addEventListener(evt, run, true);
      window.addEventListener(evt, run, true);
    });
    let prev = location.href;
    setInterval(() => {
      if (location.href !== prev) {
        prev = location.href;
        run();
      }
    }, 500);
  }

  /* ── Steam store / community: Backloggd button in .apphub_OtherSiteInfo ── */

  const STEAM_BTN_ID = 'blp-steam-backloggd-btn';
  const BACKLOGGD_SITE = 'https://www.backloggd.com';

  function isSteamHost() {
    const host = location.hostname;
    return (
      host === 'store.steampowered.com' ||
      host.endsWith('.steampowered.com') ||
      host === 'steamcommunity.com' ||
      host.endsWith('.steamcommunity.com')
    );
  }

  function isBackloggdHost() {
    return /(^|\.)backloggd\.com$/i.test(location.hostname);
  }

  function getSteamAppIdFromPage() {
    const m = location.pathname.match(/\/app\/(\d+)/i);
    return m ? m[1] : '';
  }

  function getSteamPageTitle() {
    return (
      document.getElementById('appHubAppName')?.textContent?.trim() ||
      document.querySelector('.apphub_AppName')?.textContent?.trim() ||
      document.title.replace(/\s+on\s+Steam.*$/i, '').replace(/\s+::\s+.*$/i, '').trim()
    );
  }

  function slugifyForBackloggd(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** Metacritic `/game/{slug}/` — drop apostrophes (Assassin's → assassins), not hyphenate them. */
  function slugifyForMetacritic(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[''`´]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function metacriticGameUrl(title, slug) {
    // Backloggd disambiguators: meccha-chameleon--1 → meccha-chameleon
    const raw =
      String(slug || '')
        .replace(/^\/+|\/+$/g, '')
        .replace(/--\d+$/i, '') || slugifyForMetacritic(title);
    if (!raw) return '';
    return `https://www.metacritic.com/game/${encodeURIComponent(raw)}/`;
  }

  function getSteamPathSlug() {
    const m = location.pathname.match(/\/app\/\d+\/([^/?#]+)/i);
    if (!m) return '';
    return slugifyForBackloggd(m[1].replace(/_/g, '-'));
  }

  function resolveBackloggdUrlFromSteam() {
    const pathSlug = getSteamPathSlug();
    if (pathSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(pathSlug)}/`;
    const titleSlug = slugifyForBackloggd(getSteamPageTitle());
    if (titleSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(titleSlug)}/`;
    return BACKLOGGD_SITE;
  }

  function createSteamBackloggdButton(url) {
    const a = document.createElement('a');
    a.id = STEAM_BTN_ID;
    a.className = 'btnv6_blue_hoverfade btn_medium';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = `
      <span data-tooltip-text="${escapeAttr(t.steamBackloggdTooltip)}">
        <img class="ico16" src="${escapeAttr(`${BACKLOGGD_SITE}/favicon.ico`)}" alt="Backloggd" width="16" height="16" />
      </span>
    `;
    return a;
  }

  function injectSteamBackloggdButton() {
    if (!settings.showSteamPageLink) {
      document.getElementById(STEAM_BTN_ID)?.remove();
      return;
    }

    const appId = getSteamAppIdFromPage();
    if (!appId) return;

    const anchor = document.querySelector('.apphub_OtherSiteInfo');
    if (!anchor) return;

    const url = resolveBackloggdUrlFromSteam();
    const existing = document.getElementById(STEAM_BTN_ID);
    if (existing) {
      existing.href = url;
      return;
    }

    const btn = createSteamBackloggdButton(url);

    // Place like SteamDB: before Community Hub / Store Page, after other extension icons when possible
    const hub =
      anchor.querySelector('a.btnv6_blue_hoverfade[href*="steamcommunity.com/app/"]') ||
      anchor.querySelector('a.btnv6_blue_hoverfade[href*="store.steampowered.com/app/"]') ||
      [...anchor.querySelectorAll('a.btnv6_blue_hoverfade')].find((el) =>
        /community hub|store page/i.test(el.textContent || '')
      );

    if (hub) {
      hub.insertAdjacentElement('beforebegin', btn);
      // SteamDB leaves a space text node before hub — keep spacing
      if (hub.previousSibling === btn) {
        btn.insertAdjacentText('afterend', ' ');
      }
    } else {
      anchor.appendChild(btn);
    }
  }

  function scanSteamPage() {
    injectSteamBackloggdButton();
  }

  /* ── SteamDB: Backloggd button in nav.app-links ── */

  const STEAMDB_BTN_ID = 'blp-steamdb-backloggd-btn';

  function isSteamDbHost() {
    return /(^|\.)steamdb\.info$/i.test(location.hostname);
  }

  function getSteamDbAppId() {
    const m = location.pathname.match(/\/app\/(\d+)/i);
    return m ? m[1] : '';
  }

  function getIgdbSlugFromPage() {
    const link = document.querySelector(
      '.app-links a[href*="igdb.com/games/"], a[href*="igdb.com/games/"]'
    );
    if (!link?.href) return '';
    const m = String(link.href).match(/igdb\.com\/games\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]).toLowerCase() : '';
  }

  function getSteamDbPageTitle() {
    const header =
      document.querySelector('.app-page header h1, .header-title h1, h1[itemprop="name"]') ||
      document.querySelector('h1');
    let name = (header?.textContent || '').trim();
    // "Stardew Valley" often followed by meta; strip AppID suffixes from document.title fallback
    if (!name) {
      name = document.title.replace(/\s*[·•|].*$/, '').replace(/\s*AppID.*$/i, '').trim();
    } else {
      name = name.split(/\n/)[0].trim();
    }
    return name;
  }

  function resolveBackloggdUrlFromSteamDb() {
    const igdbSlug = getIgdbSlugFromPage();
    if (igdbSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(igdbSlug)}/`;
    const titleSlug = slugifyForBackloggd(getSteamDbPageTitle());
    if (titleSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(titleSlug)}/`;
    return BACKLOGGD_SITE;
  }

  function createSteamDbBackloggdButton(url) {
    const a = document.createElement('a');
    a.id = STEAMDB_BTN_ID;
    a.className = 'btn tooltipped tooltipped-n';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', t.steamBackloggdTooltip);
    a.textContent = t.steamDbBackloggdLabel;
    return a;
  }

  function injectSteamDbBackloggdButton() {
    if (!settings.showSteamDbPageLink) {
      document.getElementById(STEAMDB_BTN_ID)?.remove();
      return;
    }

    if (!getSteamDbAppId()) return;

    const nav = document.querySelector('nav.app-links');
    if (!nav) return;

    const url = resolveBackloggdUrlFromSteamDb();
    const existing = document.getElementById(STEAMDB_BTN_ID);
    if (existing) {
      existing.href = url;
      return;
    }

    const btn = createSteamDbBackloggdButton(url);

    // Immediately after Steam Store button (like Hub follows Store)
    const store = nav.querySelector('a.btn[href*="store.steampowered.com"]');
    if (store) {
      store.insertAdjacentElement('afterend', btn);
    } else {
      const igdb = nav.querySelector('a.btn[href*="igdb.com"]');
      if (igdb) igdb.insertAdjacentElement('beforebegin', btn);
      else nav.appendChild(btn);
    }
  }

  function scanSteamDbPage() {
    injectSteamDbBackloggdButton();
  }

  function init() {
    if (document.documentElement.hasAttribute(ROOT_ATTR)) return;
    document.documentElement.setAttribute(ROOT_ATTR, '1');

    settings = loadSettings();
    locale = resolveLocale(settings.uiLocale);
    t = TRANSLATIONS[locale] || TRANSLATIONS.en;
    migrateCacheForScriptVersion();

    injectStyles();

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand(t.menuSettings, openSettings);
    }

    if (isSteamHost()) {
      scanSteamPage();
      observeDom(scanSteamPage);
      return;
    }

    if (isSteamDbHost()) {
      scanSteamDbPage();
      observeDom(scanSteamDbPage);
      return;
    }

    if (isBackloggdHost()) {
      ensureNavSettingsButton();
      scanPage();
      observeDom(scanPage);
      bindSpaNavigation(scanPage);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
