'use strict';

const NUMBER_FORMAT = /-?\d[\d,.]*/;

function finiteCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
  if (value === null || value === undefined || value === '') return null;
  const match = String(value).replace(/\s+/g, '').match(NUMBER_FORMAT);
  if (!match) return null;
  const parsed = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function kstDateParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((out, part) => {
    if (part.type !== 'literal') out[part.type] = part.value;
    return out;
  }, {});
  return parts.year && parts.month && parts.day ? parts : null;
}

function monthKeyKst(value = new Date()) {
  const parts = kstDateParts(value);
  return parts ? `${parts.year}-${parts.month}` : '';
}

function dateKeyKst(value) {
  const parts = kstDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

function threeMonthStartKey(value = new Date()) {
  const parts = kstDateParts(value);
  if (!parts) return '';
  const utc = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 3, 1));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function normalizeEngagementItem(item = {}) {
  const id = String(item.id || item.videoId || '').trim();
  if (!id) return null;
  const kind = String(item.kind || '').toLowerCase() === 'shorts' ? 'shorts' : 'videos';
  const publishedAt = String(item.publishedAt || item.dateIso || item.published || '').trim();
  const link = String(item.link || (kind === 'shorts'
    ? `https://www.youtube.com/shorts/${id}`
    : `https://www.youtube.com/watch?v=${id}`)).trim();
  return {
    id,
    kind,
    title: String(item.title || '춘봉TV 콘텐츠').trim() || '춘봉TV 콘텐츠',
    publishedAt,
    viewCount: finiteCount(item.viewCount),
    commentCount: finiteCount(item.commentCount),
    link
  };
}

function dedupeItems(items = []) {
  const byId = new Map();
  for (const raw of items) {
    const item = normalizeEngagementItem(raw);
    if (!item) continue;
    const previous = byId.get(item.id);
    if (!previous) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...previous,
      ...item,
      title: item.title || previous.title,
      publishedAt: item.publishedAt || previous.publishedAt,
      viewCount: Number.isFinite(item.viewCount) ? item.viewCount : previous.viewCount,
      commentCount: Number.isFinite(item.commentCount) ? item.commentCount : previous.commentCount,
      link: item.link || previous.link
    });
  }
  return [...byId.values()];
}

function sortMetric(items, key) {
  return items
    .filter(item => Number.isFinite(item[key]))
    .slice()
    .sort((a, b) => {
      const metricDiff = b[key] - a[key];
      if (metricDiff) return metricDiff;
      const dateDiff = Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '');
      if (Number.isFinite(dateDiff) && dateDiff) return dateDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, 5);
}

function rankPair(items) {
  return {
    views: sortMetric(items, 'viewCount'),
    comments: sortMetric(items, 'commentCount')
  };
}

function buildEngagementRankings(items = [], now = new Date()) {
  const all = dedupeItems(items);
  const currentMonth = monthKeyKst(now);
  const recentStart = threeMonthStartKey(now);
  const current = all.filter(item => item.publishedAt && monthKeyKst(item.publishedAt) === currentMonth);
  const recent = all.filter(item => {
    if (!item.publishedAt) return false;
    const dateKey = dateKeyKst(item.publishedAt);
    return Boolean(dateKey && recentStart && dateKey >= recentStart);
  });
  return {
    allTime: rankPair(all),
    currentMonth: rankPair(current),
    recentThreeMonths: rankPair(recent)
  };
}

function mergeEngagementCache(previous = {}, fresh = {}) {
  const byId = new Map();
  for (const raw of Array.isArray(previous.items) ? previous.items : []) {
    const item = normalizeEngagementItem(raw);
    if (item) byId.set(item.id, item);
  }
  for (const raw of Array.isArray(fresh.items) ? fresh.items : []) {
    const item = normalizeEngagementItem(raw);
    if (!item) continue;
    const old = byId.get(item.id);
    byId.set(item.id, old ? {
      ...old,
      ...item,
      title: item.title || old.title,
      publishedAt: item.publishedAt || old.publishedAt,
      viewCount: Number.isFinite(item.viewCount) ? item.viewCount : old.viewCount,
      commentCount: Number.isFinite(item.commentCount) ? item.commentCount : old.commentCount,
      link: item.link || old.link
    } : item);
  }
  const items = [...byId.values()].sort((a, b) => {
    const aTime = Date.parse(a.publishedAt || '') || 0;
    const bTime = Date.parse(b.publishedAt || '') || 0;
    return bTime - aTime || a.id.localeCompare(b.id);
  });
  return {
    version: 1,
    capturedAt: fresh.capturedAt || previous.capturedAt || '',
    source: fresh.source || previous.source || 'youtube-public',
    itemCount: items.length,
    items
  };
}

module.exports = {
  finiteCount,
  monthKeyKst,
  dateKeyKst,
  threeMonthStartKey,
  normalizeEngagementItem,
  buildEngagementRankings,
  mergeEngagementCache
};