import {
  fetchUserProfile,
  isUserProfileRootHref,
  parseUsernameFromHref,
  peekCachedUserProfile,
  tierIdFromProfile,
} from '../api/user-profile.js';
import {
  PROFILE_FETCH_CONCURRENCY,
  PROFILE_HOVER_CLOSE_MS,
  PROFILE_HOVER_OPEN_MS,
  PROFILE_LEAVE_MS,
  PROFILE_PRELOAD_ROOT_MARGIN,
} from '../constants.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { debounce } from '../utils/debounce.js';

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
let inFlightFetches = 0;
const fetchQueue = [];
let preloadObserver = null;
const preloadQueued = new Set();
/** Lowercase usernames with an in-flight profile fetch (spinner on page avatars). */
const loadingUsernames = new Set();
/** Shared fetch promises keyed by lowercase username. */
const profileFetches = new Map();

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
  popoverEl.addEventListener('pointerleave', () => {
    scheduleClose();
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
  popoverEl.classList.remove('is-open', 'is-leaving', 'is-loading', 'is-ready');
  popoverEl.setAttribute('aria-hidden', 'true');
  popoverEl.innerHTML = '';
  activeAnchor = null;
  activeUsername = '';
}

function hidePopover({ immediate = false } = {}) {
  if (!popoverEl) return;
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
      return `<a class="blp-ump__cover" href="${escapeAttr(g.href)}" title="${escapeAttr(g.title)}" data-turbo-frame="_top">${img}</a>`;
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

function renderLoading(username) {
  const cached = peekCachedUserProfile(username);
  const tierId = cached ? tierIdFromProfile(cached) : 'rookie';
  return `
    <div class="blp-ump__card blp-ump__card--${escapeAttr(tierId)} is-skeleton" aria-busy="true">
      <div class="blp-ump__shine" aria-hidden="true"></div>
      <div class="blp-ump__foil" aria-hidden="true"></div>
      <div class="blp-ump__top">
        ${skelBone('blp-ump__bone--pill')}
        ${skelBone('blp-ump__bone--avg')}
      </div>
      <div class="blp-ump__avatar blp-ump__avatar--skel" aria-hidden="true">
        <span class="blp-ump__spinner blp-ump__spinner--avatar" aria-hidden="true"></span>
      </div>
      <div class="blp-ump__name blp-ump__name--skel">${escapeHtml(username)}</div>
      ${skelBone('blp-ump__bone--sub')}
      <div class="blp-ump__stats" aria-hidden="true">
        <div class="blp-ump__stat blp-ump__stat--skel">${skelBone('blp-ump__bone--stat-n')}${skelBone('blp-ump__bone--stat-l')}</div>
        <div class="blp-ump__stat blp-ump__stat--skel">${skelBone('blp-ump__bone--stat-n')}${skelBone('blp-ump__bone--stat-l')}</div>
        <div class="blp-ump__stat blp-ump__stat--skel">${skelBone('blp-ump__bone--stat-n')}${skelBone('blp-ump__bone--stat-l')}</div>
      </div>
      <div class="blp-ump__ratings blp-ump__ratings--skel" aria-hidden="true">
        ${Array.from({ length: 10 }, (_, i) => `<span class="blp-ump__bar blp-ump__bar--skel" style="--h:${18 + ((i * 17) % 70)}%; --d:${i * 0.05}s"></span>`).join('')}
      </div>
      <div class="blp-ump__section" aria-hidden="true">
        ${skelBone('blp-ump__bone--label')}
        <div class="blp-ump__covers" style="--ump-slots:5">
          ${Array.from({ length: 5 }, (_, i) => `<span class="blp-ump__cover blp-ump__cover--skel" style="--d:${0.12 + i * 0.06}s"></span>`).join('')}
        </div>
      </div>
      <div class="blp-ump__status">${escapeHtml(t.miniProfileLoading)}</div>
    </div>
  `;
}

function renderError(username) {
  return `
    <div class="blp-ump__card blp-ump__card--rookie">
      <div class="blp-ump__shine" aria-hidden="true"></div>
      <div class="blp-ump__name">${escapeHtml(username)}</div>
      <div class="blp-ump__status">${escapeHtml(t.miniProfileError)}</div>
      <a class="blp-ump__cta" href="/u/${escapeAttr(encodeURIComponent(username))}/" data-turbo-frame="_top">${escapeHtml(t.miniProfileViewProfile)}</a>
    </div>
  `;
}

function renderProfile(profile) {
  const tierId = tierIdFromProfile(profile);
  const bio = profile.bio
    ? `<p class="blp-ump__bio">${escapeHtml(profile.bio)}</p>`
    : '';
  const avg =
    profile.avgRating != null
      ? `<span class="blp-ump__avg" title="${escapeAttr(t.miniProfileAvgRating)}">${escapeHtml(String(profile.avgRating))}★</span>`
      : '';
  return `
    <div class="blp-ump__card blp-ump__card--${escapeAttr(tierId)}">
      <div class="blp-ump__shine" aria-hidden="true"></div>
      <div class="blp-ump__foil" aria-hidden="true"></div>
      <div class="blp-ump__top">
        <span class="blp-ump__tier-pill">${escapeHtml(tierLabel(tierId))}</span>
        ${avg}
      </div>
      <a class="blp-ump__avatar-link" href="${escapeAttr(profile.profileUrl)}" data-turbo-frame="_top">
        <div class="blp-ump__avatar">
          ${
            profile.avatarUrl
              ? `<img src="${escapeAttr(profile.avatarUrl)}" alt="" loading="lazy" decoding="async">`
              : ''
          }
        </div>
      </a>
      <a class="blp-ump__name" href="${escapeAttr(profile.profileUrl)}" data-turbo-frame="_top">${escapeHtml(profile.username)}</a>
      <div class="blp-ump__tier-sub">${escapeHtml(
        String(t.miniProfileTierSub || '').replace('{count}', formatCount(profile.gamesPlayed))
      )}</div>
      <div class="blp-ump__stats">
        <div class="blp-ump__stat">
          <strong>${escapeHtml(formatCount(profile.gamesPlayed))}</strong>
          <span>${escapeHtml(t.miniProfilePlayed)}</span>
        </div>
        <div class="blp-ump__stat">
          <strong>${escapeHtml(formatCount(profile.playedYear))}</strong>
          <span>${escapeHtml(t.miniProfileThisYear)}</span>
        </div>
        <div class="blp-ump__stat">
          <strong>${escapeHtml(formatCount(profile.backlog))}</strong>
          <span>${escapeHtml(t.miniProfileBacklog)}</span>
        </div>
      </div>
      ${ratingBarsHtml(profile.ratings)}
      ${bio}
      ${coversHtml(profile.favorites, t.miniProfileFavorites, 5)}
      ${coversHtml(profile.recent, t.miniProfileRecent, 4)}
      ${badgesHtml(profile.badges)}
      <a class="blp-ump__cta" href="${escapeAttr(profile.profileUrl)}" data-turbo-frame="_top">${escapeHtml(t.miniProfileViewProfile)}</a>
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

function setAvatarLoading(anchor, on) {
  if (!anchor?.setAttribute) return;
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

function isEligibleAvatarAnchor(anchor) {
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
  if (!anchor.querySelector('img')) return false;
  return Boolean(parseUsernameFromHref(href));
}

function markAvatarAnchor(anchor) {
  if (!isEligibleAvatarAnchor(anchor)) {
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
    // leave unmarked tier → default outline
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

function decorateAvatars(root = document) {
  if (settings.showUserMiniProfile === false) {
    clearAllAvatarMarks();
    stopProfilePreload();
    return;
  }
  const scope = root.querySelectorAll ? root : document;
  scope.querySelectorAll('a[href*="/u/"]').forEach((anchor) => {
    markAvatarAnchor(anchor);
  });
  scheduleProfilePreload();
}

const decorateAvatarsSoon = debounce(() => decorateAvatars(), 120);

async function showForAnchor(anchor, username) {
  const el = ensurePopover();
  activeAnchor = anchor;
  activeUsername = username;
  const seq = ++fetchSeq;

  const cached = peekCachedUserProfile(username);
  if (cached) {
    applyTierToUsername(username, tierIdFromProfile(cached));
    el.classList.remove('is-loading');
    el.innerHTML = renderProfile(cached);
    openPopover(el);
    positionPopover(anchor);
    requestAnimationFrame(() => positionPopover(anchor));
    return;
  }

  el.classList.add('is-loading');
  el.innerHTML = renderLoading(username);
  openPopover(el);
  positionPopover(anchor);

  const profile = await ensureProfileFetch(username);
  if (seq !== fetchSeq || activeUsername !== username) return;

  el.classList.remove('is-loading');
  el.classList.remove('is-ready');
  if (!profile) {
    el.innerHTML = renderError(username);
  } else {
    el.innerHTML = renderProfile(profile);
  }
  // Soft re-enter for content swap.
  void el.offsetWidth;
  requestAnimationFrame(() => {
    el.classList.add('is-ready');
    positionPopover(anchor);
  });
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

function resolveAvatarAnchor(target) {
  if (!target || target.nodeType !== 1) return null;
  if (target.closest?.(`#${POPOVER_ID}, .blp-ump, .blp-settings-backdrop, #primary-nav`)) {
    return null;
  }
  const anchor = target.closest?.('a[href*="/u/"]');
  if (!anchor || !isEligibleAvatarAnchor(anchor)) return null;
  const username = parseUsernameFromHref(anchor.getAttribute('href') || anchor.href);
  if (!username) return null;
  return { anchor, username };
}

function onPointerOver(e) {
  if (settings.showUserMiniProfile === false) return;
  const hit = resolveAvatarAnchor(e.target);
  if (!hit) return;
  markAvatarAnchor(hit.anchor);
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
  const hit = resolveAvatarAnchor(e.target);
  if (!hit) return;
  const related = e.relatedTarget;
  if (related && (hit.anchor.contains(related) || popoverEl?.contains(related))) return;
  hit.anchor.removeAttribute(HOVER_ATTR);
  scheduleClose();
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
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
}

export function scheduleUserMiniProfiles() {
  bindUserMiniProfiles();
  decorateAvatarsSoon();
}
