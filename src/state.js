import { TRANSLATIONS, resolveLocale } from './i18n/index.js';
import { loadSettings } from './settings.js';

export let settings = loadSettings();
export let locale = resolveLocale(settings.uiLocale);
export let t = TRANSLATIONS[locale] || TRANSLATIONS.en;
export let cacheStore = null;
export let cachePersistTimer = 0;
export const inflight = new Map();
/** In-memory Steam resolve misses for this page session (do not persist to GM cache). */
export const steamResolveMissMemory = new Set();

export function reloadRuntimeSettings() {
  settings = loadSettings();
  locale = resolveLocale(settings.uiLocale);
  t = TRANSLATIONS[locale] || TRANSLATIONS.en;
}

export function setCacheStore(next) {
  cacheStore = next;
}

export function setCachePersistTimer(id) {
  cachePersistTimer = id;
}
