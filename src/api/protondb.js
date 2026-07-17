import {
  asCacheHit,
  asCacheMiss,
  getCached,
  setCached,
} from '../cache.js';
import { PROTONDB_SUMMARY_URL } from '../constants.js';
import { gmRequest } from '../gm.js';
import { inflight } from '../state.js';

export async function fetchProtonDb(appId) {
  const id = Number(appId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const cacheKey = `protondb:${id}`;
  const cached = getCached(cacheKey);
  if (cached) return asCacheHit(cached);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const task = (async () => {
    const data = await gmRequest({
      url: `${PROTONDB_SUMMARY_URL}/${id}.json`,
      allow404: true,
      headers: { Accept: 'application/json' },
      timeout: 15000,
    });
    if (!data || typeof data !== 'object') return null;
    const tier = typeof data.tier === 'string' ? data.tier : null;
    if (!tier) return null;
    const payload = {
      tier,
      bestReportedTier: data.bestReportedTier || null,
      confidence: data.confidence || null,
      score: data.score != null ? Number(data.score) : null,
      total: data.total != null ? Number(data.total) : null,
      url: `https://www.protondb.com/app/${id}`,
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
