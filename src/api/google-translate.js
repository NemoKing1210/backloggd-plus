import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
} from '../cache.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

const GTX_URL = 'https://translate.googleapis.com/translate_a/single';

function hashText(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function joinSegments(data) {
  if (!Array.isArray(data?.[0])) return '';
  return data[0]
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('');
}

function detectedLang(data) {
  const raw = data?.[2];
  if (typeof raw === 'string' && raw) return raw.toLowerCase().slice(0, 2);
  const nested = data?.[8]?.[0]?.[0];
  if (typeof nested === 'string' && nested) return nested.toLowerCase().slice(0, 2);
  return '';
}

/**
 * @param {string} text
 * @param {string} targetLang short locale code (en, ru, zh, …)
 * @returns {Promise<{ text: string, detectedSourceLang: string } | null>}
 */
export async function translateText(text, targetLang) {
  const plain = String(text || '').trim();
  const tl = String(targetLang || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (!plain || !tl) return null;

  const cacheKey = `gtx:${tl}:${hashText(plain)}`;
  const cached = getCached(cacheKey);
  if (cached && typeof cached.text === 'string') return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const url =
      `${GTX_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}` +
      `&dt=t&q=${encodeURIComponent(plain)}`;
    const data = await gmRequest({
      url,
      responseType: 'json',
      headers: { Accept: 'application/json' },
      timeout: 20000,
    });
    const translated = joinSegments(data).trim();
    if (!translated) return null;
    const payload = {
      text: translated,
      detectedSourceLang: detectedLang(data),
    };
    setCached(cacheKey, payload);
    return asCacheMiss(payload);
  })().catch(() => null);

  inflight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(cacheKey);
  }
}
