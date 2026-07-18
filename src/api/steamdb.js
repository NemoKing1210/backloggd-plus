import { asCacheHit, asCacheMiss, getCached, setCached } from '../cache.js';
import { STEAMDB_APP_URL, STEAMDB_SITE } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

function cellLabel(td) {
  return String(td?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function absSteamDbUrl(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${STEAMDB_SITE}${raw}`;
  return `${STEAMDB_SITE}/${raw}`;
}

function franchiseUrlFromName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  return `${STEAMDB_SITE}/franchise/${encodeURIComponent(n).replace(/%20/g, '+')}/`;
}

function steamDbMetaCacheKey(appId) {
  return `steamdb:meta:${Number(appId)}`;
}

function rowCells(tr) {
  const direct = tr.querySelectorAll(':scope > td');
  if (direct.length >= 2) return direct;
  return tr.querySelectorAll('td');
}

/**
 * Parse Franchise / Supported Systems / Technologies / Last Record Update
 * from a SteamDB app page Document (live page or DOMParser result).
 */
export function parseSteamDbAppMetaFromDocument(doc) {
  if (!doc?.querySelectorAll) return null;

  const meta = {
    franchise: null,
    systems: null,
    technologies: [],
    lastRecordUpdate: null,
    source: 'steamdb',
    blocked: false,
  };

  const rows = doc.querySelectorAll(
    '.span8 table.table tbody tr, table.table-bordered tbody tr, table.table tbody tr'
  );
  for (const tr of rows) {
    const cells = rowCells(tr);
    if (cells.length < 2) continue;
    const label = cellLabel(cells[0]);
    const valueTd = cells[1];

    if (label.startsWith('franchise')) {
      const a = valueTd.querySelector('a[href*="/franchise/"]');
      const name = String(a?.textContent || valueTd.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (name) {
        meta.franchise = {
          name,
          url: absSteamDbUrl(a?.getAttribute('href')) || franchiseUrlFromName(name),
        };
      }
      continue;
    }

    if (label.startsWith('supported systems')) {
      const osMeta = valueTd.querySelector('meta[itemprop="operatingSystem"]');
      const osRaw = String(osMeta?.getAttribute('content') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      let list = osRaw;
      if (!list.length) {
        const text = String(valueTd.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        list = [];
        if (/\bwindows\b/i.test(text)) list.push('Windows');
        if (/\bmac\s*os\b|\bmacos\b/i.test(text)) list.push('macOS');
        if (/\blinux\b/i.test(text)) list.push('Linux');
      }
      let deckCompat = null;
      const deckTip =
        valueTd.querySelector('[aria-label*="Steam Deck"]') ||
        valueTd.querySelector('[aria-label*="steam deck"]');
      const tip = String(deckTip?.getAttribute('aria-label') || '');
      if (/verified/i.test(tip)) deckCompat = 3;
      else if (/playable/i.test(tip)) deckCompat = 2;
      else if (/unsupported/i.test(tip)) deckCompat = 1;
      else if (/unknown/i.test(tip)) deckCompat = 0;
      if (list.length || deckCompat != null) {
        meta.systems = { list, deckCompat };
      }
      continue;
    }

    if (label.startsWith('technologies')) {
      const techs = [];
      valueTd.querySelectorAll('a[href*="/tech/"]').forEach((a) => {
        const name = String(a.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        const url = absSteamDbUrl(a.getAttribute('href'));
        if (name && url) techs.push({ name, url });
      });
      meta.technologies = techs;
      continue;
    }

    if (label.startsWith('last record update')) {
      const rt = valueTd.querySelector('relative-time[datetime], relative-time[content]');
      const iso = rt?.getAttribute('datetime') || rt?.getAttribute('content') || '';
      let labelText = String(valueTd.childNodes?.[0]?.textContent || valueTd.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      labelText = labelText.replace(/\([^)]*\)\s*$/, '').trim();
      if (iso || labelText) {
        meta.lastRecordUpdate = {
          iso: iso || null,
          label: labelText || iso,
        };
      }
    }
  }

  const hasData =
    meta.franchise ||
    meta.systems ||
    meta.technologies.length ||
    meta.lastRecordUpdate;
  return hasData ? meta : null;
}

/**
 * Parse from SteamDB app HTML. Detects Cloudflare challenge pages.
 */
export function parseSteamDbAppMeta(html) {
  if (!html || typeof html !== 'string') return null;
  if (/just a moment|cf-browser-verification|challenge-platform|cdn-cgi\/challenge/i.test(html)) {
    return { blocked: true, source: 'steamdb-cf' };
  }

  let doc;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch (_) {
    return null;
  }
  return parseSteamDbAppMetaFromDocument(doc);
}

export function buildSteamDbMetaPayload(appId, parsed, { pageUrl = '' } = {}) {
  const id = Number(appId);
  return {
    franchise: parsed?.franchise || null,
    systems: parsed?.systems || null,
    technologies: Array.isArray(parsed?.technologies) ? parsed.technologies : [],
    lastRecordUpdate: parsed?.lastRecordUpdate || null,
    source: parsed?.source || 'steamdb',
    pageUrl: pageUrl || `${STEAMDB_APP_URL}/${id}/`,
  };
}

/**
 * Persist meta harvested from a live SteamDB page (Cloudflare already passed).
 */
export function cacheSteamDbAppMeta(appId, parsed) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0 || !parsed || parsed.blocked) return null;
  const payload = buildSteamDbMetaPayload(id, parsed);
  if (
    !payload.franchise &&
    !payload.systems &&
    !payload.technologies.length &&
    !payload.lastRecordUpdate
  ) {
    return null;
  }
  setCached(steamDbMetaCacheKey(id), payload);
  return payload;
}

/**
 * Read the open SteamDB app page table into the shared GM cache.
 */
export function harvestSteamDbAppMetaFromPage(appId = '') {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const parsed = parseSteamDbAppMetaFromDocument(document);
  return cacheSteamDbAppMeta(id, parsed);
}

/**
 * Fetch SteamDB app page metadata (often blocked by Cloudflare from other origins).
 * Prefers GM cache (including harvests from live SteamDB visits).
 */
export async function fetchSteamDbAppMeta(appId) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return asCacheMiss(null);

  const cacheKey = steamDbMetaCacheKey(id);
  const cached = getCached(cacheKey);
  if (cached && typeof cached === 'object' && !cached.blocked) {
    return asCacheHit(cached);
  }
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const pageUrl = `${STEAMDB_APP_URL}/${id}/`;
  const task = (async () => {
    try {
      const html = await gmRequest({
        url: pageUrl,
        responseType: 'text',
        timeout: 20000,
        anonymous: false,
      });
      const parsed = parseSteamDbAppMeta(html);
      if (!parsed || parsed.blocked) {
        return asCacheMiss(parsed || { blocked: true, source: 'steamdb-cf' });
      }
      const payload = buildSteamDbMetaPayload(id, parsed, { pageUrl });
      setCached(cacheKey, payload);
      return asCacheMiss(payload);
    } catch (err) {
      return asCacheMiss({
        blocked: false,
        source: 'steamdb-error',
        error: String(err?.message || err),
        pageUrl,
      });
    }
  })();

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
