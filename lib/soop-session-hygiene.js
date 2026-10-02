'use strict';

const MAX_SESSION_MINUTES = 48 * 60;
const TRACKIFY_SENTINEL_MINUTES = 48 * 60;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function timeMs(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function elapsedSessionMinutes(item = {}) {
  const started = timeMs(item?.startedAt);
  const ended = timeMs(item?.endedAt);
  if (started === null || ended === null || ended < started) return null;
  return Math.round((ended - started) / 60000);
}

function normalizeTitle(value = '') {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isTrackify(item = {}) {
  return String(item?.measurement || item?.source || '').toLowerCase().includes('trackify');
}

function normalizeSession(item = {}) {
  if (!item || typeof item !== 'object') return null;
  const explicit = finite(item.durationMinutes);
  const elapsed = elapsedSessionMinutes(item);
  let duration = explicit;

  if (elapsed !== null) {
    if (elapsed > MAX_SESSION_MINUTES) return null;
    if (explicit === null || explicit < 0 || explicit > MAX_SESSION_MINUTES || Math.abs(explicit - elapsed) > 30) {
      duration = elapsed;
    }
  }

  if (duration === null || duration < 0 || duration > MAX_SESSION_MINUTES) return null;
  if (duration === TRACKIFY_SENTINEL_MINUTES && isTrackify(item) && (elapsed === null || elapsed === TRACKIFY_SENTINEL_MINUTES)) return null;

  return { ...item, durationMinutes: duration };
}

function sessionRange(item = {}) {
  const start = timeMs(item.startedAt);
  if (start === null) return null;
  let end = timeMs(item.endedAt);
  if (end === null || end < start) {
    const duration = finite(item.durationMinutes);
    if (duration === null) return null;
    end = start + duration * 60000;
  }
  return { start, end };
}

function overlapMinutes(a = {}, b = {}) {
  const x = sessionRange(a);
  const y = sessionRange(b);
  if (!x || !y) return 0;
  return Math.max(0, Math.min(x.end, y.end) - Math.max(x.start, y.start)) / 60000;
}

function likelySameSession(a = {}, b = {}) {
  const aId = String(a.broadcastId || '').trim();
  const bId = String(b.broadcastId || '').trim();
  if (aId && bId && aId === bId) return true;

  const aTitle = normalizeTitle(a.title);
  const bTitle = normalizeTitle(b.title);
  if (!aTitle || aTitle !== bTitle) return false;

  const aRange = sessionRange(a);
  const bRange = sessionRange(b);
  if (!aRange || !bRange) return false;
  const startGap = Math.abs(aRange.start - bRange.start) / 60000;
  if (startGap <= 15) return true;

  const overlap = overlapMinutes(a, b);
  if (overlap <= 0) return false;
  const shorter = Math.max(1, Math.min((aRange.end - aRange.start) / 60000, (bRange.end - bRange.start) / 60000));
  return overlap / shorter >= 0.6;
}

function qualityScore(item = {}) {
  let score = 0;
  if (elapsedSessionMinutes(item) !== null) score += 4;
  const samples = finite(item.viewerSampleCount ?? item.sampleCount);
  if (samples !== null) score += Math.min(5, Math.log10(samples + 1) * 2);
  if (finite(item.averageViewers) !== null) score += 2;
  if (finite(item.maxViewers) !== null) score += 1;
  if (Array.isArray(item.categories) && item.categories.length) score += 2;
  if (!isTrackify(item)) score += 1;
  return score;
}

function mergedSession(a = {}, b = {}) {
  const primary = qualityScore(b) > qualityScore(a) ? b : a;
  const secondary = primary === a ? b : a;
  const ar = sessionRange(a);
  const br = sessionRange(b);
  const start = ar && br ? Math.min(ar.start, br.start) : ar?.start ?? br?.start ?? null;
  const end = ar && br ? Math.max(ar.end, br.end) : ar?.end ?? br?.end ?? null;
  const spanMinutes = start !== null && end !== null ? Math.round((end - start) / 60000) : null;
  const duration = spanMinutes !== null && spanMinutes <= MAX_SESSION_MINUTES
    ? spanMinutes
    : finite(primary.durationMinutes) ?? finite(secondary.durationMinutes) ?? 0;
  const startedAt = start !== null ? new Date(start).toISOString() : primary.startedAt || secondary.startedAt || '';
  const endedAt = end !== null ? new Date(end).toISOString() : primary.endedAt || secondary.endedAt || '';
  const primaryMax = finite(primary.maxViewers);
  const secondaryMax = finite(secondary.maxViewers);

  return {
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    broadcastId: primary.broadcastId || secondary.broadcastId || '',
    startedAt,
    endedAt,
    date: primary.date || secondary.date,
    durationMinutes: duration,
    averageViewers: finite(primary.averageViewers) ?? finite(secondary.averageViewers),
    maxViewers: primaryMax === null ? secondaryMax : (secondaryMax === null ? primaryMax : Math.max(primaryMax, secondaryMax)),
    viewerSampleCount: Math.max(finite(primary.viewerSampleCount ?? primary.sampleCount) ?? 0, finite(secondary.viewerSampleCount ?? secondary.sampleCount) ?? 0),
    categories: Array.isArray(primary.categories) && primary.categories.length ? primary.categories : (secondary.categories || [])
  };
}

function dedupeSessions(items = []) {
  const normalized = (Array.isArray(items) ? items : []).map(normalizeSession).filter(Boolean)
    .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
  const result = [];
  for (const item of normalized) {
    const index = result.findIndex(existing => likelySameSession(existing, item));
    if (index < 0) result.push(item);
    else result[index] = mergedSession(result[index], item);
  }
  return result;
}

function kstDateKey(value = new Date()) {
  const ms = value instanceof Date ? value.getTime() : timeMs(value);
  if (!Number.isFinite(ms)) return '';
  const kst = new Date(ms + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function kstMidnightMs(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - KST_OFFSET_MS;
}

function nextKstDateKey(dateKey) {
  const midnight = kstMidnightMs(dateKey);
  return midnight === null ? '' : kstDateKey(new Date(midnight + 24 * 60 * 60 * 1000));
}

function projectLiveSegments(live = {}, now = new Date()) {
  if (live?.live !== true || !live?.startedAt) return [];
  const start = timeMs(live.startedAt);
  const end = now instanceof Date ? now.getTime() : timeMs(now);
  if (start === null || end === null || end < start) return [];
  const title = String(live.title || '');
  const categoryName = String(live.categoryName || '').trim();
  const categoryId = String(live.categoryId || categoryName || '').trim();
  const broadcastId = String(live.broadcastId || '').trim();
  const segments = [];
  let date = kstDateKey(start);
  const endDate = kstDateKey(end);

  while (date && date <= endDate) {
    const dayStart = kstMidnightMs(date);
    const nextStart = dayStart + 24 * 60 * 60 * 1000;
    const segmentStart = Math.max(start, dayStart);
    const segmentEnd = Math.min(end, nextStart);
    if (segmentEnd >= segmentStart) {
      const durationMinutes = Math.max(0, Math.round((segmentEnd - segmentStart) / 60000));
      segments.push({
        id: `live-${broadcastId || live.startedAt}-${date}`,
        broadcastId: broadcastId ? `${broadcastId}:${date}` : '',
        sourceBroadcastId: broadcastId,
        date,
        startedAt: new Date(segmentStart).toISOString(),
        endedAt: new Date(segmentEnd).toISOString(),
        durationMinutes,
        averageViewers: null,
        maxViewers: finite(live.viewerCount),
        viewerSampleCount: 0,
        followerStart: null,
        followerEnd: finite(live.followerCount),
        followerDelta: null,
        fanclubStart: null,
        fanclubEnd: finite(live.fanclubCount),
        fanclubDelta: null,
        title,
        categories: categoryName ? [{
          id: categoryId || categoryName,
          name: categoryName,
          minutes: durationMinutes,
          sampleCount: 0,
          averageViewers: null,
          maxViewers: finite(live.viewerCount)
        }] : [],
        measurement: 'live-projection'
      });
    }
    if (date === endDate) break;
    date = nextKstDateKey(date);
  }
  return segments;
}

function removeLiveDuplicates(sessions = [], live = {}, now = new Date()) {
  const segments = projectLiveSegments(live, now);
  if (!segments.length) return Array.isArray(sessions) ? sessions.slice() : [];
  const nowMs = now instanceof Date ? now.getTime() : timeMs(now);
  const startMs = timeMs(live.startedAt);
  const liveComparable = {
    broadcastId: String(live.broadcastId || ''),
    title: String(live.title || ''),
    startedAt: String(live.startedAt || ''),
    endedAt: now instanceof Date ? now.toISOString() : new Date(nowMs).toISOString(),
    durationMinutes: startMs !== null && nowMs !== null ? Math.max(0, Math.round((nowMs - startMs) / 60000)) : 0
  };
  return (Array.isArray(sessions) ? sessions : []).filter(session => !likelySameSession(session, liveComparable));
}

module.exports = {
  MAX_SESSION_MINUTES,
  TRACKIFY_SENTINEL_MINUTES,
  elapsedSessionMinutes,
  normalizeTitle,
  normalizeSession,
  likelySameSession,
  dedupeSessions,
  kstDateKey,
  projectLiveSegments,
  removeLiveDuplicates
};