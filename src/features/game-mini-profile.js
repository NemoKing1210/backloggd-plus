import {
  fetchGameMiniProfile,
  gameTierIdFromRating,
  peekCachedGameMiniProfile,
} from '../api/game-profile.js';
import { formatConvertedSalePair } from '../api/fx.js';
import { fetchGameStatus, getGsStatusLabel, getGsStatusType } from '../api/gamestatus.js';
import { fetchSteamByAppId, fetchSteamUserdata, resolveSteamForGame } from '../api/steam.js';
import {
  CARD_SKIP_ANCESTOR,
  FAVICON_URL,
  GAME_FETCH_CONCURRENCY,
  GAME_HOVER_CLOSE_MS,
  GAME_HOVER_OPEN_MS,
  GAME_LEAVE_MS,
  GAME_PRELOAD_ROOT_MARGIN,
  GAMESTATUS_SITE_BASE,
  STEAMDB_APP_URL,
} from '../constants.js';
import { fmt } from '../i18n/index.js';
import { normalizeMiniProfileTrigger } from '../settings.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { morphCard } from '../utils/card-morph.js';
import { debounce } from '../utils/debounce.js';
import {
  parseCardAppId,
  parseCardSlug,
  parseCardTitle,
} from './cards.js';
import {
  faviconForUrl,
  formatPriceText,
  formatReviewPercent,
  formatReviewPercentCompact,
  mcScoreTier,
  reviewScoreClass,
} from './enrichment.js';

const HOVER_ATTR = 'data-blp-gmp-hover';
const MARK_ATTR = 'data-blp-gmp';
const PRELOAD_ATTR = 'data-blp-gmp-preload';
const POPOVER_ID = 'blp-game-mini-profile';
const GMP_SKIP =
  `#${POPOVER_ID}, .blp-gmp, #blp-user-mini-profile, .blp-ump, .blp-settings-backdrop, .blp-fix-match-backdrop, .blp-export-backdrop`;
/** Game covers inside the user mini-profile card (favorites / recent) open a nested game card. */
const NESTED_COVER = 'a.blp-ump__cover';
const NESTED_CLASS = 'is-nested';
const USER_POPOVER = '#blp-user-mini-profile';

function isNestedCover(cover) {
  return Boolean(cover?.matches?.(NESTED_COVER) && cover.closest(USER_POPOVER));
}

/** True when `node` is inside the game card that was opened from the user mini-profile card. */
export function isInsideGameMiniProfile(node) {
  const pop = node?.closest?.(`#${POPOVER_ID}`);
  return Boolean(pop?.classList.contains(NESTED_CLASS));
}

/** Close the game card if it was opened from the user mini-profile card. */
export function closeNestedGameMiniProfile({ immediate = false } = {}) {
  if (!popoverEl?.classList.contains(NESTED_CLASS)) return;
  hidePopover({ immediate });
}

/** Covers allowed inside the game page skip zone: Plus Similar games and Backloggd's native Related Games. */
const GMP_ALLOW_IN_GAME_PAGE =
  '.blp-similar__cover, turbo-frame#game_detail_section .game-cover';

let bound = false;
let openTimer = 0;
let closeTimer = 0;
let leaveTimer = 0;
let leaveHandler = null;
let activeCover = null;
let activeSlug = '';
let popoverEl = null;
let fetchSeq = 0;
/** Bumped on every paint / close so an older async render never overwrites a newer card. */
let paintSeq = 0;
let inFlightFetches = 0;
const fetchQueue = [];
let preloadObserver = null;
const preloadQueued = new Set();
/** Shared Backloggd fetch promises keyed by lowercase slug. */
const profileFetches = new Map();
/** Shared Steam+GS enrich promises keyed by lowercase slug. */
const enrichFetches = new Map();

function triggerMode() {
  return normalizeMiniProfileTrigger(settings.gameMiniProfileTrigger);
}

/** Rating tier of the card, or null (tiers off / game not rated yet / still loading). */
function cardTierId(ctx) {
  if (settings.gameMiniProfileTiers === false) return null;
  return gameTierIdFromRating(ctx?.profile?.rating);
}

function tierLabel(tierId) {
  const map = {
    rookie: t.miniProfileTierRookie,
    bronze: t.miniProfileTierBronze,
    silver: t.miniProfileTierSilver,
    gold: t.miniProfileTierGold,
    platinum: t.miniProfileTierPlatinum,
    diamond: t.miniProfileTierDiamond,
    master: t.miniProfileTierMaster,
    legend: t.miniProfileTierLegend,
  };
  return map[tierId] || t.miniProfileTierRookie;
}

function enqueueFetch(fn) {
  return new Promise((resolve) => {
    const run = async () => {
      inFlightFetches += 1;
      try {
        resolve(await fn());
      } finally {
        inFlightFetches -= 1;
        const next = fetchQueue.shift();
        if (next) next();
      }
    };
    if (inFlightFetches < GAME_FETCH_CONCURRENCY) run();
    else fetchQueue.push(run);
  });
}

function favicon(domain) {
  return FAVICON_URL.replace('{domain}', encodeURIComponent(domain));
}

function coverImgUrl(cover) {
  const img = cover?.querySelector?.('img');
  return (
    img?.getAttribute?.('data-src') ||
    img?.getAttribute?.('src') ||
    ''
  ).trim();
}

function ensurePopover() {
  if (popoverEl && document.body.contains(popoverEl)) return popoverEl;
  popoverEl = document.createElement('div');
  popoverEl.id = POPOVER_ID;
  popoverEl.className = 'blp-gmp';
  popoverEl.setAttribute('role', 'dialog');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.addEventListener('pointerenter', () => {
    window.clearTimeout(closeTimer);
  });
  popoverEl.addEventListener('pointerleave', () => {
    // Click-triggered cards stay until an outside click / Escape.
    if (triggerMode() === 'hover') scheduleClose();
  });
  document.body.appendChild(popoverEl);
  return popoverEl;
}

function finishHidePopover() {
  window.clearTimeout(leaveTimer);
  if (popoverEl && leaveHandler) {
    popoverEl.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }
  if (!popoverEl) return;
  popoverEl.classList.remove(
    'is-open',
    'is-leaving',
    'is-loading',
    'is-ready',
    'is-updating',
    NESTED_CLASS
  );
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.innerHTML = '';
  activeCover?.removeAttribute?.(HOVER_ATTR);
  activeCover = null;
  activeSlug = '';
}

function hidePopover({ immediate = false } = {}) {
  if (!popoverEl) return;
  paintSeq += 1;
  window.clearTimeout(leaveTimer);
  if (leaveHandler) {
    popoverEl.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }

  const wasOpen = popoverEl.classList.contains('is-open');
  if (immediate || !wasOpen) {
    finishHidePopover();
    return;
  }

  popoverEl.classList.add('is-leaving');
  popoverEl.classList.remove('is-open', 'is-loading', 'is-ready');
  popoverEl.setAttribute('aria-hidden', 'true');

  leaveHandler = (e) => {
    if (e.target !== popoverEl) return;
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    finishHidePopover();
  };
  popoverEl.addEventListener('transitionend', leaveHandler);
  leaveTimer = window.setTimeout(finishHidePopover, GAME_LEAVE_MS);
}

function openPopover(el) {
  window.clearTimeout(leaveTimer);
  if (leaveHandler) {
    el.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }
  el.classList.remove('is-leaving');
  if (!el.classList.contains('is-open')) {
    void el.offsetWidth;
  }
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    el.classList.add('is-ready');
  });
}

function positionPopover(anchor) {
  const el = ensurePopover();
  const rect = anchor.getBoundingClientRect();
  // A nested card sits beside the user card (not on top of it), level with the hovered cover.
  const hostRect = anchor.closest?.(USER_POPOVER)?.getBoundingClientRect() || rect;
  const pad = 10;
  const cardW = el.offsetWidth || 312;
  const cardH = el.offsetHeight || 420;
  let left = hostRect.right + pad;
  let top = rect.top + rect.height / 2 - cardH / 2;

  if (left + cardW > window.innerWidth - 12) {
    left = hostRect.left - cardW - pad;
  }
  if (left < 12) {
    left = Math.max(12, Math.min(window.innerWidth - cardW - 12, rect.left + rect.width / 2 - cardW / 2));
    top = rect.bottom + pad;
    if (top + cardH > window.innerHeight - 12) {
      top = rect.top - cardH - pad;
    }
  }
  top = Math.max(12, Math.min(window.innerHeight - cardH - 12, top));
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

function skelBone(extraClass = '') {
  return `<span class="blp-gmp__bone ${extraClass}" aria-hidden="true"></span>`;
}

function renderHero(ctx) {
  const profile = ctx.profile;
  const title = profile?.title || ctx.titleHint || ctx.slug;
  const year = profile?.year || '';
  const coverUrl = profile?.coverUrl || ctx.coverHint || '';
  const rating = profile?.rating;
  const gameUrl = profile?.gameUrl || `/games/${encodeURIComponent(ctx.slug)}/`;
  const img = coverUrl
    ? `<img src="${escapeAttr(coverUrl)}" alt="" loading="lazy" decoding="async">`
    : `<span class="blp-gmp__cover-ph"></span>`;
  const ratingHtml =
    rating != null
      ? `<span class="blp-gmp__rating" title="${escapeAttr(t.miniGameRating)}">${escapeHtml(String(rating))}★</span>`
      : ctx.loadingProfile
        ? skelBone('blp-gmp__bone--rating')
        : '';
  const yearHtml = year
    ? `<span class="blp-gmp__year">${escapeHtml(year)}</span>`
    : '';
  const tierId = cardTierId(ctx);
  // Reserve the pill's slot while the rating loads so the title doesn't jump when the tier appears.
  const tierHtml = tierId
    ? `<span class="blp-gmp__tier-pill">${escapeHtml(tierLabel(tierId))}</span>`
    : ctx.loadingProfile && !profile && settings.gameMiniProfileTiers !== false
      ? skelBone('blp-gmp__bone--pill')
      : '';

  return `
    <div class="blp-gmp__hero">
      <a class="blp-gmp__cover-link" href="${escapeAttr(gameUrl)}" data-turbo-frame="_top">
        <div class="blp-gmp__cover">${img}</div>
      </a>
      <div class="blp-gmp__hero-meta">
        ${tierHtml}
        <a class="blp-gmp__title" href="${escapeAttr(gameUrl)}" data-turbo-frame="_top">${escapeHtml(title)}</a>
        <div class="blp-gmp__sub">
          ${yearHtml}
          ${ratingHtml}
        </div>
      </div>
    </div>
  `;
}

function renderMeta(ctx) {
  const profile = ctx.profile;
  if (!profile && ctx.loadingProfile) {
    return `
      <div class="blp-gmp__section" aria-hidden="true">
        ${skelBone('blp-gmp__bone--line')}
        <div class="blp-gmp__chips">
          ${skelBone('blp-gmp__bone--chip')}
          ${skelBone('blp-gmp__bone--chip')}
          ${skelBone('blp-gmp__bone--chip')}
        </div>
      </div>
    `;
  }
  if (!profile) return '';

  const devs = (profile.developers || [])
    .map((d) => {
      if (d.href) {
        return `<a class="blp-gmp__dev" href="${escapeAttr(d.href)}" data-turbo-frame="_top">${escapeHtml(d.name)}</a>`;
      }
      return `<span class="blp-gmp__dev">${escapeHtml(d.name)}</span>`;
    })
    .join('<span class="blp-gmp__sep"> · </span>');

  const chips = (profile.platforms || [])
    .map((p) => `<span class="blp-gmp__chip">${escapeHtml(p)}</span>`)
    .join('');

  if (!devs && !chips) return '';

  return `
    <div class="blp-gmp__section">
      ${devs ? `<div class="blp-gmp__devs">${devs}</div>` : ''}
      ${chips ? `<div class="blp-gmp__chips">${chips}</div>` : ''}
    </div>
  `;
}

async function steamRowHtml(ctx) {
  const { steam, owned, wishlist, loadingSteam } = ctx;
  if (loadingSteam && !steam?.found) {
    return `
      <div class="blp-gmp__section blp-gmp__steam" aria-busy="true">
        ${skelBone('blp-gmp__bone--steam')}
        ${skelBone('blp-gmp__bone--steam')}
      </div>
    `;
  }
  if (!steam?.found) return '';

  const bits = [];
  const priceText = formatPriceText(steam);
  if (priceText) {
    const discount =
      steam.price?.discount_percent > 0
        ? ` <span class="blp-gmp__discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
        : '';
    let fx = '';
    if (settings.showPriceConvert && steam.price && !steam.isFree) {
      const pair = await formatConvertedSalePair(steam.price, settings.convertCurrency || 'RUB');
      if (pair?.now) {
        fx = pair.was
          ? ` <span class="blp-gmp__fx">~ ${escapeHtml(pair.now)}</span>`
          : ` <span class="blp-gmp__fx">~ ${escapeHtml(pair.now)}</span>`;
      }
    }
    bits.push(
      `<a class="blp-gmp__pill blp-gmp__pill--price" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}${discount}${fx}</a>`
    );
  }

  const reviewCompact = formatReviewPercentCompact(steam.reviews);
  const reviewFull = formatReviewPercent(steam.reviews);
  const reviewClass = reviewScoreClass(steam.reviews);
  if (reviewCompact) {
    bits.push(
      `<a class="blp-gmp__pill blp-gmp__pill--review ${escapeAttr(reviewClass)}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer" title="${escapeAttr(reviewFull || reviewCompact)}">${escapeHtml(reviewCompact)}</a>`
    );
  } else if (steam.metacritic?.score != null) {
    const mc = steam.metacritic.score;
    const tier = mcScoreTier(mc);
    bits.push(
      `<a class="blp-gmp__pill blp-gmp__pill--mc${tier ? ` blp-gmp__pill--mc-${tier}` : ''}" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(t.metacritic)}">${escapeHtml(String(mc))}</a>`
    );
  }

  if (owned) {
    bits.push(`<span class="blp-gmp__pill blp-gmp__pill--owned">${escapeHtml(t.steamOwned)}</span>`);
  } else if (wishlist) {
    bits.push(
      `<span class="blp-gmp__pill blp-gmp__pill--wishlist">${escapeHtml(t.steamWishlist)}</span>`
    );
  }

  if (!bits.length) return '';
  return `<div class="blp-gmp__section blp-gmp__steam">${bits.join('')}</div>`;
}

function renderGameStatus(ctx) {
  const gs = ctx.gamestatus;
  if (ctx.loadingSteam && !gs) return '';
  if (!gs || gs.missing || !gs.data) return '';
  const type = getGsStatusType(gs.data);
  const label = getGsStatusLabel(gs.data, type);
  const gsSlug = gs.data.slug || gs.slug;
  const href = gsSlug
    ? `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(gsSlug)}`
    : GAMESTATUS_SITE_BASE;
  return `
    <div class="blp-gmp__section">
      <a class="blp-gmp__gs blp-gs-badge--${escapeAttr(type)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
    </div>
  `;
}

function renderDescription(ctx) {
  const desc = ctx.profile?.description;
  if (!desc && ctx.loadingProfile) {
    return `
      <div class="blp-gmp__section" aria-hidden="true">
        ${skelBone('blp-gmp__bone--desc')}
        ${skelBone('blp-gmp__bone--desc-short')}
      </div>
    `;
  }
  if (!desc) return '';
  return `<p class="blp-gmp__desc">${escapeHtml(desc)}</p>`;
}

function renderLinks(ctx) {
  const profile = ctx.profile;
  const steam = ctx.steam;
  const gameUrl = profile?.gameUrl || `/games/${encodeURIComponent(ctx.slug)}/`;
  const links = [];

  if (steam?.found && steam.storeUrl) {
    links.push({
      href: steam.storeUrl,
      label: 'Steam',
      icon: favicon('store.steampowered.com'),
      external: true,
    });
    if (steam.appId != null) {
      links.push({
        href: `${STEAMDB_APP_URL}/${steam.appId}/`,
        label: 'SteamDB',
        icon: favicon('steamdb.info'),
        external: true,
      });
    }
  }
  if (profile?.igdbUrl) {
    links.push({
      href: profile.igdbUrl,
      label: 'IGDB',
      icon: faviconForUrl(profile.igdbUrl) || favicon('igdb.com'),
      external: true,
    });
  }

  const linkHtml = links
    .map((l) => {
      const img = l.icon
        ? `<img class="blp-gmp__link-icon" src="${escapeAttr(l.icon)}" alt="" width="14" height="14" loading="lazy" referrerpolicy="no-referrer">`
        : '';
      const rel = l.external ? ' target="_blank" rel="noopener noreferrer"' : ' data-turbo-frame="_top"';
      return `<a class="blp-gmp__link" href="${escapeAttr(l.href)}"${rel}>${img}<span>${escapeHtml(l.label)}</span></a>`;
    })
    .join('');

  return `
    <div class="blp-gmp__section blp-gmp__footer">
      ${linkHtml ? `<div class="blp-gmp__links">${linkHtml}</div>` : ''}
      <a class="blp-gmp__cta" href="${escapeAttr(gameUrl)}" data-turbo-frame="_top">${escapeHtml(t.miniGameOpen)}</a>
    </div>
  `;
}

/** Ordered section renderers — extend here without touching hover lifecycle. */
const SECTIONS = [
  { id: 'hero', render: (ctx) => renderHero(ctx) },
  { id: 'meta', render: (ctx) => renderMeta(ctx) },
  { id: 'steam', render: (ctx) => steamRowHtml(ctx) },
  { id: 'gamestatus', render: (ctx) => renderGameStatus(ctx) },
  { id: 'description', render: (ctx) => renderDescription(ctx) },
  { id: 'links', render: (ctx) => renderLinks(ctx) },
];

async function renderCard(ctx) {
  const parts = [];
  for (const section of SECTIONS) {
    const html = await section.render(ctx);
    // Wrapper gives each block a stable identity so soft updates can morph it in place.
    if (html) parts.push(`<div class="blp-gmp__sec" data-sec="${section.id}">${html}</div>`);
  }
  const tierId = cardTierId(ctx);
  const tierClass = tierId ? ` blp-gmp__card--tier blp-gmp__card--${escapeAttr(tierId)}` : '';
  return `
    <div class="blp-gmp__card${tierClass}">
      <div class="blp-gmp__shine" aria-hidden="true"></div>
      ${parts.join('')}
    </div>
  `;
}

function renderError(slug, titleHint) {
  const gameUrl = `/games/${encodeURIComponent(slug)}/`;
  return `
    <div class="blp-gmp__card">
      <div class="blp-gmp__shine" aria-hidden="true"></div>
      <div class="blp-gmp__hero">
        <div class="blp-gmp__cover"><span class="blp-gmp__cover-ph"></span></div>
        <div class="blp-gmp__hero-meta">
          <div class="blp-gmp__title">${escapeHtml(titleHint || slug)}</div>
        </div>
      </div>
      <div class="blp-gmp__status">${escapeHtml(t.miniGameError)}</div>
      <a class="blp-gmp__cta" href="${escapeAttr(gameUrl)}" data-turbo-frame="_top">${escapeHtml(t.miniGameOpen)}</a>
    </div>
  `;
}

function ensureProfileFetch(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return Promise.resolve(null);
  const cached = peekCachedGameMiniProfile(key);
  if (cached) return Promise.resolve(cached);
  let pending = profileFetches.get(key);
  if (pending) return pending;
  pending = enqueueFetch(() => fetchGameMiniProfile(key)).finally(() => {
    profileFetches.delete(key);
  });
  profileFetches.set(key, pending);
  return pending;
}

function ensureSteamEnrich({ slug, title, appId }) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key && !appId) return Promise.resolve({ steam: null, owned: false, wishlist: false, gamestatus: null });
  const mapKey = key || `app:${appId}`;
  let pending = enrichFetches.get(mapKey);
  if (pending) return pending;

  pending = (async () => {
    const country = settings.steamCountry || 'US';
    const [steam, userdata] = await Promise.all([
      appId
        ? fetchSteamByAppId(appId, country, { includeTags: false }).catch(() => ({ found: false }))
        : resolveSteamForGame({
            title,
            slug: key,
            country,
            includeTags: false,
          }).catch(() => ({ found: false })),
      fetchSteamUserdata().catch(() => null),
    ]);

    // Same switches as the rest of the script: with both GameStatus toggles off, never query or show it.
    const wantGameStatus = settings.showGameStatus || settings.showCardBadgeGameStatus !== false;
    let gamestatus = null;
    if (wantGameStatus && steam?.found && steam.appId != null) {
      gamestatus = await fetchGameStatus({
        appId: steam.appId,
        storeUrl: steam.storeUrl,
        name: steam.name,
        title: title || steam.name,
        pageSlug: key,
      }).catch(() => null);
    }

    let owned = false;
    let wishlist = false;
    if (userdata && steam?.found && steam.appId != null) {
      const id = Number(steam.appId);
      owned = userdata.owned.has(id);
      wishlist = !owned && userdata.wishlist.has(id);
    }

    return { steam, owned, wishlist, gamestatus };
  })().finally(() => {
    enrichFetches.delete(mapKey);
  });

  enrichFetches.set(mapKey, pending);
  return pending;
}

function clearCoverMark(cover) {
  if (!cover?.removeAttribute) return;
  cover.removeAttribute(MARK_ATTR);
  cover.removeAttribute(HOVER_ATTR);
  cover.removeAttribute(PRELOAD_ATTR);
  cover.querySelector('.blp-gmp-cover-spin')?.remove();
  cover.querySelector('.overflow-wrapper > .blp-gmp-cover-spin')?.remove();
}

function isEligibleCover(cover) {
  if (!cover || cover.nodeType !== 1) return false;
  if (isNestedCover(cover)) return Boolean(parseCardSlug(cover));
  if (!cover.classList?.contains('game-cover') && !cover.classList?.contains('blp-similar__cover')) {
    return false;
  }
  if (cover.closest(GMP_SKIP)) return false;
  if (cover.closest(CARD_SKIP_ANCESTOR) && !cover.matches(GMP_ALLOW_IN_GAME_PAGE)) {
    return false;
  }
  const slug = parseCardSlug(cover);
  return Boolean(slug);
}

function markCover(cover) {
  if (!isEligibleCover(cover)) {
    clearCoverMark(cover);
    return null;
  }
  const slug = parseCardSlug(cover);
  if (!slug) {
    clearCoverMark(cover);
    return null;
  }
  cover.setAttribute(MARK_ATTR, '1');
  return {
    cover,
    slug,
    title: parseCardTitle(cover, slug),
    appId: parseCardAppId(cover),
    coverHint: coverImgUrl(cover),
  };
}

function clearAllCoverMarks() {
  profileFetches.clear();
  document
    .querySelectorAll(`[${MARK_ATTR}], [${HOVER_ATTR}], [${PRELOAD_ATTR}], .blp-gmp-cover-spin`)
    .forEach((el) => {
      if (el.classList?.contains('blp-gmp-cover-spin')) {
        el.remove();
        return;
      }
      clearCoverMark(el);
    });
}

function stopGamePreload() {
  preloadObserver?.disconnect();
  preloadObserver = null;
}

function preloadSlug(slug) {
  const key = String(slug || '')
    .trim()
    .toLowerCase();
  if (!key) return;
  if (peekCachedGameMiniProfile(key) || preloadQueued.has(key)) return;
  preloadQueued.add(key);
  ensureProfileFetch(key);
}

function ensurePreloadObserver() {
  if (preloadObserver) return preloadObserver;
  preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cover = entry.target;
        preloadObserver.unobserve(cover);
        const slug = parseCardSlug(cover);
        if (!slug) continue;
        preloadSlug(slug);
      }
    },
    { rootMargin: GAME_PRELOAD_ROOT_MARGIN, threshold: 0.01 }
  );
  return preloadObserver;
}

function scheduleGamePreload() {
  if (settings.showGameMiniProfile === false || settings.preloadGameMiniProfile !== true) {
    stopGamePreload();
    return;
  }
  const obs = ensurePreloadObserver();
  document.querySelectorAll(`[${MARK_ATTR}]`).forEach((cover) => {
    if (cover.getAttribute(PRELOAD_ATTR) === '1') return;
    const slug = parseCardSlug(cover);
    if (!slug) return;
    if (peekCachedGameMiniProfile(slug)) {
      cover.setAttribute(PRELOAD_ATTR, '1');
      return;
    }
    cover.setAttribute(PRELOAD_ATTR, '1');
    obs.observe(cover);
  });
}

function decorateCovers(root = document) {
  if (settings.showGameMiniProfile === false) {
    clearAllCoverMarks();
    stopGamePreload();
    return;
  }
  const scope = root.querySelectorAll ? root : document;
  scope.querySelectorAll('.game-cover, .blp-similar__cover').forEach((cover) => {
    markCover(cover);
  });
  scheduleGamePreload();
}

const decorateCoversSoon = debounce(() => decorateCovers(), 120);

let trackSeq = 0;

/** Follow the card's height changes (animated blocks) so it stays centered / on screen. */
function trackPosition(cover, ms = 520) {
  const seq = ++trackSeq;
  const end = performance.now() + ms;
  const step = () => {
    if (seq !== trackSeq || activeCover !== cover || !popoverEl?.classList.contains('is-open')) {
      return;
    }
    positionPopover(cover);
    if (performance.now() < end) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function paintCard(cover, ctx, { soft = false } = {}) {
  const el = ensurePopover();
  const seq = ++paintSeq;
  const html = await renderCard(ctx);
  // A newer paint started while this one was rendering — it carries fresher data.
  if (seq !== paintSeq) return;
  el.classList.toggle('is-loading', Boolean(ctx.loadingProfile && !ctx.profile));
  // Soft = patch the already-open card in place (skeleton → data); no entrance replay.
  el.classList.toggle('is-updating', soft);
  if (soft) morphCard(el, html, '.blp-gmp__card');
  else el.innerHTML = html;
  openPopover(el);
  positionPopover(cover);
  trackPosition(cover);
}

async function showForCover(cover, { slug, title, appId, coverHint }) {
  const el = ensurePopover();
  if (activeCover && activeCover !== cover) activeCover.removeAttribute(HOVER_ATTR);
  cover.setAttribute(HOVER_ATTR, '1');
  activeCover = cover;
  activeSlug = slug;
  el.classList.toggle(NESTED_CLASS, isNestedCover(cover));
  const seq = ++fetchSeq;

  let profile = peekCachedGameMiniProfile(slug);
  let enrichState = { steam: null, owned: false, wishlist: false, gamestatus: null };
  let steamDone = false;

  const ctx = (extra = {}) => ({
    slug,
    titleHint: title,
    coverHint,
    profile,
    loadingProfile: !profile,
    loadingSteam: !steamDone,
    ...enrichState,
    ...extra,
  });

  await paintCard(cover, ctx());

  const profilePromise = ensureProfileFetch(slug);
  const enrichPromise = ensureSteamEnrich({ slug, title, appId });

  const maybeRepaint = async () => {
    if (seq !== fetchSeq || activeSlug !== slug) return;
    await paintCard(cover, ctx({ loadingProfile: !profile }), { soft: true });
  };

  enrichPromise.then(async (result) => {
    if (seq !== fetchSeq || activeSlug !== slug) return;
    enrichState = result;
    steamDone = true;
    await maybeRepaint();
  });

  profile = await profilePromise;
  if (seq !== fetchSeq || activeSlug !== slug) return;

  el.classList.remove('is-loading');
  if (!profile) {
    paintSeq += 1;
    el.classList.add('is-updating');
    el.innerHTML = renderError(slug, title);
    positionPopover(cover);
    requestAnimationFrame(() => positionPopover(cover));
    const result = await enrichPromise;
    if (seq !== fetchSeq || activeSlug !== slug) return;
    enrichState = result;
    steamDone = true;
    if (result?.steam?.found) {
      await paintCard(
        cover,
        {
          slug,
          titleHint: title,
          coverHint,
          profile: null,
          loadingProfile: false,
          loadingSteam: false,
          ...enrichState,
        },
        { soft: true }
      );
    }
    return;
  }

  await maybeRepaint();
}

function scheduleOpen(cover, hit) {
  window.clearTimeout(closeTimer);
  window.clearTimeout(openTimer);
  if (popoverEl?.classList.contains('is-leaving')) {
    popoverEl.classList.remove('is-leaving');
  }
  openTimer = window.setTimeout(() => {
    showForCover(cover, hit);
  }, GAME_HOVER_OPEN_MS);
}

function scheduleClose() {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    hidePopover();
  }, GAME_HOVER_CLOSE_MS);
}

function resolveCover(target) {
  if (!target || target.nodeType !== 1) return null;
  const nested = target.closest?.(NESTED_COVER);
  if (nested && isEligibleCover(nested)) return markCover(nested);
  if (target.closest?.(GMP_SKIP)) return null;
  const cover = target.closest?.('.game-cover, .blp-similar__cover');
  if (!cover || !isEligibleCover(cover)) return null;
  return markCover(cover);
}

function onPointerOver(e) {
  if (settings.showGameMiniProfile === false || triggerMode() !== 'hover') return;
  const hit = resolveCover(e.target);
  if (!hit) return;
  if (!peekCachedGameMiniProfile(hit.slug)) {
    ensureProfileFetch(hit.slug);
  }
  if (hit.cover === activeCover && popoverEl?.classList.contains('is-open')) {
    window.clearTimeout(closeTimer);
    return;
  }
  hit.cover.setAttribute(HOVER_ATTR, '1');
  scheduleOpen(hit.cover, hit);
}

function onPointerOut(e) {
  if (triggerMode() !== 'hover') return;
  const hit = resolveCover(e.target);
  if (!hit) return;
  const related = e.relatedTarget;
  if (related && (hit.cover.contains(related) || popoverEl?.contains(related))) return;
  hit.cover.removeAttribute(HOVER_ATTR);
  scheduleClose();
}

/** Right-click / Shift+click modes: open the card instead of the native menu / navigation. */
function onClickTrigger(e) {
  if (settings.showGameMiniProfile === false) return;
  const mode = triggerMode();
  if (mode === 'hover') return;
  if (mode === 'contextmenu') {
    if (e.type !== 'contextmenu' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
  } else if (
    e.type !== 'click' ||
    e.button !== 0 ||
    !e.shiftKey ||
    e.ctrlKey ||
    e.altKey ||
    e.metaKey
  ) {
    return;
  }
  const hit = resolveCover(e.target);
  if (!hit) return;
  e.preventDefault();
  e.stopPropagation();
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  showForCover(hit.cover, hit);
}

function onOutsidePointerDown(e) {
  if (triggerMode() === 'hover' || !popoverEl?.classList.contains('is-open')) return;
  if (popoverEl.contains(e.target)) return;
  hidePopover();
}

function onEscape(e) {
  if (e.key !== 'Escape' || triggerMode() === 'hover') return;
  if (!popoverEl?.classList.contains('is-open')) return;
  hidePopover();
}

function onScrollOrResize() {
  if (!popoverEl?.classList.contains('is-open') || !activeCover) return;
  if (!document.contains(activeCover)) {
    hidePopover({ immediate: true });
    return;
  }
  positionPopover(activeCover);
}

export function bindGameMiniProfiles() {
  if (settings.showGameMiniProfile === false) {
    hidePopover({ immediate: true });
    clearAllCoverMarks();
    stopGamePreload();
    return;
  }
  if (bound) return;
  bound = true;
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('contextmenu', onClickTrigger, true);
  document.addEventListener('click', onClickTrigger, true);
  document.addEventListener('pointerdown', onOutsidePointerDown, true);
  document.addEventListener('keydown', onEscape, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
}

export function scheduleGameMiniProfiles() {
  bindGameMiniProfiles();
  decorateCoversSoon();
}
