'use strict';

function finite(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function exactDate(value) {
  const text = String(value || '').trim();
  const match = text.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return '';
  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
}

function aliasValue(row, aliases) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return undefined;
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return undefined;
}

function extractTrackifyFollowerPoints(payload = {}, capturedAt = new Date().toISOString()) {
  const points = [];

  const favoriteTrend = Array.isArray(payload?.favorite?.points) ? payload.favorite.points : [];
  for (const row of favoriteTrend) {
    const date = exactDate(row?.ts || row?.date || row?.day);
    const followerCount = finite(row?.value);
    if (date && followerCount !== null) {
      points.push({ date, followerCount, source: 'trackify', capturedAt, confidence: 1 });
    }
  }

  const seenObjects = new Set();
  const walk = node => {
    if (!node || typeof node !== 'object' || seenObjects.has(node)) return;
    seenObjects.add(node);
    if (Array.isArray(node)) {
      for (const row of node) {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          const date = exactDate(aliasValue(row, ['date', 'day', 'statDate', 'stat_date']));
          const followerCount = finite(aliasValue(row, ['fanCount', 'followerCount', 'favoriteCount', 'favorite_count']));
          if (date && followerCount !== null) {
            points.push({ date, followerCount, source: 'trackify', capturedAt, confidence: 1 });
          }
        }
        walk(row);
      }
      return;
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(payload);
  return mergeFollowerHistory(points);
}

function snapshotsToFollowerPoints(history = {}) {
  const snapshots = Array.isArray(history) ? history : Array.isArray(history?.snapshots) ? history.snapshots : [];
  return snapshots.map(row => {
    const date = exactDate(row?.date || row?.capturedAt);
    const followerCount = finite(row?.soop?.followerCount);
    if (!date || followerCount === null) return null;
    return {
      date,
      followerCount,
      source: 'fan-site-snapshot',
      capturedAt: String(row?.capturedAt || `${date}T23:59:59+09:00`),
      confidence: 2
    };
  }).filter(Boolean);
}

function mergeFollowerHistory(...collections) {
  const byDate = new Map();
  for (const collection of collections) {
    const rows = Array.isArray(collection)
      ? collection
      : Array.isArray(collection?.points) ? collection.points : [];
    for (const row of rows) {
      const date = exactDate(row?.date);
      const followerCount = finite(row?.followerCount);
      if (!date || followerCount === null) continue;
      const next = {
        date,
        followerCount,
        source: String(row?.source || 'public'),
        capturedAt: String(row?.capturedAt || ''),
        confidence: Number.isFinite(row?.confidence) ? row.confidence : 0
      };
      const previous = byDate.get(date);
      if (!previous
        || next.confidence > previous.confidence
        || (next.confidence === previous.confidence && String(next.capturedAt) >= String(previous.capturedAt))) {
        byDate.set(date, next);
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function followerHistoryToSnapshots(history = {}) {
  const points = Array.isArray(history) ? history : Array.isArray(history?.points) ? history.points : [];
  return mergeFollowerHistory(points).map(point => ({
    date: point.date,
    capturedAt: point.capturedAt || `${point.date}T15:00:00.000Z`,
    soop: { followerCount: point.followerCount },
    followerHistory: {
      source: point.source,
      confidence: point.confidence
    }
  }));
}

module.exports = {
  finite,
  exactDate,
  extractTrackifyFollowerPoints,
  snapshotsToFollowerPoints,
  mergeFollowerHistory,
  followerHistoryToSnapshots
};
