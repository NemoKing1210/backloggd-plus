import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
} from '../cache.js';
import { HLTB_INIT_URL, HLTB_SEARCH_URL, HLTB_SITE } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';
import { normalizeTitle, scoreSteamTitleMatch } from '../utils/title.js';

const HLTB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export let hltbTokenCache = null;

export function formatHoursCompact(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return null;
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function secondsToHours(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 3600;
}

export function pickBestTitleMatch(candidates, title, getName) {
  let best = null;
  let bestScore = 0;
  for (const item of candidates || []) {
    const name = getName(item);
    const score = scoreSteamTitleMatch(name, title);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  if (!best || bestScore < TITLE_MATCH_MIN_SCORE) return null;
  return { item: best, score: bestScore };
}

export async function fetchHltbAuthToken(force = false) {
  if (!force && hltbTokenCache && Date.now() < hltbTokenCache.expiresAt) {
    return hltbTokenCache;
  }
  const data = await gmRequest({
    url: `${HLTB_INIT_URL}?t=${Date.now()}`,
    headers: {
      Accept: 'application/json',
      'User-Agent': HLTB_UA,
      Origin: HLTB_SITE,
      Referer: `${HLTB_SITE}/`,
    },
    timeout: 15000,
  });
  const token = data?.token;
  const hpKey = data?.hpKey;
  const hpVal = data?.hpVal;
  if (
    typeof token !== 'string' ||
    !token ||
    typeof hpKey !== 'string' ||
    !hpKey ||
    typeof hpVal !== 'string' ||
    !hpVal
  ) {
    throw new Error('Invalid HLTB token response');
  }
  hltbTokenCache = {
    token,
    hpKey,
    hpVal,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return hltbTokenCache;
}

export function buildHltbSearchPayload(query, auth) {
  return {
    searchType: 'games',
    searchTerms: String(query || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean),
    searchPage: 1,
    size: 10,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
        rangeYear: { min: '', max: '' },
        modifier: '',
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '',
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
    [auth.hpKey]: auth.hpVal,
  };
}

export async function fetchHltb(title) {
  const q = String(title || '').trim();
  if (!q) return null;
  const cacheKey = `hltb:${normalizeTitle(q)}`;
  const cached = getCached(cacheKey);
  if (cached) return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const runSearch = async (forceToken) => {
      const auth = await fetchHltbAuthToken(forceToken);
      return gmRequest({
        method: 'POST',
        url: HLTB_SEARCH_URL,
        data: buildHltbSearchPayload(q, auth),
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          'User-Agent': HLTB_UA,
          Origin: HLTB_SITE,
          Referer: `${HLTB_SITE}/`,
          'x-auth-token': auth.token,
          'x-hp-key': auth.hpKey,
          'x-hp-val': auth.hpVal,
        },
        timeout: 20000,
      });
    };

    let root;
    try {
      root = await runSearch(false);
    } catch (err) {
      const msg = String(err?.message || err);
      if (/HTTP 401|HTTP 403/.test(msg)) {
        hltbTokenCache = null;
        root = await runSearch(true);
      } else {
        throw err;
      }
    }

    const list = Array.isArray(root?.data) ? root.data : [];
    const picked = pickBestTitleMatch(list, q, (g) => g.game_name);
    if (!picked) return null;
    const raw = picked.item;
    const gameId = raw.game_id;
    const payload = {
      id: gameId != null ? String(gameId) : null,
      name: raw.game_name || q,
      url: gameId
        ? `${HLTB_SITE}/game/${gameId}`
        : `${HLTB_SITE}/?q=${encodeURIComponent(q)}`,
      main: secondsToHours(raw.comp_main),
      extra: secondsToHours(raw.comp_plus),
      complete: secondsToHours(raw.comp_100),
      matchScore: picked.score,
    };
    if (!payload.main && !payload.extra && !payload.complete) return null;
    setCached(cacheKey, payload);
    return asCacheMiss(payload);
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
