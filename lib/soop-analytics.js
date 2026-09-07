'use strict';

const base = require('./soop-analytics-base.js');

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isTrackifyViewerPlaceholder(item = {}) {
  const measurement = String(item?.measurement || '').toLowerCase();
  return measurement.includes('trackify')
    && finite(item?.averageViewers) === 0
    && finite(item?.maxViewers) === 0;
}

function normalizeSessionViewerStats(item = {}) {
  if (!isTrackifyViewerPlaceholder(item)) return { ...item };
  return {
    ...item,
    averageViewers: null,
    maxViewers: null,
    categories: (Array.isArray(item.categories) ? item.categories : []).map(category => ({
      ...category,
      averageViewers: finite(category?.averageViewers) === 0 ? null : category?.averageViewers ?? null,
      maxViewers: finite(category?.maxViewers) === 0 ? null : category?.maxViewers ?? null
    }))
  };
}

function weightedViewerStats(items = []) {
  let total = 0;
  let weight = 0;
  let max = null;
  for (const raw of items) {
    const item = normalizeSessionViewerStats(raw);
    const average = finite(item.averageViewers);
    const peak = finite(item.maxViewers);
    const samples = finite(item.viewerSampleCount ?? item.sampleCount);
    if (average !== null) {
      const itemWeight = samples !== null && samples > 0 ? samples : 1;
      total += average * itemWeight;
      weight += itemWeight;
    }
    if (peak !== null) max = max === null ? peak : Math.max(max, peak);
  }
  return {
    averageViewers: weight > 0 ? Math.round(total / weight) : null,
    maxViewers: max
  };
}

function snapshotPoints(snapshots = [], followerHistory = [], live = {}, now = new Date()) {
  const rows = base.mergeFollowerSnapshots(snapshots, followerHistory)
    .map(row => ({
      date: String(row?.date || '').slice(0, 10),
      capturedAt: String(row?.capturedAt || ''),
      followerCount: finite(row?.soop?.followerCount),
      fanclubCount: finite(row?.soop?.fanclubCount)
    }))
    .filter(row => /^20\d{2}-\d{2}-\d{2}$/.test(row.date));

  const today = base.kstDateKey(now);
  const liveFollower = finite(live?.followerCount);
  const liveFanclub = finite(live?.fanclubCount);
  if (today && (liveFollower !== null || liveFanclub !== null)) {
    const index = rows.findIndex(row => row.date === today);
    const current = index >= 0 ? rows[index] : { date: today, capturedAt: '', followerCount: null, fanclubCount: null };
    const merged = {
      ...current,
      capturedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
      followerCount: liveFollower !== null ? liveFollower : current.followerCount,
      fanclubCount: liveFanclub !== null ? liveFanclub : current.fanclubCount
    };
    if (index >= 0) rows[index] = merged;
    else rows.push(merged);
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.capturedAt.localeCompare(b.capturedAt));
}

function latestByDate(points = []) {
  const map = new Map();
  for (const row of points) map.set(row.date, row);
  return map;
}

function previousFinite(points = [], index, key) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const value = finite(points[i]?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function dailySnapshotMeta(points = [], date = '', key = '') {
  const index = points.findIndex(row => row.date === date);
  if (index < 0) return { count: null, delta: null };
  const count = finite(points[index]?.[key]);
  const previous = previousFinite(points, index, key);
  return {
    count,
    delta: count !== null && previous !== null ? count - previous : null
  };
}

function latestFiniteBefore(points = [], date = '', key = '') {
  let value = null;
  for (const row of points) {
    if (row.date >= date) break;
    const current = finite(row?.[key]);
    if (current !== null) value = current;
  }
  return value;
}

function monthSnapshotMeta(points = [], month = '', key = '') {
  const monthRows = points.filter(row => row.date.startsWith(`${month}-`));
  let first = null;
  let last = null;
  for (const row of monthRows) {
    const current = finite(row?.[key]);
    if (current === null) continue;
    if (first === null) first = current;
    last = current;
  }
  const previous = latestFiniteBefore(points, `${month}-01`, key);
  const baseline = previous !== null ? previous : first;
  return {
    count: last,
    delta: last !== null && baseline !== null ? last - baseline : null
  };
}

function sessionDate(item = {}) {
  return String(item?.date || base.kstDateKey(item?.startedAt || '')).slice(0, 10);
}

function buildSoopAnalytics(sessions = [], snapshots = [], live = {}, now = new Date(), options = {}) {
  const result = base.buildSoopAnalytics(sessions, snapshots, live, now, options);
  const points = snapshotPoints(snapshots, options?.followerHistory || [], live, now);
  const pointMap = latestByDate(points);

  result.daily = (Array.isArray(result.daily) ? result.daily : []).map(row => {
    const follower = dailySnapshotMeta(points, row.date, 'followerCount');
    const fanclub = dailySnapshotMeta(points, row.date, 'fanclubCount');
    const normalizedSessions = (Array.isArray(row.sessions) ? row.sessions : []).map(normalizeSessionViewerStats);
    const viewer = weightedViewerStats(normalizedSessions);
    return {
      ...row,
      followerCount: follower.count,
      followerDelta: follower.delta ?? row.followerDelta ?? null,
      fanclubCount: fanclub.count,
      fanclubDelta: fanclub.delta ?? row.fanclubDelta ?? null,
      averageViewers: viewer.averageViewers,
      maxViewers: viewer.maxViewers,
      sessions: normalizedSessions
    };
  });

  const sessionsByMonth = new Map();
  for (const daily of result.daily) {
    const month = String(daily.date || '').slice(0, 7);
    if (!/^20\d{2}-\d{2}$/.test(month)) continue;
    if (!sessionsByMonth.has(month)) sessionsByMonth.set(month, []);
    sessionsByMonth.get(month).push(...(Array.isArray(daily.sessions) ? daily.sessions : []));
  }

  result.monthly = (Array.isArray(result.monthly) ? result.monthly : []).map(row => {
    const follower = monthSnapshotMeta(points, row.month, 'followerCount');
    const fanclub = monthSnapshotMeta(points, row.month, 'fanclubCount');
    const viewer = weightedViewerStats(sessionsByMonth.get(row.month) || []);
    return {
      ...row,
      followerCount: follower.count,
      followerDelta: follower.delta ?? row.followerDelta ?? null,
      fanclubCount: fanclub.count,
      fanclubDelta: fanclub.delta ?? row.fanclubDelta ?? null,
      averageViewers: viewer.averageViewers,
      maxViewers: viewer.maxViewers
    };
  });

  result.calendar = result.daily.map(row => ({ ...row, sessions: (row.sessions || []).map(session => ({ ...session })) }));
  result.recentSessions = (Array.isArray(result.recentSessions) ? result.recentSessions : []).map(normalizeSessionViewerStats);

  const currentMonth = base.monthKey(now);
  const month = result.monthly.find(row => row.month === currentMonth) || null;
  const latestPoint = points.at(-1) || null;
  if (result.overview) {
    result.overview.followerCount = finite(live?.followerCount) ?? finite(latestPoint?.followerCount) ?? result.overview.followerCount;
    result.overview.fanclubCount = finite(live?.fanclubCount) ?? finite(latestPoint?.fanclubCount) ?? result.overview.fanclubCount;
    result.overview.followerDelta = month?.followerDelta ?? result.overview.followerDelta;
    result.overview.fanclubDelta = month?.fanclubDelta ?? result.overview.fanclubDelta;
    result.overview.monthAverageViewers = month?.averageViewers ?? result.overview.monthAverageViewers;
    result.overview.monthMaxViewers = month?.maxViewers ?? result.overview.monthMaxViewers;
  }

  return result;
}

module.exports = {
  ...base,
  buildSoopAnalytics,
  isTrackifyViewerPlaceholder,
  normalizeSessionViewerStats,
  monthSnapshotMeta,
  dailySnapshotMeta
};
