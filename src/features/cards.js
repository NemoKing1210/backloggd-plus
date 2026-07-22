import { formatConvertedSalePair } from '../api/fx.js';
import { fetchGameStatus, getGsStatusLabel, getGsStatusType } from '../api/gamestatus.js';
import { fetchSteamByAppId, fetchSteamUserdata, resolveSteamForGame } from '../api/steam.js';
import {
  CARD_APPID_ATTR,
  CARD_ATTR,
  CARD_CONCURRENCY,
  CARD_ROOT_MARGIN,
  CARD_SKIP_ANCESTOR,
  CARD_SLUG_ATTR,
  CARD_STATE_ATTR,
  CARD_TITLE_ATTR,
  GAMESTATUS_SITE_BASE,
} from '../constants.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import {
  formatPriceText,
  formatReviewPercent,
  formatReviewPercentCompact,
  mcScoreTier,
  reviewScoreClass,
} from './enrichment.js';
import { getPageContext } from './page.js';

export function cardBadgeToken() {
  return [
    settings.steamCountry || 'US',
    settings.showPriceConvert ? 1 : 0,
    settings.convertCurrency || 'RUB',
    settings.showCardBadges ? 1 : 0,
    settings.showCardBadgePrice !== false ? 1 : 0,
    settings.showCardBadgeReview !== false ? 1 : 0,
    settings.showCardBadgeOwned !== false ? 1 : 0,
    settings.showCardBadgeWishlist !== false ? 1 : 0,
    settings.showCardBadgeGameStatus !== false ? 1 : 0,
  ].join('|');
}

export function anyCardBadgeTypeEnabled() {
  return (
    settings.showCardBadgePrice !== false ||
    settings.showCardBadgeReview !== false ||
    settings.showCardBadgeOwned !== false ||
    settings.showCardBadgeWishlist !== false ||
    settings.showCardBadgeGameStatus !== false
  );
}

export function parseCardSlug(cover) {
  const fromAttr = cover.getAttribute?.(CARD_SLUG_ATTR);
  if (fromAttr) return fromAttr.toLowerCase();
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
  const fromAttr = cover.getAttribute?.(CARD_TITLE_ATTR);
  if (fromAttr) return fromAttr.trim();
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

export function parseCardAppId(cover) {
  const raw = cover.getAttribute?.(CARD_APPID_ATTR);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
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

export async function renderCardBadgesHtml({ steam, owned, wishlist, gamestatus }) {
  const chips = [];
  if (steam?.found) {
    if (settings.showCardBadgePrice !== false) {
      const priceText = formatPriceText(steam);
      if (priceText) {
        const discount =
          steam.price?.discount_percent > 0
            ? ` <span class="blp-card-badge--discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>`
            : '';
        let fx = '';
        if (settings.showPriceConvert && steam.price && !steam.isFree) {
          const pair = await formatConvertedSalePair(
            steam.price,
            settings.convertCurrency || 'RUB'
          );
          if (pair?.now) {
            if (pair.was) {
              fx = ` <span class="blp-card-badge--fx"><span class="blp-card-badge--fx-now">~ ${escapeHtml(pair.now)}</span><span class="blp-card-badge--fx-was">~ ${escapeHtml(pair.was)}</span></span>`;
            } else {
              fx = ` <span class="blp-card-badge--fx">~ ${escapeHtml(pair.now)}</span>`;
            }
          }
        }
        chips.push(
          `<a class="blp-card-badge blp-card-badge--price" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}${discount}${fx}</a>`
        );
      }
    }

    if (settings.showCardBadgeReview !== false) {
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
  }
  if (owned && settings.showCardBadgeOwned !== false) {
    chips.push(`<span class="blp-card-badge blp-card-badge--owned">${escapeHtml(t.steamOwned)}</span>`);
  } else if (wishlist && settings.showCardBadgeWishlist !== false) {
    chips.push(
      `<span class="blp-card-badge blp-card-badge--wishlist">${escapeHtml(t.steamWishlist)}</span>`
    );
  }
  if (
    settings.showCardBadgeGameStatus !== false &&
    gamestatus &&
    !gamestatus.missing &&
    gamestatus.data
  ) {
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

export function clearAllCardBadges() {
  document.querySelectorAll('.blp-card-badges').forEach((el) => el.remove());
  document.querySelectorAll(`[${CARD_ATTR}]`).forEach((el) => {
    el.removeAttribute(CARD_ATTR);
    el.removeAttribute(CARD_STATE_ATTR);
  });
}

export async function enrichGameCard(cover) {
  const token = cardBadgeToken();
  if (cardIsSettled(cover, token)) return;

  if (!anyCardBadgeTypeEnabled()) {
    clearCardMarkers(cover);
    markCardState(cover, token, 'empty');
    return;
  }

  const knownAppId = parseCardAppId(cover);
  const slug = parseCardSlug(cover);
  const title = parseCardTitle(cover, slug);
  if (!knownAppId && (!slug || !title)) {
    clearCardMarkers(cover);
    markCardState(cover, token, 'empty');
    return;
  }

  markCardState(cover, token, 'loading');
  const mount = ensureCardBadgeMount(cover);
  mount.classList.add('is-loading');

  await enqueueCardJob(async () => {
    if (cover.getAttribute(CARD_ATTR) !== token) return;

    const needUserdata =
      settings.showCardBadgeOwned !== false || settings.showCardBadgeWishlist !== false;
    const needGameStatus = settings.showCardBadgeGameStatus !== false;
    const country = settings.steamCountry || 'US';

    const [steam, userdata] = await Promise.all([
      knownAppId
        ? fetchSteamByAppId(knownAppId, country, { includeTags: false }).catch(() => ({
            found: false,
          }))
        : resolveSteamForGame({
            title,
            slug,
            country,
            includeTags: false,
          }).catch(() => ({ found: false })),
      needUserdata ? fetchSteamUserdata().catch(() => null) : Promise.resolve(null),
    ]);

    let gamestatus = null;
    if (needGameStatus && steam?.found && steam.appId != null) {
      gamestatus = await fetchGameStatus({
        appId: steam.appId,
        storeUrl: steam.storeUrl,
        name: steam.name,
        title: title || steam.name,
        pageSlug: slug,
      }).catch(() => null);
    }

    if (cover.getAttribute(CARD_ATTR) !== token) return;

    let owned = false;
    let wishlist = false;
    if (userdata && steam?.found && steam.appId != null) {
      const id = Number(steam.appId);
      owned = settings.showCardBadgeOwned !== false && userdata.owned.has(id);
      wishlist =
        !owned &&
        settings.showCardBadgeWishlist !== false &&
        userdata.wishlist.has(id);
    }

    const html = await renderCardBadgesHtml({ steam, owned, wishlist, gamestatus });
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

export function collectCardCovers() {
  const ctx = getPageContext();
  const covers = [];
  if (ctx.isGamePage) {
    document.querySelectorAll(`.blp-similar__cover[${CARD_APPID_ATTR}]`).forEach((cover) => {
      covers.push(cover);
    });
    return covers;
  }
  document.querySelectorAll('.game-cover').forEach((cover) => {
    if (cover.closest(CARD_SKIP_ANCESTOR)) return;
    covers.push(cover);
  });
  return covers;
}

export function scheduleCardBadges(force = false) {
  if (!settings.showCardBadges || !anyCardBadgeTypeEnabled()) {
    clearAllCardBadges();
    cardObserver?.disconnect();
    cardObserver = null;
    return;
  }

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

  collectCardCovers().forEach((cover) => {
    if (!force && cardIsSettled(cover, token)) return;
    if (force) clearCardMarkers(cover);
    cardObserver.observe(cover);
  });
}
