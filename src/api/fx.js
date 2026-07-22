/**
 * FX rates for approximate price conversion (not Steam regional dual pricing).
 * Source: fawazahmed0/currency-api (no key) via jsDelivr + Cloudflare Pages fallback.
 * SteamDB is intentionally NOT used (Cloudflare / not an FX API).
 */
import { getCached, setCached } from '../cache.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

/** Soft TTL for FX rows in GM cache (12h). */
export const FX_TTL_MS = 12 * 60 * 60 * 1000;

/** Currencies offered as conversion target in Settings. */
export const CONVERT_CURRENCIES = [
  'RUB',
  'USD',
  'EUR',
  'KZT',
  'UAH',
  'GBP',
  'TRY',
  'CNY',
  'PLN',
  'BRL',
  'JPY',
  'KRW',
];

const FX_HOSTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies',
  'https://latest.currency-api.pages.dev/v1/currencies',
];

/** Prefer symbols for compact UI; fall back to ISO code. */
export const CURRENCY_SYMBOLS = {
  KZT: '₸',
  RUB: '₽',
  USD: '$',
  EUR: '€',
  UAH: '₴',
  GBP: '£',
  TRY: '₺',
  CNY: '¥',
  PLN: 'zł',
  BRL: 'R$',
  JPY: '¥',
  KRW: '₩',
};

export function normalizeCurrency(code) {
  return String(code || '')
    .trim()
    .toUpperCase();
}

/**
 * Steam `price_overview.final` is in minor units (cents / tiyn).
 * @returns {number|null} major units
 */
export function steamPriceMajor(price) {
  if (!price || !Number.isFinite(Number(price.final))) return null;
  return Number(price.final) / 100;
}

export function formatMoneyMajor(amount, currency, { maxFrac } = {}) {
  const cc = normalizeCurrency(currency);
  if (!Number.isFinite(amount) || !cc) return null;
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'CLP']);
  const digits = maxFrac != null ? maxFrac : zeroDecimal.has(cc) ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cc,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits === 0 ? 0 : undefined,
    }).format(amount);
  } catch (_) {
    const sym = CURRENCY_SYMBOLS[cc] || cc;
    const n = zeroDecimal.has(cc) ? Math.round(amount) : amount.toFixed(2);
    return `${n} ${sym}`;
  }
}

/**
 * Compact form: `560 ₽` (for "~ 560 ₽" next to Steam formatted price).
 */
export function formatMoneyCompact(amount, currency) {
  const cc = normalizeCurrency(currency);
  if (!Number.isFinite(amount) || !cc) return null;
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'CLP']);
  const digits = zeroDecimal.has(cc) ? 0 : 2;
  let num;
  try {
    num = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    }).format(zeroDecimal.has(cc) ? Math.round(amount) : amount);
  } catch (_) {
    num = zeroDecimal.has(cc) ? String(Math.round(amount)) : amount.toFixed(2);
  }
  const sym = CURRENCY_SYMBOLS[cc] || cc;
  // Symbols that usually prefix vs suffix
  if (sym === '$' || sym === '€' || sym === '£' || sym === '¥' || sym === '₩') {
    return `${sym}${num}`;
  }
  return `${num} ${sym}`;
}

function cacheKey(from, to) {
  return `fx:${normalizeCurrency(from)}:${normalizeCurrency(to)}`;
}

/**
 * @returns {Promise<number|null>} rate such that major_to = major_from * rate
 */
export async function getFxRate(fromCurrency, toCurrency) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (!from || !to) return null;
  if (from === to) return 1;

  const key = cacheKey(from, to);
  const hit = getCached(key);
  if (hit && Number.isFinite(Number(hit.rate)) && Number(hit.rate) > 0) {
    return Number(hit.rate);
  }

  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    let lastErr = null;
    for (const base of FX_HOSTS) {
      try {
        const url = `${base}/${fromLower}.min.json`;
        const data = await gmRequest({ url, responseType: 'json', timeout: 15000, anonymous: true });
        const table = data && (data[fromLower] || data[from] || data);
        const rate = table && (table[toLower] ?? table[to]);
        if (Number.isFinite(Number(rate)) && Number(rate) > 0) {
          const r = Number(rate);
          setCached(key, { rate: r, date: data?.date || null, from, to }, { ttlMs: FX_TTL_MS });
          return r;
        }
        lastErr = new Error(`No rate ${from}->${to}`);
      } catch (err) {
        lastErr = err;
      }
    }
    if (lastErr) console.warn('BLP FX:', lastErr.message || lastErr);
    return null;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Convert Steam minor units (cents/tiyn) to compact target currency text.
 * @returns {Promise<string|null>} e.g. "560 ₽"
 */
export async function convertMinorToCompact(minor, fromCurrency, targetCurrency) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(targetCurrency);
  if (!from || !to || from === to) return null;
  if (!Number.isFinite(Number(minor))) return null;
  const rate = await getFxRate(from, to);
  if (!rate) return null;
  return formatMoneyCompact((Number(minor) / 100) * rate, to);
}

/**
 * Build "~ 560 ₽" from Steam price_overview + settings target (final price).
 * @returns {Promise<string|null>}
 */
export async function formatConvertedApprox(price, targetCurrency) {
  if (!price) return null;
  return convertMinorToCompact(price.final, price.currency, targetCurrency);
}

/**
 * Convert both list and sale amounts when on discount.
 * @returns {Promise<{ now: string, was: string|null }|null>}
 */
export async function formatConvertedSalePair(price, targetCurrency) {
  if (!price) return null;
  const now = await convertMinorToCompact(price.final, price.currency, targetCurrency);
  if (!now) return null;
  let was = null;
  const onSale =
    Number(price.discount_percent) > 0 &&
    Number.isFinite(Number(price.initial)) &&
    Number(price.initial) > Number(price.final);
  if (onSale) {
    was = await convertMinorToCompact(price.initial, price.currency, targetCurrency);
  }
  return { now, was };
}
