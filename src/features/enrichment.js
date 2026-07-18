import { fetchGameStatus, renderGameStatusValues } from '../api/gamestatus.js';
import { fetchHltb, formatHoursCompact } from '../api/hltb.js';
import { fetchOpenCritic } from '../api/opencritic.js';
import { fetchProtonDb } from '../api/protondb.js';
import {
  fetchSteamDbExtras,
  fetchSteamSimilarGames,
  fetchSteamUserdata,
  resolveSteamForGame,
  steamCategoryUrl,
  steamTagUrl,
} from '../api/steam.js';
import { getCacheSource, getSteamOverride, mergeCacheSources } from '../cache.js';
import {
  ENRICH_ATTR,
  FAVICON_URL,
  GAMESTATUS_SITE_BASE,
  GOGDB_SITE,
  ITAD_SITE,
  PCGW_SITE,
  SCRIPT_VERSION,
  STEAMDB_APP_URL,
  STEAM_USERDATA_URL,
} from '../constants.js';
import { fmt } from '../i18n/index.js';
import { isLinkEnabled } from '../settings.js';
import { settings, t } from '../state.js';
import { escapeAttr, escapeHtml } from '../utils/html.js';
import { metacriticGameUrl } from '../utils/slug.js';
import { bindGameCoverViewer, unbindGameCoverViewer } from './gallery.js';
import { applySimilarGames, ensureSimilarMount, removeSimilarGamesUi } from './similar.js';
import {
  applyGameStatsVisibility,
  applySteamDbUi,
  clearGameStatsVisibility,
  mountSteamDbSkeletons,
  removeSteamDbUi,
} from './steamdb-ui.js';
import { syncExportButton, removeExportUi } from './export-game.js';
import { ensureUnifiedRatingWidget, updateUnifiedRatingWidget } from './unified-rating.js';
import { getIgdbUrl, getPageContext, getGameTitle } from './page.js';
import { cacheSourceLabel, paintDebugCacheMark } from './debug-cache.js';

export { getPageContext, getGameTitle, getIgdbUrl } from './page.js';
export { cacheSourceLabel, paintDebugCacheMark } from './debug-cache.js';

export function mcScoreTier(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  if (n >= 75) return 'high';
  if (n >= 50) return 'mid';
  return 'low';
}

export function renderMetacriticBadge(score, url) {
  const tier = mcScoreTier(score);
  const cls = `blp-mc-badge${tier ? ` blp-mc-badge--${tier}` : ''}`;
  const label = escapeHtml(String(score));
  if (url) {
    return `<a class="${cls} blp-ext-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }
  return `<span class="${cls}">${label}</span>`;
}

export function ocTierClass(tier) {
  const key = String(tier || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  if (key === 'mighty') return 'blp-oc-badge--mighty';
  if (key === 'strong') return 'blp-oc-badge--strong';
  if (key === 'fair') return 'blp-oc-badge--fair';
  if (key === 'weak') return 'blp-oc-badge--weak';
  return '';
}

export function renderOpenCriticValues(oc) {
  if (!oc || oc.missing || !oc.tier) return '';
  const cls = `blp-oc-badge ${ocTierClass(oc.tier)}`.trim();
  return `<span class="blp-oc-chips"><a class="${cls} blp-ext-link" href="${escapeAttr(oc.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(oc.tier)}</a></span>`;
}

export function renderHltbValues(hltb) {
  if (!hltb || hltb.missing) return '';
  const chips = [];
  const main = formatHoursCompact(hltb.main);
  const extra = formatHoursCompact(hltb.extra);
  const complete = formatHoursCompact(hltb.complete);
  if (main) {
    chips.push(
      `<a class="blp-hltb-chip blp-ext-link" href="${escapeAttr(hltb.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fmt(t.hltbMain, { n: main }))}</a>`
    );
  }
  if (extra) {
    chips.push(
      `<a class="blp-hltb-chip blp-ext-link" href="${escapeAttr(hltb.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fmt(t.hltbExtra, { n: extra }))}</a>`
    );
  }
  if (complete) {
    chips.push(
      `<a class="blp-hltb-chip blp-ext-link" href="${escapeAttr(hltb.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fmt(t.hltbComplete, { n: complete }))}</a>`
    );
  }
  return chips.length ? `<span class="blp-hltb-chips">${chips.join('')}</span>` : '';
}

export function deckCompatLabel(category) {
  const cat = Number(category);
  if (cat === 3) return { key: 'verified', label: t.deckVerified, cls: 'blp-deck-badge--verified' };
  if (cat === 2) return { key: 'playable', label: t.deckPlayable, cls: 'blp-deck-badge--playable' };
  if (cat === 1) return { key: 'unsupported', label: t.deckUnsupported, cls: 'blp-deck-badge--unsupported' };
  if (cat === 0) return { key: 'unknown', label: t.deckUnknown, cls: 'blp-deck-badge--unknown' };
  return null;
}

export function protonTierClass(tier) {
  const key = String(tier || '').toLowerCase();
  if (key === 'platinum') return 'blp-proton-badge--platinum';
  if (key === 'gold') return 'blp-proton-badge--gold';
  if (key === 'silver') return 'blp-proton-badge--silver';
  if (key === 'bronze') return 'blp-proton-badge--bronze';
  if (key === 'borked') return 'blp-proton-badge--borked';
  return '';
}

export function renderDeckProtonValues({ steam, proton }) {
  const parts = [];
  const deck = deckCompatLabel(steam?.deckCompat);
  if (deck) {
    const href = steam?.appId
      ? `https://store.steampowered.com/app/${steam.appId}/`
      : steam?.storeUrl || '#';
    parts.push(
      `<a class="blp-deck-badge ${deck.cls} blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" title="Steam Deck">${escapeHtml(deck.label)}</a>`
    );
  }
  if (proton?.tier) {
    const tierLabel = proton.tier.charAt(0).toUpperCase() + proton.tier.slice(1);
    const cls = `blp-proton-badge ${protonTierClass(proton.tier)}`.trim();
    parts.push(
      `<a class="${cls} blp-ext-link" href="${escapeAttr(proton.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fmt(t.protonTier, { tier: tierLabel }))}</a>`
    );
  }
  return parts.length ? `<span class="blp-deck-proton-chips">${parts.join('')}</span>` : '';
}

export function resolveFranchise(steam, steamDb) {
  return steam?.franchise || steamDb?.franchise || null;
}

export function resolveSystems(steam, steamDb) {
  return steam?.systems || steamDb?.systems || null;
}

export function renderFranchiseValues(franchise) {
  if (!franchise?.name) return '';
  const href = franchise.url || '#';
  return `<a class="blp-sdb-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(franchise.name)}</a>`;
}

export function renderSystemsValues(systems, { appId = null } = {}) {
  if (!systems) return '';
  const parts = [];
  const list = Array.isArray(systems.list) ? systems.list.filter(Boolean) : [];
  const href = appId ? `${STEAMDB_APP_URL}/${appId}/` : `${STEAMDB_APP_URL}/`;
  for (const os of list) {
    parts.push(
      `<a class="blp-sdb-os" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(os)}</a>`
    );
  }
  const deck = deckCompatLabel(systems.deckCompat);
  if (deck) {
    parts.push(
      `<a class="blp-deck-badge ${deck.cls} blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" title="Steam Deck">${escapeHtml(fmt(t.steamDeckStatus, { status: deck.label }))}</a>`
    );
  }
  return parts.length ? `<span class="blp-sdb-value-row">${parts.join('')}</span>` : '';
}

export function renderTechnologiesValues(technologies) {
  const list = Array.isArray(technologies) ? technologies.filter((x) => x?.name) : [];
  if (!list.length) return '';
  return `<span class="blp-sdb-value-row">${list
    .map((tech) => {
      const href = tech.url || '#';
      return `<a class="blp-sdb-tech" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tech.name)}</a>`;
    })
    .join('')}</span>`;
}

export function formatLastRecordUpdate(update) {
  if (!update) return '';
  const iso = update.iso;
  if (iso) {
    const ms = Date.parse(iso);
    if (Number.isFinite(ms)) {
      try {
        return new Date(ms).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });
      } catch (_) {
        /* fall through */
      }
    }
  }
  return String(update.label || '').trim();
}

export function renderLastRecordUpdateValues(update, { appId = null } = {}) {
  const label = formatLastRecordUpdate(update);
  if (!label) return '';
  const href = appId ? `${STEAMDB_APP_URL}/${appId}/` : `${STEAMDB_APP_URL}/`;
  return `<a class="blp-sdb-link blp-sdb-link--muted" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function steamDbFact(label, valueHtml, key = '') {
  if (!valueHtml) return '';
  const keyAttr = key ? ` data-blp-sdb="${escapeAttr(key)}"` : '';
  return `<div class="blp-sdb-fact"${keyAttr}>
    <span class="blp-sdb-fact__label">${escapeHtml(label)}</span>
    <span class="blp-sdb-fact__value">${valueHtml}</span>
  </div>`;
}

/** Franchise / Systems / Technologies / Last Record Update with SteamDB-style labels. */
export function renderSteamDbValues(steam, steamDb) {
  const appId = steam?.appId || steamDb?.appId || null;
  const facts = [
    steamDbFact(t.franchise, renderFranchiseValues(resolveFranchise(steam, steamDb)), 'franchise'),
    steamDbFact(
      t.supportedSystems,
      renderSystemsValues(resolveSystems(steam, steamDb), { appId }),
      'systems'
    ),
    steamDbFact(t.technologies, renderTechnologiesValues(steamDb?.technologies), 'technologies'),
    steamDbFact(
      t.lastRecordUpdate,
      renderLastRecordUpdateValues(steamDb?.lastRecordUpdate, { appId }),
      'lastRecordUpdate'
    ),
  ].filter(Boolean);

  if (!facts.length) return '';
  return `<div class="blp-sdb-facts">${facts.join('')}</div>`;
}

export function reviewScoreClass(summary) {
  const score = Number(summary?.review_score);
  if (!Number.isFinite(score) || score <= 0) {
    // Fallback from positive % when score is missing
    if (!summary?.total_reviews) return '';
    const pct = (summary.total_positive / summary.total_reviews) * 100;
    if (pct >= 80) return 'blp-review--very-positive';
    if (pct >= 70) return 'blp-review--mostly-positive';
    if (pct >= 40) return 'blp-review--mixed';
    return 'blp-review--mostly-negative';
  }
  const map = {
    1: 'blp-review--overwhelmingly-negative',
    2: 'blp-review--very-negative',
    3: 'blp-review--negative',
    4: 'blp-review--mostly-negative',
    5: 'blp-review--mixed',
    6: 'blp-review--mostly-positive',
    7: 'blp-review--positive',
    8: 'blp-review--very-positive',
    9: 'blp-review--overwhelming',
  };
  return map[score] || '';
}

export function formatReviewPercent(summary) {
  if (!summary || !summary.total_reviews) return null;
  const pct = Math.round((summary.total_positive / summary.total_reviews) * 100);
  const desc = summary.review_score_desc || '';
  return desc ? `${desc} (${pct}%)` : `${pct}%`;
}

export function formatReviewPercentCompact(summary) {
  if (!summary || !summary.total_reviews) return null;
  return `${Math.round((summary.total_positive / summary.total_reviews) * 100)}%`;
}

export function faviconForUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return FAVICON_URL.replace('{domain}', encodeURIComponent(host));
  } catch (_) {
    return '';
  }
}

export function formatPriceText(steam) {
  if (!steam?.found) return null;
  if (steam.isFree) return t.free;
  if (!steam.price) return null;
  let priceText = steam.price.final_formatted || '';
  if (!priceText && Number.isFinite(steam.price.final)) {
    priceText = (steam.price.final / 100).toFixed(2);
    if (steam.price.currency) priceText = `${priceText} ${steam.price.currency}`;
  }
  return priceText || null;
}

export function formatOriginalPriceText(steam) {
  if (!steam?.price || !(steam.price.discount_percent > 0)) return null;
  let text = steam.price.initial_formatted || '';
  if (!text && Number.isFinite(steam.price.initial)) {
    text = (steam.price.initial / 100).toFixed(2);
    if (steam.price.currency) text = `${text} ${steam.price.currency}`;
  }
  if (!text) return null;
  const finalText = formatPriceText(steam);
  if (finalText && text === finalText) return null;
  return text;
}

export function renderSteamPriceHtml(steam) {
  const priceText = formatPriceText(steam);
  if (!priceText) return '';

  const onSale = steam.price?.discount_percent > 0;
  if (!onSale) {
    return `<a class="game-details-value blp-ext-link blp-price" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(priceText)}</a>`;
  }

  const original = formatOriginalPriceText(steam);
  const endsLabel = formatDiscountEndDate(steam.discountEndDate);
  const wasHtml = original
    ? `<span class="blp-price__was">${escapeHtml(original)}</span>`
    : '';
  const endsHtml = endsLabel
    ? `<span class="blp-discount-ends">${escapeHtml(fmt(t.discountEnds, { date: endsLabel }))}</span>`
    : '';

  return `<a class="game-details-value blp-ext-link blp-price blp-price--sale" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">
    <span class="blp-discount">${escapeHtml(fmt(t.discount, { n: steam.price.discount_percent }))}</span>
    <span class="blp-price__stack">${wasHtml}<span class="blp-price__now">${escapeHtml(priceText)}</span></span>
    ${endsHtml}
  </a>`;
}

export function formatDiscountEndDate(unixSeconds) {
  const sec = Number(unixSeconds);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  try {
    return new Date(sec * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return null;
  }
}

export function buildExternalLinks({ title, slug, igdbUrl, steam }) {
  const q = encodeURIComponent(title || slug || '');
  const links = [];
  if (igdbUrl) links.push({ key: 'igdb', label: t.linkIgdb, url: igdbUrl });
  if (steam?.storeUrl) {
    links.push({ key: 'steam', label: t.linkSteam, url: steam.storeUrl });
  } else if (q) {
    links.push({
      key: 'steam',
      label: t.linkSteam,
      url: `https://store.steampowered.com/search/?term=${q}`,
    });
  }
  if (steam?.appId) {
    links.push({
      key: 'steamdb',
      label: t.linkSteamDb,
      url: `https://steamdb.info/app/${steam.appId}/`,
    });
  } else if (q) {
    links.push({
      key: 'steamdb',
      label: t.linkSteamDb,
      url: `https://steamdb.info/search/?a=app&q=${q}`,
    });
  }
  const mcUrl = metacriticGameUrl(title, slug);
  if (mcUrl) {
    links.push({ key: 'metacritic', label: t.linkMetacritic, url: mcUrl });
  }
  if (q) {
    links.push({
      key: 'opencritic',
      label: t.linkOpencritic,
      url: `https://opencritic.com/search?q=${q}`,
    });
    links.push({
      key: 'hltb',
      label: t.linkHltb,
      url: `https://howlongtobeat.com/?q=${q}`,
    });
    links.push({
      key: 'pcgamingwiki',
      label: t.linkPcgamingwiki,
      url: `${PCGW_SITE}/wiki/Special:Search?search=${q}`,
    });
    if (steam?.appId) {
      links.push({
        key: 'itad',
        label: t.linkItad,
        url: `${ITAD_SITE}/steam/app/${steam.appId}/`,
      });
    } else {
      links.push({
        key: 'itad',
        label: t.linkItad,
        url: `${ITAD_SITE}/search/?q=${q}`,
      });
    }
    links.push({
      key: 'gogdb',
      label: t.linkGogdb,
      url: `${GOGDB_SITE}/?q=${q}`,
    });
  }
  return links.filter((l) => isLinkEnabled(l.key, settings));
}

export function removeEnrichment() {
  document.querySelectorAll(`[${ENRICH_ATTR}]`).forEach((el) => el.remove());
  document.querySelectorAll('[data-blp-debug]').forEach((el) => el.remove());
  removeSteamDbUi();
  removeExportUi({ includeLogEditor: false });
  removeSimilarGamesUi();
  unbindGameCoverViewer();
  clearGameStatsVisibility();
}

export function makeDetailRow(key, headerText) {
  const row = document.createElement('div');
  row.className = 'row mt-2';
  row.setAttribute(ENRICH_ATTR, key);
  row.innerHTML = `
    <div class="col-3 col-md-2 my-auto">
      <p class="game-details-header">${escapeHtml(headerText)}</p>
    </div>
    <div class="col-auto col-md ml-auto my-auto text-right text-md-left" data-blp-values></div>
  `;
  return row;
}

export function skeletonHtml(kind) {
  if (kind === 'links') {
    return [0, 1, 2, 3, 4]
      .map(() => '<span class="blp-skeleton blp-skeleton--link"></span>')
      .join('');
  }
  if (kind === 'steam') {
    return `
      <span class="blp-skeleton blp-skeleton--sm"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--lg"></span>
    `;
  }
  if (kind === 'metacritic') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
  if (kind === 'opencritic') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
  if (kind === 'hltb') {
    return `
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
    `;
  }
  if (kind === 'deckproton') {
    return `
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
    `;
  }
  if (kind === 'players') return '<span class="blp-skeleton blp-skeleton--sm"></span>';
  if (kind === 'steamdb') {
    return `
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--sm"></span>
      <span class="blp-skeleton blp-skeleton--md"></span>
    `;
  }
  if (kind === 'gamestatus') {
    return `
      <span class="blp-skeleton blp-skeleton--md"></span>
      <span class="blp-skeleton blp-skeleton--sm"></span>
    `;
  }
  return '<span class="blp-skeleton blp-skeleton--md"></span>';
}

export function ensureEnrichmentRows() {
  const platforms = document.querySelector('#game-body #game-page-platforms, #game-page-platforms');
  if (!platforms) return null;

  let anchor = platforms;
  const existing = document.querySelector(`[${ENRICH_ATTR}]`);
  if (existing) {
    return {
      steam: document.querySelector(`[${ENRICH_ATTR}="steam"]`),
      steamdb: document.querySelector(`[${ENRICH_ATTR}="steamdb"]`),
      metacritic: document.querySelector(`[${ENRICH_ATTR}="metacritic"]`),
      opencritic: document.querySelector(`[${ENRICH_ATTR}="opencritic"]`),
      hltb: document.querySelector(`[${ENRICH_ATTR}="hltb"]`),
      deckproton: document.querySelector(`[${ENRICH_ATTR}="deckproton"]`),
      players: document.querySelector(`[${ENRICH_ATTR}="players"]`),
      gamestatus: document.querySelector(`[${ENRICH_ATTR}="gamestatus"]`),
      links: document.querySelector(`[${ENRICH_ATTR}="links"]`),
    };
  }

  const rows = {};
  const plan = [];
  if (settings.showSteam) plan.push(['steam', t.steam]);
  if (settings.showSteamDbDetails !== false) plan.push(['steamdb', t.linkSteamDb]);
  if (settings.showMetacritic) plan.push(['metacritic', t.metacritic]);
  if (settings.showOpenCritic) plan.push(['opencritic', t.openCritic]);
  if (settings.showHltb) plan.push(['hltb', t.hltb]);
  if (settings.showDeckProton) plan.push(['deckproton', t.deckProton]);
  if (settings.showSteamPlayers) plan.push(['players', t.players]);
  if (settings.showGameStatus) plan.push(['gamestatus', t.gameStatus]);
  if (settings.showLinks) plan.push(['links', t.links]);

  for (const [key, label] of plan) {
    const row = makeDetailRow(key, label);
    row.querySelector('[data-blp-values]').innerHTML = skeletonHtml(key);
    anchor.insertAdjacentElement('afterend', row);
    anchor = row;
    rows[key] = row;
  }
  return rows;
}

export function setRowValues(row, html) {
  const slot = row?.querySelector('[data-blp-values]');
  if (slot) slot.innerHTML = html;
}

export function hideRow(row) {
  if (row) row.hidden = true;
}

export function showRow(row) {
  if (row) row.hidden = false;
}

export function renderExtLink(link, { last = false } = {}) {
  const icon = faviconForUrl(link.url);
  const img = icon
    ? `<img class="blp-favicon" src="${escapeAttr(icon)}" alt="" width="14" height="14" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`
    : '';
  const sep = last ? '' : '<span class="separator">•</span>';
  return `
    <span class="game-detail">
      <a class="game-details-value blp-ext-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">
        ${img}${escapeHtml(link.label)}
      </a>${sep}
    </span>
  `;
}

export function renderLibraryBadge(kind) {
  if (kind === 'owned') {
    return `<span class="blp-owned-badge" title="${escapeAttr(t.steamOwned)}"><svg class="blp-owned-badge__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.4 11.3 2.9 7.8l1.2-1.2 2.3 2.3 5-5.1 1.2 1.2z"/></svg>${escapeHtml(t.steamOwned)}</span>`;
  }
  if (kind === 'wishlist') {
    return `<span class="blp-wishlist-badge" title="${escapeAttr(t.steamWishlist)}"><svg class="blp-owned-badge__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 2.2 9.7 6l4 .3-3.1 2.6 1 3.9L8 10.6 4.4 12.8l1-3.9L2.3 6.3l4-.3z"/></svg>${escapeHtml(t.steamWishlist)}</span>`;
  }
  return '';
}

export function renderSteamMatchControl(steam, slug) {
  if (!slug) return '';
  const overrideId = getSteamOverride(slug);
  const appId = steam?.appId || overrideId || '';
  if (!appId && !settings.showSteam) return '';
  const source = overrideId || steam?.manualOverride ? t.steamMatchManual : t.steamMatchAuto;
  const label = appId
    ? fmt(t.steamMatchLabel, { id: appId, source })
    : t.steamFixMatch;
  return `<span class="blp-steam-match">
    <span class="blp-steam-match__label">${escapeHtml(label)}</span>
    <button type="button" class="blp-steam-match__btn" data-blp-fix-match data-blp-slug="${escapeAttr(slug)}" data-blp-appid="${escapeAttr(appId || '')}">${escapeHtml(t.steamFixMatch)}</button>
  </span>`;
}

export function renderSteamValues(steam, { owned = false, wishlist = false, slug = '' } = {}) {
  const parts = [];

  if (owned) {
    parts.push({ html: renderLibraryBadge('owned') });
  } else if (wishlist) {
    parts.push({ html: renderLibraryBadge('wishlist') });
  }

  const priceHtml = renderSteamPriceHtml(steam);
  if (priceHtml) {
    parts.push({ html: priceHtml });
  }

  const reviewText = formatReviewPercent(steam.reviews);
  const reviewClass = reviewScoreClass(steam.reviews);
  if (reviewText) {
    parts.push({
      html: `<a class="game-details-value ${reviewClass}" href="${escapeAttr(steam.storeUrl)}#app_reviews_hash" target="_blank" rel="noopener noreferrer">${escapeHtml(reviewText)}</a>`,
    });
  } else if (steam.recommendations) {
    parts.push({
      html: `<span class="game-details-value ${reviewClass}">${escapeHtml(fmt(t.recommendations, { n: steam.recommendations.toLocaleString() }))}</span>`,
    });
  }

  if (steam.usedUsFallback) {
    parts.push({
      html: `<span class="game-details-value blp-steam-note">${escapeHtml(fmt(t.steamUsFallback, { cc: steam.requestedCountry || '' }))}</span>`,
    });
  }

  if (settings.showSteamCategories !== false && steam.categories?.length) {
    const chips = steam.categories
      .map(
        (cat) =>
          `<a class="blp-gs-chip blp-steam-category" href="${escapeAttr(steamCategoryUrl(cat.id))}" target="_blank" rel="noopener noreferrer">${escapeHtml(cat.description)}</a>`
      )
      .join('');
    parts.push({
      html: `<span class="blp-steam-categories">${chips}</span>`,
    });
  }

  if (settings.showSteamTags !== false && steam.tags?.length) {
    const chips = steam.tags
      .map(
        (tag) =>
          `<a class="blp-gs-chip blp-steam-tag" href="${escapeAttr(steamTagUrl(tag.name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(tag.name)}</a>`
      )
      .join('');
    parts.push({
      html: `<span class="blp-steam-tags">${chips}</span>`,
    });
  }

  const matchHtml = renderSteamMatchControl(steam, slug);
  if (matchHtml) parts.push({ html: matchHtml });

  if (!parts.length) {
    return `<a class="game-details-value blp-ext-link" href="${escapeAttr(steam.storeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.steam)}</a>`;
  }

  return parts.map((part) => `<span class="blp-steam-line">${part.html}</span>`).join('');
}

export function debugLink(label, url, purpose, request) {
  if (!url) return '';
  const badge = request
    ? `<span class="blp-debug-panel__source-badge">${escapeHtml(t.debugSrcRequest)}</span>`
    : '';
  const purposeHtml = purpose
    ? `<span class="blp-debug-panel__source-purpose">${escapeHtml(purpose)}</span>`
    : '';
  return `<li class="${request ? 'is-request' : ''}">
    <div class="blp-debug-panel__source-head">
      ${badge}<strong>${escapeHtml(label)}</strong>${purposeHtml}
    </div>
    <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
  </li>`;
}

export function collectDebugSources({ steam, steamDb, gamestatus, title, slug }) {
  const items = [];
  const add = (module, label, url, purpose, request = false) => {
    if (!url || items.some((x) => x.url === url && x.label === label && x.module === module)) {
      return;
    }
    items.push({
      module,
      label,
      url,
      purpose: purpose || '',
      request: Boolean(request),
    });
  };

  add('page', 'Backloggd', location.href, t.debugSrcBackloggd);
  if (slug) add('page', 'IGDB', getIgdbUrl(slug), t.debugSrcIgdb);
  const mc = metacriticGameUrl(title, slug);
  if (mc) add('page', 'Metacritic', mc, t.debugSrcMetacritic);

  if (steam?.storeUrl) add('steam', 'Steam Store', steam.storeUrl, t.debugSrcSteamStore);
  if (steam?.tinyImage) {
    add('steam', 'Steam tiny image', steam.tinyImage, t.debugSrcSteamTiny);
  }
  if (steam?.headerImage) {
    add('steam', 'Steam header image', steam.headerImage, t.debugSrcSteamHeader);
  }
  if (settings.showSteamOwned || settings.showSteamWishlist) {
    add('steam', 'Steam userdata', STEAM_USERDATA_URL, t.debugSrcSteamOwned, true);
  }

  const steamDbg = steam?._debug || {};
  for (const search of steamDbg.searches || []) {
    if (!search?.url) continue;
    const kind = search.anonymous ? 'guest' : 'session';
    add(
      'steam',
      `Steam search (${kind}, ${search.country || '?'})`,
      search.url,
      t.debugSrcSteamSearch,
      true
    );
  }
  if (steamDbg.detailsUrl) {
    add('steam', 'Steam appdetails', steamDbg.detailsUrl, t.debugSrcSteamDetails, true);
  }
  if (steamDbg.reviewsUrl) {
    add('steam', 'Steam appreviews', steamDbg.reviewsUrl, t.debugSrcSteamReviews, true);
  }
  if (steamDbg.tagsUrl) {
    add('steam', 'Steam GetItems (tags)', steamDbg.tagsUrl, t.debugSrcSteamTags, true);
  }
  if (steamDbg.tagMapUrl) {
    add('steam', 'Steam populartags', steamDbg.tagMapUrl, t.debugSrcSteamTagMap, true);
  }

  if (steam?.appId) {
    add('steamdb', 'SteamDB', `${STEAMDB_APP_URL}/${steam.appId}/`, t.debugSrcSteamDb);
    add(
      'steamdb',
      'SteamDB charts',
      `${STEAMDB_APP_URL}/${steam.appId}/charts/`,
      t.debugSrcSteamDbCharts
    );
    add(
      'steamdb',
      'SteamDB info',
      `${STEAMDB_APP_URL}/${steam.appId}/info/`,
      t.debugSrcSteamDbInfo
    );
  }

  const sdb = steamDb?._debug || {};
  if (sdb.chartsUrl) {
    add('steamdb', 'SteamDB charts', sdb.chartsUrl, t.debugSrcSteamDbCharts);
  }
  if (sdb.playersApiUrl) {
    add('steamdb', 'Steam players API', sdb.playersApiUrl, t.debugSrcSteamPlayersApi, true);
  }
  if (sdb.iconUrl || steamDb?.iconUrl) {
    add('steamdb', 'Icon URL', sdb.iconUrl || steamDb.iconUrl, t.debugSrcIcon);
  }
  if (sdb.logoUrl || steamDb?.logoUrl) {
    add('steamdb', 'Logo URL', sdb.logoUrl || steamDb.logoUrl, t.debugSrcLogo);
  }

  const gs = gamestatus?._debug || {};
  for (const attempt of gs.attempts || []) {
    if (attempt?.url) {
      add(
        'gamestatus',
        `GameStatus API (${attempt.slug || '?'})`,
        attempt.url,
        t.debugSrcGameStatusApi,
        true
      );
    }
  }
  if (gamestatus?.slug) {
    add(
      'gamestatus',
      'GameStatus page',
      `${GAMESTATUS_SITE_BASE}/${encodeURIComponent(gamestatus.slug)}`,
      t.debugSrcGameStatusPage
    );
  }

  return items;
}

export function renderDebugSourcesHtml(sources) {
  const groups = [
    { key: 'page', label: t.debugSectionPage },
    { key: 'steam', label: t.debugSectionSteam },
    { key: 'steamdb', label: t.debugSectionSteamDb },
    { key: 'gamestatus', label: t.debugSectionGameStatus },
  ];
  const blocks = [];
  for (const group of groups) {
    const list = sources
      .filter((s) => s.module === group.key)
      .sort((a, b) => Number(b.request) - Number(a.request));
    if (!list.length) continue;
    const itemsHtml = list.map((s) => debugLink(s.label, s.url, s.purpose, s.request)).join('');
    blocks.push(`
      <div class="blp-debug-panel__source-group">
        <div class="blp-debug-panel__source-group-title">${escapeHtml(group.label)}</div>
        <ul class="blp-debug-panel__source-group-list">${itemsHtml}</ul>
      </div>
    `);
  }
  return blocks.join('') || `<div>${escapeHtml('—')}</div>`;
}

export function renderUnifiedDebugPanel({
  steam,
  steamDb,
  gamestatus,
  owned = false,
  wishlist = false,
  error = false,
  title = '',
  slug = '',
}) {
  const wasOpen = Boolean(document.querySelector('[data-blp-debug][open]'));
  document.querySelectorAll('[data-blp-debug]').forEach((el) => el.remove());
  if (!settings.debugMode) return;

  const sources = collectDebugSources({ steam, steamDb, gamestatus, title, slug });
  const sourcesHtml = renderDebugSourcesHtml(sources);

  const sections = [];
  const pushSection = (label, reason, dumpObj) => {
    let dump = '';
    try {
      dump = JSON.stringify(dumpObj, null, 2);
    } catch (_) {
      dump = String(dumpObj);
    }
    sections.push(`
      <div class="blp-debug-panel__section">
        <span class="blp-debug-panel__label">${escapeHtml(label)}</span>
        <span class="blp-debug-panel__reason">${escapeHtml(reason || '—')}</span>
        <pre class="blp-debug-panel__pre">${escapeHtml(dump)}</pre>
      </div>
    `);
  };

  pushSection(t.debugSectionPage, `${title || '—'} / ${slug || '—'}`, {
    href: location.href,
    title,
    slug,
    settings: {
      steamCountry: settings.steamCountry,
      showSteam: settings.showSteam,
      showSteamOwned: settings.showSteamOwned,
      showSteamWishlist: settings.showSteamWishlist,
      showSteamTags: settings.showSteamTags,
      showSteamCategories: settings.showSteamCategories,
      showMetacritic: settings.showMetacritic,
      showOpenCritic: settings.showOpenCritic,
      showHltb: settings.showHltb,
      showDeckProton: settings.showDeckProton,
      showGameStatus: settings.showGameStatus,
      showSteamDbIcon: settings.showSteamDbIcon,
      showSteamDbCover: settings.showSteamDbCover,
      showSteamDbGallery: settings.showSteamDbGallery,
      showSteamDbDetails: settings.showSteamDbDetails,
      showSimilarGames: settings.showSimilarGames,
      showGameStats: settings.showGameStats,
      showSteamPlayers: settings.showSteamPlayers,
      showCardBadges: settings.showCardBadges,
      showCardBadgePrice: settings.showCardBadgePrice,
      showCardBadgeReview: settings.showCardBadgeReview,
      showCardBadgeOwned: settings.showCardBadgeOwned,
      showCardBadgeWishlist: settings.showCardBadgeWishlist,
      showCardBadgeGameStatus: settings.showCardBadgeGameStatus,
      showLinks: settings.showLinks,
      links: settings.links,
      steamOverride: getSteamOverride(slug),
    },
    owned,
    wishlist,
    error,
    SCRIPT_VERSION,
  });

  pushSection(
    t.debugSectionSteam,
    steam?._debug?.reason || (steam?.found ? `appId=${steam.appId}` : t.notOnSteam),
    steam?._debug || steam || { reason: 'Steam payload missing' }
  );

  pushSection(
    t.debugSectionSteamDb,
    steamDb?._debug?.reason || (steamDb ? `source=${steamDb.source}` : 'SteamDB extras not fetched'),
    steamDb?._debug || steamDb || { reason: 'SteamDB payload missing' }
  );

  pushSection(
    t.debugSectionGameStatus,
    gamestatus?._debug?.reason ||
      (gamestatus && !gamestatus.missing
        ? `slug=${gamestatus.slug}`
        : t.gsNotInDatabase),
    gamestatus?._debug || gamestatus || { reason: 'GameStatus payload missing' }
  );

  const fullDump = {
    page: { href: location.href, title, slug, owned, wishlist, error, SCRIPT_VERSION },
    steam: steam?._debug || steam || null,
    steamDb: steamDb?._debug || steamDb || null,
    gamestatus: gamestatus?._debug || gamestatus || null,
    sources,
  };
  let fullJson = '';
  try {
    fullJson = JSON.stringify(fullDump, null, 2);
  } catch (_) {
    fullJson = String(fullDump);
  }

  const panel = document.createElement('details');
  panel.className = 'blp-debug-panel';
  panel.setAttribute('data-blp-debug', '1');
  if (wasOpen) panel.open = true;
  panel.innerHTML = `
    <summary class="blp-debug-panel__summary">
      <h3 class="blp-debug-panel__title">${escapeHtml(t.debugPanelTitle)} · v${escapeHtml(SCRIPT_VERSION)}</h3>
    </summary>
    <div class="blp-debug-panel__body">
      <div class="blp-debug-panel__meta">${escapeHtml(t.debugOwned)}: ${owned ? t.on : t.off}</div>
      <div class="blp-debug-panel__section">
        <span class="blp-debug-panel__label">${escapeHtml(t.debugSources)}</span>
        <div class="blp-debug-panel__sources">${sourcesHtml}</div>
      </div>
      ${sections.join('')}
      <div class="blp-debug-panel__section">
        <span class="blp-debug-panel__label">${escapeHtml(t.debugDump)}</span>
        <pre class="blp-debug-panel__pre">${escapeHtml(fullJson)}</pre>
      </div>
    </div>
  `;

  const lastRow = document.querySelector(`[${ENRICH_ATTR}]:last-of-type`);
  const platforms = document.querySelector('#game-body #game-page-platforms, #game-page-platforms');
  const anchor = lastRow || platforms;
  if (anchor) anchor.insertAdjacentElement('afterend', panel);
  else document.querySelector('#game-body')?.appendChild(panel);
}

export function renderEnrichment(rows, { steam, links, error, owned = false, wishlist = false, gamestatus = null, title = '', slug = '', steamDb = null, opencritic = null, hltb = null, proton = null, skipDebug = false }) {
  const debugOn = Boolean(settings.debugMode);

  if (rows.steam) {
    if (error) {
      setRowValues(
        rows.steam,
        `<span class="game-details-value blp-empty">${escapeHtml(t.loadError)}</span>${renderSteamMatchControl(steam, slug)}`
      );
      showRow(rows.steam);
      paintDebugCacheMark(rows.steam, getCacheSource(steam) || 'miss');
    } else if (!steam?.found) {
      const missHtml = debugOn
        ? `<span class="game-details-value blp-empty">${escapeHtml(t.notOnSteam)}</span>`
        : '';
      const matchHtml = renderSteamMatchControl(steam, slug);
      if (missHtml || matchHtml) {
        setRowValues(
          rows.steam,
          `${missHtml}${missHtml && matchHtml ? '' : ''}${matchHtml ? `<span class="blp-steam-line">${matchHtml}</span>` : ''}`
        );
        showRow(rows.steam);
        paintDebugCacheMark(rows.steam, getCacheSource(steam) || 'miss');
      } else {
        hideRow(rows.steam);
      }
    } else {
      setRowValues(rows.steam, renderSteamValues(steam, { owned, wishlist, slug }));
      showRow(rows.steam);
      paintDebugCacheMark(rows.steam, getCacheSource(steam) || 'miss');
    }
  }

  if (rows.steamdb) {
    const html = renderSteamDbValues(steam, steamDb);
    if (html && !error) {
      setRowValues(rows.steamdb, html);
      showRow(rows.steamdb);
      paintDebugCacheMark(
        rows.steamdb,
        mergeCacheSources(
          steam?.franchise || steam?.systems ? steam : null,
          steamDb?._cacheMeta || steamDb
        )
      );
    } else if (steam == null && steamDb == null) {
      showRow(rows.steamdb);
    } else if (debugOn && steam?.found) {
      setRowValues(
        rows.steamdb,
        `<span class="game-details-value blp-empty">${escapeHtml(steamDb?.metaBlocked ? t.steamDbBlocked : '—')}</span>`
      );
      showRow(rows.steamdb);
      paintDebugCacheMark(rows.steamdb, steamDb?._cacheMeta || 'na');
    } else {
      hideRow(rows.steamdb);
    }
  }

  if (rows.metacritic) {
    const score = steam?.metacritic?.score;
    if (score != null && !error) {
      setRowValues(rows.metacritic, renderMetacriticBadge(score, metacriticGameUrl(title, slug)));
      showRow(rows.metacritic);
      paintDebugCacheMark(rows.metacritic, getCacheSource(steam) || 'miss');
    } else {
      hideRow(rows.metacritic);
    }
  }

  if (rows.opencritic) {
    if (opencritic == null) {
      // Still loading — keep skeleton visible; do not hide.
      showRow(rows.opencritic);
    } else {
      const html = renderOpenCriticValues(opencritic);
      if (html && !error) {
        setRowValues(rows.opencritic, html);
        showRow(rows.opencritic);
        paintDebugCacheMark(rows.opencritic, getCacheSource(opencritic) || 'miss');
      } else {
        hideRow(rows.opencritic);
      }
    }
  }

  if (rows.hltb) {
    if (hltb == null) {
      showRow(rows.hltb);
    } else {
      const html = renderHltbValues(hltb);
      if (html && !error) {
        setRowValues(rows.hltb, html);
        showRow(rows.hltb);
        paintDebugCacheMark(rows.hltb, getCacheSource(hltb) || 'miss');
      } else {
        hideRow(rows.hltb);
      }
    }
  }

  if (rows.deckproton) {
    const html = renderDeckProtonValues({ steam, proton });
    if (html && !error) {
      setRowValues(rows.deckproton, html);
      showRow(rows.deckproton);
      paintDebugCacheMark(rows.deckproton, mergeCacheSources(steam, proton));
    } else if (debugOn && steam?.found) {
      setRowValues(rows.deckproton, `<span class="game-details-value blp-empty">—</span>`);
      showRow(rows.deckproton);
      paintDebugCacheMark(rows.deckproton, mergeCacheSources(steam, proton));
    } else {
      hideRow(rows.deckproton);
    }
  }

  if (rows.players) {
    const count = steamDb?.players;
    if (count != null && !error) {
      const href = steamDb?.appId
        ? `${STEAMDB_APP_URL}/${steamDb.appId}/charts/`
        : `${STEAMDB_APP_URL}/`;
      const label = fmt(t.playersOnline, { n: Number(count).toLocaleString() });
      setRowValues(
        rows.players,
        `<a class="blp-players-badge blp-ext-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="blp-players-badge__dot" aria-hidden="true"></span>${escapeHtml(label)}</a>`
      );
      showRow(rows.players);
      paintDebugCacheMark(rows.players, 'miss');
    } else if (debugOn) {
      setRowValues(rows.players, `<span class="game-details-value blp-empty">—</span>`);
      showRow(rows.players);
      paintDebugCacheMark(rows.players, 'na');
    } else {
      hideRow(rows.players);
    }
  }

  if (rows.gamestatus) {
    if (gamestatus && !gamestatus.missing && gamestatus.data) {
      setRowValues(rows.gamestatus, renderGameStatusValues(gamestatus));
      showRow(rows.gamestatus);
      paintDebugCacheMark(rows.gamestatus, getCacheSource(gamestatus) || 'miss');
    } else {
      hideRow(rows.gamestatus);
    }
  }

  if (rows.links) {
    if (links?.length) {
      const html = links
        .map((l, i) => renderExtLink(l, { last: i === links.length - 1 }))
        .join('');
      setRowValues(rows.links, html);
      showRow(rows.links);
      paintDebugCacheMark(rows.links, 'na');
    } else {
      hideRow(rows.links);
    }
  }

  if (!skipDebug) {
    renderUnifiedDebugPanel({ steam, steamDb, gamestatus, owned, wishlist, error, title, slug });
  }
}

export let gamePageToken = 0;

export async function enrichGamePage() {
  const ctx = getPageContext();
  if (!ctx.isGamePage || !ctx.slug) {
    removeEnrichment();
    return;
  }

  const title = getGameTitle();
  if (!title) return;

  const token = `${ctx.slug}|${title}|${settings.steamCountry}|${settings.showSteam}|${settings.showSteamOwned}|${settings.showSteamWishlist}|${settings.showSteamTags}|${settings.showSteamCategories}|${settings.showMetacritic}|${settings.showOpenCritic}|${settings.showHltb}|${settings.showDeckProton}|${settings.showGameStatus}|${settings.showLinks}|${settings.showSteamDbIcon}|${settings.showSteamDbCover}|${settings.showSteamDbGallery}|${settings.showSteamDbDetails}|${settings.showSimilarGames}|${settings.showGameStats}|${settings.showSteamPlayers}|${settings.showExport}|${getSteamOverride(ctx.slug) || ''}|${settings.debugMode}|${JSON.stringify(settings.links)}`;
  const marker = document.querySelector(`[${ENRICH_ATTR}]`);
  // Same page/settings: keep the in-flight (or finished) mount. Remounting while
  // skeletons remain caused OpenCritic/HLTB/etc. to flicker on every MutationObserver pass.
  if (marker?.getAttribute('data-blp-token') === token) {
    ensureUnifiedRatingWidget(token);
    applyGameStatsVisibility();
    bindGameCoverViewer();
    syncExportButton(token);
    return;
  }

  removeEnrichment();
  const rows = ensureEnrichmentRows();
  if (!rows) return;

  Object.values(rows).forEach((row) => row?.setAttribute('data-blp-token', token));
  ensureUnifiedRatingWidget(token);
  applyGameStatsVisibility();
  bindGameCoverViewer();

  const runId = ++gamePageToken;
  const igdbUrl = getIgdbUrl(ctx.slug);
  const stillHere = () => runId === gamePageToken && getPageContext().isGamePage;

  const needSteamDb =
    settings.showSteamDbIcon ||
    settings.showSteamDbCover ||
    settings.showSteamDbGallery ||
    settings.showSteamPlayers ||
    settings.showSteamDbDetails !== false;
  const needSteamDbMedia =
    settings.showSteamDbIcon || settings.showSteamDbCover || settings.showSteamDbGallery;
  if (needSteamDbMedia) mountSteamDbSkeletons(token);
  else syncExportButton(token);
  if (settings.showSimilarGames) ensureSimilarMount(token);
  const needSteam =
    settings.showSteam ||
    settings.showMetacritic ||
    settings.showDeckProton ||
    settings.showGameStatus ||
    needSteamDb ||
    settings.showSimilarGames ||
    settings.showSteamDbDetails !== false ||
    (settings.showLinks && (settings.links?.itad !== false || settings.links?.steamdb !== false));
  const needUserdata =
    settings.showSteam && (settings.showSteamOwned || settings.showSteamWishlist);

  const state = {
    steam: null,
    owned: false,
    wishlist: false,
    userdata: null,
    gamestatus: null,
    steamDb: null,
    opencritic: null,
    hltb: null,
    proton: null,
    error: false,
  };

  const paintLinks = (steam) => {
    if (!stillHere() || !rows.links) return;
    const links = buildExternalLinks({ title, slug: ctx.slug, igdbUrl, steam });
    renderEnrichment(
      { links: rows.links },
      { steam, links, error: state.error, skipDebug: true }
    );
  };

  const syncLibrary = () => {
    if (state.userdata && state.steam?.found && state.steam.appId != null) {
      const id = Number(state.steam.appId);
      state.owned = settings.showSteamOwned !== false && state.userdata.owned.has(id);
      state.wishlist =
        !state.owned &&
        settings.showSteamWishlist !== false &&
        state.userdata.wishlist.has(id);
    } else {
      state.owned = false;
      state.wishlist = false;
    }
  };

  const paintSteamBlock = () => {
    if (!stillHere() || state.steam == null) return;
    syncLibrary();
    renderEnrichment(
      {
        steam: rows.steam,
        steamdb: rows.steamdb,
        metacritic: rows.metacritic,
        deckproton: rows.deckproton,
      },
      {
        steam: state.steam,
        steamDb: state.steamDb,
        proton: state.proton,
        error: state.error,
        owned: state.owned,
        wishlist: state.wishlist,
        title,
        slug: ctx.slug,
        skipDebug: true,
      }
    );
    paintLinks(state.steam);
    updateUnifiedRatingWidget(state);
  };

  const paintSteamDbDetails = () => {
    if (!stillHere()) return;
    renderEnrichment(
      {
        steamdb: rows.steamdb,
        players: rows.players,
      },
      {
        steam: state.steam,
        steamDb: state.steamDb,
        error: state.error,
        skipDebug: true,
      }
    );
  };

  const paintOpenCritic = () => {
    if (!stillHere()) return;
    if (rows.opencritic) {
      renderEnrichment(
        { opencritic: rows.opencritic },
        { opencritic: state.opencritic, error: state.error, skipDebug: true }
      );
    }
    updateUnifiedRatingWidget(state);
  };

  const paintHltb = () => {
    if (!stillHere() || !rows.hltb) return;
    renderEnrichment(
      { hltb: rows.hltb },
      { hltb: state.hltb, error: state.error, skipDebug: true }
    );
  };

  const paintDeckProton = () => {
    if (!stillHere() || !rows.deckproton) return;
    renderEnrichment(
      { deckproton: rows.deckproton },
      {
        steam: state.steam,
        proton: state.proton,
        error: state.error,
        skipDebug: true,
      }
    );
  };

  const paintPlayers = () => {
    if (!stillHere() || !rows.players) return;
    renderEnrichment(
      { players: rows.players },
      { steamDb: state.steamDb, error: state.error, skipDebug: true }
    );
  };

  const paintGameStatus = () => {
    if (!stillHere() || !rows.gamestatus) return;
    renderEnrichment(
      { gamestatus: rows.gamestatus },
      { gamestatus: state.gamestatus, skipDebug: true }
    );
  };

  const paintFinal = () => {
    if (!stillHere()) return;
    syncLibrary();
    const links = buildExternalLinks({
      title,
      slug: ctx.slug,
      igdbUrl,
      steam: state.steam,
    });
    renderEnrichment(rows, {
      steam: state.steam,
      links,
      error: state.error,
      owned: state.owned,
      wishlist: state.wishlist,
      gamestatus: state.gamestatus,
      title,
      slug: ctx.slug,
      steamDb: state.steamDb,
      opencritic: state.opencritic,
      hltb: state.hltb,
      proton: state.proton,
    });
    if (state.steamDb) applySteamDbUi(state.steamDb, token, { final: true });
    updateUnifiedRatingWidget(state);
  };

  // Links that don't depend on Steam can appear immediately.
  paintLinks(null);

  let dependentsStarted = false;
  let dependentsPromise = Promise.resolve();

  const gsSkippedPayload = (steam, reason) => ({
    missing: true,
    data: null,
    slug: null,
    _debug: settings.debugMode
      ? {
          reason,
          steamFound: Boolean(steam?.found),
          steamDebug: steam?._debug || null,
        }
      : undefined,
  });

  const startDependents = (steam) => {
    if (dependentsStarted || !steam?.found || steam.appId == null) return;
    dependentsStarted = true;
    const jobs = [];

    if (needSteamDb) {
      jobs.push(
        fetchSteamDbExtras(steam.appId, {
          country: settings.steamCountry || 'US',
          onPartial: (partial) => {
            if (!stillHere()) return;
            state.steamDb = partial;
            applySteamDbUi(partial, token);
            // Keep players skeleton until a count arrives (final paint clears misses).
            if (partial?.players != null) paintPlayers();
            paintSteamDbDetails();
          },
        })
          .then((full) => {
            if (!stillHere() || !full) return;
            state.steamDb = full;
            applySteamDbUi(full, token, { final: true });
            paintPlayers();
            paintSteamDbDetails();
          })
          .catch((err) => {
            if (!stillHere()) return;
            state.steamDb = {
              appId: steam.appId,
              iconUrl: '',
              logoUrl: '',
              players: null,
              technologies: [],
              lastRecordUpdate: null,
              _debug: settings.debugMode
                ? { reason: `SteamDB error: ${err?.message || err}` }
                : undefined,
            };
            removeSteamDbUi();
            paintPlayers();
            paintSteamDbDetails();
          })
      );
    }

    if (settings.showGameStatus) {
      jobs.push(
        fetchGameStatus({
          appId: steam.appId,
          storeUrl: steam.storeUrl,
          name: steam.name,
          title,
          pageSlug: ctx.slug,
        })
          .then((gs) => {
            if (!stillHere()) return;
            state.gamestatus = gs;
            paintGameStatus();
          })
          .catch((err) => {
            if (!stillHere()) return;
            state.gamestatus = gsSkippedPayload(
              steam,
              `GameStatus error: ${err?.message || err}`
            );
            paintGameStatus();
          })
      );
    }

    if (settings.showDeckProton) {
      jobs.push(
        fetchProtonDb(steam.appId)
          .then((proton) => {
            if (!stillHere()) return;
            state.proton = proton;
            paintDeckProton();
          })
          .catch(() => {
            if (!stillHere()) return;
            paintDeckProton();
          })
      );
    }

    if (settings.showSimilarGames) {
      ensureSimilarMount(token);
      jobs.push(
        fetchSteamSimilarGames(steam.appId, steam.tags, settings.steamCountry || 'US')
          .then((games) => {
            if (!stillHere()) return;
            applySimilarGames(games, steam.appId, token, { final: true });
            import('./cards.js').then((m) => m.scheduleCardBadges());
          })
          .catch(() => {
            if (!stillHere()) return;
            removeSimilarGamesUi();
          })
      );
    }

    dependentsPromise = Promise.all(jobs);
  };

  try {
    const scoreJobs = [];
    if (settings.showOpenCritic) {
      scoreJobs.push(
        fetchOpenCritic(title)
          .then((oc) => {
            if (!stillHere()) return;
            state.opencritic = oc || { missing: true };
            paintOpenCritic();
          })
          .catch(() => {
            if (!stillHere()) return;
            state.opencritic = { missing: true };
            paintOpenCritic();
          })
      );
    }
    if (settings.showHltb) {
      scoreJobs.push(
        fetchHltb(title)
          .then((hltb) => {
            if (!stillHere()) return;
            state.hltb = hltb || { missing: true };
            paintHltb();
          })
          .catch(() => {
            if (!stillHere()) return;
            state.hltb = { missing: true };
            paintHltb();
          })
      );
    }

    const userdataPromise = needUserdata
      ? fetchSteamUserdata()
          .then((data) => {
            if (!stillHere()) return null;
            state.userdata = data;
            if (state.steam) paintSteamBlock();
            return data;
          })
          .catch(() => null)
      : Promise.resolve(null);

    const steamPromise = needSteam
      ? resolveSteamForGame({
          title,
          slug: ctx.slug,
          country: settings.steamCountry || 'US',
          onPartial: (partial) => {
            if (!stillHere()) return;
            state.steam = partial;
            paintSteamBlock();
            startDependents(partial);
          },
        })
      : Promise.resolve(null);

    const [steamResult] = await Promise.all([steamPromise, userdataPromise, ...scoreJobs]);
    if (!stillHere()) return;

    state.steam = steamResult;
    if (steamResult?.found) {
      paintSteamBlock();
      startDependents(steamResult);
    } else if (needSteam) {
      state.steam = steamResult || { found: false };
      paintSteamBlock();
      if (needSteamDbMedia) removeSteamDbUi();
      syncExportButton(token);
      if (settings.showSimilarGames) removeSimilarGamesUi();
    }

    if (settings.showGameStatus && !dependentsStarted) {
      state.gamestatus = gsSkippedPayload(
        state.steam,
        state.steam?.found
          ? 'GameStatus enabled but Steam appId missing'
          : 'GameStatus skipped — Steam app not found'
      );
      paintGameStatus();
    }

    await dependentsPromise;
  } catch (err) {
    state.error = true;
    state.steam = state.steam || {
      found: false,
      _debug: { reason: `Enrichment error: ${err?.message || err}` },
    };
    state.owned = false;
    state.wishlist = false;
    state.gamestatus = state.gamestatus || {
      missing: true,
      data: null,
      slug: null,
      _debug: { reason: `Enrichment error: ${err?.message || err}` },
    };
    if (needSteamDbMedia && !state.steamDb) removeSteamDbUi();
    syncExportButton(token);
    if (settings.showSimilarGames) removeSimilarGamesUi();
    paintSteamBlock();
    paintOpenCritic();
    paintHltb();
    paintDeckProton();
    paintGameStatus();
    paintPlayers();
    paintSteamDbDetails();
  }

  if (!stillHere()) return;
  paintFinal();
}
