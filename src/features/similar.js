import { getCacheSource } from '../cache.js';
import {
  CARD_APPID_ATTR,
  CARD_SLUG_ATTR,
  CARD_TITLE_ATTR,
  FAVICON_URL,
  SIMILAR_ATTR,
  STEAMDB_ATTR,
} from '../constants.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { slugifyForBackloggd } from '../utils/slug.js';
import { paintDebugCacheMark } from './debug-cache.js';
import { bindHorizontalTrack, gameStatsMountAnchor } from './steamdb-ui.js';

export function similarMountAnchor() {
  return (
    document.querySelector(`[${STEAMDB_ATTR}="gallery"]`) ||
    gameStatsMountAnchor()
  );
}

export function removeSimilarGamesUi() {
  document.querySelectorAll(`[${SIMILAR_ATTR}]`).forEach((el) => el.remove());
}

export function ensureSimilarMount(token = '') {
  if (!settings.showSimilarGames) {
    removeSimilarGamesUi();
    return null;
  }
  let host = document.querySelector(`[${SIMILAR_ATTR}]`);
  if (host) {
    if (token) host.setAttribute('data-blp-token', token);
    return host;
  }
  const anchor = similarMountAnchor();
  if (!anchor) return null;
  host = document.createElement('section');
  host.setAttribute(SIMILAR_ATTR, '1');
  host.className = 'blp-similar is-loading';
  if (token) host.setAttribute('data-blp-token', token);
  host.innerHTML = `
    <div class="blp-similar__head">
      <span class="blp-similar__title">${escapeHtml(t.similarGamesTitle)}</span>
    </div>
    <div class="blp-similar__track" data-blp-similar-track>
      <span class="blp-similar__skel" aria-hidden="true"></span>
      <span class="blp-similar__skel" aria-hidden="true"></span>
      <span class="blp-similar__skel" aria-hidden="true"></span>
      <span class="blp-similar__skel" aria-hidden="true"></span>
      <span class="blp-similar__skel" aria-hidden="true"></span>
    </div>
  `;
  anchor.insertAdjacentElement('afterend', host);
  bindHorizontalTrack(host.querySelector('[data-blp-similar-track]'));
  return host;
}

export function applySimilarGames(games, appId, token = '', { final = false } = {}) {
  if (!settings.showSimilarGames) {
    removeSimilarGamesUi();
    return;
  }
  if (!Array.isArray(games) || !games.length) {
    if (final) removeSimilarGamesUi();
    else ensureSimilarMount(token);
    return;
  }

  const host = ensureSimilarMount(token);
  if (!host) return;
  const readyKey = `${appId || ''}|${games.map((g) => `${g.appId}:${g.matchPct}`).join(',')}`;
  if (host.dataset.blpSimilarReady === '1' && host.dataset.blpSimilarKey === readyKey) {
    if (token) host.setAttribute('data-blp-token', token);
    paintDebugCacheMark(host, getCacheSource(games) || 'miss', {
      titleSelector: '.blp-similar__title',
    });
    return;
  }
  if (appId) host.setAttribute('data-blp-appid', String(appId));
  if (token) host.setAttribute('data-blp-token', token);
  host.dataset.blpSimilarReady = '1';
  host.dataset.blpSimilarKey = readyKey;
  paintDebugCacheMark(host, getCacheSource(games) || 'miss', {
    titleSelector: '.blp-similar__title',
  });

  const steamUrl = appId
    ? `https://store.steampowered.com/app/${appId}/`
    : 'https://store.steampowered.com/';
  const favicon = (domain) =>
    FAVICON_URL.replace('{domain}', encodeURIComponent(domain));

  const htmlCards = games
    .map((game) => {
      const href = escapeAttr(game.backloggdUrl || game.storeUrl || '#');
      const cover = escapeAttr(game.coverUrl || '');
      const name = escapeHtml(game.name);
      const pct = Math.max(0, Math.min(100, Number(game.matchPct) || 0));
      const tags = Array.isArray(game.sharedTags) ? game.sharedTags.filter(Boolean) : [];
      const tagsHtml = tags.length
        ? `<span class="blp-similar__tags">${escapeHtml(tags.join(' · '))}</span>`
        : '';
      const steamHref = escapeAttr(game.storeUrl || '');
      const steamBtn = steamHref
        ? `<a class="blp-similar__steam" href="${steamHref}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(t.similarGamesOpenSteam)}">
            <img src="${escapeAttr(favicon('store.steampowered.com'))}" alt="" width="14" height="14" loading="lazy" referrerpolicy="no-referrer" />
          </a>`
        : '';
      const appId = Number(game.appId);
      const appIdAttr =
        Number.isFinite(appId) && appId > 0
          ? ` ${CARD_APPID_ATTR}="${escapeAttr(String(appId))}"`
          : '';
      const slug =
        (game.backloggdUrl && game.backloggdUrl.match(/\/games\/([^/?#]+)/i)?.[1]) ||
        slugifyForBackloggd(game.name) ||
        '';
      const slugAttr = slug ? ` ${CARD_SLUG_ATTR}="${escapeAttr(slug)}"` : '';
      const titleAttr = game.name
        ? ` ${CARD_TITLE_ATTR}="${escapeAttr(game.name)}"`
        : '';
      return `
        <div class="blp-similar__card">
          <div class="blp-similar__cover"${appIdAttr}${slugAttr}${titleAttr}>
            <span class="blp-similar__badge">
              <span class="blp-similar__pct">${pct}%</span>
              <span class="blp-similar__match">${escapeHtml(t.similarGamesMatch)}</span>
            </span>
            ${steamBtn}
            <a class="blp-similar__hit" href="${href}" title="${escapeAttr(game.name)}" aria-label="${escapeAttr(game.name)}">
              ${cover ? `<img src="${cover}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : ''}
            </a>
          </div>
          <a class="blp-similar__meta" href="${href}" title="${escapeAttr(game.name)}">
            <span class="blp-similar__name">${name}</span>
            ${tagsHtml}
          </a>
        </div>
      `;
    })
    .join('');

  host.classList.remove('is-loading');
  host.innerHTML = `
    <div class="blp-similar__head">
      <span class="blp-similar__title">${escapeHtml(t.similarGamesTitle)}</span>
      <a class="blp-similar__link" href="${escapeAttr(steamUrl)}" target="_blank" rel="noopener noreferrer">Steam</a>
    </div>
    <div class="blp-similar__track" data-blp-similar-track>${htmlCards}</div>
  `;

  host.querySelectorAll('.blp-similar__cover img').forEach((img) => {
    const mark = () => img.classList.add('is-ready');
    if (img.complete && img.naturalWidth) mark();
    else {
      img.addEventListener('load', mark, { once: true });
      img.addEventListener('error', mark, { once: true });
    }
  });
  bindHorizontalTrack(host.querySelector('[data-blp-similar-track]'));
}
