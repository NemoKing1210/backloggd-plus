import {
  GM_getValue,
  GM_setValue,
} from '$';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './constants.js';

export function loadSettings() {
  try {
    const raw = GM_getValue(SETTINGS_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return {
        ...DEFAULT_SETTINGS,
        links: { ...DEFAULT_SETTINGS.links },
      };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      links: { ...DEFAULT_SETTINGS.links, ...(raw.links || {}) },
    };
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
  };
  return map[key] || key;
}
