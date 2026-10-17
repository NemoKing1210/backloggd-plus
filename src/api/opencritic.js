import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
} from '../cache.js';
import {
  DDG_HTML_SEARCH,
  OPENCRITIC_API_BASE,
  OPENCRITIC_RAPIDAPI_HOST,
  OPENCRITIC_SITE,
  PCGW_API,
} from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight, settings } from '../state.js';
import { normalizeTitle, scoreSteamTitleMatch, TITLE_MATCH_MIN_SCORE } from '../utils/title.js';

export async function fetchOpenCritic(title) {
  const q = String(title || '').trim();
  if (!q) return null;
  const cacheKey = `opencritic:${normalizeTitle(q)}`;
  const cached = getCached(cacheKey);
  // Bust legacy HTML caches that kept tier but dropped the numeric score.
  if (cached && (cached.score != null || cached.missing || cached.scoreParseV2)) {
    return asCacheHit(cached);
  }
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    // Search by name needs a key; without one the wiki/search routes below still work.
    const apiKey = settings.openCriticSource === 'api' ? String(settings.openCriticApiKey || '').trim() : '';
    const routes = [
      apiKey ? () => fetchOpenCriticViaApi(q, apiKey) : null,
      () => fetchOpenCriticViaPcgw(q),
      () => fetchOpenCriticViaHtml(q),
    ].filter(Boolean);
    for (const route of routes) {
      const hit = await route().catch(() => null);
      if (hit) {
        setCached(cacheKey, hit);
        return asCacheMiss(hit);
      }
    }
    return null;
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}

export function pickOpenCriticSearchMatch(list, title) {
  if (!Array.isArray(list) || !list.length) return null;
  const scored = list
    .map((item) => {
      const name = item?.name || item?.distilledName || '';
      return {
        item,
        titleScore: scoreSteamTitleMatch(name, title),
        dist: Number(item?.dist),
      };
    })
    .filter((row) => row.item?.id != null);
  if (!scored.length) return null;
  scored.sort(
    (a, b) =>
      b.titleScore - a.titleScore ||
      (Number.isFinite(a.dist) ? a.dist : 99) - (Number.isFinite(b.dist) ? b.dist : 99)
  );
  const best = scored[0];
  if (best.titleScore >= TITLE_MATCH_MIN_SCORE) {
    return { item: best.item, score: best.titleScore };
  }
  // OpenCritic search ranks by dist; accept a very close hit when title scoring is strict.
  if (Number.isFinite(best.dist) && best.dist <= 0.12) {
    return { item: best.item, score: Math.max(best.titleScore, 80) };
  }
  return null;
}

function openCriticApiHeaders(apiKey) {
  return {
    Accept: 'application/json',
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': OPENCRITIC_RAPIDAPI_HOST,
  };
}

export async function fetchOpenCriticViaApi(title, apiKey) {
  if (!apiKey) return null;
  const results = await gmRequest({
    url: `${OPENCRITIC_API_BASE}/game/search?criteria=${encodeURIComponent(title)}`,
    headers: openCriticApiHeaders(apiKey),
    timeout: 15000,
  });
  const list = Array.isArray(results) ? results : [];
  const picked = pickOpenCriticSearchMatch(list, title);
  if (!picked?.item?.id) return null;
  const id = Number(picked.item.id);
  let detail = null;
  try {
    detail = await gmRequest({
      url: `${OPENCRITIC_API_BASE}/game/${id}`,
      headers: openCriticApiHeaders(apiKey),
      timeout: 15000,
    });
  } catch (_) {
    detail = null;
  }
  return buildOpenCriticPayload(detail || picked.item, picked.item, title, picked.score);
}

export function coerceOpenCriticScore(...candidates) {
  for (const raw of candidates) {
    if (raw == null || raw === '') continue;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 100) continue;
    return Math.round(n);
  }
  return null;
}

export function buildOpenCriticPayload(detail, searchItem, title, matchScore) {
  if (!detail || typeof detail !== 'object') return null;
  const tier =
    (typeof detail.tier === 'string' && detail.tier) ||
    (typeof searchItem?.tier === 'string' && searchItem.tier) ||
    null;
  if (!tier) return null;
  const id = Number(detail.id || searchItem?.id);
  const slug = detail.slug || searchItem?.slug;
  return {
    id,
    name: detail.name || searchItem?.name || title,
    tier,
    score: coerceOpenCriticScore(
      detail.topCriticScore,
      detail.medianScore,
      searchItem?.topCriticScore,
      searchItem?.medianScore
    ),
    url: slug
      ? `${OPENCRITIC_SITE}/game/${id}/${encodeURIComponent(slug)}`
      : Number.isFinite(id)
        ? `${OPENCRITIC_SITE}/game/${id}`
        : `${OPENCRITIC_SITE}/search?q=${encodeURIComponent(title)}`,
    matchScore: matchScore || null,
    source: 'api',
    scoreParseV2: true,
  };
}

export function extractOpenCriticGameCandidates(html) {
  const found = [];
  const push = (id, slug) => {
    const num = Number(id);
    const s = String(slug || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/^-+|-+$/g, '');
    if (!Number.isFinite(num) || num <= 0 || !s) return;
    if (found.some((f) => f.id === num)) return;
    found.push({
      id: num,
      slug: s,
      url: `${OPENCRITIC_SITE}/game/${num}/${s}`,
      name: s.replace(/-/g, ' '),
    });
  };
  const directRe = /opencritic\.com\/game\/(\d+)\/([a-z0-9-]+)/gi;
  let m;
  while ((m = directRe.exec(html))) {
    push(m[1], m[2]);
  }
  const uddgRe = /[?&]uddg=([^&"']+)/gi;
  while ((m = uddgRe.exec(html))) {
    try {
      const decoded = decodeURIComponent(m[1]);
      const mm = decoded.match(/opencritic\.com\/game\/(\d+)\/([a-z0-9-]+)/i);
      if (mm) push(mm[1], mm[2]);
    } catch (_) {
      /* ignore */
    }
  }
  return found;
}

export async function resolveOpenCriticUrlViaDdg(title) {
  const q = `${title} site:opencritic.com/game`;
  const html = await gmRequest({
    url: `${DDG_HTML_SEARCH}?q=${encodeURIComponent(q)}`,
    responseType: 'text',
    headers: {
      Accept: 'text/html',
    },
    timeout: 15000,
  });
  const candidates = extractOpenCriticGameCandidates(String(html || ''));
  if (!candidates.length) return null;
  const picked = pickOpenCriticSearchMatch(candidates, title);
  if (picked?.item) return picked.item;
  // First organic hit if the slug roughly contains the title tokens.
  const target = normalizeTitle(title);
  const loose = candidates.find((c) => {
    const name = normalizeTitle(c.name);
    return name === target || name.includes(target) || target.includes(name);
  });
  return loose || candidates[0] || null;
}

export function parseOpenCriticScoreFromHtml(text) {
  const fromJson = text.match(/"topCriticScore"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (fromJson) {
    const n = coerceOpenCriticScore(fromJson[1]);
    if (n != null) return n;
  }
  // Page order is usually: big number, then "Top Critic Average".
  const beforeLabel = text.match(/(\d{2,3})(?:\s*<[^>]*>|\s|&nbsp;|<!--.*?-->){0,12}\s*Top Critic Average/i);
  if (beforeLabel) {
    const n = coerceOpenCriticScore(beforeLabel[1]);
    if (n != null) return n;
  }
  const afterLabel = text.match(/Top Critic Average[\s\S]{0,160}?(\d{2,3})/i);
  if (afterLabel) {
    const n = coerceOpenCriticScore(afterLabel[1]);
    if (n != null) return n;
  }
  return null;
}

/** Angular SSR ships page state with `&q;` for quotes (and `&s;` for apostrophes). */
function decodeOpenCriticState(html) {
  return html.replace(/&q;/g, '"').replace(/&s;/g, "'").replace(/&a;/g, '&');
}

export function parseOpenCriticGameHtml(html, fallbackUrl) {
  const text = decodeOpenCriticState(String(html || ''));
  if (!text) return null;
  let tier = null;
  let name = null;
  let id = null;
  let slug = null;

  // The page's own game object: score, percentile and tier sit side by side (name usually follows).
  const own = text.match(
    /"topCriticScore"\s*:\s*(-?[0-9]+(?:\.[0-9]+)?)\s*,\s*"percentile"\s*:\s*[0-9.]+\s*,\s*"tier"\s*:\s*"(Mighty|Strong|Fair|Weak)"(?:\s*,\s*"name"\s*:\s*"([^"]+)")?/i
  );
  const score = coerceOpenCriticScore(own?.[1]) ?? parseOpenCriticScoreFromHtml(text);
  if (own) {
    tier = own[2];
    name = own[3];
  }
  const idJson = text.match(/"id"\s*:\s*(\d+)/);
  if (idJson) id = Number(idJson[1]);
  const slugJson = text.match(/"slug"\s*:\s*"([a-z0-9-]+)"/i);
  if (slugJson) slug = slugJson[1];

  if (!name) {
    const titleTag = text.match(/<title[^>]*>\s*([^|<]+?)\s*(?:Reviews)?\s*[-–|]/i);
    if (titleTag) name = titleTag[1].trim();
  }
  const path = String(fallbackUrl || '').match(/opencritic\.com\/game\/(\d+)\/([a-z0-9-]+)/i);
  if (path) {
    // The URL we fetched is authoritative; the first "id"/"slug" in page state may belong to a related game.
    id = Number(path[1]);
    slug = path[2];
  }

  if (!tier) return null;
  return {
    id,
    name: name || slug || null,
    tier,
    score,
    url:
      id && slug
        ? `${OPENCRITIC_SITE}/game/${id}/${encodeURIComponent(slug)}`
        : fallbackUrl || OPENCRITIC_SITE,
    source: 'html',
    scoreParseV2: true,
  };
}

async function loadOpenCriticPage(url) {
  const html = await gmRequest({
    url,
    responseType: 'text',
    headers: {
      Accept: 'text/html',
      Referer: `${OPENCRITIC_SITE}/`,
    },
    timeout: 20000,
  });
  return parseOpenCriticGameHtml(html, url);
}

export async function fetchOpenCriticViaHtml(title) {
  const hit = await resolveOpenCriticUrlViaDdg(title);
  if (!hit?.url) return null;
  const parsed = await loadOpenCriticPage(hit.url);
  if (!parsed) return null;
  if (parsed.name) {
    const score = scoreSteamTitleMatch(parsed.name, title);
    // Reject obvious wrong pages from search noise.
    if (score > 0 && score < 50) return null;
  }
  return parsed;
}

/** `{{Infobox game/row/reception|OpenCritic|10181/hades|94}}` on a PCGamingWiki article. */
export function parsePcgwOpenCriticRef(wikitext) {
  const m = String(wikitext || '').match(
    /\{\{\s*Infobox game\/row\/reception\s*\|\s*OpenCritic\s*\|\s*(\d+)(?:\/([a-z0-9-]+))?/i
  );
  if (!m) return null;
  const id = Number(m[1]);
  return id > 0 ? { id, slug: m[2] || null } : null;
}

/** PCGamingWiki lists every PC game's OpenCritic id — a keyless way to search by title. */
export async function resolveOpenCriticViaPcgw(title) {
  const found = await gmRequest({
    url: `${PCGW_API}?action=opensearch&limit=8&format=json&search=${encodeURIComponent(title)}`,
    headers: { Accept: 'application/json' },
    timeout: 15000,
  });
  const names = Array.isArray(found?.[1]) ? found[1] : [];
  let best = null;
  let bestScore = 0;
  for (const name of names) {
    const score = scoreSteamTitleMatch(name, title);
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  if (!best || bestScore < TITLE_MATCH_MIN_SCORE) return null;

  const page = await gmRequest({
    url:
      `${PCGW_API}?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1` +
      `&format=json&formatversion=2&titles=${encodeURIComponent(best)}`,
    headers: { Accept: 'application/json' },
    timeout: 15000,
  });
  const wikitext = page?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
  const ref = parsePcgwOpenCriticRef(wikitext);
  if (!ref) return null;
  const slug = ref.slug || normalizeTitle(best).replace(/\s+/g, '-') || 'game';
  return {
    id: ref.id,
    slug,
    name: best,
    url: `${OPENCRITIC_SITE}/game/${ref.id}/${slug}`,
    matchScore: bestScore,
  };
}

export async function fetchOpenCriticViaPcgw(title) {
  const hit = await resolveOpenCriticViaPcgw(title);
  if (!hit) return null;
  const parsed = await loadOpenCriticPage(hit.url);
  if (!parsed) return null;
  return { ...parsed, matchScore: hit.matchScore, source: 'pcgw' };
}
