import {
  GM_getValue,
  GM_setValue,
} from '$';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './constants.js';

/** Keys that used to ride on showUserMiniProfile before the Profile settings tab. */
const PROFILE_PAGE_SETTING_KEYS = [
  'showProfilePage',
  'showProfileHeader',
  'showProfileTierChip',
  'showProfileStats',
  'showProfileNav',
  'showProfileFavorites',
];

function migrateProfilePageSettings(raw, merged) {
  // Old combined toggle: mini-profile off meant no profile-page chrome either.
  if (!('showProfilePage' in raw) && raw.showUserMiniProfile === false) {
    for (const key of PROFILE_PAGE_SETTING_KEYS) {
      merged[key] = false;
    }
  }
  return merged;
}

export function loadSettings() {
  try {
    const raw = GM_getValue(SETTINGS_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return {
        ...DEFAULT_SETTINGS,
        links: { ...DEFAULT_SETTINGS.links },
      };
    }
    const merged = {
      ...DEFAULT_SETTINGS,
      ...raw,
      links: { ...DEFAULT_SETTINGS.links, ...(raw.links || {}) },
    };
    return migrateProfilePageSettings(raw, merged);
  } catch (_) {
    return {
      ...DEFAULT_SETTINGS,
      links: { ...DEFAULT_SETTINGS.links },
    };
  }
}

export function saveSettings(next) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...next,
    links: { ...DEFAULT_SETTINGS.links, ...(next.links || {}) },
  };
  GM_setValue(SETTINGS_KEY, merged);
}

export function isLinkEnabled(key, cfg) {
  return Boolean(cfg.showLinks && cfg.links && cfg.links[key] !== false);
}

export function linkLabelKey(key) {
  const map = {
    igdb: 'linkIgdb',
    steam: 'linkSteam',
    steamdb: 'linkSteamDb',
    metacritic: 'linkMetacritic',
    opencritic: 'linkOpencritic',
    hltb: 'linkHltb',
    pcgamingwiki: 'linkPcgamingwiki',
    itad: 'linkItad',
    gogdb: 'linkGogdb',
    gameslike: 'linkGameslike',
  };
  return map[key] || key;
}
