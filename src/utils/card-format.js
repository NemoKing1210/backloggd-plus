import { t } from '../state.js';

/** Shared Steam / Metacritic formatting used by game pages, cards and mini-profiles. */
export function mcScoreTier(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  if (n >= 75) return 'high';
  if (n >= 50) return 'mid';
  return 'low';
}

export function reviewScoreClass(summary) {
  const score = Number(summary?.review_score);
  if (!Number.isFinite(score) || score <= 0) {
    // Fallback from positive % when score is missing
    if (!summary?.total_reviews) return '';
    const pct = (summary.total_positive / summary.total_reviews) * 100;
    if (pct >= 80) return 'blp-review--very-positive';
    if (pct >= 70) return 'blp-review--mostly-positive';
    if (pct >= 40) return 'blp-review--mixed';
    return 'blp-review--mostly-negative';
  }
  const map = {
    1: 'blp-review--overwhelmingly-negative',
    2: 'blp-review--very-negative',
    3: 'blp-review--negative',
    4: 'blp-review--mostly-negative',
    5: 'blp-review--mixed',
    6: 'blp-review--mostly-positive',
    7: 'blp-review--positive',
    8: 'blp-review--very-positive',
    9: 'blp-review--overwhelming',
  };
  return map[score] || '';
}

export function formatReviewPercent(summary) {
  if (!summary || !summary.total_reviews) return null;
  const pct = Math.round((summary.total_positive / summary.total_reviews) * 100);
  const desc = summary.review_score_desc || '';
  return desc ? `${desc} (${pct}%)` : `${pct}%`;
}

export function formatReviewPercentCompact(summary) {
  if (!summary || !summary.total_reviews) return null;
  return `${Math.round((summary.total_positive / summary.total_reviews) * 100)}%`;
}

export function formatPriceText(steam) {
  if (!steam?.found) return null;
  if (steam.isFree) return t.free;
  if (!steam.price) return null;
  let priceText = steam.price.final_formatted || '';
  if (!priceText && Number.isFinite(steam.price.final)) {
    priceText = (steam.price.final / 100).toFixed(2);
    if (steam.price.currency) priceText = `${priceText} ${steam.price.currency}`;
  }
  return priceText || null;
}
