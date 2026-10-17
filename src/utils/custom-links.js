import { LINK_KEYS } from '../constants.js';
import { slugifyForBackloggd } from './slug.js';

/** User-defined quick links: `{ id, label, url (template), format, icon, enabled }`. */
export const CUSTOM_LINK_MAX = 30;
export const CUSTOM_LINK_LABEL_MAX = 40;
export const CUSTOM_LINK_URL_MAX = 600;
export const CUSTOM_LINK_ICON_MAX = 600;
export const CUSTOM_LINK_ID_PREFIX = 'c_';

/** How `{title}` is written into the URL when the placeholder has no explicit `:format`. */
export const LINK_TITLE_FORMATS = ['encoded', 'plus', 'slug', 'underscore', 'compact'];
export const DEFAULT_LINK_TITLE_FORMAT = 'encoded';

/** Placeholders usable in the URL template (`{title}`, `{title:plus}`, `{appid}`…). */
export const LINK_PLACEHOLDERS = ['title', 'slug', 'appid', 'year', 'id'];

const PLACEHOLDER_RE = new RegExp(
  `\\{(${LINK_PLACEHOLDERS.join('|')})(?::(${LINK_TITLE_FORMATS.join('|')}))?\\}`,
  'gi'
);
const BUILTIN_KEY_SET = new Set(LINK_KEYS);

export function isCustomLinkId(id) {
  return typeof id === 'string' && id.startsWith(CUSTOM_LINK_ID_PREFIX);
}

export function newCustomLinkId() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${CUSTOM_LINK_ID_PREFIX}${Date.now().toString(36)}${rnd}`;
}

export function normalizeTitleFormat(value) {
  const fmt = String(value ?? '').trim().toLowerCase();
  return LINK_TITLE_FORMATS.includes(fmt) ? fmt : DEFAULT_LINK_TITLE_FORMAT;
}

function words(title) {
  return String(title ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function formatTitleForUrl(title, format) {
  switch (normalizeTitleFormat(format)) {
    case 'plus':
      return words(title).map(encodeURIComponent).join('+');
    case 'slug':
      return slugifyForBackloggd(title);
    case 'underscore':
      return words(title).map(encodeURIComponent).join('_');
    case 'compact':
      return encodeURIComponent(words(title).join(''));
    default:
      return encodeURIComponent(String(title ?? '').trim());
  }
}

export function isHttpUrl(value) {
  return /^https?:\/\/[^\s/?#]+/i.test(String(value ?? '').trim());
}

/**
 * Accepts http(s) images, inline data:image, and site-relative paths (`/favicon.ico`,
 * `img/icon.png`, `//cdn.example.com/i.png`); any other scheme is dropped.
 */
export function normalizeIconUrl(value) {
  const raw = String(value ?? '').trim().slice(0, CUSTOM_LINK_ICON_MAX);
  if (!raw || /\s/.test(raw.replace(/^data:[^,]*,.*$/is, ''))) return '';
  if (/^https?:\/\/[^\s]+$/i.test(raw)) return raw;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);/i.test(raw)) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';
  return raw;
}

/**
 * Absolute icon URL for a link: relative icons resolve against the root of the link's site
 * (`/favicon.ico` and `favicon.ico` both mean `https://site/favicon.ico`). '' when unusable.
 */
export function resolveIconUrl(icon, linkUrl) {
  const raw = normalizeIconUrl(icon);
  if (!raw) return '';
  if (/^(https?:|data:)/i.test(raw)) return raw;
  try {
    const base = new URL(String(linkUrl ?? '').replace(/\{[^}]*\}/g, 'x'));
    const rel = raw.startsWith('//') || raw.startsWith('/') ? raw : `/${raw.replace(/^\.\//, '')}`;
    const out = new URL(rel, base.origin);
    return /^https?:$/.test(out.protocol) ? out.href : '';
  } catch (_) {
    return '';
  }
}

/** Which placeholders the template uses (lowercased names). */
export function templatePlaceholders(template) {
  const found = new Set();
  String(template ?? '').replace(PLACEHOLDER_RE, (_m, name) => {
    found.add(name.toLowerCase());
    return '';
  });
  return found;
}

/**
 * Fill a URL template. Returns '' when a used placeholder has no value for this game
 * (e.g. `{appid}` before Steam resolves) or the result is not an http(s) URL.
 * @param {{ url: string, format?: string }} link
 * @param {{ title?: string, slug?: string, appId?: string|number|null, year?: string|number|null, gameId?: string }} ctx
 */
export function resolveCustomLinkUrl(link, ctx = {}) {
  const template = String(link?.url ?? '').trim();
  if (!isHttpUrl(template)) return '';
  let missing = false;
  const url = template.replace(PLACEHOLDER_RE, (_m, rawName, rawFormat) => {
    const name = rawName.toLowerCase();
    let value = '';
    if (name === 'title') {
      value = formatTitleForUrl(ctx.title || ctx.slug || '', rawFormat || link.format);
    } else if (name === 'slug') {
      value = encodeURIComponent(String(ctx.slug ?? '').replace(/^\/+|\/+$/g, ''));
    } else if (name === 'appid') {
      value = ctx.appId != null ? encodeURIComponent(String(ctx.appId)) : '';
    } else if (name === 'year') {
      value = ctx.year ? encodeURIComponent(String(ctx.year)) : '';
    } else if (name === 'id') {
      value = ctx.gameId ? encodeURIComponent(String(ctx.gameId)) : '';
    }
    if (!value) missing = true;
    return value;
  });
  if (missing || !isHttpUrl(url)) return '';
  return url;
}

/** Clean one stored/imported entry; returns null when it is unusable. */
export function sanitizeCustomLink(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const label = String(raw.label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CUSTOM_LINK_LABEL_MAX);
  const url = String(raw.url ?? '').trim().slice(0, CUSTOM_LINK_URL_MAX);
  if (!label || !isHttpUrl(url)) return null;
  const id = isCustomLinkId(raw.id) && /^c_[a-z0-9]{3,40}$/i.test(raw.id) ? raw.id : newCustomLinkId();
  return {
    id,
    label,
    url,
    format: normalizeTitleFormat(raw.format),
    icon: normalizeIconUrl(raw.icon),
    enabled: raw.enabled !== false,
  };
}

export function sanitizeCustomLinks(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    const link = sanitizeCustomLink(entry);
    if (!link) continue;
    if (seen.has(link.id)) link.id = newCustomLinkId();
    seen.add(link.id);
    out.push(link);
    if (out.length >= CUSTOM_LINK_MAX) break;
  }
  return out;
}

/**
 * Full display order: the saved order first (unknown ids dropped), then any built-in or
 * custom link it does not mention yet (new built-ins land at the end).
 */
export function normalizeLinkOrder(order, customLinks = []) {
  const known = new Set([...LINK_KEYS, ...customLinks.map((l) => l.id)]);
  const out = [];
  const seen = new Set();
  for (const id of Array.isArray(order) ? order : []) {
    if (typeof id !== 'string' || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of known) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export function isBuiltinLinkKey(id) {
  return BUILTIN_KEY_SET.has(id);
}
