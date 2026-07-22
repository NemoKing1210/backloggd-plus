import {
  GM_getValue,
  GM_setValue,
} from '$';
import {
  CACHE_HOURS_MAX,
  DEFAULT_SETTINGS,
  LINK_KEYS,
  SCRIPT_VERSION,
  SETTINGS_KEY,
  STEAM_COUNTRY_CODES,
} from './constants.js';
import { SUPPORTED_LOCALES } from './i18n/index.js';

/** Envelope marker for exported JSON backups. */
export const SETTINGS_EXPORT_KIND = 'backloggd-plus-settings';
export const SETTINGS_EXPORT_FORMAT_VERSION = 1;
/** Soft cap — preferences are tiny; reject accidental huge dumps. */
export const SETTINGS_IMPORT_MAX_BYTES = 256 * 1024;

/** Keep in sync with CONVERT_CURRENCIES in api/fx.js (avoid importing fx → settings cycle). */
const CONVERT_CURRENCY_CODES = new Set([
  'RUB',
  'USD',
  'EUR',
  'KZT',
  'UAH',
  'GBP',
  'TRY',
  'CNY',
  'PLN',
  'BRL',
  'JPY',
  'KRW',
]);

const STEAM_CC_SET = new Set(STEAM_COUNTRY_CODES);
const LINK_KEY_SET = new Set(LINK_KEYS);
const BOOL_SETTING_KEYS = Object.keys(DEFAULT_SETTINGS).filter(
  (key) => key !== 'links' && typeof DEFAULT_SETTINGS[key] === 'boolean'
);

/** Keys that used to ride on showUserMiniProfile before the Profile settings tab. */
const PROFILE_PAGE_SETTING_KEYS = [
  'showProfilePage',
  'showProfileHeader',
  'showProfileTierChip',
  'showProfileStats',
  'showProfileNav',
  'showProfileFavorites',
];

function migrateProfilePageSettings(raw, merged) {
  // Old combined toggle: mini-profile off meant no profile-page chrome either.
  if (!('showProfilePage' in raw) && raw.showUserMiniProfile === false) {
    for (const key of PROFILE_PAGE_SETTING_KEYS) {
      merged[key] = false;
    }
  }
  return merged;
}

function cloneDefaults() {
  return {
    ...DEFAULT_SETTINGS,
    links: { ...DEFAULT_SETTINGS.links },
  };
}

export function loadSettings() {
  try {
    const raw = GM_getValue(SETTINGS_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return cloneDefaults();
    }
    const merged = {
      ...DEFAULT_SETTINGS,
      ...raw,
      links: { ...DEFAULT_SETTINGS.links, ...(raw.links || {}) },
    };
    return migrateProfilePageSettings(raw, merged);
  } catch (_) {
    return cloneDefaults();
  }
}

export function saveSettings(next) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...next,
    links: { ...DEFAULT_SETTINGS.links, ...(next.links || {}) },
  };
  GM_setValue(SETTINGS_KEY, merged);
}

export function resetSettings() {
  saveSettings(cloneDefaults());
}

export function isLinkEnabled(key, cfg) {
  return Boolean(cfg.showLinks && cfg.links && cfg.links[key] !== false);
}

export function linkLabelKey(key) {
  const map = {
    igdb: 'linkIgdb',
    steam: 'linkSteam',
    steamdb: 'linkSteamDb',
    metacritic: 'linkMetacritic',
    opencritic: 'linkOpencritic',
    hltb: 'linkHltb',
    pcgamingwiki: 'linkPcgamingwiki',
    itad: 'linkItad',
    gogdb: 'linkGogdb',
    gameslike: 'linkGameslike',
  };
  return map[key] || key;
}

function coerceBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

function coerceLocale(value, fallback) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (raw === 'auto' || SUPPORTED_LOCALES.includes(raw)) return raw;
  return fallback;
}

function coerceSteamCountry(value, fallback) {
  const cc = String(value ?? '')
    .trim()
    .toUpperCase();
  return STEAM_CC_SET.has(cc) ? cc : fallback;
}

function coerceConvertCurrency(value, fallback) {
  const ccy = String(value ?? '')
    .trim()
    .toUpperCase();
  return CONVERT_CURRENCY_CODES.has(ccy) ? ccy : fallback;
}

function coerceCacheHours(value, fallback) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(CACHE_HOURS_MAX, Math.round(n)));
}

function coerceTranslateMode(value, fallback) {
  const mode = String(value ?? '')
    .trim()
    .toLowerCase();
  if (mode === 'replace' || mode === 'below') return mode;
  return fallback;
}

function sanitizeLinks(rawLinks, defaults) {
  const out = { ...defaults };
  if (!rawLinks || typeof rawLinks !== 'object' || Array.isArray(rawLinks)) {
    return { links: out, applied: 0, ignored: 0 };
  }
  let applied = 0;
  let ignored = 0;
  for (const [key, value] of Object.entries(rawLinks)) {
    if (!LINK_KEY_SET.has(key)) {
      ignored += 1;
      continue;
    }
    out[key] = coerceBoolean(value, out[key] !== false);
    applied += 1;
  }
  return { links: out, applied, ignored };
}

/**
 * Merge unknown / partial / legacy payloads onto defaults.
 * Extra keys are dropped; missing keys keep defaults; bad values fall back per-field.
 */
export function sanitizeSettings(raw) {
  const base = cloneDefaults();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { settings: base, appliedKeys: [], ignoredKeys: [] };
  }

  const appliedKeys = [];
  const ignoredKeys = [];
  const next = { ...base };

  for (const key of Object.keys(raw)) {
    if (key === 'links') continue;
    if (!(key in DEFAULT_SETTINGS)) {
      ignoredKeys.push(key);
    }
  }

  for (const key of BOOL_SETTING_KEYS) {
    if (!(key in raw)) continue;
    next[key] = coerceBoolean(raw[key], base[key]);
    appliedKeys.push(key);
  }

  if ('cacheHours' in raw) {
    next.cacheHours = coerceCacheHours(raw.cacheHours, base.cacheHours);
    appliedKeys.push('cacheHours');
  }
  if ('uiLocale' in raw) {
    next.uiLocale = coerceLocale(raw.uiLocale, base.uiLocale);
    appliedKeys.push('uiLocale');
  }
  if ('translateTargetLocale' in raw) {
    next.translateTargetLocale = coerceLocale(
      raw.translateTargetLocale,
      base.translateTargetLocale
    );
    appliedKeys.push('translateTargetLocale');
  }
  if ('steamCountry' in raw) {
    next.steamCountry = coerceSteamCountry(raw.steamCountry, base.steamCountry);
    appliedKeys.push('steamCountry');
  }
  if ('convertCurrency' in raw) {
    next.convertCurrency = coerceConvertCurrency(raw.convertCurrency, base.convertCurrency);
    appliedKeys.push('convertCurrency');
  }
  if ('translateDisplayMode' in raw) {
    next.translateDisplayMode = coerceTranslateMode(
      raw.translateDisplayMode,
      base.translateDisplayMode
    );
    appliedKeys.push('translateDisplayMode');
  }

  if ('links' in raw) {
    const { links, applied, ignored } = sanitizeLinks(raw.links, base.links);
    next.links = links;
    if (applied > 0 || ignored > 0 || (raw.links && typeof raw.links === 'object')) {
      appliedKeys.push('links');
    }
    if (ignored > 0) ignoredKeys.push('links.*');
  }

  migrateProfilePageSettings(raw, next);

  return {
    settings: next,
    appliedKeys: [...new Set(appliedKeys)],
    ignoredKeys: [...new Set(ignoredKeys)],
  };
}

function unwrapSettingsPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { raw: null, meta: {} };
  }

  // Canonical envelope from buildSettingsExport.
  if (
    parsed.kind === SETTINGS_EXPORT_KIND &&
    parsed.settings &&
    typeof parsed.settings === 'object' &&
    !Array.isArray(parsed.settings)
  ) {
    return {
      raw: parsed.settings,
      meta: {
        kind: parsed.kind,
        formatVersion: parsed.version,
        scriptVersion: parsed.scriptVersion,
        exportedAt: parsed.exportedAt,
      },
    };
  }

  // Loose wrappers some users may hand-edit.
  for (const key of ['settings', 'data', 'preferences', 'config']) {
    const nested = parsed[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return {
        raw: nested,
        meta: {
          kind: typeof parsed.kind === 'string' ? parsed.kind : null,
          formatVersion: parsed.version,
          scriptVersion: parsed.scriptVersion,
          exportedAt: parsed.exportedAt,
        },
      };
    }
  }

  // Bare settings object (GM dump / older backup).
  return { raw: parsed, meta: {} };
}

function looksLikeSettingsObject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  if (raw.links && typeof raw.links === 'object' && !Array.isArray(raw.links)) return true;
  return Object.keys(DEFAULT_SETTINGS).some((key) => key !== 'links' && key in raw);
}

/**
 * Build a downloadable backup of the given settings (defaults to current GM value).
 */
export function buildSettingsExport(cfg = loadSettings()) {
  const { settings: clean } = sanitizeSettings(cfg);
  return {
    kind: SETTINGS_EXPORT_KIND,
    version: SETTINGS_EXPORT_FORMAT_VERSION,
    scriptVersion: SCRIPT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: clean,
  };
}

export function settingsExportFilename(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `backloggd-plus-settings-${y}-${m}-${d}.json`;
}

/**
 * Parse a settings backup (envelope or bare object). Fault-tolerant for missing / extra fields.
 * @returns {{ ok: true, settings: object, appliedKeys: string[], ignoredKeys: string[], meta: object }
 *   | { ok: false, code: string }}
 */
export function parseSettingsImport(text, byteLength = 0) {
  if (byteLength > SETTINGS_IMPORT_MAX_BYTES) {
    return { ok: false, code: 'too_large' };
  }

  const trimmed = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!trimmed) {
    return { ok: false, code: 'empty' };
  }

  // Reject absurd paste sizes even when byteLength was not provided.
  if (trimmed.length > SETTINGS_IMPORT_MAX_BYTES) {
    return { ok: false, code: 'too_large' };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (_) {
    return { ok: false, code: 'invalid_json' };
  }

  const { raw, meta } = unwrapSettingsPayload(parsed);
  if (!looksLikeSettingsObject(raw)) {
    return { ok: false, code: 'not_settings' };
  }

  const { settings, appliedKeys, ignoredKeys } = sanitizeSettings(raw);
  if (appliedKeys.length === 0) {
    return { ok: false, code: 'empty' };
  }

  return {
    ok: true,
    settings,
    appliedKeys,
    ignoredKeys,
    meta,
  };
}
