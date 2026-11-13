import { DEFAULT_ACCENT_COLOR } from '../constants.js';
import { settings } from '../state.js';
import { hexToRgb, normalizeHexColor, readableInk } from '../utils/color.js';

const VARS = ['--blp-accent', '--blp-accent-rgb', '--blp-accent-ink'];

export function normalizeAccentColor(value) {
  return normalizeHexColor(value, DEFAULT_ACCENT_COLOR);
}

/**
 * Paint the Plus accent color (Settings → General → Accent color) via CSS variables on <html>.
 * The default color clears the overrides so the stylesheet values apply untouched.
 */
export function applyAccentColor(value = settings.accentColor) {
  const root = document.documentElement;
  const hex = normalizeAccentColor(value);
  if (hex === DEFAULT_ACCENT_COLOR) {
    for (const name of VARS) root.style.removeProperty(name);
    return;
  }
  root.style.setProperty('--blp-accent', hex);
  root.style.setProperty('--blp-accent-rgb', hexToRgb(hex).join(', '));
  root.style.setProperty('--blp-accent-ink', readableInk(hex));
}
