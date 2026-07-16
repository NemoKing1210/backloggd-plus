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
// @version           0.2.2
// @description       Extends Backloggd with extra game info, richer UI, and quality-of-life features
// @description:ru    Расширяет Backloggd: больше информации об играх, удобный UI и QoL-улучшения
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
// @grant              GM_xmlhttpRequest
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_addStyle
// @grant              GM_registerMenuCommand
// @connect            store.steampowered.com
// @run-at             document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const REPO_URL = 'https://github.com/NemoKing1210/backloggd-plus';
  const SETTINGS_KEY = 'blp_settings';
  const CACHE_KEY = 'blp_cache_v1';
  const ROOT_ATTR = 'data-blp-root';
  const ENRICH_ATTR = 'data-blp-enrich';
  const FAVICON_URL = 'https://www.google.com/s2/favicons?domain={domain}&sz=32';
  const SCAN_DEBOUNCE_MS = 400;
  const CACHE_HOURS_MAX = 168;
  const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/';
  const STEAM_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';
  const STEAM_REVIEWS_URL = 'https://store.steampowered.com/appreviews';

  const DEFAULT_SETTINGS = {
    cacheHours: 12,
    steamCountry: 'US',
    showSteam: true,
    showMetacritic: true,
    showLinks: true,
  };

  const SUPPORTED_LOCALES = ['en', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'ja', 'ko', 'pl'];

  const TRANSLATIONS = {
    en: {
      menuSettings: 'Backloggd Plus — Settings',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · scores · quick links',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      saveReload: 'Save & Reload page',
      repoLink: 'GitHub',
      repoAbout: 'Source code, updates, and issue reports',
      sectionGame: 'Game page',
      sectionCache: 'Cache',
      steamCountry: 'Steam store region',
      steamCountryHint: 'Affects price currency from the Steam Store API.',
      showSteam: 'Show Steam price & reviews',
      showMetacritic: 'Show Metacritic score',
      showLinks: 'Show quick links',
      cacheHours: 'Cache duration (hours)',
      cacheHoursHint: 'How long to reuse Steam lookups. 0 disables cache.',
      clearCache: 'Clear cache',
      cacheCleared: 'Cache cleared ({count})',
      cacheEmpty: 'Cache is empty',
      cacheClearHint: 'Removes stored Steam lookups from this browser profile.',
      on: 'ON',
      off: 'OFF',
      loading: 'Loading…',
      notOnSteam: 'Not found on Steam',
      loadError: 'Could not load Steam data',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Reviews',
      price: 'Price',
      free: 'Free',
      discount: '-{n}%',
      recommendations: '{n} recommendations',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    ru: {
      menuSettings: 'Backloggd Plus — Настройки',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · оценки · быстрые ссылки',
      close: 'Закрыть',
      cancel: 'Отмена',
      save: 'Сохранить',
      saveReload: 'Сохранить и перезагрузить',
      repoLink: 'GitHub',
      repoAbout: 'Исходники, обновления и баг-репорты',
      sectionGame: 'Страница игры',
      sectionCache: 'Кэш',
      steamCountry: 'Регион Steam Store',
      steamCountryHint: 'Влияет на валюту цены из Steam Store API.',
      showSteam: 'Показывать цену и отзывы Steam',
      showMetacritic: 'Показывать оценку Metacritic',
      showLinks: 'Показывать быстрые ссылки',
      cacheHours: 'Время кэша (часы)',
      cacheHoursHint: 'Как долго переиспользовать ответы Steam. 0 отключает кэш.',
      clearCache: 'Очистить кэш',
      cacheCleared: 'Кэш очищен ({count})',
      cacheEmpty: 'Кэш пуст',
      cacheClearHint: 'Удаляет сохранённые запросы Steam из этого профиля браузера.',
      on: 'ВКЛ',
      off: 'ВЫКЛ',
      loading: 'Загрузка…',
      notOnSteam: 'Не найдено в Steam',
      loadError: 'Не удалось загрузить данные Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Отзывы',
      price: 'Цена',
      free: 'Бесплатно',
      discount: '-{n}%',
      recommendations: '{n} рекомендаций',
      links: 'Ссылки',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    zh: {
      menuSettings: 'Backloggd Plus — 设置',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · 评分 · 快捷链接',
      close: '关闭',
      cancel: '取消',
      save: '保存',
      saveReload: '保存并刷新页面',
      repoLink: 'GitHub',
      repoAbout: '源码、更新与问题反馈',
      sectionGame: '游戏页',
      sectionCache: '缓存',
      steamCountry: 'Steam 商店地区',
      steamCountryHint: '影响 Steam Store API 返回的货币。',
      showSteam: '显示 Steam 价格与评价',
      showMetacritic: '显示 Metacritic 分数',
      showLinks: '显示快捷链接',
      cacheHours: '缓存时长（小时）',
      cacheHoursHint: '复用 Steam 查询的时间。0 禁用缓存。',
      clearCache: '清除缓存',
      cacheCleared: '已清除缓存（{count}）',
      cacheEmpty: '缓存为空',
      cacheClearHint: '删除此浏览器配置中的 Steam 查询缓存。',
      on: '开',
      off: '关',
      loading: '加载中…',
      notOnSteam: '在 Steam 未找到',
      loadError: '无法加载 Steam 数据',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: '评价',
      price: '价格',
      free: '免费',
      discount: '-{n}%',
      recommendations: '{n} 条推荐',
      links: '链接',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    es: {
      menuSettings: 'Backloggd Plus — Ajustes',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · notas · enlaces rápidos',
      close: 'Cerrar',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveReload: 'Guardar y recargar',
      repoLink: 'GitHub',
      repoAbout: 'Código, actualizaciones e informes',
      sectionGame: 'Página del juego',
      sectionCache: 'Caché',
      steamCountry: 'Región de Steam Store',
      steamCountryHint: 'Afecta la moneda del precio de la API de Steam.',
      showSteam: 'Mostrar precio y reseñas de Steam',
      showMetacritic: 'Mostrar puntuación de Metacritic',
      showLinks: 'Mostrar enlaces rápidos',
      cacheHours: 'Duración de caché (horas)',
      cacheHoursHint: 'Cuánto reutilizar búsquedas de Steam. 0 desactiva la caché.',
      clearCache: 'Vaciar caché',
      cacheCleared: 'Caché vaciada ({count})',
      cacheEmpty: 'La caché está vacía',
      cacheClearHint: 'Elimina las búsquedas de Steam de este perfil.',
      on: 'ON',
      off: 'OFF',
      loading: 'Cargando…',
      notOnSteam: 'No encontrado en Steam',
      loadError: 'No se pudieron cargar datos de Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Reseñas',
      price: 'Precio',
      free: 'Gratis',
      discount: '-{n}%',
      recommendations: '{n} recomendaciones',
      links: 'Enlaces',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    pt: {
      menuSettings: 'Backloggd Plus — Configurações',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · notas · links rápidos',
      close: 'Fechar',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveReload: 'Salvar e recarregar',
      repoLink: 'GitHub',
      repoAbout: 'Código, atualizações e relatórios',
      sectionGame: 'Página do jogo',
      sectionCache: 'Cache',
      steamCountry: 'Região da Steam Store',
      steamCountryHint: 'Afeta a moeda do preço da API da Steam.',
      showSteam: 'Mostrar preço e avaliações Steam',
      showMetacritic: 'Mostrar nota Metacritic',
      showLinks: 'Mostrar links rápidos',
      cacheHours: 'Duração do cache (horas)',
      cacheHoursHint: 'Por quanto tempo reutilizar buscas Steam. 0 desativa o cache.',
      clearCache: 'Limpar cache',
      cacheCleared: 'Cache limpo ({count})',
      cacheEmpty: 'Cache vazio',
      cacheClearHint: 'Remove buscas Steam deste perfil do navegador.',
      on: 'ON',
      off: 'OFF',
      loading: 'Carregando…',
      notOnSteam: 'Não encontrado na Steam',
      loadError: 'Falha ao carregar dados da Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Avaliações',
      price: 'Preço',
      free: 'Grátis',
      discount: '-{n}%',
      recommendations: '{n} recomendações',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    de: {
      menuSettings: 'Backloggd Plus — Einstellungen',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · Wertungen · Schnelllinks',
      close: 'Schließen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      saveReload: 'Speichern & neu laden',
      repoLink: 'GitHub',
      repoAbout: 'Quellcode, Updates und Issue-Reports',
      sectionGame: 'Spieleseite',
      sectionCache: 'Cache',
      steamCountry: 'Steam-Store-Region',
      steamCountryHint: 'Beeinflusst die Währung der Steam-Store-API.',
      showSteam: 'Steam-Preis & Bewertungen anzeigen',
      showMetacritic: 'Metacritic-Wertung anzeigen',
      showLinks: 'Schnelllinks anzeigen',
      cacheHours: 'Cache-Dauer (Stunden)',
      cacheHoursHint: 'Wie lange Steam-Abfragen wiederverwendet werden. 0 deaktiviert den Cache.',
      clearCache: 'Cache leeren',
      cacheCleared: 'Cache geleert ({count})',
      cacheEmpty: 'Cache ist leer',
      cacheClearHint: 'Entfernt gespeicherte Steam-Abfragen aus diesem Profil.',
      on: 'AN',
      off: 'AUS',
      loading: 'Lädt…',
      notOnSteam: 'Nicht auf Steam gefunden',
      loadError: 'Steam-Daten konnten nicht geladen werden',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Bewertungen',
      price: 'Preis',
      free: 'Kostenlos',
      discount: '-{n}%',
      recommendations: '{n} Empfehlungen',
      links: 'Links',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    fr: {
      menuSettings: 'Backloggd Plus — Réglages',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · notes · liens rapides',
      close: 'Fermer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      saveReload: 'Enregistrer et recharger',
      repoLink: 'GitHub',
      repoAbout: 'Code source, mises à jour et signalements',
      sectionGame: 'Page jeu',
      sectionCache: 'Cache',
      steamCountry: 'Région Steam Store',
      steamCountryHint: 'Affecte la devise du prix via l’API Steam Store.',
      showSteam: 'Afficher prix et avis Steam',
      showMetacritic: 'Afficher le score Metacritic',
      showLinks: 'Afficher les liens rapides',
      cacheHours: 'Durée du cache (heures)',
      cacheHoursHint: 'Durée de réutilisation des requêtes Steam. 0 désactive le cache.',
      clearCache: 'Vider le cache',
      cacheCleared: 'Cache vidé ({count})',
      cacheEmpty: 'Le cache est vide',
      cacheClearHint: 'Supprime les requêtes Steam de ce profil navigateur.',
      on: 'ON',
      off: 'OFF',
      loading: 'Chargement…',
      notOnSteam: 'Introuvable sur Steam',
      loadError: 'Impossible de charger les données Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Avis',
      price: 'Prix',
      free: 'Gratuit',
      discount: '-{n}%',
      recommendations: '{n} recommandations',
      links: 'Liens',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    ja: {
      menuSettings: 'Backloggd Plus — 設定',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · スコア · クイックリンク',
      close: '閉じる',
      cancel: 'キャンセル',
      save: '保存',
      saveReload: '保存して再読み込み',
      repoLink: 'GitHub',
      repoAbout: 'ソースコード、更新、Issue報告',
      sectionGame: 'ゲームページ',
      sectionCache: 'キャッシュ',
      steamCountry: 'Steamストア地域',
      steamCountryHint: 'Steam Store APIの価格通貨に影響します。',
      showSteam: 'Steamの価格とレビューを表示',
      showMetacritic: 'Metacriticスコアを表示',
      showLinks: 'クイックリンクを表示',
      cacheHours: 'キャッシュ時間（時間）',
      cacheHoursHint: 'Steam照会の再利用時間。0で無効。',
      clearCache: 'キャッシュを消去',
      cacheCleared: 'キャッシュを消去しました（{count}）',
      cacheEmpty: 'キャッシュは空です',
      cacheClearHint: 'このブラウザプロファイルのSteam照会を削除します。',
      on: 'ON',
      off: 'OFF',
      loading: '読み込み中…',
      notOnSteam: 'Steamで見つかりません',
      loadError: 'Steamデータを読み込めませんでした',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'レビュー',
      price: '価格',
      free: '無料',
      discount: '-{n}%',
      recommendations: 'おすすめ {n}',
      links: 'リンク',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    ko: {
      menuSettings: 'Backloggd Plus — 설정',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · 점수 · 빠른 링크',
      close: '닫기',
      cancel: '취소',
      save: '저장',
      saveReload: '저장 후 새로고침',
      repoLink: 'GitHub',
      repoAbout: '소스 코드, 업데이트, 이슈 보고',
      sectionGame: '게임 페이지',
      sectionCache: '캐시',
      steamCountry: 'Steam 스토어 지역',
      steamCountryHint: 'Steam Store API 가격 통화에 영향을 줍니다.',
      showSteam: 'Steam 가격 및 리뷰 표시',
      showMetacritic: 'Metacritic 점수 표시',
      showLinks: '빠른 링크 표시',
      cacheHours: '캐시 시간(시간)',
      cacheHoursHint: 'Steam 조회 재사용 시간. 0은 캐시 비활성.',
      clearCache: '캐시 비우기',
      cacheCleared: '캐시 비움 ({count})',
      cacheEmpty: '캐시가 비어 있음',
      cacheClearHint: '이 브라우저 프로필의 Steam 조회를 삭제합니다.',
      on: '켜짐',
      off: '꺼짐',
      loading: '로딩 중…',
      notOnSteam: 'Steam에서 찾을 수 없음',
      loadError: 'Steam 데이터를 불러오지 못함',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: '리뷰',
      price: '가격',
      free: '무료',
      discount: '-{n}%',
      recommendations: '추천 {n}',
      links: '링크',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
    pl: {
      menuSettings: 'Backloggd Plus — Ustawienia',
      panelTitle: 'Backloggd Plus',
      panelSubtitle: 'Steam · oceny · szybkie linki',
      close: 'Zamknij',
      cancel: 'Anuluj',
      save: 'Zapisz',
      saveReload: 'Zapisz i przeładuj',
      repoLink: 'GitHub',
      repoAbout: 'Kod źródłowy, aktualizacje i zgłoszenia',
      sectionGame: 'Strona gry',
      sectionCache: 'Cache',
      steamCountry: 'Region Steam Store',
      steamCountryHint: 'Wpływa na walutę ceny z API Steam Store.',
      showSteam: 'Pokaż cenę i opinie Steam',
      showMetacritic: 'Pokaż wynik Metacritic',
      showLinks: 'Pokaż szybkie linki',
      cacheHours: 'Czas cache (godziny)',
      cacheHoursHint: 'Jak długo ponownie używać zapytań Steam. 0 wyłącza cache.',
      clearCache: 'Wyczyść cache',
      cacheCleared: 'Cache wyczyszczony ({count})',
      cacheEmpty: 'Cache jest pusty',
      cacheClearHint: 'Usuwa zapisane zapytania Steam z tego profilu.',
      on: 'WŁ',
      off: 'WYŁ',
      loading: 'Ładowanie…',
      notOnSteam: 'Nie znaleziono na Steam',
      loadError: 'Nie udało się wczytać danych Steam',
      steam: 'Steam',
      metacritic: 'Metacritic',
      reviews: 'Opinie',
      price: 'Cena',
      free: 'Za darmo',
      discount: '-{n}%',
      recommendations: '{n} rekomendacji',
      links: 'Linki',
      linkIgdb: 'IGDB',
      linkSteam: 'Steam',
      linkMetacritic: 'Metacritic',
      linkOpencritic: 'OpenCritic',
      linkHltb: 'HLTB',
      linkWikipedia: 'Wikipedia',
    },
  };

  function detectLocale() {
    const raw = String(navigator.language || 'en').toLowerCase();
    const short = raw.slice(0, 2);
    return SUPPORTED_LOCALES.includes(short) ? short : 'en';
  }

  const locale = detectLocale();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

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
      if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...raw };
    } catch (_) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(next) {
    GM_setValue(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...next });
  }

  let settings = loadSettings();
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

  function gmRequest(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: options.method || 'GET',
        url: options.url,
        headers: options.headers || {},
        responseType: options.responseType || 'json',
        timeout: options.timeout || 20000,
        onload(res) {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.response);
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout')),
      });
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
        --blp-skel: rgba(128, 128, 128, 0.22);
        --blp-skel-shine: rgba(255, 255, 255, 0.18);
      }

      [${ENRICH_ATTR}] .blp-ext-link {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        vertical-align: middle;
      }

      [${ENRICH_ATTR}] .blp-favicon {
        width: 14px;
        height: 14px;
        border-radius: 2px;
        flex: 0 0 auto;
        object-fit: contain;
      }

      [${ENRICH_ATTR}] .blp-mc-score--high { color: var(--blp-mc-high) !important; font-weight: 600; }
      [${ENRICH_ATTR}] .blp-mc-score--mid { color: var(--blp-mc-mid) !important; font-weight: 600; }
      [${ENRICH_ATTR}] .blp-mc-score--low { color: var(--blp-mc-low) !important; font-weight: 600; }

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
        font-size: 13px;
      }

      .blp-actions button.blp-primary {
        background: var(--blp-accent);
        border-color: transparent;
        color: #0b1210;
        font-weight: 600;
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

  function mcScoreClass(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return '';
    if (n >= 75) return 'blp-mc-score--high';
    if (n >= 50) return 'blp-mc-score--mid';
    return 'blp-mc-score--low';
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
    const cacheKey = `steam:${country}:${normalizeTitle(title)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    if (inflight.has(cacheKey)) return inflight.get(cacheKey);

    const task = (async () => {
      const searchUrl =
        `${STEAM_SEARCH_URL}?term=${encodeURIComponent(title)}` +
        `&l=english&cc=${encodeURIComponent(country)}`;
      const search = await gmRequest({ url: searchUrl });
      const hit = pickSteamSearchItem(search?.items, title);
      if (!hit) {
        const miss = { found: false };
        setCached(cacheKey, miss);
        return miss;
      }

      const appId = hit.id;
      const [detailsRoot, reviews] = await Promise.all([
        gmRequest({
          url:
            `${STEAM_DETAILS_URL}?appids=${appId}` +
            `&cc=${encodeURIComponent(country)}&l=english`,
        }),
        gmRequest({
          url:
            `${STEAM_REVIEWS_URL}/${appId}?json=1&language=all` +
            `&purchase_type=all&num_per_page=0`,
        }).catch(() => null),
      ]);

      const details = detailsRoot?.[appId]?.success ? detailsRoot[appId].data : null;
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
      };
      setCached(cacheKey, payload);
      return payload;
    })();

    inflight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      inflight.delete(cacheKey);
    }
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
    if (steam?.metacritic?.url) {
      links.push({ key: 'metacritic', label: t.linkMetacritic, url: steam.metacritic.url });
    } else if (q) {
      links.push({
        key: 'metacritic',
        label: t.linkMetacritic,
        url: `https://www.metacritic.com/search/${q}/`,
      });
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
      links.push({
        key: 'wikipedia',
        label: t.linkWikipedia,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
      });
    }
    return links;
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
      <div class="col ml-auto text-right text-md-left" data-blp-values></div>
    `;
    return row;
  }

  function skeletonHtml(kind) {
    if (kind === 'links') {
      return [0, 1, 2, 3, 4]
        .map(() => '<span class="blp-skeleton blp-skeleton--link"></span>')
        .join('');
    }
    if (kind === 'reviews') return '<span class="blp-skeleton blp-skeleton--lg"></span>';
    if (kind === 'metacritic') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
    return '<span class="blp-skeleton blp-skeleton--md"></span>';
  }

  function ensureEnrichmentRows() {
    const platforms = document.querySelector('#game-body #game-page-platforms, #game-page-platforms');
    if (!platforms) return null;

    let anchor = platforms;
    const existing = document.querySelector(`[${ENRICH_ATTR}]`);
    if (existing) {
      return {
        price: document.querySelector(`[${ENRICH_ATTR}="price"]`),
        reviews: document.querySelector(`[${ENRICH_ATTR}="reviews"]`),
        metacritic: document.querySelector(`[${ENRICH_ATTR}="metacritic"]`),
        links: document.querySelector(`[${ENRICH_ATTR}="links"]`),
      };
    }

    const rows = {};
    const plan = [];
    if (settings.showSteam) {
      plan.push(['price', t.price]);
      plan.push(['reviews', t.reviews]);
    }
    if (settings.showMetacritic) plan.push(['metacritic', t.metacritic]);
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

  function renderEnrichment(rows, { steam, links, error }) {
    if (rows.price) {
      if (error) {
        setRowValues(rows.price, `<span class="game-details-value blp-empty">${escapeHtml(t.loadError)}</span>`);
        showRow(rows.price);
        if (rows.reviews) hideRow(rows.reviews);
      } else if (!steam?.found) {
        setRowValues(rows.price, `<span class="game-details-value blp-empty">${escapeHtml(t.notOnSteam)}</span>`);
        showRow(rows.price);
        if (rows.reviews) hideRow(rows.reviews);
      } else {
        const priceText = formatPriceText(steam);
        const discount =
          steam.price?.discount_percent > 0
            ? ` <span class="blp-discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
            : '';
        setRowValues(
          rows.price,
          `<a class="game-details-value blp-ext-link" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">
            <img class="blp-favicon" src="${escapeAttr(faviconForUrl(steam.storeUrl))}" alt="" width="14" height="14" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
            ${escapeHtml(priceText || '—')}${discount}
          </a>`
        );
        showRow(rows.price);

        if (rows.reviews) {
          const reviewText = formatReviewPercent(steam.reviews);
          const reviewClass = reviewScoreClass(steam.reviews);
          if (reviewText) {
            setRowValues(
              rows.reviews,
              `<a class="game-details-value ${reviewClass}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer">${escapeHtml(reviewText)}</a>`
            );
            showRow(rows.reviews);
          } else if (steam.recommendations) {
            setRowValues(
              rows.reviews,
              `<span class="game-details-value ${reviewClass}">${escapeHtml(fmt(t.recommendations, { n: steam.recommendations.toLocaleString() }))}</span>`
            );
            showRow(rows.reviews);
          } else {
            hideRow(rows.reviews);
          }
        }
      }
    }

    if (rows.metacritic) {
      const score = steam?.metacritic?.score;
      if (score != null && !error) {
        const href = steam.metacritic.url
          ? `href="${escapeAttr(steam.metacritic.url)}" target="_blank" rel="noopener noreferrer"`
          : '';
        const tag = steam.metacritic.url ? 'a' : 'span';
        const icon = steam.metacritic.url
          ? `<img class="blp-favicon" src="${escapeAttr(faviconForUrl(steam.metacritic.url))}" alt="" width="14" height="14" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
          : '';
        setRowValues(
          rows.metacritic,
          `<${tag} class="game-details-value blp-ext-link ${mcScoreClass(score)}" ${href}>${icon}${escapeHtml(String(score))}</${tag}>`
        );
        showRow(rows.metacritic);
      } else {
        hideRow(rows.metacritic);
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

    const token = `${ctx.slug}|${title}|${settings.steamCountry}|${settings.showSteam}|${settings.showMetacritic}|${settings.showLinks}`;
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

    try {
      if (settings.showSteam || settings.showMetacritic) {
        steam = await fetchSteamBundle(title, settings.steamCountry || 'US');
      }
    } catch (_) {
      error = true;
      steam = null;
    }

    if (runId !== gamePageToken) return;
    if (!getPageContext().isGamePage) return;

    const links = buildExternalLinks({ title, slug: ctx.slug, igdbUrl, steam });
    renderEnrichment(rows, { steam, links, error });
  }

  function openSettings() {
    if (document.querySelector('.blp-settings-backdrop')) return;

    const draft = { ...settings };
    const backdrop = document.createElement('div');
    backdrop.className = 'blp-settings-backdrop';
    backdrop.innerHTML = `
      <div class="blp-settings" role="dialog" aria-modal="true" aria-label="${escapeAttr(t.panelTitle)}">
        <h2>${escapeHtml(t.panelTitle)}</h2>
        <p class="blp-settings__sub">${escapeHtml(t.panelSubtitle)}</p>
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
            <span>${escapeHtml(t.showMetacritic)}</span>
            <button type="button" data-blp-toggle="showMetacritic" class="${draft.showMetacritic ? 'is-on' : ''}">${draft.showMetacritic ? t.on : t.off}</button>
          </div>
          <div class="blp-toggle">
            <span>${escapeHtml(t.showLinks)}</span>
            <button type="button" data-blp-toggle="showLinks" class="${draft.showLinks ? 'is-on' : ''}">${draft.showLinks ? t.on : t.off}</button>
          </div>
        </section>
        <section>
          <h3>${escapeHtml(t.sectionCache)}</h3>
          <div class="blp-field">
            <label for="blp-cache-hours">${escapeHtml(t.cacheHours)}</label>
            <input id="blp-cache-hours" type="number" min="0" max="${CACHE_HOURS_MAX}" value="${Number(draft.cacheHours) || 0}" />
            <p class="blp-hint">${escapeHtml(t.cacheHoursHint)}</p>
          </div>
          <button type="button" data-blp-clear>${escapeHtml(t.clearCache)}</button>
          <p class="blp-hint">${escapeHtml(t.cacheClearHint)}</p>
          <div class="blp-cache-msg" data-blp-cache-msg hidden></div>
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

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function scanPage() {
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

  function init() {
    if (document.documentElement.hasAttribute(ROOT_ATTR)) return;
    document.documentElement.setAttribute(ROOT_ATTR, '1');

    settings = loadSettings();
    injectStyles();
    scanPage();
    observeDom(scanPage);
    bindSpaNavigation(scanPage);

    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand(t.menuSettings, openSettings);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
