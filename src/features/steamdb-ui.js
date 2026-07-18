import { steamCdnAsset } from '../api/steam.js';
import { STEAMDB_APP_URL, STEAMDB_ATTR } from '../constants.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import {
  bindSteamDbCoverGallery,
  buildSteamGalleryItems,
  closeSteamGalleryLightbox,
  openSteamGalleryLightbox,
  setSteamGalleryItems,
} from './gallery.js';
import { syncExportButton } from './export-game.js';

export function removeSteamDbUi() {
  closeSteamGalleryLightbox();
  setSteamGalleryItems([]);
  document.querySelectorAll(`[${STEAMDB_ATTR}]`).forEach((el) => el.remove());
}

export function desktopTitleHeading() {
  return (
    document.querySelector(
      '#game-body > div:nth-child(2) > div.row.d-none.d-sm-flex.mx-n1.game-title-section h1'
    ) ||
    document.querySelector(
      '#game-body .row.d-none.d-sm-flex.game-title-section h1'
    ) ||
    document.querySelector('#game-body .game-title-section.d-none.d-sm-flex h1')
  );
}

export function loggingSidebarMount() {
  return (
    document.querySelector('#logging-sidebar-section > div > div') ||
    document.querySelector('#logging-sidebar-section .col.col-md-5') ||
    document.querySelector('#logging-sidebar-section .col-md-5') ||
    document.querySelector('#logging-sidebar-section .col')
  );
}

export function isSteamLogoAsset(url) {
  return /(?:^|\/)logo\.(png|jpe?g)(?:$|\?)/i.test(String(url || ''));
}

export function revealSteamDbMediaImage(host, img, url) {
  if (!host || !img || !url) return;
  const current = img.getAttribute('src') || '';
  if (current === url && img.classList.contains('is-ready') && img.complete && img.naturalWidth) {
    host.classList.remove('is-loading');
    return;
  }

  const markReady = () => {
    if ((img.getAttribute('src') || '') !== url) return;
    img.classList.add('is-ready');
    host.classList.remove('is-loading');
  };

  // Same URL still loading — attach handler, don't restart fade/gen.
  if (current === url) {
    img.addEventListener('load', markReady, { once: true });
    if (img.complete && img.naturalWidth) markReady();
    return;
  }

  const upgrading = img.classList.contains('is-ready') && Boolean(current);
  const gen = String((Number(img.dataset.blpRevealGen || '0') || 0) + 1);
  img.dataset.blpRevealGen = gen;

  const markReadyGen = () => {
    if (img.dataset.blpRevealGen !== gen) return;
    markReady();
  };

  if (upgrading) {
    // Soft swap: fade out → new src → fade in, keep skeleton hidden.
    img.classList.remove('is-ready');
    window.setTimeout(() => {
      if (img.dataset.blpRevealGen !== gen) return;
      img.addEventListener('load', markReadyGen, { once: true });
      img.src = url;
      if (img.complete && img.naturalWidth) markReadyGen();
    }, 160);
    return;
  }

  img.classList.remove('is-ready');
  host.classList.add('is-loading');
  img.addEventListener('load', markReadyGen, { once: true });
  img.src = url;
  if (img.complete && img.naturalWidth) markReadyGen();
}

export function ensureSteamDbTitleIconMount(token = '') {
  if (!settings.showSteamDbIcon) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="icon"]`).forEach((el) => el.remove());
    return null;
  }
  let wrap = document.querySelector(`[${STEAMDB_ATTR}="icon"]`);
  if (wrap) {
    if (token) wrap.setAttribute('data-blp-token', token);
    return wrap;
  }
  const h1 = desktopTitleHeading();
  if (!h1) return null;
  wrap = document.createElement('span');
  wrap.setAttribute(STEAMDB_ATTR, 'icon');
  wrap.className = 'blp-title-icon-wrap is-loading';
  if (token) wrap.setAttribute('data-blp-token', token);
  wrap.innerHTML =
    '<span class="blp-title-icon-skel" aria-hidden="true"></span>' +
    '<img class="blp-title-icon" alt="" width="32" height="32" decoding="async" referrerpolicy="no-referrer" />';
  const img = wrap.querySelector('img');
  if (img) {
    img.addEventListener('error', () => {
      if (img.dataset.blpFallback === '1') {
        wrap.remove();
        return;
      }
      img.dataset.blpFallback = '1';
      const id = wrap.getAttribute('data-blp-appid');
      if (!id) {
        wrap.remove();
        return;
      }
      revealSteamDbMediaImage(wrap, img, steamCdnAsset(id, 'capsule_sm_120.jpg'));
    });
  }
  h1.insertAdjacentElement('afterbegin', wrap);
  return wrap;
}

export function ensureSteamDbCoverMount(token = '') {
  if (!settings.showSteamDbCover) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="cover"]`).forEach((el) => el.remove());
    return null;
  }
  let box = document.querySelector(`[${STEAMDB_ATTR}="cover"]`);
  if (box) {
    if (token) box.setAttribute('data-blp-token', token);
    return box;
  }
  const mount = loggingSidebarMount();
  if (!mount) return null;
  box = document.createElement('div');
  box.setAttribute(STEAMDB_ATTR, 'cover');
  box.className = 'blp-steamdb-cover is-loading';
  if (token) box.setAttribute('data-blp-token', token);
  box.innerHTML =
    '<span class="blp-steamdb-cover-skel" aria-hidden="true"></span>' +
    '<img alt="" decoding="async" referrerpolicy="no-referrer" />';
  const img = box.querySelector('img');
  if (img) {
    img.addEventListener('error', () => {
      const fallbacks = String(box.dataset.blpFallbacks || '')
        .split('\n')
        .filter(Boolean);
      let idx = Number(box.dataset.blpFallbackIdx || '0') + 1;
      box.dataset.blpFallbackIdx = String(idx);
      if (idx < fallbacks.length) {
        const next = fallbacks[idx];
        img.classList.toggle('blp-steamdb-cover__logo', isSteamLogoAsset(next));
        revealSteamDbMediaImage(box, img, next);
        return;
      }
      box.remove();
    });
  }
  mount.appendChild(box);
  return box;
}

export function mountSteamDbSkeletons(token = '') {
  ensureSteamDbTitleIconMount(token);
  ensureSteamDbCoverMount(token);
  syncExportButton(token);
  ensureSteamGalleryMount(token);
}

export function gameStatsMountAnchor() {
  return document.querySelector('turbo-frame#game-stats');
}

export function applyGameStatsVisibility() {
  const el = gameStatsMountAnchor();
  if (!el) return;
  if (settings.showGameStats === false) {
    el.setAttribute('data-blp-hide-game-stats', '1');
  } else {
    el.removeAttribute('data-blp-hide-game-stats');
  }
}

export function clearGameStatsVisibility() {
  document.querySelectorAll('[data-blp-hide-game-stats]').forEach((el) => {
    el.removeAttribute('data-blp-hide-game-stats');
  });
}

/** Keep horizontal strips scrollable inside the column (wheel + containment). */
export function bindHorizontalTrack(track) {
  if (!track || track.dataset.blpHScroll === '1') return;
  track.dataset.blpHScroll = '1';
  track.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (track.scrollWidth <= track.clientWidth + 1) return;
      const dy = e.deltaY;
      const dx = e.deltaX;
      // Prefer native horizontal trackpad gestures.
      if (Math.abs(dx) > Math.abs(dy)) return;
      if (!dy) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const next = Math.max(0, Math.min(maxScroll, track.scrollLeft + dy));
      if (next === track.scrollLeft) return;
      e.preventDefault();
      track.scrollLeft = next;
    },
    { passive: false }
  );
}

export function ensureSteamGalleryMount(token = '') {
  if (!settings.showSteamDbGallery) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="gallery"]`).forEach((el) => el.remove());
    return null;
  }
  let host = document.querySelector(`[${STEAMDB_ATTR}="gallery"]`);
  if (host) {
    if (token) host.setAttribute('data-blp-token', token);
    return host;
  }
  const anchor = gameStatsMountAnchor();
  if (!anchor) return null;
  host = document.createElement('section');
  host.setAttribute(STEAMDB_ATTR, 'gallery');
  host.className = 'blp-steam-gallery is-loading';
  if (token) host.setAttribute('data-blp-token', token);
  host.innerHTML = `
    <div class="blp-steam-gallery__head">
      <span class="blp-steam-gallery__title">${escapeHtml(t.steamGalleryTitle)}</span>
    </div>
    <div class="blp-steam-gallery__track" data-blp-gallery-track>
      <span class="blp-steam-gallery__skel" aria-hidden="true"></span>
      <span class="blp-steam-gallery__skel" aria-hidden="true"></span>
      <span class="blp-steam-gallery__skel" aria-hidden="true"></span>
      <span class="blp-steam-gallery__skel" aria-hidden="true"></span>
    </div>
  `;
  anchor.insertAdjacentElement('afterend', host);
  bindHorizontalTrack(host.querySelector('[data-blp-gallery-track]'));
  return host;
}

export function applySteamGallery(screenshots, appId, token = '', { final = false, coverUrl = '' } = {}) {
  if (!settings.showSteamDbGallery) {
    setSteamGalleryItems([]);
    document.querySelectorAll(`[${STEAMDB_ATTR}="gallery"]`).forEach((el) => el.remove());
    bindSteamDbCoverGallery([]);
    return;
  }

  const shotsPending = !Array.isArray(screenshots);
  const items = buildSteamGalleryItems(shotsPending ? [] : screenshots, coverUrl);
  // While screenshots load, still show the cover in the strip if we have it.
  if (shotsPending && !coverUrl) {
    ensureSteamGalleryMount(token);
    return;
  }
  if (!items.length) {
    setSteamGalleryItems([]);
    if (final) {
      document.querySelectorAll(`[${STEAMDB_ATTR}="gallery"]`).forEach((el) => el.remove());
    } else {
      ensureSteamGalleryMount(token);
    }
    bindSteamDbCoverGallery([]);
    return;
  }

  const host = ensureSteamGalleryMount(token);
  if (!host) return;
  const readyKey = `${appId || ''}|${items.length}|${items[0]?.full || ''}|${shotsPending ? 'p' : 'd'}`;
  if (host.dataset.blpGalleryReady === '1' && host.dataset.blpGalleryKey === readyKey) {
    if (token) host.setAttribute('data-blp-token', token);
    setSteamGalleryItems(items);
    bindSteamDbCoverGallery(items);
    return;
  }
  if (appId) host.setAttribute('data-blp-appid', String(appId));
  if (token) host.setAttribute('data-blp-token', token);
  host.dataset.blpGalleryReady = '1';
  host.dataset.blpGalleryKey = readyKey;
  host.dataset.blpGalleryCount = String(items.length);
  setSteamGalleryItems(items);

  const steamDbUrl = appId
    ? `${STEAMDB_APP_URL}/${appId}/screenshots/`
    : `${STEAMDB_APP_URL}/`;
  const htmlItems = items
    .map((shot, i) => {
      const src = escapeAttr(shot.thumb || shot.full);
      const coverClass = shot.kind === 'cover' ? ' blp-steam-gallery__item--cover' : '';
      return `
        <button type="button" class="blp-steam-gallery__item${coverClass}" data-blp-gallery-index="${i}" aria-label="${escapeAttr(t.steamGalleryOpen)}">
          <img src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        </button>
      `;
    })
    .join('');

  host.classList.remove('is-loading');
  host.innerHTML = `
    <div class="blp-steam-gallery__head">
      <span class="blp-steam-gallery__title">${escapeHtml(t.steamGalleryTitle)}</span>
      <a class="blp-steam-gallery__link" href="${escapeAttr(steamDbUrl)}" target="_blank" rel="noopener noreferrer">SteamDB</a>
    </div>
    <div class="blp-steam-gallery__track" data-blp-gallery-track>${htmlItems}</div>
  `;

  host.querySelectorAll('.blp-steam-gallery__item img').forEach((img) => {
    const mark = () => img.classList.add('is-ready');
    img.addEventListener('load', mark, { once: true });
    if (img.complete && img.naturalWidth) mark();
  });

  host.querySelectorAll('[data-blp-gallery-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-blp-gallery-index'));
      openSteamGalleryLightbox(items, idx);
    });
  });

  bindHorizontalTrack(host.querySelector('[data-blp-gallery-track]'));
  bindSteamDbCoverGallery(items);
}

export function injectSteamDbTitleIcon(url, appId, token = '') {
  if (!settings.showSteamDbIcon) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="icon"]`).forEach((el) => el.remove());
    return;
  }
  if (!url) return;
  const wrap = ensureSteamDbTitleIconMount(token);
  if (!wrap) return;
  if (appId) wrap.setAttribute('data-blp-appid', String(appId));
  const img = wrap.querySelector('img.blp-title-icon');
  if (!img) return;
  delete img.dataset.blpFallback;
  revealSteamDbMediaImage(wrap, img, url);
}

export function injectSteamDbCover(url, appId, { logoIsPortrait = false, token = '' } = {}) {
  if (!settings.showSteamDbCover) {
    document.querySelectorAll(`[${STEAMDB_ATTR}="cover"]`).forEach((el) => el.remove());
    return;
  }
  if (!url) return;
  const box = ensureSteamDbCoverMount(token);
  if (!box) return;

  const fallbacks = [];
  const push = (u) => {
    if (u && !fallbacks.includes(u)) fallbacks.push(u);
  };
  push(url);
  push(steamCdnAsset(appId, 'header.jpg'));
  push(steamCdnAsset(appId, 'library_600x900.jpg'));
  push(steamCdnAsset(appId, 'logo.png'));

  box.dataset.blpFallbacks = fallbacks.join('\n');
  box.dataset.blpFallbackIdx = '0';
  if (appId) box.setAttribute('data-blp-appid', String(appId));

  const img = box.querySelector('img');
  if (!img) return;
  const firstIsLogo = isSteamLogoAsset(fallbacks[0]) && !logoIsPortrait;
  img.classList.toggle('blp-steamdb-cover__logo', firstIsLogo);
  revealSteamDbMediaImage(box, img, fallbacks[0]);
}

export function applySteamDbUi(steamDb, token = '', { final = false } = {}) {
  if (!steamDb) {
    removeSteamDbUi();
    return;
  }
  // Keep skeleton mounts; only reveal when a URL is ready (empty URL = still loading).
  if (settings.showSteamDbIcon) ensureSteamDbTitleIconMount(token);
  if (settings.showSteamDbCover) ensureSteamDbCoverMount(token);
  injectSteamDbTitleIcon(steamDb.iconUrl, steamDb.appId, token);
  injectSteamDbCover(steamDb.logoUrl, steamDb.appId, {
    logoIsPortrait: Boolean(steamDb.logoIsPortrait),
    token,
  });
  syncExportButton(token);
  applySteamGallery(steamDb.screenshots, steamDb.appId, token, {
    final,
    coverUrl: steamDb.logoUrl || '',
  });
  if (
    steamDb.source === 'steamdb' &&
    steamDb.logoUrl &&
    isSteamLogoAsset(steamDb.logoUrl)
  ) {
    document
      .querySelector(`[${STEAMDB_ATTR}="cover"] img`)
      ?.classList.add('blp-steamdb-cover__logo');
  }
  if (token) {
    document.querySelectorAll(`[${STEAMDB_ATTR}]`).forEach((el) => {
      el.setAttribute('data-blp-token', token);
    });
  }
}
