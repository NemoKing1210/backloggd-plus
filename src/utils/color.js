const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX3 = /^#[0-9a-f]{3}$/i;

/** Accept `#rrggbb` / `#rgb` (any case); return lowercase `#rrggbb` or the fallback. */
export function normalizeHexColor(value, fallback) {
  const raw = String(value ?? '').trim();
  if (HEX6.test(raw)) return raw.toLowerCase();
  if (HEX3.test(raw)) {
    const [, r, g, b] = raw.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text color with the higher WCAG contrast on `hex`; ties go to the dark ink the stylesheet already uses. */
export function readableInk(hex, dark = '#0b1210', light = '#ffffff') {
  const bg = relativeLuminance(hex);
  const onDark = contrastRatio(bg, relativeLuminance(dark));
  const onLight = contrastRatio(bg, relativeLuminance(light));
  return onDark >= onLight ? dark : light;
}
