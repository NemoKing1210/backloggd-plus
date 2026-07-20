import { asCacheHit, asCacheMiss, getCached, setCached } from '../cache.js';
import { PROFILE_CARD_TIERS } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

const PROFILE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_FAVORITES = 5;
const MAX_RECENT = 4;
const MAX_BADGES = 6;

export function profileCacheKey(username) {
  return `user:profile:${String(username || '').trim().toLowerCase()}`;
}

export function resolveProfileTier(gamesPlayed) {
  const n = Math.max(0, Number(gamesPlayed) || 0);
  let tier = PROFILE_CARD_TIERS[0];
  for (const row of PROFILE_CARD_TIERS) {
    if (n >= row.min) tier = row;
  }
  return { ...tier, gamesPlayed: n };
}

export function parseUsernameFromHref(href) {
  const m = String(href || '').match(/\/u\/([^/?#]+)/i);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]).trim();
  } catch {
    return m[1].trim();
  }
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

function compactCover(url) {
  return String(url || '').replace(/\/t_cover_big(_2x)?\//i, '/t_cover_small/');
}

function textOf(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function parseStatNumber(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number.parseInt(digits, 10) || 0;
}

function parseRatings(doc) {
  const bars = [...(doc.querySelectorAll('#ratings-bars-height .top-tooltip') || [])];
  return bars.map((el, i) => {
    const tip = el.getAttribute('data-tippy-content') || '';
    const m = tip.match(/^(\d+)\s*\|\s*([\d.]+)/);
    const count = m ? Number(m[1]) || 0 : 0;
    const stars = m ? Number(m[2]) || (i + 1) * 0.5 : (i + 1) * 0.5;
    const pctM = tip.match(/\(([\d.]+)%\)/);
    const pct = pctM ? Number(pctM[1]) || 0 : 0;
    const bar = el.querySelector('.bar-h');
    const heightRaw = bar?.style?.height || '';
    const height = Number.parseFloat(heightRaw) || 0;
    return { stars, count, pct, height };
  });
}

function parseBadges(doc) {
  const out = [];
  for (const col of doc.querySelectorAll('.badges .backlog-badge-cus-col') || []) {
    const tip = col.querySelector('.badge-tooltip');
    const id = tip?.getAttribute('badge_id') || '';
    const detail = id ? doc.getElementById(`badge-${id}`) : null;
    const title = textOf(detail?.querySelector('.badge-title') || col.querySelector('.badge-title'));
    const desc = textOf(detail?.querySelector('.badge-desc') || col.querySelector('.badge-desc'));
    const img = col.querySelector('.badge-image img');
    const imageUrl = absUrl(img?.getAttribute('src') || '');
    if (!title && !imageUrl) continue;
    out.push({ id, title, desc, imageUrl });
    if (out.length >= MAX_BADGES) break;
  }
  return out;
}

function parseGameCovers(root, limit) {
  if (!root) return [];
  const out = [];
  const seen = new Set();
  for (const cover of root.querySelectorAll('.game-cover') || []) {
    const link =
      cover.querySelector('a.cover-link[href*="/games/"]') ||
      cover.querySelector('a[href*="/games/"]') ||
      cover.closest('a[href*="/games/"]') ||
      cover.parentElement?.querySelector?.('a[href*="/games/"]');
    const href = absUrl(link?.getAttribute('href') || '');
    const slugM = href.match(/\/games\/([^/?#]+)/i);
    const slug = slugM ? slugM[1].toLowerCase() : '';
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const img = cover.querySelector('img');
    const title =
      textOf(cover.querySelector('.game-text-centered')) ||
      (img?.getAttribute('alt') || '').trim() ||
      slug.replace(/-/g, ' ');
    const coverUrl = compactCover(
      absUrl(img?.getAttribute('data-src') || img?.getAttribute('src') || '')
    );
    out.push({ slug, title, coverUrl, href: href || `/games/${slug}/` });
    if (out.length >= limit) break;
  }
  return out;
}

function parseBio(doc) {
  const body = doc.querySelector('#bio-body');
  if (!body) return '';
  const empty = body.querySelector('i.text-color-secondary');
  if (empty && /nothing here/i.test(textOf(empty))) return '';
  const clone = body.cloneNode(true);
  clone.querySelectorAll('script, style').forEach((n) => n.remove());
  return textOf(clone).slice(0, 280);
}

function parseProfileStats(doc) {
  const stats = { gamesPlayed: 0, playedYear: 0, playedYearLabel: '', backlog: 0 };
  const cols = [...(doc.querySelectorAll('#profile-stats > div') || [])];
  for (const col of cols) {
    const label = textOf(col.querySelector('h4')).replace(/\s+/g, ' ');
    const value = parseStatNumber(textOf(col.querySelector('h1')));
    if (/games played/i.test(label)) stats.gamesPlayed = value;
    else if (/backlog/i.test(label)) stats.backlog = value;
    else if (/played in/i.test(label)) {
      stats.playedYear = value;
      stats.playedYearLabel = label;
    }
  }
  return stats;
}

export function parseUserProfileHtml(html, usernameHint = '') {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const headerName = textOf(doc.querySelector('#profile-header h3.main-header'));
  const username = headerName || String(usernameHint || '').trim();
  if (!username) return null;

  const avatarImg =
    doc.querySelector('#profile-header .avatar img') ||
    doc.querySelector('meta[property="og:image"]');
  const avatarUrl = absUrl(
    avatarImg?.getAttribute?.('src') ||
      avatarImg?.getAttribute?.('content') ||
      ''
  );

  const userIdRaw =
    doc.querySelector('button.friend-btn[user_id]')?.getAttribute('user_id') ||
    doc.querySelector('button.report-btn[user_id]')?.getAttribute('user_id') ||
    '';
  const userId = Number(userIdRaw) || null;

  const stats = parseProfileStats(doc);
  const ratings = parseRatings(doc);
  const ratedCount = ratings.reduce((sum, r) => sum + (r.count || 0), 0);
  const ratingSum = ratings.reduce((sum, r) => sum + (r.count || 0) * (r.stars || 0), 0);
  const avgRating = ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null;

  const tier = resolveProfileTier(stats.gamesPlayed);

  return {
    username,
    userId,
    avatarUrl,
    bio: parseBio(doc),
    gamesPlayed: stats.gamesPlayed,
    playedYear: stats.playedYear,
    playedYearLabel: stats.playedYearLabel,
    backlog: stats.backlog,
    ratings,
    ratedCount,
    avgRating,
    badges: parseBadges(doc),
    favorites: parseGameCovers(doc.querySelector('#profile-favorites'), MAX_FAVORITES),
    recent: parseGameCovers(doc.querySelector('#profile-journal'), MAX_RECENT),
    profileUrl: `/u/${encodeURIComponent(username)}/`,
    tierId: tier.id,
    tierMin: tier.min,
  };
}

/** Synchronous cache peek (no network). */
export function peekCachedUserProfile(username) {
  const name = String(username || '').trim();
  if (!name) return null;
  const cached = getCached(profileCacheKey(name));
  return cached?.username ? cached : null;
}

export function tierIdFromProfile(profile) {
  if (!profile) return 'rookie';
  if (profile.tierId) return profile.tierId;
  return resolveProfileTier(profile.gamesPlayed).id;
}

export async function fetchUserProfile(username) {
  const name = String(username || '').trim();
  if (!name) return null;
  const cacheKey = profileCacheKey(name);
  const cached = getCached(cacheKey);
  if (cached?.username) return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const url = `https://www.backloggd.com/u/${encodeURIComponent(name)}/`;
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
    const profile = parseUserProfileHtml(html, name);
    if (!profile) return null;
    setCached(cacheKey, profile, { ttlMs: PROFILE_TTL_MS });
    return asCacheMiss(profile);
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}

