import {
  asCacheHit,
  getCached,
  getSteamOverride,
  getUserdataCached,
  mergeCacheSources,
} from '../cache.js';
import { settings } from '../state.js';
import { normalizeTitle } from '../utils/title.js';
import { steamCdnAsset } from '../api/steam.js';

/**
 * Sync peek of GM lookup cache for a game page remount.
 * Returns payloads marked as cache hits so UI can paint before async fetch*.
 */
export function peekGamePageCache({ title, slug, country } = {}) {
  const cc = String(country || settings.steamCountry || 'US').toUpperCase() || 'US';
  const q = String(title || '').trim();
  const norm = q ? normalizeTitle(q) : '';
  const overrideId = slug ? getSteamOverride(slug) : null;

  let steam = null;
  if (overrideId) {
    const id = Number(overrideId);
    if (Number.isFinite(id) && id > 0) {
      const hit = getCached(`steam:id:${cc}:${id}`);
      if (hit?.found) {
        steam = asCacheHit({ ...hit, manualOverride: true });
      }
    }
  } else if (norm) {
    const hit = getCached(`steam:${cc}:${norm}`);
    if (hit?.found) {
      steam = asCacheHit({
        ...hit,
        manualOverride: Boolean(hit.manualOverride),
      });
    }
  }

  let opencritic = null;
  if (settings.showOpenCritic && norm) {
    const oc = getCached(`opencritic:${norm}`);
    if (oc && (oc.score != null || oc.missing || oc.scoreParseV2)) {
      opencritic = asCacheHit(oc);
    }
  }

  let hltb = null;
  if (settings.showHltb && norm) {
    const hit = getCached(`hltb:${norm}`);
    if (hit) hltb = asCacheHit(hit);
  }

  let userdata = null;
  const ud = getUserdataCached();
  if (ud) {
    userdata = {
      owned: new Set(ud.appIds),
      wishlist: new Set(ud.wishlistAppIds),
    };
  }

  let gamestatus = null;
  let proton = null;
  let steamDb = null;
  let similar = null;

  const appId = steam?.found && steam.appId != null ? Number(steam.appId) : NaN;
  if (Number.isFinite(appId) && appId > 0) {
    if (settings.showGameStatus) {
      const gs = getCached(`gs:${appId}`);
      if (gs) gamestatus = asCacheHit(gs);
    }
    if (settings.showDeckProton) {
      const p = getCached(`protondb:${appId}`);
      if (p) proton = asCacheHit(p);
    }
    if (settings.showSimilarGames) {
      const games = getCached(`steam:similar:${appId}`);
      if (Array.isArray(games) && games.length) similar = asCacheHit(games);
    }

    steamDb = buildSteamDbFromCache(appId, steam);
  }

  return { steam, opencritic, hltb, userdata, gamestatus, proton, steamDb, similar };
}

function buildSteamDbFromCache(appId, steam) {
  const needMedia = settings.showSteamDbIcon || settings.showSteamDbCover;
  const needGallery = settings.showSteamDbGallery;
  const needMeta = settings.showSteamDbDetails !== false;
  if (!needMedia && !needGallery && !needMeta && !settings.showSteamPlayers) return null;

  const media = needMedia ? getCached(`steamdb:media:${appId}`) : null;
  let screenshots = needGallery ? getCached(`steam:screenshots:${appId}`) : null;
  if (screenshots && !Array.isArray(screenshots)) screenshots = null;
  const pageMeta = needMeta ? getCached(`steamdb:meta:${appId}`) : null;

  const hasMedia = Boolean(media);
  const hasShots = Array.isArray(screenshots);
  const hasMeta = Boolean(pageMeta);
  if (!hasMedia && !hasShots && !hasMeta) return null;

  const iconUrl = media?.iconUrl || '';
  const logoUrl =
    media?.logoUrl ||
    (needMedia ? steamCdnAsset(appId, 'header.jpg') || steamCdnAsset(appId, 'library_600x900.jpg') : '');
  const logoIsPortrait = Boolean(logoUrl && /library_600x900/i.test(logoUrl) && !media?.logoUrl);
  const technologies = Array.isArray(pageMeta?.technologies) ? pageMeta.technologies : [];

  const mediaCache = needMedia ? (hasMedia ? 'hit' : 'na') : 'na';
  const shotsCache = needGallery ? (hasShots ? 'hit' : 'na') : 'na';
  const metaCache = needMeta ? (hasMeta ? 'hit' : 'na') : 'na';

  return {
    appId,
    iconUrl: needMedia && settings.showSteamDbIcon ? iconUrl : '',
    logoUrl: needMedia && settings.showSteamDbCover ? logoUrl : '',
    logoIsPortrait: Boolean(logoIsPortrait),
    screenshots: needGallery ? (hasShots ? screenshots : null) : null,
    players: null,
    franchise: needMeta ? pageMeta?.franchise || steam?.franchise || null : null,
    systems: needMeta ? pageMeta?.systems || steam?.systems || null : null,
    technologies: needMeta ? technologies : [],
    lastRecordUpdate: needMeta ? pageMeta?.lastRecordUpdate || null : null,
    metaBlocked: Boolean(pageMeta?.blocked),
    source: media?.source || pageMeta?.source || 'steam',
    _cache: mergeCacheSources(mediaCache, shotsCache, metaCache),
    _cacheMedia: mediaCache,
    _cacheShots: shotsCache,
    _cachePlayers: 'na',
    _cacheMeta: metaCache,
  };
}
