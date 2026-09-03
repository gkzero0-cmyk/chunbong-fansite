'use strict';

const MEASUREMENT = Object.freeze({
  viewer: 'fan-site-sampled-5m',
  follower: 'public-snapshot',
  fanclub: 'public-snapshot-or-unavailable'
});

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value, digits = 0) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function kstDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthKey(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : kstDateKey(value);
  return date ? date.slice(0, 7) : '';
}

function validSamples(samples = []) {
  return samples
    .filter(item => item && item.capturedAt && !Number.isNaN(new Date(item.capturedAt).getTime()))
    .slice()
    .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
}

function firstFinite(samples, key) {
  for (const sample of samples) {
    const value = finite(sample?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function lastFinite(samples, key) {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const value = finite(samples[index]?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function delta(start, end) {
  return Number.isFinite(start) && Number.isFinite(end) ? end - start : null;
}

function weightedViewerStats(items = []) {
  let weighted = 0;
  let weight = 0;
  let max = null;
  for (const item of items) {
    const average = finite(item?.averageViewers);
    const samples = finite(item?.viewerSampleCount ?? item?.sampleCount);
    const peak = finite(item?.maxViewers);
    if (average !== null && samples !== null && samples > 0) {
      weighted += average * samples;
      weight += samples;
    } else if (average !== null) {
      weighted += average;
      weight += 1;
    }
    if (peak !== null) max = max === null ? peak : Math.max(max, peak);
  }
  return {
    averageViewers: weight > 0 ? Math.round(weighted / weight) : null,
    maxViewers: max,
    viewerSampleCount: weight
  };
}

function buildSessionCategories(samples, endedAt) {
  const rows = validSamples(samples);
  const groups = new Map();
  const endMs = new Date(endedAt).getTime();
  for (let index = 0; index < rows.length; index += 1) {
    const sample = rows[index];
    const startMs = new Date(sample.capturedAt).getTime();
    const nextMs = index + 1 < rows.length ? new Date(rows[index + 1].capturedAt).getTime() : endMs;
    const intervalMinutes = Math.max(0, Math.min(10, (nextMs - startMs) / 60000));
    const name = String(sample.categoryName || '미분류').trim() || '미분류';
    const id = String(sample.categoryId || name);
    if (!groups.has(id)) groups.set(id, { id, name, minutes: 0, sampleCount: 0, viewerTotal: 0, viewerCount: 0, maxViewers: null });
    const group = groups.get(id);
    group.minutes += intervalMinutes;
    group.sampleCount += 1;
    const viewer = finite(sample.viewerCount);
    if (viewer !== null) {
      group.viewerTotal += viewer;
      group.viewerCount += 1;
      group.maxViewers = group.maxViewers === null ? viewer : Math.max(group.maxViewers, viewer);
    }
  }
  return [...groups.values()].map(group => ({
    id: group.id,
    name: group.name,
    minutes: Math.round(group.minutes),
    sampleCount: group.sampleCount,
    averageViewers: group.viewerCount ? Math.round(group.viewerTotal / group.viewerCount) : null,
    maxViewers: group.maxViewers
  })).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'ko'));
}

function finalizeSession(state, offlineAt = new Date().toISOString()) {
  const session = state?.session;
  if (!session?.active) return null;
  const samples = validSamples(session.samples || []);
  const startedAt = session.startedAt || samples[0]?.capturedAt || offlineAt;
  const endedAt = offlineAt || samples.at(-1)?.capturedAt || startedAt;
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  const durationMinutes = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.max(0, Math.round((endMs - startMs) / 60000))
    : 0;
  const viewers = samples.map(item => finite(item.viewerCount)).filter(Number.isFinite);
  const followerStart = firstFinite(samples, 'followerCount');
  const followerEnd = lastFinite(samples, 'followerCount');
  const fanclubStart = firstFinite(samples, 'fanclubCount');
  const fanclubEnd = lastFinite(samples, 'fanclubCount');
  return {
    id: String(session.sessionId || startedAt),
    startedAt,
    endedAt,
    date: kstDateKey(startedAt),
    durationMinutes,
    averageViewers: viewers.length ? Math.round(viewers.reduce((sum, value) => sum + value, 0) / viewers.length) : null,
    maxViewers: viewers.length ? Math.max(...viewers) : null,
    viewerSampleCount: viewers.length,
    followerStart,
    followerEnd,
    followerDelta: delta(followerStart, followerEnd),
    fanclubStart,
    fanclubEnd,
    fanclubDelta: delta(fanclubStart, fanclubEnd),
    title: String(session.title || samples.at(-1)?.title || ''),
    categories: buildSessionCategories(samples, endedAt),
    measurement: MEASUREMENT.viewer
  };
}

function upsertSession(store, session, limit = 1200) {
  const source = store && typeof store === 'object' ? store : {};
  const map = new Map();
  for (const item of Array.isArray(source.sessions) ? source.sessions : []) {
    if (item?.id) map.set(String(item.id), item);
  }
  if (session?.id) map.set(String(session.id), session);
  const sessions = [...map.values()]
    .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')))
    .slice(-Math.max(1, limit));
  return { version: Number(source.version) || 1, sessions };
}

function aggregateCategories(sessions = []) {
  const groups = new Map();
  let totalMinutes = 0;
  for (const session of sessions) {
    const seen = new Set();
    for (const category of Array.isArray(session?.categories) ? session.categories : []) {
      const name = String(category?.name || '미분류').trim() || '미분류';
      if (!groups.has(name)) groups.set(name, { name, minutes: 0, streamCount: 0, weightedViewerTotal: 0, viewerWeight: 0, maxViewers: null });
      const group = groups.get(name);
      const minutes = finite(category?.minutes) ?? 0;
      group.minutes += minutes;
      totalMinutes += minutes;
      if (!seen.has(name)) { group.streamCount += 1; seen.add(name); }
      const average = finite(category?.averageViewers);
      const sampleCount = finite(category?.sampleCount);
      if (average !== null) {
        const weight = sampleCount !== null && sampleCount > 0 ? sampleCount : 1;
        group.weightedViewerTotal += average * weight;
        group.viewerWeight += weight;
      }
      const peak = finite(category?.maxViewers);
      if (peak !== null) group.maxViewers = group.maxViewers === null ? peak : Math.max(group.maxViewers, peak);
    }
  }
  return [...groups.values()].map(group => ({
    name: group.name,
    minutes: Math.round(group.minutes),
    streamCount: group.streamCount,
    averageViewers: group.viewerWeight ? Math.round(group.weightedViewerTotal / group.viewerWeight) : null,
    maxViewers: group.maxViewers,
    sharePercent: totalMinutes > 0 ? Math.round(group.minutes / totalMinutes * 100) : 0
  })).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'ko'));
}

function snapshotValue(snapshot, key) {
  return finite(snapshot?.soop?.[key]);
}

function buildSnapshotDeltaMap(snapshots = [], key) {
  const rows = (Array.isArray(snapshots) ? snapshots : [])
    .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || '')))
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const map = new Map();
  let previous = null;
  for (const row of rows) {
    const current = snapshotValue(row, key);
    map.set(row.date, current !== null && previous !== null ? current - previous : null);
    if (current !== null) previous = current;
  }
  return map;
}

function aggregateDaily(sessions = [], snapshots = []) {
  const byDate = new Map();
  for (const session of sessions) {
    const date = String(session?.date || kstDateKey(session?.startedAt));
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(session);
  }
  const followerDeltas = buildSnapshotDeltaMap(snapshots, 'followerCount');
  const fanclubDeltas = buildSnapshotDeltaMap(snapshots, 'fanclubCount');
  let cumulative = 0;
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => {
    const durationMinutes = Math.round(rows.reduce((sum, item) => sum + (finite(item?.durationMinutes) ?? 0), 0));
    cumulative += durationMinutes;
    const viewer = weightedViewerStats(rows);
    const fallbackFollower = rows.map(item => finite(item?.followerDelta)).filter(Number.isFinite);
    const fallbackFanclub = rows.map(item => finite(item?.fanclubDelta)).filter(Number.isFinite);
    return {
      date,
      streamCount: rows.length,
      durationMinutes,
      cumulativeMinutes: cumulative,
      averageViewers: viewer.averageViewers,
      maxViewers: viewer.maxViewers,
      followerDelta: followerDeltas.has(date) && followerDeltas.get(date) !== null ? followerDeltas.get(date) : (fallbackFollower.length ? fallbackFollower.reduce((a, b) => a + b, 0) : null),
      fanclubDelta: fanclubDeltas.has(date) && fanclubDeltas.get(date) !== null ? fanclubDeltas.get(date) : (fallbackFanclub.length ? fallbackFanclub.reduce((a, b) => a + b, 0) : null),
      categories: aggregateCategories(rows),
      sessions: rows.slice().sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
    };
  });
}

function monthlySnapshotDelta(snapshots, month, key) {
  const values = (Array.isArray(snapshots) ? snapshots : [])
    .filter(item => String(item?.date || '').startsWith(`${month}-`))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(item => snapshotValue(item, key))
    .filter(Number.isFinite);
  return values.length >= 2 ? values.at(-1) - values[0] : null;
}

function aggregateMonthly(sessions = [], snapshots = []) {
  const groups = new Map();
  for (const session of sessions) {
    const month = monthKey(session?.date || session?.startedAt);
    if (!month) continue;
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(session);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, rows]) => {
    const durationMinutes = Math.round(rows.reduce((sum, item) => sum + (finite(item?.durationMinutes) ?? 0), 0));
    const viewer = weightedViewerStats(rows);
    const followerSnapshotDelta = monthlySnapshotDelta(snapshots, month, 'followerCount');
    const fanclubSnapshotDelta = monthlySnapshotDelta(snapshots, month, 'fanclubCount');
    const followerSessionValues = rows.map(item => finite(item?.followerDelta)).filter(Number.isFinite);
    const fanclubSessionValues = rows.map(item => finite(item?.fanclubDelta)).filter(Number.isFinite);
    return {
      month,
      activeDays: new Set(rows.map(item => item?.date || kstDateKey(item?.startedAt)).filter(Boolean)).size,
      streamCount: rows.length,
      durationMinutes,
      averageStreamMinutes: rows.length ? Math.round(durationMinutes / rows.length) : 0,
      averageViewers: viewer.averageViewers,
      maxViewers: viewer.maxViewers,
      followerDelta: followerSnapshotDelta !== null ? followerSnapshotDelta : (followerSessionValues.length ? followerSessionValues.reduce((a, b) => a + b, 0) : null),
      fanclubDelta: fanclubSnapshotDelta !== null ? fanclubSnapshotDelta : (fanclubSessionValues.length ? fanclubSessionValues.reduce((a, b) => a + b, 0) : null),
      categories: aggregateCategories(rows)
    };
  });
}

function latestSnapshotValue(snapshots, key) {
  const rows = (Array.isArray(snapshots) ? snapshots : []).slice().sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')));
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = snapshotValue(rows[index], key);
    if (value !== null) return value;
  }
  return null;
}

function buildSoopAnalytics(sessions = [], snapshots = [], live = {}, now = new Date()) {
  const cleanSessions = (Array.isArray(sessions) ? sessions : []).filter(item => item?.id);
  const daily = aggregateDaily(cleanSessions, snapshots);
  const monthly = aggregateMonthly(cleanSessions, snapshots);
  const currentMonth = monthKey(now);
  const month = monthly.find(item => item.month === currentMonth) || null;
  const todayKey = kstDateKey(now);
  const today = daily.find(item => item.date === todayKey) || null;
  const measuredTotalMinutes = Math.round(cleanSessions.reduce((sum, item) => sum + (finite(item?.durationMinutes) ?? 0), 0));
  const liveFollower = finite(live?.followerCount);
  const liveFanclub = finite(live?.fanclubCount);
  return {
    overview: {
      live: live?.live ?? null,
      currentViewerCount: finite(live?.viewerCount),
      currentCategory: live?.categoryName || '',
      currentTitle: live?.title || '',
      todayDurationMinutes: today?.durationMinutes ?? 0,
      monthDurationMinutes: month?.durationMinutes ?? 0,
      measuredTotalMinutes,
      monthAverageViewers: month?.averageViewers ?? null,
      monthMaxViewers: month?.maxViewers ?? null,
      followerCount: liveFollower !== null ? liveFollower : latestSnapshotValue(snapshots, 'followerCount'),
      fanclubCount: liveFanclub !== null ? liveFanclub : latestSnapshotValue(snapshots, 'fanclubCount'),
      followerDelta: month?.followerDelta ?? null,
      fanclubDelta: month?.fanclubDelta ?? null
    },
    daily,
    monthly,
    calendar: daily.map(item => ({ ...item })),
    categories: aggregateCategories(cleanSessions),
    recentSessions: cleanSessions.slice().sort((a, b) => String(b.endedAt || b.startedAt || '').localeCompare(String(a.endedAt || a.startedAt || ''))).slice(0, 30),
    measurement: { ...MEASUREMENT }
  };
}

module.exports = {
  MEASUREMENT,
  kstDateKey,
  monthKey,
  finalizeSession,
  upsertSession,
  aggregateCategories,
  aggregateDaily,
  aggregateMonthly,
  buildSoopAnalytics
};
