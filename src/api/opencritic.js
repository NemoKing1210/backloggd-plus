import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
} from '../cache.js';
import { DDG_HTML_SEARCH, OPENCRITIC_API_BASE, OPENCRITIC_SITE } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';
import { normalizeTitle, scoreSteamTitleMatch } from '../utils/title.js';

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
    const fromApi = await fetchOpenCriticViaApi(q).catch(() => null);
    if (fromApi) {
      setCached(cacheKey, fromApi);
      return asCacheMiss(fromApi);
    }
    const fromHtml = await fetchOpenCriticViaHtml(q).catch(() => null);
    if (fromHtml) {
      setCached(cacheKey, fromHtml);
      return asCacheMiss(fromHtml);
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

export async function fetchOpenCriticViaApi(title) {
  const searchUrl = `${OPENCRITIC_API_BASE}/game/search?criteria=${encodeURIComponent(title)}`;
  const results = await gmRequest({
    url: searchUrl,
    headers: {
      Accept: 'application/json',
      Origin: OPENCRITIC_SITE,
      Referer: `${OPENCRITIC_SITE}/`,
    },
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
      headers: {
        Accept: 'application/json',
        Origin: OPENCRITIC_SITE,
        Referer: `${OPENCRITIC_SITE}/`,
      },
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

export function parseOpenCriticGameHtml(html, fallbackUrl) {
  const text = String(html || '');
  if (!text) return null;
  let tier = null;
  let name = null;
  let id = null;
  let slug = null;

  const score = parseOpenCriticScoreFromHtml(text);
  const tierJson = text.match(/"tier"\s*:\s*"(Mighty|Strong|Fair|Weak)"/i);
  if (tierJson) tier = tierJson[1];
  const nameJson = text.match(/"name"\s*:\s*"([^"\\]+)"/);
  if (nameJson) name = nameJson[1];
  const idJson = text.match(/"id"\s*:\s*(\d+)/);
  if (idJson) id = Number(idJson[1]);
  const slugJson = text.match(/"slug"\s*:\s*"([a-z0-9-]+)"/i);
  if (slugJson) slug = slugJson[1];

  if (!tier) {
    const tierText = text.match(/\b(Mighty|Strong|Fair|Weak)\b/);
    if (tierText) tier = tierText[1];
  }
  if (!name) {
    const titleTag = text.match(/<title[^>]*>\s*([^|<]+?)\s*(?:Reviews)?\s*[-–|]/i);
    if (titleTag) name = titleTag[1].trim();
  }
  const path = String(fallbackUrl || '').match(/opencritic\.com\/game\/(\d+)\/([a-z0-9-]+)/i);
  if (path) {
    if (!id) id = Number(path[1]);
    if (!slug) slug = path[2];
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

export async function fetchOpenCriticViaHtml(title) {
  const hit = await resolveOpenCriticUrlViaDdg(title);
  if (!hit?.url) return null;
  const html = await gmRequest({
    url: hit.url,
    responseType: 'text',
    headers: {
      Accept: 'text/html',
      Referer: `${OPENCRITIC_SITE}/`,
    },
    timeout: 20000,
  });
  const parsed = parseOpenCriticGameHtml(html, hit.url);
  if (!parsed) return null;
  if (parsed.name) {
    const score = scoreSteamTitleMatch(parsed.name, title);
    // Reject obvious wrong pages from search noise.
    if (score > 0 && score < 50) return null;
  }
  return parsed;
}
