import {
  cacheUserProfile,
  fetchUserProfile,
  getNextProfileTier,
  parseUsernameFromHref,
  parseUserProfileDoc,
  peekCachedUserProfile,
  tierIdFromProfile,
} from '../api/user-profile.js';
import { fmt } from '../i18n/index.js';
import { settings, t } from '../state.js';
import { escapeHtml } from '../utils/html.js';
import { debounce } from '../utils/debounce.js';

const ROOT_ATTR = 'data-blp-profile-tier';
const TOKEN_ATTR = 'data-blp-profile-chrome';
const CHIP_CLASS = 'blp-profile-tier-chip';
const AVATAR_CLASS = 'blp-profile-avatar';

let applySeq = 0;

function profilePageEnabled() {
  return settings.showProfilePage !== false;
}

function wantHeader() {
  return profilePageEnabled() && settings.showProfileHeader !== false;
}

function wantTierChip() {
  return profilePageEnabled() && settings.showProfileTierChip !== false;
}

function wantStats() {
  return profilePageEnabled() && settings.showProfileStats !== false;
}

function wantNav() {
  return profilePageEnabled() && settings.showProfileNav !== false;
}

function wantFavorites() {
  return profilePageEnabled() && settings.showProfileFavorites !== false;
}

function anyProfileChromeEnabled() {
  return wantHeader() || wantTierChip() || wantStats() || wantNav() || wantFavorites();
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

function usernameFromPage() {
  const header = document.querySelector('#profile-header h3.main-header');
  const fromHeader = (header?.textContent || '').replace(/\s+/g, ' ').trim();
  if (fromHeader) return fromHeader;
  return parseUsernameFromHref(location.pathname);
}

function clearProfileChrome() {
  document.documentElement.removeAttribute(ROOT_ATTR);
  const header = document.getElementById('profile-header');
  if (header) {
    header.removeAttribute(ROOT_ATTR);
    header.classList.remove('blp-profile-header');
  }
  document.querySelectorAll(`.${CHIP_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`.${AVATAR_CLASS}`).forEach((el) => {
    el.classList.remove(AVATAR_CLASS);
  });
  document.getElementById('profile-stats')?.classList.remove('blp-profile-stats');
  document.getElementById('profile-nav')?.classList.remove('blp-profile-nav');
  document.getElementById('profile-nav-row')?.classList.remove('blp-profile-nav-row');
  const favs = document.getElementById('profile-favorites');
  if (favs) {
    favs.classList.remove('blp-profile-favorites');
    favs.querySelectorAll('.game-cover[data-blp-fav-rank]').forEach((cover) => {
      cover.removeAttribute('data-blp-fav-rank');
    });
  }
  document.querySelectorAll('.blp-profile-fav-title').forEach((el) => {
    el.classList.remove('blp-profile-fav-title');
  });
}

function ensureTierChip(header, profile, tierId) {
  const nameCol = header.querySelector('h3.main-header')?.closest('.col-auto');
  if (!nameCol) return;

  let chip = header.querySelector(`.${CHIP_CLASS}`);
  if (!chip) {
    chip = document.createElement('div');
    chip.className = `${CHIP_CLASS} col-auto pl-2 my-auto`;
    chip.setAttribute(TOKEN_ATTR, '1');
    nameCol.insertAdjacentElement('afterend', chip);
  }

  const next = getNextProfileTier(profile.gamesPlayed);
  const progressPct = next ? Math.round(next.progress * 100) : 100;
  const meta = next
    ? fmt(t.profileTierProgress || '{n} to {tier}', {
        n: next.remaining,
        tier: tierLabel(next.next.id),
      })
    : t.profileTierMax || '';
  const played = fmt(t.miniProfileTierSub || '{count} games played', {
    count: String(profile.gamesPlayed ?? 0),
  });

  chip.innerHTML = `
    <div class="blp-profile-tier-chip__pill">${escapeHtml(tierLabel(tierId))}</div>
    <div class="blp-profile-tier-chip__body">
      <div class="blp-profile-tier-chip__played">${escapeHtml(played)}</div>
      ${meta ? `<div class="blp-profile-tier-chip__next">${escapeHtml(meta)}</div>` : ''}
      <div class="blp-profile-tier-chip__bar" aria-hidden="true">
        <span style="width:${progressPct}%"></span>
      </div>
    </div>
  `;
}

function decorateFavorites() {
  const favs = document.getElementById('profile-favorites');
  if (!favs) return;
  favs.classList.add('blp-profile-favorites');

  const title =
    favs.previousElementSibling?.querySelector?.('h2') ||
    document.getElementById('profile-recent-play');
  if (title && /favorite/i.test(title.textContent || '')) {
    title.classList.add('blp-profile-fav-title');
  }

  [...favs.querySelectorAll('.game-cover')].forEach((cover, i) => {
    cover.setAttribute('data-blp-fav-rank', String(i + 1));
  });
}

function decorateNav() {
  const nav = document.getElementById('profile-nav');
  const row = document.getElementById('profile-nav-row');
  if (nav) nav.classList.add('blp-profile-nav');
  if (row) row.classList.add('blp-profile-nav-row');
}

function applyProfileChrome(profile) {
  const header = document.getElementById('profile-header');
  if (!header || !profile) return;

  const tierId = tierIdFromProfile(profile);
  clearProfileChrome();

  if (!anyProfileChromeEnabled()) return;

  // Root tier tokens feed CSS vars used by stats / nav / favorites even without header wash.
  document.documentElement.setAttribute(ROOT_ATTR, tierId);

  if (wantHeader()) {
    header.setAttribute(ROOT_ATTR, tierId);
    header.classList.add('blp-profile-header');
    const avatar = header.querySelector('.avatar');
    if (avatar) avatar.classList.add(AVATAR_CLASS);
  }

  if (wantTierChip()) ensureTierChip(header, profile, tierId);
  if (wantStats()) document.getElementById('profile-stats')?.classList.add('blp-profile-stats');
  if (wantNav()) decorateNav();
  if (wantFavorites()) decorateFavorites();
}

async function resolveProfileForPage() {
  const username = usernameFromPage();
  if (!username) return null;

  const live = parseUserProfileDoc(document, username);
  const hasLiveStats = Boolean(document.getElementById('profile-stats'));

  if (live && hasLiveStats) {
    cacheUserProfile(live);
    return live;
  }

  const cached = peekCachedUserProfile(username);
  if (cached) {
    return {
      ...cached,
      avatarUrl: live?.avatarUrl || cached.avatarUrl,
      username: live?.username || cached.username,
    };
  }

  if (live?.gamesPlayed > 0) {
    cacheUserProfile(live);
    return live;
  }

  return (await fetchUserProfile(username)) || live;
}

export async function enhanceProfilePage() {
  if (!anyProfileChromeEnabled()) {
    clearProfileChrome();
    return;
  }

  const header = document.getElementById('profile-header');
  if (!header) {
    clearProfileChrome();
    return;
  }

  const seq = ++applySeq;
  const profile = await resolveProfileForPage();
  if (seq !== applySeq) return;
  if (!profile) {
    clearProfileChrome();
    return;
  }
  applyProfileChrome(profile);
}

export const scheduleProfilePage = debounce(() => {
  enhanceProfilePage();
}, 80);
