import { settings, t } from '../state.js';
import { slugifyForBackloggd } from '../utils/slug.js';
import { BACKLOGGD_SITE } from './steam-page.js';

const STEAMDB_BTN_ID = 'blp-steamdb-backloggd-btn';

export function getSteamDbAppId() {
  const m = location.pathname.match(/\/app\/(\d+)/i);
  return m ? m[1] : '';
}

export function getIgdbSlugFromPage() {
  const link = document.querySelector(
    '.app-links a[href*="igdb.com/games/"], a[href*="igdb.com/games/"]'
  );
  if (!link?.href) return '';
  const m = String(link.href).match(/igdb\.com\/games\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : '';
}

export function getSteamDbPageTitle() {
  const header =
    document.querySelector('.app-page header h1, .header-title h1, h1[itemprop="name"]') ||
    document.querySelector('h1');
  let name = (header?.textContent || '').trim();
  // "Stardew Valley" often followed by meta; strip AppID suffixes from document.title fallback
  if (!name) {
    name = document.title.replace(/\s*[·•|].*$/, '').replace(/\s*AppID.*$/i, '').trim();
  } else {
    name = name.split(/\n/)[0].trim();
  }
  return name;
}

export function resolveBackloggdUrlFromSteamDb() {
  const igdbSlug = getIgdbSlugFromPage();
  if (igdbSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(igdbSlug)}/`;
  const titleSlug = slugifyForBackloggd(getSteamDbPageTitle());
  if (titleSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(titleSlug)}/`;
  return BACKLOGGD_SITE;
}

export function createSteamDbBackloggdButton(url) {
  const a = document.createElement('a');
  a.id = STEAMDB_BTN_ID;
  a.className = 'btn tooltipped tooltipped-n';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', t.steamBackloggdTooltip);
  a.textContent = t.steamDbBackloggdLabel;
  return a;
}

export function injectSteamDbBackloggdButton() {
  if (!settings.showSteamDbPageLink) {
    document.getElementById(STEAMDB_BTN_ID)?.remove();
    return;
  }

  if (!getSteamDbAppId()) return;

  const nav = document.querySelector('nav.app-links');
  if (!nav) return;

  const url = resolveBackloggdUrlFromSteamDb();
  const existing = document.getElementById(STEAMDB_BTN_ID);
  if (existing) {
    existing.href = url;
    return;
  }

  const btn = createSteamDbBackloggdButton(url);

  // Immediately after Steam Store button (like Hub follows Store)
  const store = nav.querySelector('a.btn[href*="store.steampowered.com"]');
  if (store) {
    store.insertAdjacentElement('afterend', btn);
  } else {
    const igdb = nav.querySelector('a.btn[href*="igdb.com"]');
    if (igdb) igdb.insertAdjacentElement('beforebegin', btn);
    else nav.appendChild(btn);
  }
}

export function scanSteamDbPage() {
  injectSteamDbBackloggdButton();
}
