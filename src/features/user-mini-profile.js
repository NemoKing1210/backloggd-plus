import {
  fetchUserProfile,
  isUserProfileRootHref,
  parseUsernameFromHref,
  peekCachedUserProfile,
  tierIdFromProfile,
} from '../api/user-profile.js';
import {
  CARD_SLUG_ATTR,
  CARD_TITLE_ATTR,
  PROFILE_FETCH_CONCURRENCY,
  PROFILE_HOVER_CLOSE_MS,
  PROFILE_HOVER_OPEN_MS,
  PROFILE_LEAVE_MS,
  PROFILE_PRELOAD_ROOT_MARGIN,
} from '../constants.js';
import { normalizeMiniProfileTrigger } from '../settings.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { morphCard } from '../utils/card-morph.js';
import { debounce } from '../utils/debounce.js';
import { closeNestedGameMiniProfile, isInsideGameMiniProfile } from './game-mini-profile.js';

const HOVER_ATTR = 'data-blp-profile-hover';
const MARK_ATTR = 'data-blp-ump';
const TIER_ATTR = 'data-blp-ump-tier';
const PRELOAD_ATTR = 'data-blp-ump-preload';
const LOADING_ATTR = 'data-blp-ump-loading';
const AVATAR_SPIN_CLASS = 'blp-ump-avatar-spin';
const POPOVER_ID = 'blp-user-mini-profile';

let bound = false;
let openTimer = 0;
let closeTimer = 0;
let leaveTimer = 0;
let leaveHandler = null;
let activeAnchor = null;
let activeUsername = '';
let popoverEl = null;
let fetchSeq = 0;
let trackSeq = 0;
let inFlightFetches = 0;
const fetchQueue = [];
let preloadObserver = null;
const preloadQueued = new Set();
/** Lowercase usernames with an in-flight profile fetch (spinner on page avatars). */
const loadingUsernames = new Set();
/** Shared fetch promises keyed by lowercase username. */
const profileFetches = new Map();

function triggerMode() {
  return normalizeMiniProfileTrigger(settings.userMiniProfileTrigger);
}

function tiersEnabled() {
  return settings.userMiniProfileTiers !== false;
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

function formatCount(n) {
  const v = Number(n) || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v);
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
    if (inFlightFetches < PROFILE_FETCH_CONCURRENCY) run();
    else fetchQueue.push(run);
  });
}

function ensurePopover() {
  if (popoverEl && document.body.contains(popoverEl)) return popoverEl;
  popoverEl = document.createElement('div');
  popoverEl.id = POPOVER_ID;
  popoverEl.className = 'blp-ump';
  popoverEl.setAttribute('role', 'dialog');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.addEventListener('pointerenter', () => {
    window.clearTimeout(closeTimer);
  });
  popoverEl.addEventListener('pointerleave', (e) => {
    // The nested game card belongs to this card — moving onto it is not leaving.
    if (isInsideGameMiniProfile(e.relatedTarget)) return;
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
  popoverEl.classList.remove('is-open', 'is-leaving', 'is-ready', 'is-updating');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.innerHTML = '';
  activeAnchor?.removeAttribute?.(HOVER_ATTR);
  activeAnchor = null;
  activeUsername = '';
}

function hidePopover({ immediate = false } = {}) {
  if (!popoverEl) return;
  closeNestedGameMiniProfile({ immediate });
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
  popoverEl.classList.remove('is-open', 'is-ready');
  popoverEl.setAttribute('aria-hidden', 'true');

  leaveHandler = (e) => {
    if (e.target !== popoverEl) return;
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    finishHidePopover();
  };
  popoverEl.addEventListener('transitionend', leaveHandler);
  leaveTimer = window.setTimeout(finishHidePopover, PROFILE_LEAVE_MS);
}

function openPopover(el) {
  window.clearTimeout(leaveTimer);
  if (leaveHandler) {
    el.removeEventListener('transitionend', leaveHandler);
    leaveHandler = null;
  }
  el.classList.remove('is-leaving');
  // Restart enter transition when reopening mid-leave.
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
  const pad = 10;
  const cardW = el.offsetWidth || 300;
  const cardH = el.offsetHeight || 420;
  let left = rect.right + pad;
  let top = rect.top + rect.height / 2 - cardH / 2;

  if (left + cardW > window.innerWidth - 12) {
    left = rect.left - cardW - pad;
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

function ratingBarsHtml(ratings) {
  if (!Array.isArray(ratings) || !ratings.length) return '';
  const maxH = Math.max(...ratings.map((r) => r.height || 0), 1);
  const bars = ratings
    .map((r) => {
      const h = Math.max(6, Math.round(((r.height || 0) / maxH) * 100));
      const title = `${r.count} · ${r.stars}★`;
      return `<span class="blp-ump__bar" style="--h:${h}%" title="${escapeAttr(title)}"></span>`;
    })
    .join('');
  return `<div class="blp-ump__ratings" aria-hidden="true">${bars}</div>`;
}

function coversHtml(games, label, slots = 5) {
  if (!Array.isArray(games) || !games.length) return '';
  const items = games
    .map((g) => {
      const img = g.coverUrl
        ? `<img src="${escapeAttr(g.coverUrl)}" alt="" loading="lazy" decoding="async">`
        : `<span class="blp-ump__cover-ph"></span>`;
      const slugAttr = g.slug ? ` ${CARD_SLUG_ATTR}="${escapeAttr(g.slug)}"` : '';
      const titleAttr = g.title ? ` ${CARD_TITLE_ATTR}="${escapeAttr(g.title)}"` : '';
      return `<a class="blp-ump__cover" href="${escapeAttr(g.href)}" title="${escapeAttr(g.title)}"${slugAttr}${titleAttr} data-turbo-frame="_top">${img}</a>`;
    })
    .join('');
  return `<div class="blp-ump__section"><div class="blp-ump__section-label">${escapeHtml(label)}</div><div class="blp-ump__covers" style="--ump-slots:${slots}">${items}</div></div>`;
}

function badgesHtml(badges) {
  if (!Array.isArray(badges) || !badges.length) return '';
  const items = badges
    .map((b) => {
      const tip = [b.title, b.desc].filter(Boolean).join(' — ');
      const img = b.imageUrl
        ? `<img src="${escapeAttr(b.imageUrl)}" alt="" loading="lazy">`
        : '';
      return `<span class="blp-ump__badge" title="${escapeAttr(tip)}">${img}</span>`;
    })
    .join('');
  return `<div class="blp-ump__section"><div class="blp-ump__section-label">${escapeHtml(t.miniProfileBadges)}</div><div class="blp-ump__badges">${items}</div></div>`;
}

function skelBone(extraClass = '') {
  return `<span class="blp-ump__bone ${extraClass}" aria-hidden="true"></span>`;
}

function coversSkeleton(label, slots) {
  const covers = Array.from(
    { length: slots },
    (_, i) => `<span class="blp-ump__cover blp-ump__cover--skel" style="--d:${0.12 + i * 0.06}s"></span>`
  ).join('');
  return `<div class="blp-ump__section" aria-hidden="true"><div class="blp-ump__section-label">${escapeHtml(label)}</div><div class="blp-ump__covers" style="--ump-slots:${slots}">${covers}</div></div>`;
}

function profileUrlFor(ctx) {
  return ctx.profile?.profileUrl || `/u/${encodeURIComponent(ctx.username)}/`;
}

function renderTop(ctx) {
  const { profile, loading } = ctx;
  const tiers = tiersEnabled();
  if (loading) {
    return `<div class="blp-ump__top">${tiers ? skelBone('blp-ump__bone--pill') : ''}${skelBone('blp-ump__bone--avg')}</div>`;
  }
  if (!profile) return '';
  const pill = tiers
    ? `<span class="blp-ump__tier-pill">${escapeHtml(tierLabel(tierIdFromProfile(profile)))}</span>`
    : '';
  const avg =
    profile.avgRating != null
      ? `<span class="blp-ump__avg" title="${escapeAttr(t.miniProfileAvgRating)}">${escapeHtml(String(profile.avgRating))}★</span>`
      : '';
  if (!pill && !avg) return '';
  return `<div class="blp-ump__top">${pill}${avg}</div>`;
}

function renderIdentity(ctx) {
  const { profile, loading } = ctx;
  const name = escapeHtml(profile?.username || ctx.username);
  const url = escapeAttr(profileUrlFor(ctx));
  const nameLink = `<a class="blp-ump__name" href="${url}" data-turbo-frame="_top">${name}</a>`;
  if (!loading && !profile) return `<div class="blp-ump__identity">${nameLink}</div>`;

  const avatar = loading
    ? `<div class="blp-ump__avatar blp-ump__avatar--skel" aria-hidden="true"><span class="blp-ump__spinner blp-ump__spinner--avatar"></span></div>`
    : `<div class="blp-ump__avatar">${
        profile.avatarUrl
          ? `<img src="${escapeAttr(profile.avatarUrl)}" alt="" loading="lazy" decoding="async">`
          : ''
      }</div>`;
  const sub = loading
    ? skelBone('blp-ump__bone--sub')
    : escapeHtml(String(t.miniProfileTierSub || '').replace('{count}', formatCount(profile.gamesPlayed)));
  return `
    <div class="blp-ump__identity">
      <a class="blp-ump__avatar-link" href="${url}" data-turbo-frame="_top">${avatar}</a>
      ${nameLink}
      <div class="blp-ump__tier-sub">${sub}</div>
    </div>
  `;
}

function renderStats(ctx) {
  const { profile, loading } = ctx;
  if (!loading && !profile) return '';
  const rows = [
    [profile?.gamesPlayed, t.miniProfilePlayed],
    [profile?.playedYear, t.miniProfileThisYear],
    [profile?.backlog, t.miniProfileBacklog],
  ];
  // Labels are known up front, so only the numbers are skeletons (and the labels never re-render).
  const stats = rows
    .map(([value, label]) => {
      const num = loading ? skelBone('blp-ump__bone--stat-n') : escapeHtml(formatCount(value));
      return `<div class="blp-ump__stat"><strong>${num}</strong><span>${escapeHtml(label)}</span></div>`;
    })
    .join('');
  return `<div class="blp-ump__stats">${stats}</div>`;
}

function renderRatings(ctx) {
  if (ctx.loading) {
    const bars = Array.from(
      { length: 10 },
      (_, i) => `<span class="blp-ump__bar blp-ump__bar--skel" style="--h:${18 + ((i * 17) % 70)}%; --d:${i * 0.05}s"></span>`
    ).join('');
    return `<div class="blp-ump__ratings" aria-hidden="true">${bars}</div>`;
  }
  return ratingBarsHtml(ctx.profile?.ratings);
}

function renderBio(ctx) {
  const bio = ctx.profile?.bio;
  return bio ? `<p class="blp-ump__bio">${escapeHtml(bio)}</p>` : '';
}

function renderFavorites(ctx) {
  if (ctx.loading) return coversSkeleton(t.miniProfileFavorites, 5);
  return coversHtml(ctx.profile?.favorites, t.miniProfileFavorites, 5);
}

function renderRecent(ctx) {
  return coversHtml(ctx.profile?.recent, t.miniProfileRecent, 4);
}

function renderBadges(ctx) {
  return badgesHtml(ctx.profile?.badges);
}

function renderStatus(ctx) {
  if (ctx.loading || ctx.profile) return '';
  return `<div class="blp-ump__status">${escapeHtml(t.miniProfileError)}</div>`;
}

function renderCta(ctx) {
  return `<a class="blp-ump__cta" href="${escapeAttr(profileUrlFor(ctx))}" data-turbo-frame="_top">${escapeHtml(t.miniProfileViewProfile)}</a>`;
}

/** Ordered section renderers — extend here without touching hover lifecycle. */
const SECTIONS = [
  { id: 'top', render: renderTop },
  { id: 'identity', render: renderIdentity },
  { id: 'stats', render: renderStats },
  { id: 'ratings', render: renderRatings },
  { id: 'bio', render: renderBio },
  { id: 'favorites', render: renderFavorites },
  { id: 'recent', render: renderRecent },
  { id: 'badges', render: renderBadges },
  { id: 'status', render: renderStatus },
  { id: 'cta', render: renderCta },
];

/**
 * One card for every state (skeleton / profile / error): the same sections in the same order, so
 * a soft update only changes what actually differs.
 */
function renderCard(ctx) {
  const tiers = tiersEnabled();
  // Tiers off (or still loading / failed) → the neutral Rookie skin.
  const tierId = tiers && ctx.profile ? tierIdFromProfile(ctx.profile) : 'rookie';
  const parts = [];
  for (const section of SECTIONS) {
    const html = section.render(ctx);
    // Wrapper gives each block a stable identity so soft updates can morph it in place.
    if (html) parts.push(`<div class="blp-ump__sec" data-sec="${section.id}">${html}</div>`);
  }
  return `
    <div class="blp-ump__card blp-ump__card--${escapeAttr(tierId)}${tiers ? '' : ' blp-ump__card--plain'}">
      <div class="blp-ump__shine" aria-hidden="true"></div>
      <div class="blp-ump__foil" aria-hidden="true"></div>
      ${parts.join('')}
    </div>
  `;
}

function avatarSpinHost(anchor) {
  return (
    anchor.querySelector('.overflow-wrapper') ||
    anchor.querySelector('img')?.parentElement ||
    anchor
  );
}

function hasAvatarImage(anchor) {
  return Boolean(anchor?.querySelector?.('img'));
}

function setAvatarLoading(anchor, on) {
  if (!anchor?.setAttribute) return;
  // Username-only links have no avatar to overlay — skip spinner chrome.
  if (!hasAvatarImage(anchor)) {
    if (!on) anchor.removeAttribute(LOADING_ATTR);
    return;
  }
  const host = avatarSpinHost(anchor);
  if (on) {
    anchor.setAttribute(LOADING_ATTR, '1');
    if (!host.querySelector(`.${AVATAR_SPIN_CLASS}`)) {
      const spin = document.createElement('span');
      spin.className = AVATAR_SPIN_CLASS;
      spin.setAttribute('aria-hidden', 'true');
      host.appendChild(spin);
    }
    return;
  }
  anchor.removeAttribute(LOADING_ATTR);
  host.querySelector(`.${AVATAR_SPIN_CLASS}`)?.remove();
  // Also clear a spin left on the anchor from an earlier host choice.
  if (host !== anchor) anchor.querySelector(`.${AVATAR_SPIN_CLASS}`)?.remove();
}

function applyLoadingToUsername(username, on) {
  const want = String(username || '').toLowerCase();
  if (!want) return;
  document.querySelectorAll(`a[${MARK_ATTR}]`).forEach((anchor) => {
    const name = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
    if (name.toLowerCase() === want) setAvatarLoading(anchor, on);
  });
}

function setUsernameLoading(username, on) {
  const key = String(username || '')
    .trim()
    .toLowerCase();
  if (!key) return;
  if (on) {
    if (loadingUsernames.has(key)) {
      applyLoadingToUsername(username, true);
      return;
    }
    loadingUsernames.add(key);
    applyLoadingToUsername(username, true);
    return;
  }
  if (!loadingUsernames.has(key)) return;
  loadingUsernames.delete(key);
  applyLoadingToUsername(username, false);
}

function ensureProfileFetch(username) {
  const name = String(username || '').trim();
  if (!name) return Promise.resolve(null);
  const key = name.toLowerCase();
  const cached = peekCachedUserProfile(name);
  if (cached) {
    setUsernameLoading(name, false);
    return Promise.resolve(cached);
  }
  let pending = profileFetches.get(key);
  if (pending) {
    setUsernameLoading(name, true);
    return pending;
  }
  setUsernameLoading(name, true);
  pending = enqueueFetch(() => fetchUserProfile(name))
    .then((profile) => {
      if (profile) applyTierToUsername(name, tierIdFromProfile(profile));
      return profile;
    })
    .finally(() => {
      profileFetches.delete(key);
      setUsernameLoading(name, false);
    });
  profileFetches.set(key, pending);
  return pending;
}

function clearAvatarMark(anchor) {
  if (!anchor?.removeAttribute) return;
  setAvatarLoading(anchor, false);
  anchor.removeAttribute(MARK_ATTR);
  anchor.removeAttribute(TIER_ATTR);
  anchor.removeAttribute(HOVER_ATTR);
  anchor.removeAttribute(PRELOAD_ATTR);
}

/** Root `/u/{user}` links — avatars and username text (e.g. `.username-link`). */
function isEligibleProfileAnchor(anchor) {
  if (!anchor || anchor.nodeType !== 1) return false;
  if (anchor.closest(`#${POPOVER_ID}, .blp-ump, .blp-settings-backdrop, #primary-nav, #profile-header`)) {
    return false;
  }
  // Achievement badges link to /u/{user}/badges/ and contain an <img> — skip those.
  if (anchor.closest('.badge-tooltip, .badges, .backlog-badge-cus-col, .badge-image')) {
    return false;
  }
  const href = anchor.getAttribute('href') || anchor.href || '';
  if (!isUserProfileRootHref(href)) return false;
  return Boolean(parseUsernameFromHref(href));
}

function markProfileAnchor(anchor) {
  if (!isEligibleProfileAnchor(anchor)) {
    clearAvatarMark(anchor);
    return null;
  }
  const username = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
  if (!username) {
    clearAvatarMark(anchor);
    return null;
  }
  anchor.setAttribute(MARK_ATTR, '1');
  const cached = peekCachedUserProfile(username);
  if (cached) {
    anchor.setAttribute(TIER_ATTR, tierIdFromProfile(cached));
    setAvatarLoading(anchor, false);
  } else if (!anchor.hasAttribute(TIER_ATTR)) {
    // leave unmarked tier → default outline (avatars only; CSS targets img)
  }
  if (loadingUsernames.has(username.toLowerCase())) {
    setAvatarLoading(anchor, true);
  }
  return { anchor, username };
}

function applyTierToUsername(username, tierId) {
  const want = String(username || '').toLowerCase();
  if (!want || !tierId) return;
  document.querySelectorAll(`a[${MARK_ATTR}]`).forEach((anchor) => {
    const name = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
    if (name.toLowerCase() === want) {
      anchor.setAttribute(TIER_ATTR, tierId);
    }
  });
}

function clearAllAvatarMarks() {
  loadingUsernames.clear();
  profileFetches.clear();
  document
    .querySelectorAll(
      `a[${MARK_ATTR}], a[${TIER_ATTR}], a[${HOVER_ATTR}], a[${PRELOAD_ATTR}], a[${LOADING_ATTR}]`
    )
    .forEach(clearAvatarMark);
}

function stopProfilePreload() {
  preloadObserver?.disconnect();
  preloadObserver = null;
}

function preloadUsername(username) {
  const name = String(username || '').trim();
  if (!name) return;
  const key = name.toLowerCase();
  if (peekCachedUserProfile(name) || preloadQueued.has(key)) return;
  preloadQueued.add(key);
  ensureProfileFetch(name);
}

function ensurePreloadObserver() {
  if (preloadObserver) return preloadObserver;
  preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const anchor = entry.target;
        preloadObserver.unobserve(anchor);
        const username = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
        if (!username) continue;
        preloadUsername(username);
      }
    },
    { rootMargin: PROFILE_PRELOAD_ROOT_MARGIN, threshold: 0.01 }
  );
  return preloadObserver;
}

function scheduleProfilePreload() {
  if (settings.showUserMiniProfile === false || settings.preloadUserMiniProfile !== true) {
    stopProfilePreload();
    return;
  }
  const obs = ensurePreloadObserver();
  document.querySelectorAll(`a[${MARK_ATTR}]`).forEach((anchor) => {
    if (anchor.getAttribute(PRELOAD_ATTR) === '1') return;
    const username = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
    if (!username) return;
    const cached = peekCachedUserProfile(username);
    if (cached) {
      applyTierToUsername(username, tierIdFromProfile(cached));
      anchor.setAttribute(PRELOAD_ATTR, '1');
      return;
    }
    anchor.setAttribute(PRELOAD_ATTR, '1');
    obs.observe(anchor);
  });
}

function decorateProfileAnchors(root = document) {
  if (settings.showUserMiniProfile === false) {
    clearAllAvatarMarks();
    stopProfilePreload();
    return;
  }
  const scope = root.querySelectorAll ? root : document;
  scope.querySelectorAll('a[href*="/u/"]').forEach((anchor) => {
    markProfileAnchor(anchor);
  });
  scheduleProfilePreload();
}

const decorateProfileAnchorsSoon = debounce(() => decorateProfileAnchors(), 120);

/** Follow the card's height changes (animated blocks) so it stays beside the anchor / on screen. */
function trackPosition(anchor, ms = 520) {
  const seq = ++trackSeq;
  const end = performance.now() + ms;
  const step = () => {
    if (seq !== trackSeq || activeAnchor !== anchor || !popoverEl?.classList.contains('is-open')) {
      return;
    }
    positionPopover(anchor);
    if (performance.now() < end) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function paintCard(anchor, ctx, { soft = false } = {}) {
  const el = ensurePopover();
  const html = renderCard(ctx);
  if (ctx.loading) {
    el.setAttribute('aria-busy', 'true');
    el.setAttribute('aria-label', t.miniProfileLoading);
  } else {
    el.removeAttribute('aria-busy');
    el.removeAttribute('aria-label');
  }
  // Soft = patch the already-open card in place (skeleton → data); no entrance replay.
  el.classList.toggle('is-updating', soft);
  if (soft) morphCard(el, html, '.blp-ump__card');
  else el.innerHTML = html;
  openPopover(el);
  positionPopover(anchor);
  trackPosition(anchor);
}

async function showForAnchor(anchor, username) {
  ensurePopover();
  // Re-rendering the card replaces its covers, so a game card opened from them would be orphaned.
  closeNestedGameMiniProfile({ immediate: true });
  if (activeAnchor && activeAnchor !== anchor) activeAnchor.removeAttribute(HOVER_ATTR);
  anchor.setAttribute(HOVER_ATTR, '1');
  activeAnchor = anchor;
  activeUsername = username;
  const seq = ++fetchSeq;

  const cached = peekCachedUserProfile(username);
  if (cached) applyTierToUsername(username, tierIdFromProfile(cached));
  paintCard(anchor, { username, profile: cached, loading: !cached });
  if (cached) return;

  const profile = await ensureProfileFetch(username);
  // Superseded, or the card was closed while loading (it may still be fading out).
  if (seq !== fetchSeq || activeUsername !== username || !popoverEl?.classList.contains('is-open')) {
    return;
  }
  paintCard(anchor, { username, profile, loading: false }, { soft: true });
}

function scheduleOpen(anchor, username) {
  window.clearTimeout(closeTimer);
  window.clearTimeout(openTimer);
  // Cancel an in-progress leave immediately when user re-hovers.
  if (popoverEl?.classList.contains('is-leaving')) {
    popoverEl.classList.remove('is-leaving');
  }
  openTimer = window.setTimeout(() => {
    showForAnchor(anchor, username);
  }, PROFILE_HOVER_OPEN_MS);
}

function scheduleClose() {
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    hidePopover();
  }, PROFILE_HOVER_CLOSE_MS);
}

function resolveProfileAnchor(target) {
  if (!target || target.nodeType !== 1) return null;
  if (target.closest?.(`#${POPOVER_ID}, .blp-ump, .blp-settings-backdrop, #primary-nav`)) {
    return null;
  }
  const anchor = target.closest?.('a[href*="/u/"]');
  if (!anchor || !isEligibleProfileAnchor(anchor)) return null;
  const username = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
  if (!username) return null;
  return { anchor, username };
}

function onPointerOver(e) {
  if (settings.showUserMiniProfile === false || triggerMode() !== 'hover') return;
  // Pointer reached the nested game card: keep this card open.
  if (isInsideGameMiniProfile(e.target)) {
    window.clearTimeout(closeTimer);
    return;
  }
  const hit = resolveProfileAnchor(e.target);
  if (!hit) return;
  markProfileAnchor(hit.anchor);
  // Start fetch immediately so the avatar spinner shows even before the card opens,
  // and keeps spinning if the pointer leaves mid-load.
  if (!peekCachedUserProfile(hit.username)) {
    ensureProfileFetch(hit.username);
  }
  if (hit.anchor === activeAnchor && popoverEl?.classList.contains('is-open')) {
    window.clearTimeout(closeTimer);
    return;
  }
  hit.anchor.setAttribute(HOVER_ATTR, '1');
  scheduleOpen(hit.anchor, hit.username);
}

function onPointerOut(e) {
  if (triggerMode() !== 'hover') return;
  // Leaving the nested game card for somewhere other than this card closes this card too.
  if (isInsideGameMiniProfile(e.target)) {
    const to = e.relatedTarget;
    if (!to || (!popoverEl?.contains(to) && !isInsideGameMiniProfile(to))) scheduleClose();
    return;
  }
  const hit = resolveProfileAnchor(e.target);
  if (!hit) return;
  const related = e.relatedTarget;
  if (related && (hit.anchor.contains(related) || popoverEl?.contains(related))) return;
  hit.anchor.removeAttribute(HOVER_ATTR);
  scheduleClose();
}

/** Right-click / Shift+click modes: open the card instead of the native menu / navigation. */
function onClickTrigger(e) {
  if (settings.showUserMiniProfile === false) return;
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
  const hit = resolveProfileAnchor(e.target);
  if (!hit) return;
  markProfileAnchor(hit.anchor);
  e.preventDefault();
  e.stopPropagation();
  window.clearTimeout(openTimer);
  window.clearTimeout(closeTimer);
  showForAnchor(hit.anchor, hit.username);
}

function onOutsidePointerDown(e) {
  if (triggerMode() === 'hover' || !popoverEl?.classList.contains('is-open')) return;
  if (popoverEl.contains(e.target) || isInsideGameMiniProfile(e.target)) return;
  hidePopover();
}

function onEscape(e) {
  if (e.key !== 'Escape' || triggerMode() === 'hover') return;
  if (!popoverEl?.classList.contains('is-open')) return;
  hidePopover();
}

function onScrollOrResize() {
  if (!popoverEl?.classList.contains('is-open') || !activeAnchor) return;
  if (!document.contains(activeAnchor)) {
    hidePopover({ immediate: true });
    return;
  }
  positionPopover(activeAnchor);
}

export function bindUserMiniProfiles() {
  if (settings.showUserMiniProfile === false) {
    hidePopover({ immediate: true });
    clearAllAvatarMarks();
    stopProfilePreload();
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

export function scheduleUserMiniProfiles() {
  bindUserMiniProfiles();
  decorateProfileAnchorsSoon();
}
