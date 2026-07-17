import { fetchGameStatus, getGsStatusLabel, getGsStatusType } from '../api/gamestatus.js';
import { fetchSteamUserdata, resolveSteamForGame } from '../api/steam.js';
import {
  CARD_ATTR,
  CARD_CONCURRENCY,
  CARD_ROOT_MARGIN,
  CARD_SKIP_ANCESTOR,
  CARD_STATE_ATTR,
  GAMESTATUS_SITE_BASE,
} from '../constants.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import {
  formatPriceText,
  formatReviewPercent,
  formatReviewPercentCompact,
  getPageContext,
  mcScoreTier,
  reviewScoreClass,
} from './enrichment.js';

export function cardBadgeToken() {
  return [
    settings.steamCountry || 'US',
    settings.showSteam ? 1 : 0,
    settings.showSteamOwned ? 1 : 0,
    settings.showSteamWishlist ? 1 : 0,
    settings.showGameStatus ? 1 : 0,
    settings.showCardBadges ? 1 : 0,
  ].join('|');
}

export function parseCardSlug(cover) {
  const roots = [
    cover,
    cover.parentElement,
    cover.closest('a[href*="/games/"]'),
    cover.closest('[game_id], .result, .col, .row'),
  ].filter(Boolean);
  for (const root of roots) {
    const link =
      root.matches?.('a[href*="/games/"]')
        ? root
        : root.querySelector?.('a[href*="/games/"]');
    const href = link?.getAttribute?.('href') || '';
    const m = href.match(/\/games\/([^/?#]+)/i);
    if (m) return m[1].toLowerCase();
  }
  return '';
}

export function parseCardTitle(cover, slug) {
  const img = cover.querySelector('img[alt]');
  if (img?.alt) return img.alt.trim();
  const nearby = cover
    .closest('.result, .row, .col, [game_id]')
    ?.querySelector('.game-name h3, h3, .game-name a');
  if (nearby?.textContent) {
    return nearby.textContent.replace(/\s+\d{4}\s*$/, '').trim();
  }
  return slug ? slug.replace(/-/g, ' ') : '';
}

export function ensureCardBadgeMount(cover) {
  let mount = cover.querySelector('.blp-card-badges');
  if (mount) return mount;
  const host = cover.querySelector('.overflow-wrapper') || cover;
  if (getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }
  mount = document.createElement('div');
  mount.className = 'blp-card-badges is-loading';
  mount.innerHTML = '<span class="blp-card-badge"></span><span class="blp-card-badge"></span>';
  host.appendChild(mount);
  return mount;
}

export function renderCardBadgesHtml({ steam, owned, wishlist, gamestatus }) {
  const chips = [];
  if (settings.showSteam !== false && steam?.found) {
    const priceText = formatPriceText(steam);
    if (priceText) {
      const discount =
        steam.price?.discount_percent > 0
          ? ` <span class="blp-card-badge--discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
          : '';
      chips.push(
        `<a class="blp-card-badge blp-card-badge--price" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}${discount}</a>`
      );
    }

    const reviewCompact = formatReviewPercentCompact(steam.reviews);
    const reviewFull = formatReviewPercent(steam.reviews);
    const reviewClass = reviewScoreClass(steam.reviews);
    if (reviewCompact) {
      chips.push(
        `<a class="blp-card-badge blp-card-badge--review ${escapeAttr(reviewClass)}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer" title="${escapeAttr(reviewFull || reviewCompact)}">${escapeHtml(reviewCompact)}</a>`
      );
    } else if (steam.metacritic?.score != null) {
      const mc = steam.metacritic.score;
      const tier = mcScoreTier(mc);
      chips.push(
        `<a class="blp-card-badge blp-card-badge--mc${tier ? ` blp-card-badge--mc-${tier}` : ''}" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(t.metacritic)}">${escapeHtml(String(mc))}</a>`
      );
    }
  }
  if (owned) {
    chips.push(`<span class="blp-card-badge blp-card-badge--owned">${escapeHtml(t.steamOwned)}</span>`);
  } else if (wishlist) {
    chips.push(
      `<span class="blp-card-badge blp-card-badge--wishlist">${escapeHtml(t.steamWishlist)}</span>`
    );
  }
  if (settings.showGameStatus && gamestatus && !gamestatus.missing && gamestatus.data) {
    const type = getGsStatusType(gamestatus.data);
    const label = getGsStatusLabel(gamestatus.data, type);
    const gsSlug = gamestatus.data.slug || gamestatus.slug;
    const href = gsSlug
      ? `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(gsSlug)}`
      : GAMESTATUS_SITE_BASE;
    chips.push(
      `<a class="blp-card-badge blp-card-badge--gs blp-gs-badge--${escapeAttr(type)}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
    );
  }
  return chips.join('');
}

const cardQueue = [];
export let cardActive = 0;
export let cardObserver = null;

export function pumpCardQueue() {
  while (cardActive < CARD_CONCURRENCY && cardQueue.length) {
    const job = cardQueue.shift();
    cardActive += 1;
    Promise.resolve()
      .then(job.fn)
      .then(job.resolve, job.reject)
      .finally(() => {
        cardActive -= 1;
        pumpCardQueue();
      });
  }
}

export function enqueueCardJob(fn) {
  return new Promise((resolve, reject) => {
    cardQueue.push({ fn, resolve, reject });
    pumpCardQueue();
  });
}

export function cardIsSettled(cover, token) {
  if (cover.getAttribute(CARD_ATTR) !== token) return false;
  const state = cover.getAttribute(CARD_STATE_ATTR);
  return state === 'done' || state === 'empty' || state === 'loading';
}

export function markCardState(cover, token, state) {
  cover.setAttribute(CARD_ATTR, token);
  cover.setAttribute(CARD_STATE_ATTR, state);
}

export function clearCardMarkers(cover) {
  cover.removeAttribute(CARD_ATTR);
  cover.removeAttribute(CARD_STATE_ATTR);
  cover.querySelector('.blp-card-badges')?.remove();
}

export async function enrichGameCard(cover) {
  const token = cardBadgeToken();
  if (cardIsSettled(cover, token)) return;

  const slug = parseCardSlug(cover);
  const title = parseCardTitle(cover, slug);
  if (!slug || !title) {
    clearCardMarkers(cover);
    markCardState(cover, token, 'empty');
    return;
  }

  markCardState(cover, token, 'loading');
  const mount = ensureCardBadgeMount(cover);
  mount.classList.add('is-loading');

  await enqueueCardJob(async () => {
    if (cover.getAttribute(CARD_ATTR) !== token) return;

    const needUserdata = settings.showSteamOwned || settings.showSteamWishlist;
    const [steam, userdata] = await Promise.all([
      resolveSteamForGame({
        title,
        slug,
        country: settings.steamCountry || 'US',
        includeTags: false,
      }).catch(() => ({ found: false })),
      needUserdata ? fetchSteamUserdata().catch(() => null) : Promise.resolve(null),
    ]);

    let gamestatus = null;
    if (settings.showGameStatus && steam?.found && steam.appId != null) {
      gamestatus = await fetchGameStatus({
        appId: steam.appId,
        storeUrl: steam.storeUrl,
        name: steam.name,
        title,
        pageSlug: slug,
      }).catch(() => null);
    }

    if (cover.getAttribute(CARD_ATTR) !== token) return;

    let owned = false;
    let wishlist = false;
    if (userdata && steam?.found && steam.appId != null) {
      const id = Number(steam.appId);
      owned = settings.showSteamOwned !== false && userdata.owned.has(id);
      wishlist =
        !owned &&
        settings.showSteamWishlist !== false &&
        userdata.wishlist.has(id);
    }

    const html = renderCardBadgesHtml({ steam, owned, wishlist, gamestatus });
    mount.classList.remove('is-loading');
    if (!html) {
      // Mark empty before DOM remove so MutationObserver → scanPage does not re-queue.
      markCardState(cover, token, 'empty');
      mount.remove();
      return;
    }
    mount.innerHTML = html;
    markCardState(cover, token, 'done');
  });
}

export function scheduleCardBadges(force = false) {
  if (!settings.showCardBadges) {
    document.querySelectorAll('.blp-card-badges').forEach((el) => el.remove());
    document.querySelectorAll(`[${CARD_ATTR}]`).forEach((el) => {
      el.removeAttribute(CARD_ATTR);
      el.removeAttribute(CARD_STATE_ATTR);
    });
    cardObserver?.disconnect();
    cardObserver = null;
    return;
  }

  const ctx = getPageContext();
  if (ctx.isGamePage) return;

  const token = cardBadgeToken();
  if (!cardObserver) {
    cardObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const cover = entry.target;
          cardObserver.unobserve(cover);
          enrichGameCard(cover);
        }
      },
      { rootMargin: CARD_ROOT_MARGIN }
    );
  }

  document.querySelectorAll('.game-cover').forEach((cover) => {
    if (cover.closest(CARD_SKIP_ANCESTOR)) return;
    if (!force && cardIsSettled(cover, token)) return;
    if (force) clearCardMarkers(cover);
    cardObserver.observe(cover);
  });
}
