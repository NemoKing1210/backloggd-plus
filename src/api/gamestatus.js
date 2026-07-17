import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
  stripEphemeralMeta,
} from '../cache.js';
import {
  GAMESTATUS_API_BASE,
  GAMESTATUS_MAX_SLUG_ATTEMPTS,
  GAMESTATUS_SITE_BASE,
  GS_INVALID_SLUG_RE,
} from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight, locale, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';

export function getApiLanguage() {
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'pt') return 'pt-BR';
  if (locale === 'en') return 'en-US';
  return locale || 'en-US';
}

export function gsSlugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©'’":]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function extractSteamSlugFromHref(href) {
  const match = String(href || '').match(/\/app\/\d+\/([^/?#]+)/i);
  if (!match) return null;
  return gsSlugify(match[1].replace(/_/g, '-'));
}

export function isValidGsSlug(slug) {
  if (!slug || slug.length < 2) return false;
  if (!/[a-z]/.test(slug)) return false;
  if (GS_INVALID_SLUG_RE.test(slug)) return false;
  if (/^\d+(-\d+)+$/.test(slug)) return false;
  const segments = slug.split('-').filter(Boolean);
  if (!segments.length) return false;
  if (segments.every((part) => /^\d+$/.test(part))) return false;
  const numericParts = segments.filter((part) => /^\d+$/.test(part)).length;
  return numericParts / segments.length <= 0.5;
}

/**
 * Backloggd remake disambiguator: resident-evil-2--1 → resident-evil-2-remake
 * (GameStatus uses -remake; plain gsSlugify would yield -1).
 */
export function gsRemakeSlugFromPageSlug(pageSlug) {
  const raw = String(pageSlug || '').replace(/^\/+|\/+$/g, '');
  if (!/--1$/i.test(raw)) return null;
  return gsSlugify(raw.replace(/--1$/i, '-remake'));
}

export function buildGsSlugCandidates({ storeUrl, name, title, pageSlug }) {
  const candidates = [];
  const addSlug = (slug) => {
    if (slug && isValidGsSlug(slug) && !candidates.includes(slug)) {
      candidates.push(slug);
    }
  };
  const addFromText = (text) => {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return;
    addSlug(gsSlugify(normalized));
    addSlug(gsSlugify(normalized.replace(/\s*[-–—:|].*$/, '')));
  };

  // Prefer Backloggd --1 → -remake before store/title fallbacks.
  addSlug(gsRemakeSlugFromPageSlug(pageSlug));
  addSlug(extractSteamSlugFromHref(storeUrl));
  addFromText(name);
  addFromText(title);
  addSlug(gsSlugify(pageSlug));
  return candidates;
}

export function isMatchingGsGame(data, appId) {
  if (!data) return false;
  if (!data.steam_prod_id) return true;
  return String(data.steam_prod_id) === String(appId);
}

export function buildGsApiUrl(slug) {
  return `${GAMESTATUS_API_BASE}/${encodeURIComponent(slug)}/`;
}

export async function fetchGsBySlug(slug, appId) {
  const data = await gmRequest({
    url: buildGsApiUrl(slug),
    allow404: true,
    headers: {
      Accept: 'application/json',
      'Accept-Language': getApiLanguage(),
    },
    timeout: 15000,
  });
  if (!data) {
    return { data: null, match: false, outcome: '404' };
  }
  const match = isMatchingGsGame(data, appId);
  return {
    data,
    match,
    outcome: match ? 'match' : 'steam_prod_id_mismatch',
    steam_prod_id: data.steam_prod_id ?? null,
    readable_status: data.readable_status || null,
    title: data.title || null,
    slug: data.slug || slug,
  };
}

export async function fetchGameStatus({ appId, storeUrl, name, title, pageSlug }) {
  if (!appId) {
    return {
      missing: true,
      data: null,
      slug: null,
      _debug: { reason: 'No Steam appId — GameStatus skipped', appId: null },
      _cache: 'na',
    };
  }

  const cacheKey = `gs:${appId}`;
  const cached = getCached(cacheKey);
  if (cached) return asCacheHit(cached);

  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const slugs = buildGsSlugCandidates({ storeUrl, name, title, pageSlug });
    const tried = slugs.slice(0, GAMESTATUS_MAX_SLUG_ATTEMPTS);
    const debug = {
      appId,
      cacheKey,
      cacheSkipped: false,
      candidates: slugs,
      tried,
      attempts: [],
    };

    for (const slug of tried) {
      try {
        const result = await fetchGsBySlug(slug, appId);
        debug.attempts.push({
          slug,
          url: buildGsApiUrl(slug),
          outcome: result.outcome,
          steam_prod_id: result.steam_prod_id,
          title: result.title,
          readable_status: result.readable_status,
        });
        if (result.match && result.data) {
          debug.reason = `Matched slug "${result.slug || slug}" (steam_prod_id=${result.steam_prod_id ?? 'empty'})`;
          const entry = {
            missing: false,
            data: result.data,
            slug: result.data.slug || slug,
            _debug: debug,
          };
          setCached(cacheKey, stripEphemeralMeta(entry));
          return asCacheMiss(entry);
        }
      } catch (err) {
        debug.attempts.push({
          slug,
          url: buildGsApiUrl(slug),
          outcome: 'error',
          error: String(err?.message || err),
        });
      }
    }

    debug.reason = tried.length
      ? 'No GameStatus match for tried slugs'
      : 'No valid GameStatus slug candidates';
    const miss = { missing: true, data: null, slug: tried[0] || null, _debug: debug };
    return asCacheMiss(miss);
  })();

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}

export function parseGsDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getGsPendingVariant(game) {
  const release = parseGsDate(game.release_date);
  if (!release) return 'pending-recent';
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return release > monthAgo ? 'pending-recent' : 'pending-old';
}

export function getGsStatusType(game) {
  if (!game) return 'missing';
  const status = String(game.readable_status || '').toLowerCase();
  const groups = String(game.hacked_groups_en || game.hacked_groups || '').toLowerCase();
  if (/release today|релиз сегодня|выходит сегодня/.test(status)) return 'release-today';
  if (/bypass|обход|hypervisor/.test(groups) || /bypass|обход/.test(status)) return 'partial';
  if (/not cracked|не взлом|не взломан|unbroken|unreleased crack/.test(status)) {
    return getGsPendingVariant(game);
  }
  if (game.crack_date || /cracked|взлом/.test(status)) return 'ready';
  return 'unknown';
}

export function getGsStatusLabel(game, type) {
  if (!game) return t.gsNotInDatabase;
  if (game.readable_status) return game.readable_status;
  if (type === 'ready') return t.gsReady;
  if (type === 'pending-recent' || type === 'pending-old') return t.gsPending;
  if (type === 'partial') return t.gsPartial;
  if (type === 'release-today') return t.gsReleaseToday;
  return t.gsUnknown;
}

export function cleanGsChipToken(value) {
  return String(value || '')
    .replace(/^[\s\[\(\{"'`]+|[\]\)\}"'`\s]+$/g, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

export function splitGsChipValues(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) {
    return value.map(cleanGsChipToken).filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  if (/^[\[{"]/.test(raw)) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(cleanGsChipToken).filter(Boolean);
      }
      if (typeof parsed === 'string') {
        return [cleanGsChipToken(parsed)].filter(Boolean);
      }
    } catch (_) {
      /* fall through to delimiter split */
    }
  }

  return raw
    .split(/[,;/|]+/)
    .map(cleanGsChipToken)
    .filter(Boolean);
}

export function gsProtectionChipClass(name) {
  return /denuvo/i.test(name) ? 'blp-gs-chip--highlight' : 'blp-gs-chip--protection';
}

export function renderGameStatusValues(entry) {
  const game = entry?.data;
  if (!game) return '';

  const type = getGsStatusType(game);
  const label = getGsStatusLabel(game, type);
  const slug = game.slug || entry.slug;
  const href = slug ? `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(slug)}` : GAMESTATUS_SITE_BASE;

  const chips = [];
  for (const prot of splitGsChipValues(game.protections)) {
    chips.push(
      `<span class="blp-gs-chip ${gsProtectionChipClass(prot)}">${escapeHtml(prot)}</span>`
    );
  }
  for (const group of splitGsChipValues(game.hacked_groups_en || game.hacked_groups)) {
    const groupType = /bypass|обход|hypervisor/i.test(group) ? 'partial' : type;
    chips.push(
      `<span class="blp-gs-chip blp-gs-chip--${escapeAttr(groupType)}">${escapeHtml(group)}</span>`
    );
  }
  if (game.is_AAA) {
    chips.push(`<span class="blp-gs-chip blp-gs-chip--aaa">AAA</span>`);
  }

  const lines = [
    `<span class="blp-steam-line"><a class="blp-gs-badge blp-gs-badge--${escapeAttr(type)} blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="blp-gs-badge__dot" aria-hidden="true"></span>${escapeHtml(label)}</a></span>`,
  ];
  if (chips.length) {
    lines.push(`<span class="blp-steam-line blp-gs-chips">${chips.join('')}</span>`);
  }
  return lines.join('');
}
