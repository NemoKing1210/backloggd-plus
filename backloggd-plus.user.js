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
// @version           0.4.16
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
  const SCRIPT_VERSION = '0.4.16';
  const SETTINGS_KEY = 'blp_settings';
  const CACHE_KEY = 'blp_cache_v1';
  const CACHE_VERSION_KEY = 'blp_cache_script_version';
  const ROOT_ATTR = 'data-blp-root';
  const ENRICH_ATTR = 'data-blp-enrich';
  const FAVICON_URL = 'https://www.google.com/s2/favicons?domain={domain}&sz=32';
  const SCAN_DEBOUNCE_MS = 400;
  const CACHE_HOURS_MAX = 168;
  const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/';
  const STEAM_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';
  const STEAM_REVIEWS_URL = 'https://store.steampowered.com/appreviews';
  const STEAM_USERDATA_URL = 'https://store.steampowered.com/dynamicstore/userdata/';
  const STEAM_POPULAR_TAGS_URL = 'https://store.steampowered.com/tagdata/populartags/english';
  const STEAM_STORE_ITEMS_URL = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';
  const STEAM_TAGS_MAX = 12;
  const GAMESTATUS_API_BASE = 'https://gamestatus.info/back/api/gameinfo/game';
  const GAMESTATUS_SITE_BASE = 'https://gamestatus.info';
  const GAMESTATUS_MAX_SLUG_ATTEMPTS = 2;
  const OWNED_CACHE_KEY = 'steam:owned';
  const OWNED_EMPTY_TTL_MS = 5 * 60 * 1000;
  const OWNED_FALLBACK_TTL_MS = 60 * 60 * 1000;
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
    showSteamTags: true,
    showSteamPageLink: true,
    showSteamDbPageLink: true,
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
      panelSubtitle: 'Steam · GameStatus · scores · quick links',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      saveReload: 'Save & Reload page',
      repoLink: 'GitHub',
      repoAbout: 'Source code, updates, and issue reports',
      sectionGame: 'Game page',
      sectionGeneral: 'General',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Debug mode',
      debugModeHint:
        'On game pages, show why Steam / GameStatus matched or failed and a truncated response dump under each row.',
      debugReason: 'Reason',
      debugResponse: 'Response',
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
      showSteamTags: 'Show Steam tags',
      showSteamTagsHint: 'Popular community tags from the Steam store (Open World, RPG, …).',
      showSteamPageLink: 'Show Backloggd button on Steam',
      showSteamPageLinkHint: 'Adds a SteamDB-style button in Other site info on Steam app pages.',
      showSteamDbPageLink: 'Show Backloggd button on SteamDB',
      showSteamDbPageLinkHint: 'Adds a Backloggd button next to Store / IGDB in SteamDB app links.',
      steamBackloggdTooltip: 'View on Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Owned',
      sectionLinks: 'Quick links',
      sectionLinksHint: 'Choose which sites appear in the Links row on game pages.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus settings',
      cacheHours: 'Cache duration (hours)',
      cacheHoursHint: 'How long to reuse Steam / GameStatus lookups. 0 disables cache.',
      clearCache: 'Clear cache',
      cacheCleared: 'Cache cleared ({count})',
      cacheEmpty: 'Cache is empty',
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
    },
    ru: {
      menuSettings: 'Backloggd Plus — Настройки',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · оценки · быстрые ссылки',
      close: 'Закрыть',
      cancel: 'Отмена',
      save: 'Сохранить',
      saveReload: 'Сохранить и перезагрузить',
      repoLink: 'GitHub',
      repoAbout: 'Исходники, обновления и баг-репорты',
      sectionGame: 'Страница игры',
      sectionGeneral: 'Общие',
      sectionCache: 'Кэш',
      sectionDebug: 'Отладка',
      debugMode: 'Режим отладки',
      debugModeHint:
        'На странице игры показывает причину совпадения/промаха Steam / GameStatus и урезанный дамп ответа под строкой.',
      debugReason: 'Причина',
      debugResponse: 'Ответ',
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
      showSteamTags: 'Показывать теги Steam',
      showSteamTagsHint: 'Популярные пользовательские теги из Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Кнопка Backloggd на Steam',
      showSteamPageLinkHint: 'Кнопка в стиле SteamDB в блоке Other site info на страницах игр Steam.',
      showSteamDbPageLink: 'Кнопка Backloggd на SteamDB',
      showSteamDbPageLinkHint: 'Кнопка рядом со Store / IGDB в блоке app-links на SteamDB.',
      steamBackloggdTooltip: 'Открыть на Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Куплено',
      sectionLinks: 'Быстрые ссылки',
      sectionLinksHint: 'Какие сайты показывать в ряду Links на странице игры.',
      navSettings: 'Plus',
      navSettingsTitle: 'Настройки Backloggd Plus',
      cacheHours: 'Время кэша (часы)',
      cacheHoursHint: 'Как долго переиспользовать ответы Steam / GameStatus. 0 отключает кэш.',
      clearCache: 'Очистить кэш',
      cacheCleared: 'Кэш очищен ({count})',
      cacheEmpty: 'Кэш пуст',
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

    },
    zh: {
      menuSettings: 'Backloggd Plus — 设置',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · 评分 · 快捷链接',
      close: '关闭',
      cancel: '取消',
      save: '保存',
      saveReload: '保存并刷新页面',
      repoLink: 'GitHub',
      repoAbout: '源码、更新与问题反馈',
      sectionGame: '游戏页',
      sectionGeneral: '通用',
      sectionCache: '缓存',
      sectionDebug: '调试',
      debugMode: '调试模式',
      debugModeHint: '在游戏页显示 Steam / GameStatus 匹配或失败的原因，以及截断的响应内容。',
      debugReason: '原因',
      debugResponse: '响应',
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
      showSteamTags: '显示 Steam 标签',
      showSteamTagsHint: '来自 Steam 商店的热门社区标签（Open World、RPG 等）。',
      showSteamPageLink: '在 Steam 显示 Backloggd 按钮',
      showSteamPageLinkHint: '在 Steam 游戏页 Other site info 中添加类似 SteamDB 的按钮。',
      showSteamDbPageLink: '在 SteamDB 显示 Backloggd 按钮',
      showSteamDbPageLinkHint: '在 SteamDB app-links 中、Store / IGDB 旁添加 Backloggd 按钮。',
      steamBackloggdTooltip: '在 Backloggd 查看',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '已拥有',
      sectionLinks: '快捷链接',
      sectionLinksHint: '选择游戏页 Links 行中显示的站点。',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 设置',
      cacheHours: '缓存时长（小时）',
      cacheHoursHint: '复用 Steam / GameStatus 查询的时间。0 禁用缓存。',
      clearCache: '清除缓存',
      cacheCleared: '已清除缓存（{count}）',
      cacheEmpty: '缓存为空',
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

    },
    es: {
      menuSettings: 'Backloggd Plus — Ajustes',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notas · enlaces rápidos',
      close: 'Cerrar',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveReload: 'Guardar y recargar',
      repoLink: 'GitHub',
      repoAbout: 'Código, actualizaciones e informes',
      sectionGame: 'Página del juego',
      sectionGeneral: 'General',
      sectionCache: 'Caché',
      sectionDebug: 'Depuración',
      debugMode: 'Modo depuración',
      debugModeHint: 'En la página del juego muestra por qué Steam / GameStatus coincidió o falló y un volcado truncado bajo cada fila.',
      debugReason: 'Motivo',
      debugResponse: 'Respuesta',
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
      showSteamTags: 'Mostrar etiquetas de Steam',
      showSteamTagsHint: 'Etiquetas populares de la tienda Steam (Open World, RPG, …).',
      showSteamPageLink: 'Botón Backloggd en Steam',
      showSteamPageLinkHint: 'Añade un botón estilo SteamDB en Other site info en páginas de Steam.',
      showSteamDbPageLink: 'Botón Backloggd en SteamDB',
      showSteamDbPageLinkHint: 'Añade un botón junto a Store / IGDB en app-links de SteamDB.',
      steamBackloggdTooltip: 'Ver en Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'En propiedad',
      sectionLinks: 'Enlaces rápidos',
      sectionLinksHint: 'Elige qué sitios aparecen en la fila Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Ajustes de Backloggd Plus',
      cacheHours: 'Duración de caché (horas)',
      cacheHoursHint: 'Cuánto reutilizar búsquedas de Steam / GameStatus. 0 desactiva la caché.',
      clearCache: 'Vaciar caché',
      cacheCleared: 'Caché vaciada ({count})',
      cacheEmpty: 'La caché está vacía',
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

    },
    pt: {
      menuSettings: 'Backloggd Plus — Configurações',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notas · links rápidos',
      close: 'Fechar',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveReload: 'Salvar e recarregar',
      repoLink: 'GitHub',
      repoAbout: 'Código, atualizações e relatórios',
      sectionGame: 'Página do jogo',
      sectionGeneral: 'Geral',
      sectionCache: 'Cache',
      sectionDebug: 'Depuração',
      debugMode: 'Modo debug',
      debugModeHint: 'Na página do jogo mostra por que Steam / GameStatus bateu ou falhou e um dump truncado sob cada linha.',
      debugReason: 'Motivo',
      debugResponse: 'Resposta',
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
      showSteamTags: 'Mostrar tags da Steam',
      showSteamTagsHint: 'Tags populares da Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Botão Backloggd no Steam',
      showSteamPageLinkHint: 'Adiciona um botão estilo SteamDB em Other site info nas páginas da Steam.',
      showSteamDbPageLink: 'Botão Backloggd no SteamDB',
      showSteamDbPageLinkHint: 'Adiciona um botão ao lado de Store / IGDB em app-links do SteamDB.',
      steamBackloggdTooltip: 'Ver no Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Possui',
      sectionLinks: 'Links rápidos',
      sectionLinksHint: 'Escolha quais sites aparecem na linha Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Configurações do Backloggd Plus',
      cacheHours: 'Duração do cache (horas)',
      cacheHoursHint: 'Por quanto tempo reutilizar buscas Steam / GameStatus. 0 desativa o cache.',
      clearCache: 'Limpar cache',
      cacheCleared: 'Cache limpo ({count})',
      cacheEmpty: 'Cache vazio',
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

    },
    de: {
      menuSettings: 'Backloggd Plus — Einstellungen',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · Wertungen · Schnelllinks',
      close: 'Schließen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      saveReload: 'Speichern & neu laden',
      repoLink: 'GitHub',
      repoAbout: 'Quellcode, Updates und Issue-Reports',
      sectionGame: 'Spieleseite',
      sectionGeneral: 'Allgemein',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Debug-Modus',
      debugModeHint: 'Auf der Spieleseite: Grund für Steam-/GameStatus-Treffer oder Fehlschlag und gekürzter Response unter jeder Zeile.',
      debugReason: 'Grund',
      debugResponse: 'Antwort',
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
      showSteamTags: 'Steam-Tags anzeigen',
      showSteamTagsHint: 'Beliebte Community-Tags aus dem Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Backloggd-Button auf Steam',
      showSteamPageLinkHint: 'SteamDB-ähnlicher Button in Other site info auf Steam-Spieleseiten.',
      showSteamDbPageLink: 'Backloggd-Button auf SteamDB',
      showSteamDbPageLinkHint: 'Button neben Store / IGDB in den SteamDB app-links.',
      steamBackloggdTooltip: 'Auf Backloggd ansehen',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Im Besitz',
      sectionLinks: 'Schnelllinks',
      sectionLinksHint: 'Welche Seiten in der Links-Zeile erscheinen.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus Einstellungen',
      cacheHours: 'Cache-Dauer (Stunden)',
      cacheHoursHint: 'Wie lange Steam-/GameStatus-Abfragen wiederverwendet werden. 0 deaktiviert den Cache.',
      clearCache: 'Cache leeren',
      cacheCleared: 'Cache geleert ({count})',
      cacheEmpty: 'Cache ist leer',
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

    },
    fr: {
      menuSettings: 'Backloggd Plus — Réglages',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · notes · liens rapides',
      close: 'Fermer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saveReload: 'Enregistrer et recharger',
      repoLink: 'GitHub',
      repoAbout: 'Code source, mises à jour et signalements',
      sectionGame: 'Page jeu',
      sectionGeneral: 'Général',
      sectionCache: 'Cache',
      sectionDebug: 'Débogage',
      debugMode: 'Mode debug',
      debugModeHint: 'Sur la page jeu : raison du match/échec Steam / GameStatus et dump tronqué sous chaque ligne.',
      debugReason: 'Raison',
      debugResponse: 'Réponse',
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
      showSteamTags: 'Afficher les tags Steam',
      showSteamTagsHint: 'Tags communautaires populaires du Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Bouton Backloggd sur Steam',
      showSteamPageLinkHint: 'Ajoute un bouton style SteamDB dans Other site info sur les pages Steam.',
      showSteamDbPageLink: 'Bouton Backloggd sur SteamDB',
      showSteamDbPageLinkHint: 'Ajoute un bouton à côté de Store / IGDB dans app-links SteamDB.',
      steamBackloggdTooltip: 'Voir sur Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Possédé',
      sectionLinks: 'Liens rapides',
      sectionLinksHint: 'Choisissez les sites affichés dans la rangée Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Réglages Backloggd Plus',
      cacheHours: 'Durée du cache (heures)',
      cacheHoursHint: 'Durée de réutilisation des requêtes Steam / GameStatus. 0 désactive le cache.',
      clearCache: 'Vider le cache',
      cacheCleared: 'Cache vidé ({count})',
      cacheEmpty: 'Le cache est vide',
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

    },
    ja: {
      menuSettings: 'Backloggd Plus — 設定',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · スコア · クイックリンク',
      close: '閉じる',
      cancel: 'キャンセル',
      save: '保存',
      saveReload: '保存して再読み込み',
      repoLink: 'GitHub',
      repoAbout: 'ソースコード、更新、Issue報告',
      sectionGame: 'ゲームページ',
      sectionGeneral: '一般',
      sectionCache: 'キャッシュ',
      sectionDebug: 'デバッグ',
      debugMode: 'デバッグモード',
      debugModeHint: 'ゲームページで Steam / GameStatus の一致・失敗理由と短縮レスポンスを各行の下に表示します。',
      debugReason: '理由',
      debugResponse: 'レスポンス',
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
      showSteamTags: 'Steamタグを表示',
      showSteamTagsHint: 'Steamストアの人気コミュニティタグ（Open World、RPG など）。',
      showSteamPageLink: 'SteamにBackloggdボタン',
      showSteamPageLinkHint: 'Steamのゲームページ Other site info にSteamDB風ボタンを追加します。',
      showSteamDbPageLink: 'SteamDBにBackloggdボタン',
      showSteamDbPageLinkHint: 'SteamDBのapp-linksでStore / IGDBの横にボタンを追加します。',
      steamBackloggdTooltip: 'Backloggdで見る',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '所持',
      sectionLinks: 'クイックリンク',
      sectionLinksHint: 'Links行に表示するサイトを選択します。',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 設定',
      cacheHours: 'キャッシュ時間（時間）',
      cacheHoursHint: 'Steam / GameStatus照会の再利用時間。0で無効。',
      clearCache: 'キャッシュを消去',
      cacheCleared: 'キャッシュを消去しました（{count}）',
      cacheEmpty: 'キャッシュは空です',
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

    },
    ko: {
      menuSettings: 'Backloggd Plus — 설정',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · 점수 · 빠른 링크',
      close: '닫기',
      cancel: '취소',
      save: '저장',
      saveReload: '저장 후 새로고침',
      repoLink: 'GitHub',
      repoAbout: '소스 코드, 업데이트, 이슈 보고',
      sectionGame: '게임 페이지',
      sectionGeneral: '일반',
      sectionCache: '캐시',
      sectionDebug: '디버그',
      debugMode: '디버그 모드',
      debugModeHint: '게임 페이지에서 Steam / GameStatus 일치·실패 이유와 잘린 응답을 각 행 아래에 표시합니다.',
      debugReason: '이유',
      debugResponse: '응답',
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
      showSteamTags: 'Steam 태그 표시',
      showSteamTagsHint: 'Steam 스토어의 인기 커뮤니티 태그(Open World, RPG 등).',
      showSteamPageLink: 'Steam에 Backloggd 버튼',
      showSteamPageLinkHint: 'Steam 게임 페이지 Other site info에 SteamDB 스타일 버튼을 추가합니다.',
      showSteamDbPageLink: 'SteamDB에 Backloggd 버튼',
      showSteamDbPageLinkHint: 'SteamDB app-links에서 Store / IGDB 옆에 버튼을 추가합니다.',
      steamBackloggdTooltip: 'Backloggd에서 보기',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: '보유',
      sectionLinks: '빠른 링크',
      sectionLinksHint: 'Links 행에 표시할 사이트를 선택합니다.',
      navSettings: 'Plus',
      navSettingsTitle: 'Backloggd Plus 설정',
      cacheHours: '캐시 시간(시간)',
      cacheHoursHint: 'Steam / GameStatus 조회 재사용 시간. 0은 캐시 비활성.',
      clearCache: '캐시 비우기',
      cacheCleared: '캐시 비움 ({count})',
      cacheEmpty: '캐시가 비어 있음',
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

    },
    pl: {
      menuSettings: 'Backloggd Plus — Ustawienia',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · GameStatus · oceny · szybkie linki',
      close: 'Zamknij',
      cancel: 'Anuluj',
      save: 'Zapisz',
      saveReload: 'Zapisz i przeładuj',
      repoLink: 'GitHub',
      repoAbout: 'Kod źródłowy, aktualizacje i zgłoszenia',
      sectionGame: 'Strona gry',
      sectionGeneral: 'Ogólne',
      sectionCache: 'Cache',
      sectionDebug: 'Debug',
      debugMode: 'Tryb debug',
      debugModeHint: 'Na stronie gry pokazuje powód trafienia/pudła Steam / GameStatus i skrócony dump pod każdym wierszem.',
      debugReason: 'Powód',
      debugResponse: 'Odpowiedź',
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
      showSteamTags: 'Pokaż tagi Steam',
      showSteamTagsHint: 'Popularne tagi społeczności ze Steam Store (Open World, RPG, …).',
      showSteamPageLink: 'Przycisk Backloggd na Steam',
      showSteamPageLinkHint: 'Dodaje przycisk w stylu SteamDB w Other site info na stronach Steam.',
      showSteamDbPageLink: 'Przycisk Backloggd na SteamDB',
      showSteamDbPageLinkHint: 'Dodaje przycisk obok Store / IGDB w app-links na SteamDB.',
      steamBackloggdTooltip: 'Zobacz na Backloggd',
      steamDbBackloggdLabel: 'Backloggd',
      steamOwned: 'Posiadane',
      sectionLinks: 'Szybkie linki',
      sectionLinksHint: 'Wybierz witryny widoczne w wierszu Links.',
      navSettings: 'Plus',
      navSettingsTitle: 'Ustawienia Backloggd Plus',
      cacheHours: 'Czas cache (godziny)',
      cacheHoursHint: 'Jak długo ponownie używać zapytań Steam / GameStatus. 0 wyłącza cache.',
      clearCache: 'Wyczyść cache',
      cacheCleared: 'Cache wyczyszczony ({count})',
      cacheEmpty: 'Cache jest pusty',
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

  function ownedCacheTtlMs(empty) {
    if (empty) return OWNED_EMPTY_TTL_MS;
    const ttl = cacheTtlMs();
    return ttl > 0 ? ttl : OWNED_FALLBACK_TTL_MS;
  }

  function getOwnedCached() {
    const entry = readCacheStore()[OWNED_CACHE_KEY];
    if (!entry?.ts || !entry.data || !Array.isArray(entry.data.appIds)) return null;
    const empty = entry.data.appIds.length === 0;
    if (Date.now() - entry.ts > ownedCacheTtlMs(empty)) return null;
    return entry.data;
  }

  function setOwnedCached(data) {
    readCacheStore()[OWNED_CACHE_KEY] = { ts: Date.now(), data };
    persistCacheSoon();
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

  async function fetchSteamAppTags(appId, country) {
    const cacheKey = `steam:tags:${appId}`;
    const debugOn = Boolean(settings.debugMode);
    if (!debugOn) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    if (inflight.has(cacheKey)) return inflight.get(cacheKey);

    const task = (async () => {
      try {
        const input = JSON.stringify({
          ids: [{ appid: Number(appId) }],
          context: {
            language: 'english',
            country_code: String(country || 'US').toUpperCase(),
            steam_realm: 1,
          },
          data_request: { include_tag_count: STEAM_TAGS_MAX },
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
        if (!debugOn) setCached(cacheKey, tags);
        return tags;
      } catch (_) {
        return [];
      }
    })();

    inflight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(cacheKey);
    }
  }

  function steamTagUrl(name) {
    return `https://store.steampowered.com/tags/en/${encodeURIComponent(name)}/`;
  }

  async function fetchSteamOwnedSet() {
    const cached = getOwnedCached();
    if (cached) return new Set(cached.appIds);

    if (inflight.has(OWNED_CACHE_KEY)) return inflight.get(OWNED_CACHE_KEY);

    const task = (async () => {
      try {
        const data = await gmRequest({
          url: `${STEAM_USERDATA_URL}?t=${Date.now()}`,
          anonymous: false,
          headers: { 'Cache-Control': 'no-cache' },
        });
        const appIds = Array.isArray(data?.rgOwnedApps)
          ? data.rgOwnedApps.map(Number).filter((id) => Number.isFinite(id) && id > 0)
          : [];
        setOwnedCached({ appIds });
        return new Set(appIds);
      } catch (_) {
        return new Set();
      }
    })();

    inflight.set(OWNED_CACHE_KEY, task);
    try {
      return await task;
    } finally {
      inflight.delete(OWNED_CACHE_KEY);
    }
  }

  function clearCache() {
    const store = readCacheStore();
    const count = Object.keys(store).length;
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
            resolve(res.response);
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

      [${ENRICH_ATTR}] .blp-debug {
        margin-top: 0.45rem;
        padding: 0.45rem 0.55rem;
        border-radius: 6px;
        border: 1px dashed rgba(255, 179, 33, 0.35);
        background: rgba(0, 0, 0, 0.28);
        text-align: left;
        max-width: min(100%, 36rem);
      }

      [${ENRICH_ATTR}] .blp-debug__label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #ffb321;
        margin-bottom: 0.2rem;
      }

      [${ENRICH_ATTR}] .blp-debug__reason {
        display: block;
        font-size: 0.8rem;
        color: var(--blp-text);
        margin-bottom: 0.35rem;
        word-break: break-word;
      }

      [${ENRICH_ATTR}] .blp-debug__pre {
        margin: 0;
        padding: 0.4rem 0.45rem;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.35);
        color: #b0aeac;
        font-size: 0.68rem;
        line-height: 1.35;
        overflow: auto;
        max-height: 12rem;
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

  function normalizeTitle(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[™®©]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function isLikelyExtra(name) {
    return /\b(dlc|soundtrack|ost|bundle|pack|edition upgrade|cosmetic)\b/i.test(name);
  }

  function pickSteamSearchItem(items, title) {
    const list = (items || []).filter((i) => i && i.type === 'app' && i.id);
    if (!list.length) return null;
    const target = normalizeTitle(title);
    const exact = list.find((i) => normalizeTitle(i.name) === target);
    if (exact) return exact;
    const nonExtra = list.filter((i) => !isLikelyExtra(i.name));
    const pool = nonExtra.length ? nonExtra : list;
    const starts = pool.find((i) => normalizeTitle(i.name).startsWith(target));
    if (starts) return starts;
    return pool[0];
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

  async function fetchSteamBundle(title, country) {
    const requestedCountry = String(country || 'US').toUpperCase();
    const cacheKey = `steam:${requestedCountry}:${normalizeTitle(title)}`;
    const debugOn = Boolean(settings.debugMode);
    if (!debugOn) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }

    if (inflight.has(cacheKey)) return inflight.get(cacheKey);

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
        const anonymous = hit ? !sessionIds.has(hit.id) : Boolean(guestResult.ok && !sessionResult.ok);
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

      let { hit, anonymous } = round;
      debug.searchCountry = searchCountry;
      debug.usedUsFallback = usedUsFallback;
      debug.anonymous = anonymous;

      if (!hit) {
        debug.reason = usedUsFallback
          ? `No Steam search match for ${requestedCountry} or US (session + guest, parallel)`
          : 'No Steam search match (session + guest, parallel)';
        const miss = { found: false, _debug: debug };
        return miss;
      }

      const appId = hit.id;
      debug.picked = { id: hit.id, name: hit.name, type: hit.type };

      // Price/details use the country that actually found the game.
      const detailsCountry = searchCountry;
      let detailsRoot = null;
      let reviews = null;
      let tags = [];
      try {
        const needTags = settings.showSteamTags !== false;
        const jobs = [
          gmRequest({
            url:
              `${STEAM_DETAILS_URL}?appids=${appId}` +
              `&cc=${encodeURIComponent(detailsCountry)}&l=english`,
            anonymous,
          }),
          gmRequest({
            url:
              `${STEAM_REVIEWS_URL}/${appId}?json=1&language=all` +
              `&purchase_type=all&num_per_page=0`,
            anonymous,
          }).catch((err) => {
            debug.reviewsError = String(err?.message || err);
            return null;
          }),
        ];
        if (needTags) {
          jobs.push(
            fetchSteamAppTags(appId, detailsCountry).catch((err) => {
              debug.tagsError = String(err?.message || err);
              return [];
            })
          );
        }
        const results = await Promise.all(jobs);
        detailsRoot = results[0];
        reviews = results[1];
        tags = needTags ? results[2] || [] : [];
      } catch (err) {
        debug.reason = `Steam details/reviews failed: ${err?.message || err}`;
        const miss = { found: false, _debug: debug };
        return miss;
      }

      const details = detailsRoot?.[appId]?.success ? detailsRoot[appId].data : null;
      const sourceBits = [
        anonymous ? 'guest items' : 'session items',
        usedUsFallback ? `US fallback (requested ${requestedCountry})` : detailsCountry,
      ];
      debug.reason = details
        ? `Matched Steam app ${appId} (${sourceBits.join(', ')})`
        : `Search hit app ${appId}, but appdetails success=false`;
      debug.detailsSuccess = Boolean(detailsRoot?.[appId]?.success);
      debug.detailsCountry = detailsCountry;
      debug.reviews = reviews?.query_summary || null;
      debug.tags = tags;

      const payload = {
        found: true,
        appId,
        name: details?.name || hit.name,
        storeUrl: `https://store.steampowered.com/app/${appId}/`,
        isFree: Boolean(details?.is_free),
        price: details?.price_overview || hit.price || null,
        metacritic: details?.metacritic || (hit.metascore ? { score: Number(hit.metascore) } : null),
        recommendations: details?.recommendations?.total || null,
        reviews: reviews?.query_summary || null,
        tags,
        usedUsFallback,
        requestedCountry,
        searchCountry: detailsCountry,
        _debug: debug,
      };
      if (!debugOn) {
        const { _debug, ...store } = payload;
        setCached(cacheKey, store);
      }
      return payload;
    })();

    inflight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(cacheKey);
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
        gamestatus: document.querySelector(`[${ENRICH_ATTR}="gamestatus"]`),
        links: document.querySelector(`[${ENRICH_ATTR}="links"]`),
      };
    }

    const rows = {};
    const plan = [];
    if (settings.showSteam) plan.push(['steam', t.steam]);
    if (settings.showMetacritic) plan.push(['metacritic', t.metacritic]);
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

  function renderSteamValues(steam, { owned = false } = {}) {
    const parts = [];

    if (owned) {
      parts.push({
        html: `<span class="blp-owned-badge" title="${escapeAttr(t.steamOwned)}"><svg class="blp-owned-badge__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 11.3 2.9 7.8l1.2-1.2 2.3 2.3 5-5.1 1.2 1.2z"/></svg>${escapeHtml(t.steamOwned)}</span>`,
      });
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

    if (!parts.length) {
      return `<a class="game-details-value blp-ext-link" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.steam)}</a>`;
    }

    return parts.map((part) => `<span class="blp-steam-line">${part.html}</span>`).join('');
  }

  function renderDebugBlock(debug) {
    if (!settings.debugMode || !debug) return '';
    const reason = debug.reason || '—';
    let dump = '';
    try {
      dump = JSON.stringify(debug, null, 2);
    } catch (_) {
      dump = String(debug);
    }
    if (dump.length > 4000) dump = `${dump.slice(0, 4000)}\n…`;
    return `
      <div class="blp-debug">
        <span class="blp-debug__label">${escapeHtml(t.debugReason)}</span>
        <span class="blp-debug__reason">${escapeHtml(reason)}</span>
        <span class="blp-debug__label">${escapeHtml(t.debugResponse)}</span>
        <pre class="blp-debug__pre">${escapeHtml(dump)}</pre>
      </div>
    `;
  }

  function renderEnrichment(rows, { steam, links, error, owned = false, gamestatus = null, title = '', slug = '' }) {
    const debugOn = Boolean(settings.debugMode);

    if (rows.steam) {
      if (error) {
        const dbg =
          steam?._debug ||
          ({ reason: 'Steam request threw before a payload was built', error: true });
        setRowValues(
          rows.steam,
          `<span class="game-details-value blp-empty">${escapeHtml(t.loadError)}</span>${renderDebugBlock(dbg)}`
        );
        showRow(rows.steam);
      } else if (!steam?.found) {
        if (debugOn) {
          setRowValues(
            rows.steam,
            `<span class="game-details-value blp-empty">${escapeHtml(t.notOnSteam)}</span>${renderDebugBlock(steam?._debug)}`
          );
          showRow(rows.steam);
        } else {
          hideRow(rows.steam);
        }
      } else {
        setRowValues(
          rows.steam,
          `${renderSteamValues(steam, { owned })}${renderDebugBlock(steam._debug)}`
        );
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

    if (rows.gamestatus) {
      if (gamestatus && !gamestatus.missing && gamestatus.data) {
        setRowValues(
          rows.gamestatus,
          `${renderGameStatusValues(gamestatus)}${renderDebugBlock(gamestatus._debug)}`
        );
        showRow(rows.gamestatus);
      } else if (debugOn) {
        const reasonHtml = gamestatus?._debug
          ? renderDebugBlock(gamestatus._debug)
          : renderDebugBlock({
              reason: steam?.found
                ? 'GameStatus missing / not fetched'
                : 'GameStatus skipped — Steam app not found',
            });
        setRowValues(
          rows.gamestatus,
          `<span class="game-details-value blp-empty">${escapeHtml(t.gsNotInDatabase)}</span>${reasonHtml}`
        );
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

    const token = `${ctx.slug}|${title}|${settings.steamCountry}|${settings.showSteam}|${settings.showSteamOwned}|${settings.showSteamTags}|${settings.showMetacritic}|${settings.showGameStatus}|${settings.showLinks}|${settings.debugMode}|${JSON.stringify(settings.links)}`;
    const marker = document.querySelector(`[${ENRICH_ATTR}]`);
    if (marker?.getAttribute('data-blp-token') === token && !marker.querySelector('.blp-skeleton')) {
      return;
    }

    removeEnrichment();
    const rows = ensureEnrichmentRows();
    if (!rows) return;

    Object.values(rows).forEach((row) => row?.setAttribute('data-blp-token', token));

    const runId = ++gamePageToken;
    const igdbUrl = getIgdbUrl(ctx.slug);

    // Links that don't depend on Steam can appear immediately (skeletons stay on Steam rows).
    if (rows.links) {
      const earlyLinks = buildExternalLinks({ title, slug: ctx.slug, igdbUrl, steam: null });
      renderEnrichment({ links: rows.links }, { steam: null, links: earlyLinks, error: false });
    }

    let steam = null;
    let error = false;
    let owned = false;
    let gamestatus = null;

    try {
      const needSteam =
        settings.showSteam || settings.showMetacritic || settings.showGameStatus;
      const needOwned = settings.showSteam && settings.showSteamOwned;
      const [steamResult, ownedSet] = await Promise.all([
        needSteam ? fetchSteamBundle(title, settings.steamCountry || 'US') : Promise.resolve(null),
        needOwned ? fetchSteamOwnedSet() : Promise.resolve(null),
      ]);
      steam = steamResult;
      if (ownedSet && steam?.found && steam.appId != null) {
        owned = ownedSet.has(Number(steam.appId));
      }
      if (settings.showGameStatus && steam?.found && steam.appId != null) {
        gamestatus = await fetchGameStatus({
          appId: steam.appId,
          storeUrl: steam.storeUrl,
          name: steam.name,
          title,
          pageSlug: ctx.slug,
        });
      } else if (settings.showGameStatus && settings.debugMode) {
        gamestatus = {
          missing: true,
          data: null,
          slug: null,
          _debug: {
            reason: steam?.found
              ? 'GameStatus enabled but Steam appId missing'
              : 'GameStatus skipped — Steam app not found',
            steamFound: Boolean(steam?.found),
            steamDebug: steam?._debug || null,
          },
        };
      }
    } catch (err) {
      error = true;
      steam = steam || {
        found: false,
        _debug: { reason: `Enrichment error: ${err?.message || err}` },
      };
      owned = false;
      gamestatus = gamestatus || {
        missing: true,
        data: null,
        slug: null,
        _debug: { reason: `Enrichment error: ${err?.message || err}` },
      };
    }

    if (runId !== gamePageToken) return;
    if (!getPageContext().isGamePage) return;

    const links = buildExternalLinks({ title, slug: ctx.slug, igdbUrl, steam });
    renderEnrichment(rows, { steam, links, error, owned, gamestatus, title, slug: ctx.slug });
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
        </section>
        <section>
          <h3>${escapeHtml(t.sectionLinks)}</h3>
          <p class="blp-hint" style="margin-bottom:10px">${escapeHtml(t.sectionLinksHint)}</p>
          ${linkToggles}
        </section>
        <section>
          <h3>${escapeHtml(t.sectionCache)}</h3>
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

  function scanPage() {
    ensureNavSettingsButton();
    enrichGamePage();
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
