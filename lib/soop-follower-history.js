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

function metricCandidate(row, key) {
  const value = finite(row?.[key]);
  if (value === null) return null;
  return {
    value,
    source: String(row?.source || 'public'),
    capturedAt: String(row?.capturedAt || ''),
    confidence: Number.isFinite(row?.confidence) ? row.confidence : 0
  };
}

function candidateWins(next, previous) {
  return !previous
    || next.confidence > previous.confidence
    || (next.confidence === previous.confidence && next.capturedAt >= previous.capturedAt);
}

function mergeFollowerHistory(...collections) {
  const byDate = new Map();
  for (const collection of collections) {
    const rows = Array.isArray(collection) ? collection : Array.isArray(collection?.points) ? collection.points : [];
    for (const row of rows) {
      const date = exactDate(row?.date);
      if (!date) continue;
      const follower = metricCandidate(row, 'followerCount');
      const fanclub = metricCandidate(row, 'fanclubCount');
      if (!follower && !fanclub) continue;
      const current = byDate.get(date) || { date, follower: null, fanclub: null };
      if (follower && candidateWins(follower, current.follower)) current.follower = follower;
      if (fanclub && candidateWins(fanclub, current.fanclub)) current.fanclub = fanclub;
      byDate.set(date, current);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map(item => {
    const candidates = [item.follower, item.fanclub].filter(Boolean);
    const sources = [...new Set(candidates.map(candidate => candidate.source).filter(Boolean))];
    const capturedAt = candidates.map(candidate => candidate.capturedAt).sort().at(-1) || '';
    const confidence = Math.max(...candidates.map(candidate => candidate.confidence), 0);
    return {
      date: item.date,
      ...(item.follower ? { followerCount: item.follower.value } : {}),
      ...(item.fanclub ? { fanclubCount: item.fanclub.value } : {}),
      source: sources.length === 1 ? sources[0] : 'mixed-public',
      capturedAt,
      confidence,
      fieldSources: {
        ...(item.follower ? { followerCount: item.follower.source } : {}),
        ...(item.fanclub ? { fanclubCount: item.fanclub.source } : {})
      }
    };
  });
}

function extractTrackifyFollowerPoints(payload = {}, capturedAt = new Date().toISOString()) {
  const points = [];
  const addTrend = (metric, key) => {
    const rows = Array.isArray(payload?.[metric]?.points) ? payload[metric].points : [];
    for (const row of rows) {
      const date = exactDate(row?.ts || row?.date || row?.day);
      const value = finite(row?.value);
      if (date && value !== null) points.push({ date, [key]: value, source: 'trackify', capturedAt, confidence: 1 });
    }
  };
  addTrend('favorite', 'followerCount');
  addTrend('fanclub', 'fanclubCount');

  const seenObjects = new Set();
  const walk = node => {
    if (!node || typeof node !== 'object' || seenObjects.has(node)) return;
    seenObjects.add(node);
    if (Array.isArray(node)) {
      for (const row of node) {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          const date = exactDate(aliasValue(row, ['date', 'day', 'statDate', 'stat_date']));
          const followerCount = finite(aliasValue(row, ['fanCount', 'followerCount', 'favoriteCount', 'favorite_count']));
          const fanclubCount = finite(aliasValue(row, ['fanclubCount', 'fanclubCnt', 'fanclub_count', 'fanclub']));
          if (date && (followerCount !== null || fanclubCount !== null)) {
            points.push({ date, ...(followerCount !== null ? { followerCount } : {}), ...(fanclubCount !== null ? { fanclubCount } : {}), source: 'trackify', capturedAt, confidence: 1 });
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
    const fanclubCount = finite(row?.soop?.fanclubCount);
    if (!date || (followerCount === null && fanclubCount === null)) return null;
    return {
      date,
      ...(followerCount !== null ? { followerCount } : {}),
      ...(fanclubCount !== null ? { fanclubCount } : {}),
      source: 'fan-site-snapshot',
      capturedAt: String(row?.capturedAt || `${date}T23:59:59+09:00`),
      confidence: 2
    };
  }).filter(Boolean);
}

function followerHistoryToSnapshots(history = {}) {
  const points = Array.isArray(history) ? history : Array.isArray(history?.points) ? history.points : [];
  return mergeFollowerHistory(points).map(point => ({
    date: point.date,
    capturedAt: point.capturedAt || `${point.date}T15:00:00.000Z`,
    soop: {
      ...(finite(point.followerCount) !== null ? { followerCount: finite(point.followerCount) } : {}),
      ...(finite(point.fanclubCount) !== null ? { fanclubCount: finite(point.fanclubCount) } : {})
    },
    followerHistory: {
      source: point.source,
      confidence: point.confidence,
      fieldSources: point.fieldSources || {}
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
