import {
  asCacheHit,
  asCacheMiss,
  asCacheMixed,
  cacheTtlMs,
  getCacheSource,
  getCached,
  getSteamOverride,
  getUserdataCached,
  isCacheEntryExpired,
  mergeCacheSources,
  readCacheStore,
  setCached,
  setUserdataCached,
  stripEphemeralMeta,
} from '../cache.js';
import {
  SIMILAR_GAMES_FETCH,
  SIMILAR_GAMES_SHOW,
  STEAMDB_APP_URL,
  STEAM_CDN_APPS,
  STEAM_CDN_COMMUNITY_ICONS,
  STEAM_CDN_STORE_ASSETS,
  STEAM_DETAILS_URL,
  STEAM_MORE_LIKE_URL,
  STEAM_PLAYERS_URL,
  STEAM_POPULAR_TAGS_URL,
  STEAM_REVIEWS_URL,
  STEAM_SEARCH_URL,
  STEAM_STORE_ITEMS_URL,
  STEAM_TAGS_MAX,
  STEAM_USERDATA_URL,
  TAG_MAP_CACHE_KEY,
  TAG_MAP_TTL_MS,
  USERDATA_CACHE_KEY,
} from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight, settings, steamResolveMissMemory } from '../state.js';
import { slugifyForBackloggd } from '../utils/slug.js';
import { normalizeTitle, pickSteamSearchItem } from '../utils/title.js';

export async function fetchSteamPopularTagMap() {
  const cached = getCached(TAG_MAP_CACHE_KEY);
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
    setCached(TAG_MAP_CACHE_KEY, map, { ttlMs: TAG_MAP_TTL_MS });
    return map;
  })();

  inflight.set(TAG_MAP_CACHE_KEY, task);
  try {
    return await task;
  } finally {
    inflight.delete(TAG_MAP_CACHE_KEY);
  }
}

export function parseSteamStoreAssets(appId, assets) {
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

export function parseSteamPurchaseExtras(item) {
  const opt = item?.best_purchase_option || null;
  if (!opt || typeof opt !== 'object') {
    return { discountEndDate: null };
  }
  let discountEndDate = null;
  const discounts = Array.isArray(opt.active_discounts) ? opt.active_discounts : [];
  for (const d of discounts) {
    const end = Number(d?.discount_end_date);
    if (Number.isFinite(end) && end > 0) {
      discountEndDate = end;
      break;
    }
  }
  return { discountEndDate };
}

export function parseSteamDeckCompat(item) {
  const cat = Number(item?.platforms?.steam_deck_compat_category);
  return Number.isFinite(cat) ? cat : null;
}

export async function fetchSteamStoreItem(appId, country) {
  const id = Number(appId);
  const cc = String(country || 'US').toUpperCase();
  const inflightKey = `steam:storeitem:${id}:${cc}`;
  const tagsKey = `steam:tags:${id}`;
  const assetsKey = `steam:assets:${id}`;
  const extrasKey = `steam:extras:${id}:${cc}`;

  const cachedTags = getCached(tagsKey);
  const cachedAssets = getCached(assetsKey);
  const cachedExtras = getCached(extrasKey);
  if (cachedTags && cachedAssets && cachedExtras) {
    return { tags: cachedTags, assets: cachedAssets, extras: cachedExtras, _cache: 'hit' };
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
          include_platforms: true,
          include_all_purchase_options: true,
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
      const purchase = parseSteamPurchaseExtras(item);
      const extras = {
        deckCompat: parseSteamDeckCompat(item),
        ...purchase,
      };
      setCached(tagsKey, tags);
      if (assets) setCached(assetsKey, assets);
      setCached(extrasKey, extras);
      const partialHit = Boolean(cachedTags || cachedAssets || cachedExtras);
      return {
        tags: tags.length ? tags : cachedTags || [],
        assets: assets || cachedAssets || null,
        extras: extras || cachedExtras || null,
        _cache: partialHit ? 'mixed' : 'miss',
      };
    } catch (_) {
      return {
        tags: cachedTags || [],
        assets: cachedAssets || null,
        extras: cachedExtras || null,
        _cache: cachedTags || cachedAssets || cachedExtras ? 'hit' : 'miss',
      };
    }
  })();

  inflight.set(inflightKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(inflightKey);
  }
}

export async function fetchSteamAppTags(appId, country) {
  const { tags } = await fetchSteamStoreItem(appId, country);
  return tags;
}

export function steamAssetUrlFromFormat(assets, file) {
  const name = String(file || '').trim();
  if (!name) return '';
  const format = String(assets?.asset_url_format || '').trim();
  if (format) {
    return `${STEAM_CDN_STORE_ASSETS}/${format.replace('${FILENAME}', name)}`;
  }
  return '';
}

export function parseSimilarCoverUrl(appId, assets) {
  if (!assets || typeof assets !== 'object') return '';
  const id = Number(appId);
  const candidates = [
    assets.library_capsule_2x,
    assets.library_capsule,
    assets.header_2x,
    assets.header,
    assets.main_capsule_2x,
    assets.main_capsule,
  ];
  for (const file of candidates) {
    const url = steamAssetUrlFromFormat(assets, file);
    if (url) return url;
    const name = String(file || '').trim();
    if (name && Number.isFinite(id) && id > 0) return steamCdnAsset(id, name);
  }
  return '';
}

export function tagWeightMap(tags) {
  const map = new Map();
  if (!Array.isArray(tags)) return map;
  for (const tag of tags) {
    const id = Number(tag?.id ?? tag?.tagid);
    if (!Number.isFinite(id) || id <= 0) continue;
    const weight = Number(tag?.weight);
    map.set(id, Number.isFinite(weight) && weight > 0 ? weight : 1);
  }
  return map;
}

/** Weighted Jaccard on Steam tag ids; returns match % and top shared tag ids. */
export function scoreTagOverlap(sourceTags, otherTags) {
  const a = tagWeightMap(sourceTags);
  const b = tagWeightMap(otherTags);
  if (!a.size || !b.size) return { matchPct: 0, sharedTagIds: [] };

  let inter = 0;
  let union = 0;
  const shared = [];
  const allIds = new Set([...a.keys(), ...b.keys()]);
  for (const id of allIds) {
    const wa = a.get(id) || 0;
    const wb = b.get(id) || 0;
    inter += Math.min(wa, wb);
    union += Math.max(wa, wb);
    if (wa > 0 && wb > 0) shared.push({ id, weight: Math.min(wa, wb) });
  }
  shared.sort((x, y) => y.weight - x.weight);
  const matchPct = union > 0 ? Math.round((100 * inter) / union) : 0;
  return {
    matchPct,
    sharedTagIds: shared.slice(0, 2).map((s) => s.id),
  };
}

export function normalizeSimilarStoreItem(item, sourceTags, tagMap, apiIndex) {
  const appId = Number(item?.appid ?? item?.id);
  if (!Number.isFinite(appId) || appId <= 0) return null;
  const name = String(item?.name || '').trim();
  if (!name) return null;
  const rawTags = Array.isArray(item?.tags) ? item.tags : [];
  const tags = rawTags
    .slice()
    .sort((x, y) => (y.weight || 0) - (x.weight || 0))
    .map((tag) => ({
      id: tag.tagid,
      name: tagMap[tag.tagid] || null,
      weight: tag.weight || 0,
    }))
    .filter((tag) => tag.id != null);
  const { matchPct, sharedTagIds } = scoreTagOverlap(sourceTags, tags);
  const sharedTags = sharedTagIds
    .map((id) => tagMap[id] || tags.find((t) => t.id === id)?.name)
    .filter(Boolean)
    .slice(0, 2);
  const coverUrl = parseSimilarCoverUrl(appId, item?.assets);
  const slug = slugifyForBackloggd(name);
  return {
    appId,
    name,
    coverUrl,
    matchPct,
    sharedTags,
    storeUrl: `https://store.steampowered.com/app/${appId}/`,
    backloggdUrl: slug ? `https://www.backloggd.com/games/${encodeURIComponent(slug)}/` : '',
    apiIndex,
  };
}

export async function fetchSteamSimilarGames(appId, sourceTags, country) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return [];

  const cc = String(country || settings.steamCountry || 'US').toUpperCase() || 'US';
  const cacheKey = `steam:similar:${id}`;
  const cached = getCached(cacheKey);
  if (Array.isArray(cached) && cached.length) return asCacheHit(cached);

  const inflightKey = `similar:${id}:${cc}`;
  if (inflight.has(inflightKey)) return inflight.get(inflightKey);

  const task = (async () => {
    try {
      let tags = Array.isArray(sourceTags) ? sourceTags : [];
      if (!tags.length) {
        tags = await fetchSteamAppTags(id, cc).catch(() => []);
      }
      const input = JSON.stringify({
        item_id: { appid: id },
        count: SIMILAR_GAMES_FETCH,
        context: {
          language: 'english',
          country_code: cc,
          steam_realm: 1,
        },
        data_request: {
          include_assets: true,
          include_basic_info: true,
          include_tag_count: STEAM_TAGS_MAX,
        },
        filters: {
          type_filters: {
            include_games: true,
            include_dlc: false,
            include_demos: false,
            include_software: false,
            include_video: false,
            include_hardware: false,
          },
        },
      });
      const [root, tagMap] = await Promise.all([
        gmRequest({
          url: `${STEAM_MORE_LIKE_URL}?input_json=${encodeURIComponent(input)}`,
        }),
        fetchSteamPopularTagMap(),
      ]);
      const items = Array.isArray(root?.response?.store_items) ? root.response.store_items : [];
      const games = items
        .map((item, apiIndex) => normalizeSimilarStoreItem(item, tags, tagMap || {}, apiIndex))
        .filter((g) => g && g.appId !== id)
        .sort((a, b) => {
          if (b.matchPct !== a.matchPct) return b.matchPct - a.matchPct;
          return a.apiIndex - b.apiIndex;
        })
        .slice(0, SIMILAR_GAMES_SHOW)
        .map(({ apiIndex, ...rest }) => rest);

      if (games.length) setCached(cacheKey, games);
      return asCacheMiss(games);
    } catch (_) {
      return asCacheMiss([]);
    }
  })();

  inflight.set(inflightKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(inflightKey);
  }
}

export async function fetchSteamStoreAssets(appId, country) {
  const { assets } = await fetchSteamStoreItem(appId, country);
  return assets;
}

export function steamTagUrl(name) {
  return `https://store.steampowered.com/tags/en/${encodeURIComponent(name)}/`;
}

export function steamCategoryUrl(id) {
  return `https://store.steampowered.com/search/?category2=${encodeURIComponent(id)}`;
}

export function normalizeSteamCategories(details) {
  if (!Array.isArray(details?.categories)) return [];
  return details.categories
    .map((c) => ({
      id: Number(c.id),
      description: String(c.description || '').trim(),
    }))
    .filter((c) => c.description && Number.isFinite(c.id) && c.id > 0);
}

export function parseSteamIdList(list) {
  return (Array.isArray(list) ? list : [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);
}

export async function fetchSteamUserdata() {
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

export async function fetchSteamOwnedSet() {
  const data = await fetchSteamUserdata();
  return data.owned;
}

export async function hydrateSteamApp({
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
  const debug = debugBase || {
    appId: id,
    country: reqCountry,
    cacheKey,
    cacheSkipped: false,
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
  const needExtras = includeTags;
  if (needTags || needExtras) {
    const tagsInput = JSON.stringify({
      ids: [{ appid: id }],
      context: {
        language: 'english',
        country_code: detailsCountry,
        steam_realm: 1,
      },
      data_request: {
        include_tag_count: STEAM_TAGS_MAX,
        include_assets: true,
        include_platforms: true,
        include_all_purchase_options: true,
      },
    });
    debug.tagsUrl = `${STEAM_STORE_ITEMS_URL}?input_json=${encodeURIComponent(tagsInput)}`;
    debug.tagMapUrl = STEAM_POPULAR_TAGS_URL;
  }

  const detailsPromise = gmRequest({ url: detailsUrl, anonymous });
  const reviewsPromise = gmRequest({ url: reviewsUrl, anonymous }).catch((err) => {
    debug.reviewsError = String(err?.message || err);
    return null;
  });
  const storeItemPromise =
    needTags || needExtras
      ? fetchSteamStoreItem(id, detailsCountry).catch((err) => {
          debug.tagsError = String(err?.message || err);
          return { tags: [], assets: null, extras: null };
        })
      : Promise.resolve({ tags: [], assets: null, extras: null });

  let detailsRoot = null;
  try {
    detailsRoot = await detailsPromise;
  } catch (err) {
    debug.reason = `Steam details failed: ${err?.message || err}`;
    return { found: false, manualOverride: Boolean(manualOverride), _debug: debug };
  }

  let reviews = null;
  let tags = [];
  let extras = null;
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
    debug.categories = normalizeSteamCategories(details);
    debug.extras = extras;
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
      categories: normalizeSteamCategories(details),
      deckCompat: extras?.deckCompat ?? null,
      discountEndDate: extras?.discountEndDate ?? null,
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
  const storeReady = storeItemPromise.then((value) => {
    tags = needTags ? value?.tags || [] : [];
    extras = value?.extras || null;
    emitPartial();
    return value;
  });

  canEmit = true;
  emitPartial();
  await Promise.all([reviewsReady, storeReady]);

  const payload = buildPayload();
  if (!detailsRoot?.[id]?.success && !hit) {
    payload.found = false;
  }
  // Persist Steam resolves. Lite (list cards) may write tagsLoaded=false, but must not
  // overwrite a still-valid full entry (tagsLoaded=true) — that caused missing tags after
  // visiting a list before the game page.
  if (cacheKey && payload.found) {
    persistSteamResolveCache(cacheKey, payload, includeTags);
  }
  return asCacheMiss(payload);
}

export function persistSteamResolveCache(cacheKey, payload, includeTags) {
  if (!cacheKey || !payload?.found || !cacheTtlMs()) return;
  const store = stripEphemeralMeta(payload);
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

export function cachedSteamNeedsTagBackfill(cached, includeTags) {
  if (!includeTags || settings.showSteamTags === false) return false;
  if (!cached?.found || cached.appId == null) return false;
  return cached.tagsLoaded !== true;
}

export async function backfillSteamTags(cached, country) {
  const tags = await fetchSteamAppTags(cached.appId, country).catch(() => []);
  return {
    ...cached,
    tags: Array.isArray(tags) ? tags : [],
    tagsLoaded: true,
  };
}

export async function readSteamCacheOrBackfill(cacheKey, { includeTags, country, manualOverride }) {
  const cached = getCached(cacheKey);
  if (!cached) return null;
  let result = {
    ...cached,
    manualOverride: Boolean(manualOverride || cached.manualOverride),
  };
  let mixed = false;
  if (cachedSteamNeedsTagBackfill(result, includeTags)) {
    result = await backfillSteamTags(result, country);
    setCached(cacheKey, stripEphemeralMeta(result));
    mixed = true;
  }
  return mixed ? asCacheMixed(result) : asCacheHit(result);
}

export async function fetchSteamByAppId(appId, country, { onPartial, includeTags = true, manualOverride = false } = {}) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) {
    return { found: false, _debug: { reason: 'Invalid Steam App ID' }, _cache: 'na' };
  }
  const requestedCountry = String(country || 'US').toUpperCase();
  const cacheKey = `steam:id:${requestedCountry}:${id}`;
  const inflightKey = includeTags ? cacheKey : `${cacheKey}:lite`;
  const cached = await readSteamCacheOrBackfill(cacheKey, {
    includeTags,
    country: requestedCountry,
    manualOverride,
  });
  if (cached) return cached;
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
      cacheSkipped: false,
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

export function steamMissKey(title, slug, country) {
  const cc = String(country || 'US').toUpperCase();
  const overrideId = getSteamOverride(slug);
  if (overrideId) return `id:${cc}:${overrideId}`;
  return `title:${cc}:${normalizeTitle(title)}`;
}

export async function resolveSteamForGame({ title, slug, country, onPartial, includeTags = true }) {
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

export async function fetchSteamBundle(title, country, { onPartial, includeTags = true } = {}) {
  const requestedCountry = String(country || 'US').toUpperCase();
  const cacheKey = `steam:${requestedCountry}:${normalizeTitle(title)}`;
  const inflightKey = includeTags ? cacheKey : `${cacheKey}:lite`;
  const cached = await readSteamCacheOrBackfill(cacheKey, {
    includeTags,
    country: requestedCountry,
    manualOverride: false,
  });
  if (cached) return cached;

  if (inflight.has(inflightKey)) return inflight.get(inflightKey);

  const task = (async () => {
    const debug = {
      title,
      country: requestedCountry,
      cacheKey,
      cacheSkipped: false,
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

export function steamCdnAsset(appId, file) {
  return `${STEAM_CDN_APPS}/${Number(appId)}/${file}`;
}

export async function fetchSteamPlayers(appId) {
  try {
    const data = await gmRequest({
      url: `${STEAM_PLAYERS_URL}?appid=${encodeURIComponent(appId)}`,
      anonymous: true,
    });
    const players = Number(data?.response?.player_count);
    return Number.isFinite(players) ? players : null;
  } catch (_) {
    return null;
  }
}

/**
 * Icon / cover / screenshots / players via Steam APIs only.
 * SteamDB has no public JSON API (internal /api/* is extension-only + Cloudflare).
 * Media: GetItems community_icon + header. Screenshots: appdetails.
 * Players: GetNumberOfCurrentPlayers.
 */
export async function fetchSteamDbExtras(appId, { onPartial, country } = {}) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const needMedia = settings.showSteamDbIcon || settings.showSteamDbCover;
  const needGallery = settings.showSteamDbGallery;
  const needPlayers = settings.showSteamPlayers;
  if (!needMedia && !needGallery && !needPlayers) return null;

  const mediaKey = `steamdb:media:${id}`;
  const shotsKey = `steam:screenshots:${id}`;
  const debugOn = Boolean(settings.debugMode);
  let media = getCached(mediaKey);
  let mediaFromCache = Boolean(media);
  let screenshots = needGallery ? getCached(shotsKey) : null;
  let shotsFromCache = Array.isArray(screenshots);
  if (screenshots && !Array.isArray(screenshots)) {
    screenshots = null;
    shotsFromCache = false;
  }
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
    const playersCache = latestPlayers != null ? 'miss' : 'na';
    const mediaCache = needMedia ? (mediaFromCache ? 'hit' : media ? 'miss' : 'na') : 'na';
    const shotsCache = needGallery
      ? shotsFromCache
        ? 'hit'
        : Array.isArray(screenshots)
          ? 'miss'
          : 'na'
      : 'na';
    return {
      appId: id,
      iconUrl: needMedia && settings.showSteamDbIcon ? iconUrl : '',
      logoUrl: needMedia && settings.showSteamDbCover ? logoUrl : '',
      logoIsPortrait: Boolean(logoIsPortrait),
      screenshots: needGallery ? (Array.isArray(screenshots) ? screenshots : null) : null,
      players: needPlayers ? latestPlayers : null,
      source: media?.source || 'steam',
      _cache: mergeCacheSources(mediaCache, shotsCache),
      _cacheMedia: mediaCache,
      _cacheShots: shotsCache,
      _cachePlayers: playersCache,
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
              needGallery
                ? Array.isArray(screenshots)
                  ? `Screenshots: ${screenshots.length} from appdetails`
                  : 'Screenshots pending'
                : null,
              latestPlayersSource === 'steam-api'
                ? 'Players from GetNumberOfCurrentPlayers (live, not cached)'
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
            screenshots,
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
  } else if (needMedia || needGallery) {
    emit(buildResult());
  }

  const assetsPromise = needMedia
    ? fetchSteamStoreAssets(id, cc).catch(() => null)
    : Promise.resolve(null);

  const shotsPromise =
    needGallery && !Array.isArray(screenshots)
      ? fetchSteamScreenshots(id).then((shots) => {
          screenshots = Array.isArray(shots) ? shots : [];
          shotsFromCache = getCacheSource(shots) === 'hit';
          emit(buildResult());
          return screenshots;
        })
      : Promise.resolve(screenshots);

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

  const [storeAssets] = await Promise.all([assetsPromise, shotsPromise, playersPromise]);
  if (storeAssets && (storeAssets.iconUrl || storeAssets.logoUrl)) {
    media = {
      iconUrl: storeAssets.iconUrl || media?.iconUrl || '',
      logoUrl: storeAssets.logoUrl || media?.logoUrl || '',
      source: 'steam-assets',
    };
    if (!mediaFromCache) setCached(mediaKey, media);
    emit(buildResult());
  }

  if (needMedia && settings.showSteamDbIcon && media && !media.iconUrl) {
    media = { ...media, iconUrl: steamCdnAsset(id, 'capsule_sm_120.jpg') };
  }

  if (needGallery && !Array.isArray(screenshots)) screenshots = [];

  const result = buildResult();
  emit(result);
  return result;
}

export function parseSteamScreenshots(details) {
  const list = Array.isArray(details?.screenshots) ? details.screenshots : [];
  const out = [];
  for (const shot of list) {
    const thumb = String(shot?.path_thumbnail || '').trim();
    const full = String(shot?.path_full || thumb).trim();
    if (!thumb && !full) continue;
    out.push({
      id: shot?.id != null ? Number(shot.id) : out.length,
      thumb: thumb || full,
      full: full || thumb,
    });
  }
  return out;
}

export async function fetchSteamScreenshots(appId) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return asCacheMiss([]);
  const cacheKey = `steam:screenshots:${id}`;
  const cached = getCached(cacheKey);
  if (Array.isArray(cached)) return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    try {
      const url =
        `${STEAM_DETAILS_URL}?appids=${encodeURIComponent(id)}` +
        `&filters=screenshots&l=english`;
      const root = await gmRequest({ url, anonymous: true });
      const shots = parseSteamScreenshots(root?.[id]?.success ? root[id].data : null);
      if (shots.length) setCached(cacheKey, shots);
      return asCacheMiss(shots);
    } catch (_) {
      return asCacheMiss([]);
    }
  })();

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
