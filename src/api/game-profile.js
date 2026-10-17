import { asCacheHit, asCacheMiss, getCached, setCached } from '../cache.js';
import { GAME_CARD_TIERS } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

const GAME_MINI_TTL_MS = 6 * 60 * 60 * 1000;
const DESC_MAX = 180;
const PLATFORMS_MAX = 8;
const DEVS_MAX = 4;

export function gameMiniCacheKey(slug) {
  return `game:mini:${String(slug || '').trim().toLowerCase()}`;
}

/** Tier id for a Backloggd average rating; null when the game has no rating yet. */
export function gameTierIdFromRating(rating) {
  const n = Number(rating);
  if (rating == null || !Number.isFinite(n) || n <= 0) return null;
  let tier = GAME_CARD_TIERS[0];
  for (const row of GAME_CARD_TIERS) {
    if (n >= row.min) tier = row;
  }
  return tier.id;
}

export function cacheGameMiniProfile(profile) {
  if (!profile?.slug) return;
  setCached(gameMiniCacheKey(profile.slug), profile, { ttlMs: GAME_MINI_TTL_MS });
}

/** Release year (number) from a cached mini-profile, or null when unknown. */
export function getKnownGameYear(slug) {
  const year = Number(peekCachedGameMiniProfile(slug)?.year);
  return Number.isFinite(year) && year > 0 ? year : null;
}

/** Remake/remaster slugs Backloggd lists for a game (server-rendered related page). */
export async function fetchBackloggdRemakeSlugs(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return [];
  const cacheKey = `game:remakes:${key}`;
  const cached = getCached(cacheKey);
  if (Array.isArray(cached)) return cached;
  const inflightKey = `remakes:${key}`;
  if (inflight.has(inflightKey)) return inflight.get(inflightKey);

  const task = (async () => {
    const html = await gmRequest({
      url: `https://www.backloggd.com/games/${encodeURIComponent(key)}/related/associated/popular:desc/category:remake,remaster/`,
      method: 'GET',
      responseType: 'text',
      anonymous: false,
      headers: { Accept: 'text/html' },
    });
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const slugs = [];
    for (const a of doc.querySelectorAll('a[href^="/games/"]')) {
      const m = (a.getAttribute('href') || '').match(/^\/games\/([a-z0-9][a-z0-9-]*)\/$/i);
      const s = m?.[1]?.toLowerCase();
      if (s && s !== 'lib' && s !== key && !slugs.includes(s)) slugs.push(s);
    }
    if (slugs.length) setCached(cacheKey, slugs, { ttlMs: GAME_MINI_TTL_MS });
    return slugs;
  })().catch(() => []);

  inflight.set(inflightKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(inflightKey);
  }
}

const SLUG_YEAR_MAX_GAP = 1;

function profileYear(profile) {
  const y = Number(profile?.year);
  return Number.isFinite(y) && y > 0 ? y : null;
}

/**
 * Steam app → Backloggd slug when several games share a name (RE4 2005 vs the 2023 remake).
 * Keeps the name-derived slug unless its release year disagrees with Steam's; then looks for a
 * same-stem remake/remaster whose year matches. Falls back to the base slug.
 */
export async function resolveBackloggdSlugByYear(baseSlug, steamYear) {
  const base = String(baseSlug || '').trim().toLowerCase();
  const year = Number(steamYear);
  if (!base || !Number.isFinite(year) || year <= 0) return base;

  const cacheKey = `game:slug:${base}@${year}`;
  const cached = getCached(cacheKey);
  if (typeof cached === 'string' && cached) return cached;

  const baseProfile = await fetchGameMiniProfile(base).catch(() => null);
  const baseYear = profileYear(baseProfile);
  if (baseYear == null || Math.abs(baseYear - year) <= SLUG_YEAR_MAX_GAP) return base;

  const siblings = (await fetchBackloggdRemakeSlugs(base)).filter((s) => s.startsWith(base));
  let best = base;
  let bestGap = Math.abs(baseYear - year);
  for (const slug of siblings.slice(0, 4)) {
    const py = profileYear(await fetchGameMiniProfile(slug).catch(() => null));
    if (py == null) continue;
    const gap = Math.abs(py - year);
    if (gap < bestGap) {
      best = slug;
      bestGap = gap;
      if (gap === 0) break;
    }
  }
  if (bestGap > SLUG_YEAR_MAX_GAP) return base;
  if (best !== base) setCached(cacheKey, best, { ttlMs: GAME_MINI_TTL_MS });
  return best;
}

/** Synchronous cache peek (no network). */
export function peekCachedGameMiniProfile(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  const cached = getCached(gameMiniCacheKey(key));
  return cached?.slug ? cached : null;
}

function absUrl(url, base = 'https://www.backloggd.com/') {
  const raw = String(url || '').trim();
  if (!raw || raw.startsWith('data:')) return '';
  try {
    return new URL(raw, base).href;
  } catch {
    return '';
  }
}

function textOf(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizePlatformLabel(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  if (/^windows\s*pc$/i.test(s)) return 'PC';
  return s;
}

function parseTitle(doc) {
  const candidates = [
    doc.querySelector('#game-body .game-title-section h1'),
    doc.querySelector('#game-profile h1'),
    doc.querySelector('#center-content h1'),
    doc.querySelector('main h1'),
    doc.querySelector('meta[property="og:title"]'),
  ];
  for (const el of candidates) {
    if (!el) continue;
    if (el.closest?.('#game-rating, .game-rating, #ratings-bars-height')) continue;
    const raw =
      el.getAttribute?.('content') ||
      (() => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll?.('small, .blp-game-id')?.forEach?.((n) => n.remove());
        return textOf(clone);
      })();
    const title = String(raw || '')
      .replace(/\s+\(\d{4}\)\s*$/, '')
      .trim();
    if (title) return title;
  }
  return '';
}

function parseCoverUrl(doc) {
  const img =
    doc.querySelector('#interaction-sidebar .col-cover .game-cover img') ||
    doc.querySelector('#interaction-sidebar .game-cover img') ||
    doc.querySelector('.col-cover .game-cover img') ||
    doc.querySelector('meta[property="og:image"]');
  return absUrl(
    img?.getAttribute?.('data-src') ||
      img?.getAttribute?.('src') ||
      img?.getAttribute?.('content') ||
      ''
  );
}

export function parseYear(doc) {
  const links = [
    ...doc.querySelectorAll(
      '#game-body a[href*="release_year:"], #game_detail_section a[href*="release_year:"], a.game-year'
    ),
  ];
  for (const a of links) {
    const text = textOf(a);
    const m = text.match(/\b(19|20)\d{2}\b/);
    if (m) return m[0];
    const href = a.getAttribute('href') || '';
    const hm = href.match(/release_year:(\d{4})/i);
    if (hm) return hm[1];
  }
  return '';
}

function parseReleaseDate(doc) {
  const candidates = [
    ...doc.querySelectorAll(
      '#game-body a[href*="release_year:"], #game_detail_section a[href*="release_year:"]'
    ),
  ]
    .map((a) => textOf(a))
    .filter((text) => /\d/.test(text) && /[a-z]/i.test(text));
  return candidates[0] || '';
}

function parsePlatforms(doc) {
  const root =
    doc.querySelector('#game-body #game-page-platforms, #game-page-platforms') ||
    doc.querySelector('#game_detail_section');
  if (!root) return [];
  const out = [];
  const seen = new Set();
  for (const a of root.querySelectorAll('a[href*="release_platform:"]') || []) {
    const label = normalizePlatformLabel(textOf(a));
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= PLATFORMS_MAX) break;
  }
  return out;
}

function parseDevelopers(doc) {
  const links = [
    ...doc.querySelectorAll(
      '#game-body .game-title-section a[href*="/company/"], #interaction-sidebar .game-subtitle a[href*="/company/"]'
    ),
  ];
  const out = [];
  const seen = new Set();
  for (const a of links) {
    const name = textOf(a);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      href: absUrl(a.getAttribute('href') || '') || a.getAttribute('href') || '',
    });
    if (out.length >= DEVS_MAX) break;
  }
  return out;
}

function parseRating(doc) {
  const nodes = doc.querySelectorAll('#game-rating h1, .game-rating h1');
  for (const h1 of nodes) {
    const raw = textOf(h1).replace(',', '.');
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, Math.round(n * 10) / 10));
  }
  return null;
}

function parseDescription(doc) {
  const root = doc.querySelector('#collapseSummary');
  if (!root) return '';
  const p = root.querySelector('p');
  const text = textOf(p || root);
  if (!text) return '';
  if (text.length <= DESC_MAX) return text;
  return `${text.slice(0, DESC_MAX - 1).trimEnd()}…`;
}

function parseGameId(doc) {
  const raw = doc.querySelector('#game-page-meta[data-game-id]')?.getAttribute('data-game-id');
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseIgdbUrl(doc) {
  const a = doc.querySelector('a[href*="igdb.com/games/"]');
  return absUrl(a?.getAttribute('href') || '');
}

export function parseGameMiniProfileDoc(doc, slugHint = '') {
  if (!doc) return null;
  const slug = String(slugHint || '').trim().toLowerCase();
  const title = parseTitle(doc) || (slug ? slug.replace(/-/g, ' ') : '');
  if (!slug && !title) return null;

  const resolvedSlug =
    slug ||
    (() => {
      const canon = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      const m = canon.match(/\/games\/([^/?#]+)/i);
      return m ? m[1].toLowerCase() : '';
    })();

  if (!resolvedSlug) return null;

  return {
    slug: resolvedSlug,
    title,
    coverUrl: parseCoverUrl(doc),
    year: parseYear(doc),
    releaseDate: parseReleaseDate(doc),
    platforms: parsePlatforms(doc),
    developers: parseDevelopers(doc),
    rating: parseRating(doc),
    description: parseDescription(doc),
    gameId: parseGameId(doc),
    igdbUrl: parseIgdbUrl(doc),
    gameUrl: `/games/${encodeURIComponent(resolvedSlug)}/`,
  };
}

export function parseGameMiniProfileHtml(html, slugHint = '') {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return parseGameMiniProfileDoc(doc, slugHint);
}

export async function fetchGameMiniProfile(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return null;
  const cacheKey = gameMiniCacheKey(key);
  const cached = getCached(cacheKey);
  if (cached?.slug) return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const url = `https://www.backloggd.com/games/${encodeURIComponent(key)}/`;
    const html = await gmRequest({
      url,
      method: 'GET',
      responseType: 'text',
      anonymous: false,
      headers: {
        Accept: 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
    const profile = parseGameMiniProfileHtml(html, key);
    if (!profile) return null;
    cacheGameMiniProfile(profile);
    return asCacheMiss(profile);
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
