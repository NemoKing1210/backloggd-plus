import pkg from '../package.json' with { type: 'json' };

export const REPO_URL = 'https://github.com/NemoKing1210/backloggd-plus';
export const SCRIPT_VERSION = pkg.version;
export const SETTINGS_KEY = 'blp_settings';
export const CACHE_KEY = 'blp_cache_v1';
export const CACHE_VERSION_KEY = 'blp_cache_script_version';
export const STEAM_OVERRIDES_KEY = 'blp_steam_overrides';
export const ROOT_ATTR = 'data-blp-root';
export const ENRICH_ATTR = 'data-blp-enrich';
export const STEAMDB_ATTR = 'data-blp-steamdb';
export const SIMILAR_ATTR = 'data-blp-similar';
export const CARD_ATTR = 'data-blp-card';
export const CARD_STATE_ATTR = 'data-blp-card-state';
export const CARD_APPID_ATTR = 'data-blp-card-appid';
export const CARD_SLUG_ATTR = 'data-blp-card-slug';
export const CARD_TITLE_ATTR = 'data-blp-card-title';
export const FAVICON_URL = 'https://www.google.com/s2/favicons?domain={domain}&sz=32';
export const SCAN_DEBOUNCE_MS = 400;
export const CARD_CONCURRENCY = 3;
export const CARD_ROOT_MARGIN = '240px 0px';
export const CARD_SKIP_ANCESTOR =
  '#game-profile, #game-body, #logging-sidebar-section, .blp-settings-backdrop, .blp-fix-match-backdrop, .blp-export-backdrop';
export const CACHE_HOURS_MAX = 168;
/** Soft advisory budget for the settings meter (GM storage has no fixed quota). */
export const CACHE_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;
export const STEAM_SEARCH_URL = 'https://store.steampowered.com/api/storesearch/';
export const STEAM_DETAILS_URL = 'https://store.steampowered.com/api/appdetails';
export const STEAM_REVIEWS_URL = 'https://store.steampowered.com/appreviews';
export const STEAM_USERDATA_URL = 'https://store.steampowered.com/dynamicstore/userdata/';
export const STEAM_POPULAR_TAGS_URL = 'https://store.steampowered.com/tagdata/populartags/english';
export const STEAM_STORE_ITEMS_URL = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';
export const STEAM_MORE_LIKE_URL = 'https://api.steampowered.com/IStoreQueryService/MoreLikeThis/v1/';
export const STEAM_PLAYERS_URL = 'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/';
export const SIMILAR_GAMES_FETCH = 12;
export const SIMILAR_GAMES_SHOW = 10;
export const STEAM_DECK_REPORT_URL =
  'https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport';
export const PROTONDB_SUMMARY_URL = 'https://www.protondb.com/api/v1/reports/summaries';
export const OPENCRITIC_API_BASE = 'https://api.opencritic.com/api';
export const OPENCRITIC_SITE = 'https://opencritic.com';
export const DDG_HTML_SEARCH = 'https://html.duckduckgo.com/html/';
export const HLTB_SITE = 'https://howlongtobeat.com';
export const HLTB_INIT_URL = `${HLTB_SITE}/api/bleed/init`;
export const HLTB_SEARCH_URL = `${HLTB_SITE}/api/bleed`;
export const ITAD_SITE = 'https://isthereanydeal.com';
export const PCGW_SITE = 'https://www.pcgamingwiki.com';
export const GOGDB_SITE = 'https://www.gogdb.org';
export const STEAM_CDN_APPS = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps';
export const STEAM_CDN_STORE_ASSETS = 'https://shared.fastly.steamstatic.com/store_item_assets';
export const STEAM_CDN_COMMUNITY_ICONS = 'https://shared.fastly.steamstatic.com/community_assets/images/apps';
export const STEAMDB_SITE = 'https://steamdb.info';
export const STEAMDB_APP_URL = `${STEAMDB_SITE}/app`;
export const STEAM_TAGS_MAX = 12;
export const GAMESTATUS_API_BASE = 'https://gamestatus.info/back/api/gameinfo/game';
export const GAMESTATUS_SITE_BASE = 'https://gamestatus.info';
export const GAMESTATUS_MAX_SLUG_ATTEMPTS = 2;
export const USERDATA_CACHE_KEY = 'steam:userdata';
export const USERDATA_EMPTY_TTL_MS = 5 * 60 * 1000;
export const USERDATA_FALLBACK_TTL_MS = 60 * 60 * 1000;
export const TAG_MAP_CACHE_KEY = 'steam:tagmap:english';
export const TAG_MAP_TTL_MS = 7 * 24 * 3600 * 1000;
export const GS_INVALID_SLUG_RE =
  /^(https?-)?(store-)?steam(powered|static)?(-[a-z0-9]+)*(-com)?$|steampowered|steamstatic|akamaihd|^(on-)?wishlist$|^gamestatus$|^(soon-)?on-game-pass$/;

export const LINK_KEYS = [
  'igdb',
  'steam',
  'steamdb',
  'metacritic',
  'opencritic',
  'hltb',
  'pcgamingwiki',
  'itad',
  'gogdb',
];
export const LINK_DOMAINS = {
  igdb: 'igdb.com',
  steam: 'store.steampowered.com',
  steamdb: 'steamdb.info',
  metacritic: 'metacritic.com',
  opencritic: 'opencritic.com',
  hltb: 'howlongtobeat.com',
  pcgamingwiki: 'pcgamingwiki.com',
  itad: 'isthereanydeal.com',
  gogdb: 'gogdb.org',
};

export const DEFAULT_SETTINGS = {
  cacheHours: 12,
  uiLocale: 'auto',
  steamCountry: 'US',
  showSteam: true,
  showMetacritic: true,
  showOpenCritic: true,
  showHltb: true,
  showDeckProton: true,
  showGameStatus: true,
  showLinks: true,
  showSteamOwned: true,
  showSteamWishlist: true,
  showSteamTags: true,
  showSteamCategories: true,
  showSteamPageLink: true,
  showSteamDbPageLink: true,
  showSteamDbIcon: true,
  showSteamDbCover: true,
  showSteamDbGallery: true,
  showSimilarGames: true,
  showGameStats: true,
  showSteamPlayers: true,
  showSteamDbDetails: true,
  showCardBadges: true,
  showCardBadgePrice: true,
  showCardBadgeReview: true,
  showCardBadgeOwned: true,
  showCardBadgeWishlist: true,
  showCardBadgeGameStatus: true,
  showExport: false,
  showGameId: false,
  debugMode: false,
  links: {
    igdb: true,
    steam: true,
    steamdb: true,
    metacritic: true,
    opencritic: true,
    hltb: true,
    pcgamingwiki: true,
    itad: true,
    gogdb: true,
  },
};
