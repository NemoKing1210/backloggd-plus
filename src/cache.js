import {
  GM_getValue,
  GM_setValue,
} from '$';
import {
  CACHE_HOURS_MAX,
  CACHE_KEY,
  CACHE_SOFT_LIMIT_BYTES,
  CACHE_VERSION_KEY,
  SCRIPT_VERSION,
  STEAM_OVERRIDES_KEY,
  TAG_MAP_CACHE_KEY,
  TAG_MAP_TTL_MS,
  USERDATA_CACHE_KEY,
  USERDATA_EMPTY_TTL_MS,
  USERDATA_FALLBACK_TTL_MS,
} from './constants.js';
import { fmt } from './i18n/index.js';
import {
  cachePersistTimer,
  cacheStore,
  setCachePersistTimer,
  setCacheStore,
  settings,
  steamResolveMissMemory,
  t,
} from './state.js';
import { escapeAttr, escapeHtml } from './utils/html.js';

export const CACHE_PINNED_KEYS = new Set([USERDATA_CACHE_KEY, TAG_MAP_CACHE_KEY]);

/** Soft-budget breakdown + per-source toggles (system is always on). */
export const CACHE_CATEGORIES = [
  { id: 'game', settingKey: 'cacheGameData', labelKey: 'cacheCatGame', swatch: 'game' },
  { id: 'profiles', settingKey: 'cacheUserProfiles', labelKey: 'cacheCatProfiles', swatch: 'profiles' },
  {
    id: 'translations',
    settingKey: 'cacheTranslations',
    labelKey: 'cacheCatTranslations',
    swatch: 'translations',
  },
  { id: 'fx', settingKey: 'cacheFx', labelKey: 'cacheCatFx', swatch: 'fx' },
  { id: 'system', settingKey: null, labelKey: 'cacheCatSystem', swatch: 'system' },
];

const CACHE_TOUCH_PERSIST_THROTTLE_MS = 5000;
let cacheTouchPersistAt = 0;
let cachePersistFlushBound = false;

export function cacheCategoryForKey(key) {
  const k = String(key || '');
  if (k === USERDATA_CACHE_KEY || k === TAG_MAP_CACHE_KEY) return 'system';
  if (k.startsWith('user:profile:')) return 'profiles';
  if (k.startsWith('gtx:')) return 'translations';
  if (k.startsWith('fx:')) return 'fx';
  return 'game';
}

export function isCacheCategoryEnabled(category) {
  if (category === 'system') return true;
  if (category === 'game') return settings.cacheGameData !== false;
  if (category === 'profiles') return settings.cacheUserProfiles !== false;
  if (category === 'translations') return settings.cacheTranslations !== false;
  if (category === 'fx') return settings.cacheFx !== false;
  return true;
}

export function readCacheStore() {
  if (cacheStore) return cacheStore;
  try {
    const raw = GM_getValue(CACHE_KEY, null);
    setCacheStore(raw && typeof raw === 'object' ? raw : {});
  } catch (_) {
    setCacheStore({});
  }
  return cacheStore;
}

export function flushCachePersist() {
  if (!cachePersistTimer) return;
  clearTimeout(cachePersistTimer);
  setCachePersistTimer(0);
  try {
    pruneExpiredCache();
    evictCacheToBudget();
    GM_setValue(CACHE_KEY, readCacheStore());
  } catch (_) {
    /* ignore */
  }
}

export function persistCacheSoon() {
  clearTimeout(cachePersistTimer);
  setCachePersistTimer(
    setTimeout(() => {
      setCachePersistTimer(0);
      try {
        pruneExpiredCache();
        evictCacheToBudget();
        GM_setValue(CACHE_KEY, readCacheStore());
      } catch (_) {
        /* ignore */
      }
    }, 400)
  );
}

/** Flush pending cache writes on tab hide / unload so remounts keep warm hits. */
export function bindCachePersistFlush() {
  if (cachePersistFlushBound || typeof window === 'undefined') return;
  cachePersistFlushBound = true;
  const flush = () => flushCachePersist();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export function cacheTtlMs() {
  const hours = Number(settings.cacheHours);
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.min(hours, CACHE_HOURS_MAX) * 3600 * 1000;
}

/** System keys keep their own TTL even when cacheHours is 0. */
export function isSystemCacheKey(key) {
  return key === TAG_MAP_CACHE_KEY || key === USERDATA_CACHE_KEY;
}

export function userdataCacheTtlMs(empty) {
  if (empty) return USERDATA_EMPTY_TTL_MS;
  const ttl = cacheTtlMs();
  return ttl > 0 ? ttl : USERDATA_FALLBACK_TTL_MS;
}

export function isSteamGameResolveKey(key) {
  return key.startsWith('steam:id:') || /^steam:[A-Z]{2}:/.test(key);
}

/** Single source of truth for entry TTL (lookup default vs per-key / per-entry). */
export function cacheEntryTtlMs(key, entry) {
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

export function isCacheEntryExpired(key, entry) {
  if (!entry?.ts) return true;
  const ttl = cacheEntryTtlMs(key, entry);
  if (!ttl) return true;
  return Date.now() - entry.ts > ttl;
}

export function touchCacheEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  entry.at = Date.now();
  const now = Date.now();
  if (now - cacheTouchPersistAt < CACHE_TOUCH_PERSIST_THROTTLE_MS) return;
  cacheTouchPersistAt = now;
  persistCacheSoon();
}

export function getCached(key) {
  if (!isCacheCategoryEnabled(cacheCategoryForKey(key))) return null;
  const entry = readCacheStore()[key];
  if (!entry?.ts) return null;
  // Master duration: game lookups need cacheHours. Entries with their own ttlMs
  // (profiles / translations / FX) may still hit when cacheHours is 0.
  if (!isSystemCacheKey(key)) {
    const hasOwnTtl = Number(entry.ttlMs) > 0;
    if (!hasOwnTtl && !cacheTtlMs()) return null;
  }
  if (isCacheEntryExpired(key, entry)) return null;
  touchCacheEntry(entry);
  return entry.data;
}

export function setCached(key, data, opts) {
  if (!isCacheCategoryEnabled(cacheCategoryForKey(key))) return;
  const optTtl = Number(opts?.ttlMs);
  const hasOptTtl = Number.isFinite(optTtl) && optTtl > 0;
  if (!isSystemCacheKey(key) && !hasOptTtl && !cacheTtlMs()) return;

  const now = Date.now();
  const entry = { ts: now, at: now, data };
  if (hasOptTtl) {
    entry.ttlMs = optTtl;
  } else if (key === TAG_MAP_CACHE_KEY) {
    entry.ttlMs = TAG_MAP_TTL_MS;
  }
  readCacheStore()[key] = entry;
  persistCacheSoon();
}

/** Ephemeral runtime flag: hit | miss | mixed | na (never persisted). */
export function asCacheHit(data) {
  if (data == null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return Object.assign(data.slice(), { _cache: 'hit' });
  return { ...data, _cache: 'hit' };
}

export function asCacheMiss(data) {
  if (data == null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return Object.assign(data.slice(), { _cache: 'miss' });
  return { ...data, _cache: 'miss' };
}

export function asCacheMixed(data) {
  if (data == null || typeof data !== 'object') return data;
  return { ...data, _cache: 'mixed' };
}

export function getCacheSource(data) {
  const v = data?._cache;
  return v === 'hit' || v === 'miss' || v === 'mixed' || v === 'na' ? v : null;
}

export function mergeCacheSources(...parts) {
  const vals = parts
    .map((p) => (typeof p === 'string' ? p : getCacheSource(p)))
    .filter((v) => v && v !== 'na');
  if (!vals.length) return 'na';
  const hit = vals.some((v) => v === 'hit' || v === 'mixed');
  const miss = vals.some((v) => v === 'miss' || v === 'mixed');
  if (hit && miss) return 'mixed';
  if (vals.includes('mixed')) return 'mixed';
  if (hit) return 'hit';
  return 'miss';
}

export function stripEphemeralMeta(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const { _debug, _cache, ...rest } = obj;
  return rest;
}

export function getUserdataCached() {
  const entry = readCacheStore()[USERDATA_CACHE_KEY];
  if (!entry?.ts || !entry.data) return null;
  if (!Array.isArray(entry.data.appIds) || !Array.isArray(entry.data.wishlistAppIds)) {
    return null;
  }
  if (isCacheEntryExpired(USERDATA_CACHE_KEY, entry)) return null;
  touchCacheEntry(entry);
  return entry.data;
}

export function setUserdataCached(data) {
  const now = Date.now();
  readCacheStore()[USERDATA_CACHE_KEY] = { ts: now, at: now, data };
  persistCacheSoon();
}

export function loadSteamOverrides() {
  try {
    const raw = GM_getValue(STEAM_OVERRIDES_KEY, null);
    return raw && typeof raw === 'object' ? raw : {};
  } catch (_) {
    return {};
  }
}

export function saveSteamOverrides(map) {
  try {
    GM_setValue(STEAM_OVERRIDES_KEY, map && typeof map === 'object' ? map : {});
  } catch (_) {
    /* ignore */
  }
}

export function getSteamOverride(slug) {
  const key = String(slug || '')
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
  if (!key) return null;
  const id = Number(loadSteamOverrides()[key]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setSteamOverride(slug, appId) {
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

export function clearSteamOverride(slug) {
  setSteamOverride(slug, null);
}

export function isCacheEntryPartial(key, entry) {
  if (isCacheEntryExpired(key, entry)) return true;
  if (!isSteamGameResolveKey(key)) return false;
  const data = entry?.data;
  if (!data?.found) return true;
  // Lite list/card resolves are stored without tags.
  return data.tagsLoaded !== true;
}

export function cacheEntryByteSize(key, entry) {
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

export function pruneExpiredCache() {
  const store = readCacheStore();
  let removed = 0;
  for (const key of Object.keys(store)) {
    if (isCacheEntryExpired(key, store[key])) {
      delete store[key];
      removed += 1;
    }
  }
  return removed;
}

/** Drop least-recently-used entries until under the soft budget. Pins userdata + tag map. */
export function evictCacheToBudget() {
  const store = readCacheStore();
  let usedBytes = 0;
  const candidates = [];
  for (const key of Object.keys(store)) {
    const entry = store[key];
    const bytes = cacheEntryByteSize(key, entry);
    usedBytes += bytes;
    if (CACHE_PINNED_KEYS.has(key)) continue;
    candidates.push({
      key,
      bytes,
      at: Number(entry?.at || entry?.ts) || 0,
    });
  }
  if (usedBytes <= CACHE_SOFT_LIMIT_BYTES) return 0;

  candidates.sort((a, b) => a.at - b.at);
  let removed = 0;
  for (const item of candidates) {
    if (usedBytes <= CACHE_SOFT_LIMIT_BYTES) break;
    delete store[item.key];
    usedBytes -= item.bytes;
    removed += 1;
  }
  return removed;
}

export function formatCacheBytes(n) {
  const bytes = Math.max(0, Number(n) || 0);
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getCacheUsageStats() {
  const store = readCacheStore();
  const byCat = Object.fromEntries(
    CACHE_CATEGORIES.map((c) => [c.id, { bytes: 0, count: 0, partialCount: 0 }])
  );
  let fullBytes = 0;
  let partialBytes = 0;
  let fullCount = 0;
  let partialCount = 0;

  for (const key of Object.keys(store)) {
    const entry = store[key];
    const bytes = cacheEntryByteSize(key, entry);
    const cat = cacheCategoryForKey(key);
    const bucket = byCat[cat] || byCat.game;
    bucket.bytes += bytes;
    bucket.count += 1;
    if (isCacheEntryPartial(key, entry)) {
      partialBytes += bytes;
      partialCount += 1;
      bucket.partialCount += 1;
    } else {
      fullBytes += bytes;
      fullCount += 1;
    }
  }

  const usedBytes = fullBytes + partialBytes;
  const limitBytes = CACHE_SOFT_LIMIT_BYTES;
  const freeBytes = Math.max(0, limitBytes - usedBytes);
  const categories = CACHE_CATEGORIES.map((meta) => {
    const row = byCat[meta.id] || { bytes: 0, count: 0, partialCount: 0 };
    return {
      id: meta.id,
      labelKey: meta.labelKey,
      swatch: meta.swatch,
      settingKey: meta.settingKey,
      bytes: row.bytes,
      count: row.count,
      partialCount: row.partialCount,
      enabled: isCacheCategoryEnabled(meta.id),
    };
  });

  return {
    fullBytes,
    partialBytes,
    freeBytes,
    usedBytes,
    limitBytes,
    fullCount,
    partialCount,
    totalCount: fullCount + partialCount,
    categories,
  };
}

/** Drop entries whose category toggle is off (call after settings reload). */
export function pruneDisabledCacheCategories() {
  const store = readCacheStore();
  let removed = 0;
  for (const key of Object.keys(store)) {
    if (isCacheCategoryEnabled(cacheCategoryForKey(key))) continue;
    delete store[key];
    removed += 1;
  }
  if (removed) persistCacheSoon();
  return removed;
}

export function getCacheEntryCount() {
  return getCacheUsageStats().totalCount;
}

export function cacheMeterPct(part, denom) {
  if (!denom) return 0;
  return Math.max(0, Math.min(100, (part / denom) * 100));
}

/** Rounded 0–100 fill vs soft budget. */
export function cacheFillPct(stats) {
  const s = stats || getCacheUsageStats();
  return Math.round(cacheMeterPct(s.usedBytes, s.limitBytes));
}

/** Visual tone for fill level: low under 70, mid under 90, else high. */
export function cacheFillTone(pct) {
  const n = Math.max(0, Math.min(100, Number(pct) || 0));
  if (n >= 90) return 'high';
  if (n >= 70) return 'mid';
  return 'low';
}

export function buildCacheTabBadgeHtml(stats) {
  const s = stats || getCacheUsageStats();
  const pct = cacheFillPct(s);
  const tone = cacheFillTone(pct);
  const label = fmt(t.cacheBarPct, { pct });
  const aria = fmt(t.cacheTabFillAria, { pct });
  return `<span class="blp-settings__tab-badge blp-settings__tab-badge--${tone}" data-blp-cache-tab-badge aria-label="${escapeAttr(aria)}">${escapeHtml(label)}</span>`;
}

export function paintCacheTabBadge(root, stats) {
  const badge = root?.querySelector?.('[data-blp-cache-tab-badge]');
  if (!badge) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildCacheTabBadgeHtml(stats).trim();
  const next = wrap.firstElementChild;
  if (next) badge.replaceWith(next);
}

export function buildCacheMeterHtml(stats) {
  const s = stats || getCacheUsageStats();
  const denom = Math.max(s.usedBytes, s.limitBytes, 1);
  const fillPct = cacheFillPct(s);
  const tone = cacheFillTone(fillPct);
  const pctLabel = fmt(t.cacheBarPct, { pct: fillPct });
  const freePct = cacheMeterPct(s.freeBytes, denom);

  const activeCats = s.categories.filter((c) => c.bytes > 0);
  const ariaParts = activeCats
    .map((c) => `${t[c.labelKey] || c.id} ${formatCacheBytes(c.bytes)}`)
    .concat([`${t.cacheBarFree} ${formatCacheBytes(s.freeBytes)}`]);
  const aria = fmt(t.cacheBarAriaCats, {
    pct: fillPct,
    detail: ariaParts.join(', '),
  });

  const segs = activeCats
    .map((c) => {
      const w = cacheMeterPct(c.bytes, denom);
      if (w <= 0) return '';
      return `<span class="blp-cache-meter__seg blp-cache-meter__seg--${escapeAttr(c.swatch)}" style="width:${w}%" title="${escapeAttr(
        `${t[c.labelKey] || c.id}: ${formatCacheBytes(c.bytes)}`
      )}"></span>`;
    })
    .join('');

  const legendRows = s.categories
    .map((c) => {
      const label = t[c.labelKey] || c.id;
      const off = c.enabled ? '' : ' is-off';
      const size = formatCacheBytes(c.bytes);
      const countLabel = fmt(t.cacheBarCatCount, { count: c.count });
      const disabledMark = c.enabled
        ? ''
        : `<span class="blp-cache-meter__off">${escapeHtml(t.cacheCatOff)}</span>`;
      return `
        <li class="blp-cache-meter__row${off}">
          <span class="blp-cache-meter__swatch blp-cache-meter__swatch--${escapeAttr(c.swatch)}"></span>
          <span class="blp-cache-meter__name">${escapeHtml(label)}${disabledMark}</span>
          <span class="blp-cache-meter__meta">
            <span class="blp-cache-meter__count">${escapeHtml(countLabel)}</span>
            <span class="blp-cache-meter__size">${escapeHtml(size)}</span>
          </span>
        </li>`;
    })
    .join('');

  const freeRow = `
    <li class="blp-cache-meter__row blp-cache-meter__row--free">
      <span class="blp-cache-meter__swatch blp-cache-meter__swatch--free"></span>
      <span class="blp-cache-meter__name">${escapeHtml(t.cacheBarFree)}</span>
      <span class="blp-cache-meter__meta">
        <span class="blp-cache-meter__size">${escapeHtml(formatCacheBytes(s.freeBytes))}</span>
      </span>
    </li>`;

  return `
    <div class="blp-cache-meter" data-blp-cache-meter>
      <div class="blp-cache-meter__head">
        <div class="blp-cache-meter__pct blp-cache-meter__pct--${tone}">
          <span class="blp-cache-meter__pct-value">${escapeHtml(pctLabel)}</span>
          <span class="blp-cache-meter__pct-caption">${escapeHtml(t.cacheBarFilled)}</span>
        </div>
        <div class="blp-cache-meter__used-wrap">
          <span class="blp-cache-meter__used">${escapeHtml(
            fmt(t.cacheBarUsed, {
              used: formatCacheBytes(s.usedBytes),
              limit: formatCacheBytes(s.limitBytes),
            })
          )}</span>
          <span class="blp-cache-meter__entries">${escapeHtml(
            fmt(t.cacheBarEntries, { count: s.totalCount })
          )}</span>
        </div>
      </div>
      <div class="blp-cache-meter__bar" role="img" aria-label="${escapeAttr(aria)}">
        ${segs}
        <span class="blp-cache-meter__seg blp-cache-meter__seg--free" style="width:${freePct}%"></span>
      </div>
      <ul class="blp-cache-meter__legend">
        ${legendRows}
        ${freeRow}
      </ul>
      <p class="blp-hint">${escapeHtml(t.cacheBarHint)}</p>
    </div>
  `;
}

export function paintCacheMeter(root) {
  const stats = getCacheUsageStats();
  const current = root?.querySelector?.('[data-blp-cache-meter]');
  if (current) {
    const wrap = document.createElement('div');
    wrap.innerHTML = buildCacheMeterHtml(stats).trim();
    const next = wrap.firstElementChild;
    if (next) current.replaceWith(next);
  }
  paintCacheTabBadge(root, stats);
}

export function clearCache() {
  const count = getCacheEntryCount();
  clearTimeout(cachePersistTimer);
  setCachePersistTimer(0);
  setCacheStore({});
  try {
    GM_setValue(CACHE_KEY, {});
  } catch (_) {
    /* ignore */
  }
  return count;
}

/** Wipe lookup cache when the userscript version changes (stale payloads / schema). */
export function migrateCacheForScriptVersion() {
  let stored = null;
  try {
    stored = GM_getValue(CACHE_VERSION_KEY, null);
  } catch (_) {
    stored = null;
  }
  if (stored === SCRIPT_VERSION) {
    const pruned = pruneExpiredCache();
    const evicted = evictCacheToBudget();
    if (pruned > 0 || evicted > 0) {
      try {
        GM_setValue(CACHE_KEY, readCacheStore());
      } catch (_) {
        /* ignore */
      }
    }
    return null;
  }
  clearCache();
  try {
    GM_setValue(CACHE_VERSION_KEY, SCRIPT_VERSION);
  } catch (_) {
    /* ignore */
  }
  // First run has no stored version — don't treat as an upgrade toast.
  return stored == null ? 'install' : 'upgrade';
}
