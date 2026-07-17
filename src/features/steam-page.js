import { settings, t } from '../state.js';
import { escapeAttr } from '../utils/html.js';
import { slugifyForBackloggd } from '../utils/slug.js';

const STEAM_BTN_ID = 'blp-steam-backloggd-btn';
export const BACKLOGGD_SITE = 'https://www.backloggd.com';

export function getSteamAppIdFromPage() {
  const m = location.pathname.match(/\/app\/(\d+)/i);
  return m ? m[1] : '';
}

export function getSteamPageTitle() {
  return (
    document.getElementById('appHubAppName')?.textContent?.trim() ||
    document.querySelector('.apphub_AppName')?.textContent?.trim() ||
    document.title.replace(/\s+on\s+Steam.*$/i, '').replace(/\s+::\s+.*$/i, '').trim()
  );
}

export function getSteamPathSlug() {
  const m = location.pathname.match(/\/app\/\d+\/([^/?#]+)/i);
  if (!m) return '';
  return slugifyForBackloggd(m[1].replace(/_/g, '-'));
}

export function resolveBackloggdUrlFromSteam() {
  const pathSlug = getSteamPathSlug();
  if (pathSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(pathSlug)}/`;
  const titleSlug = slugifyForBackloggd(getSteamPageTitle());
  if (titleSlug) return `${BACKLOGGD_SITE}/games/${encodeURIComponent(titleSlug)}/`;
  return BACKLOGGD_SITE;
}

export function createSteamBackloggdButton(url) {
  const a = document.createElement('a');
  a.id = STEAM_BTN_ID;
  a.className = 'btnv6_blue_hoverfade btn_medium';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.innerHTML = `
    <span data-tooltip-text="${escapeAttr(t.steamBackloggdTooltip)}">
      <img class="ico16" src="${escapeAttr(`${BACKLOGGD_SITE}/favicon.ico`)}" alt="Backloggd" width="16" height="16" />
    </span>
  `;
  return a;
}

export function injectSteamBackloggdButton() {
  if (!settings.showSteamPageLink) {
    document.getElementById(STEAM_BTN_ID)?.remove();
    return;
  }

  const appId = getSteamAppIdFromPage();
  if (!appId) return;

  const anchor = document.querySelector('.apphub_OtherSiteInfo');
  if (!anchor) return;

  const url = resolveBackloggdUrlFromSteam();
  const existing = document.getElementById(STEAM_BTN_ID);
  if (existing) {
    existing.href = url;
    return;
  }

  const btn = createSteamBackloggdButton(url);

  // Place like SteamDB: before Community Hub / Store Page, after other extension icons when possible
  const hub =
    anchor.querySelector('a.btnv6_blue_hoverfade[href*="steamcommunity.com/app/"]') ||
    anchor.querySelector('a.btnv6_blue_hoverfade[href*="store.steampowered.com/app/"]') ||
    [...anchor.querySelectorAll('a.btnv6_blue_hoverfade')].find((el) =>
      /community hub|store page/i.test(el.textContent || '')
    );

  if (hub) {
    hub.insertAdjacentElement('beforebegin', btn);
    // SteamDB leaves a space text node before hub — keep spacing
    if (hub.previousSibling === btn) {
      btn.insertAdjacentText('afterend', ' ');
    }
  } else {
    anchor.appendChild(btn);
  }
}

export function scanSteamPage() {
  injectSteamBackloggdButton();
}
